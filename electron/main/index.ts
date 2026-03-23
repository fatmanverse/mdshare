import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  Menu,
  nativeImage,
  shell,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
} from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerFileIpc } from "./ipc/file.js";
import { registerExportIpc } from "./ipc/export.js";
import { rebuildApplicationMenu, setMenuWindow } from "./menu.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

type ContextMenuDetails = {
  codeText: string | null;
};

function getWindowIconPath() {
  return process.env.VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), "public", "icon.png")
    : path.join(__dirname, "../../../dist/icon.png");
}

function isExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isSameDocumentNavigation(targetUrl: string, currentUrl: string) {
  const [targetBase] = targetUrl.split("#");
  const [currentBase] = currentUrl.split("#");
  return targetBase === currentBase;
}

function attachWindowUnloadGuard(window: BrowserWindow) {
  window.webContents.on("will-prevent-unload", (event) => {
    const action = dialog.showMessageBoxSync(window, {
      type: "warning",
      buttons: ["取消", "仍然退出"],
      defaultId: 0,
      cancelId: 0,
      title: "未保存修改",
      message: "当前文档有未保存修改。",
      detail: "确认关闭窗口并放弃本次未保存内容吗？",
      noLink: true,
    });

    if (action === 1) {
      event.preventDefault();
    }
  });
}

async function resolveContextMenuDetails(window: BrowserWindow, params: ContextMenuParams): Promise<ContextMenuDetails> {
  try {
    const details = await window.webContents.executeJavaScript(
      `(() => {
        const node = document.elementFromPoint(${params.x}, ${params.y});
        const codeNode = node?.closest?.("pre, code");
        const preNode = codeNode?.closest?.("pre") ?? (codeNode?.tagName === "PRE" ? codeNode : null);
        const codeText = preNode instanceof HTMLElement
          ? preNode.innerText
          : codeNode instanceof HTMLElement
            ? codeNode.innerText
            : null;

        return {
          codeText: codeText && codeText.trim().length > 0 ? codeText : null,
        };
      })()`,
      true,
    );

    return {
      codeText: typeof details?.codeText === "string" ? details.codeText : null,
    };
  } catch {
    return { codeText: null };
  }
}

function buildContextMenuTemplate(params: ContextMenuParams, details: ContextMenuDetails): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [];
  const hasSelection = params.selectionText.trim().length > 0;
  const hasExternalLink = Boolean(params.linkURL && isExternalUrl(params.linkURL));
  const hasImage = Boolean(params.srcURL);
  const hasCodeText = Boolean(details.codeText && details.codeText.trim().length > 0);

  if (hasExternalLink) {
    template.push(
      {
        label: "打开链接",
        click: () => {
          void shell.openExternal(params.linkURL);
        },
      },
      {
        label: "复制链接地址",
        click: () => {
          clipboard.writeText(params.linkURL);
        },
      },
    );
  }

  if (hasImage) {
    if (template.length > 0) {
      template.push({ type: "separator" });
    }

    template.push({
      label: "复制图片地址",
      click: () => {
        clipboard.writeText(params.srcURL);
      },
    });
  }

  if (hasCodeText) {
    if (template.length > 0) {
      template.push({ type: "separator" });
    }

    template.push({
      label: "复制代码块内容",
      click: () => {
        clipboard.writeText(details.codeText ?? "");
      },
    });
  }

  if (params.isEditable) {
    if (template.length > 0) {
      template.push({ type: "separator" });
    }

    template.push(
      { role: "undo", enabled: params.editFlags.canUndo },
      { role: "redo", enabled: params.editFlags.canRedo },
      { type: "separator" },
      { role: "cut", enabled: params.editFlags.canCut },
      { role: "copy", enabled: params.editFlags.canCopy },
      { role: "paste", enabled: params.editFlags.canPaste },
      { role: "selectAll", enabled: params.editFlags.canSelectAll },
    );

    return template;
  }

  if (hasSelection) {
    if (template.length > 0) {
      template.push({ type: "separator" });
    }

    template.push({ role: "copy" }, { role: "selectAll", enabled: params.editFlags.canSelectAll });
  }

  return template;
}

function attachContextMenu(window: BrowserWindow) {
  window.webContents.on("context-menu", (_event, params) => {
    void (async () => {
      const details = await resolveContextMenuDetails(window, params);
      const template = buildContextMenuTemplate(params, details);
      if (template.length === 0 || window.isDestroyed()) {
        return;
      }

      Menu.buildFromTemplate(template).popup({ window });
    })();
  });
}

function attachExternalNavigationGuard(window: BrowserWindow) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const currentUrl = window.webContents.getURL();
    if (isSameDocumentNavigation(url, currentUrl)) {
      return;
    }

    if (isExternalUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#0f172a",
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachWindowUnloadGuard(mainWindow);
  attachContextMenu(mainWindow);
  attachExternalNavigationGuard(mainWindow);
  setMenuWindow(mainWindow);
  void rebuildApplicationMenu();

  mainWindow.on("focus", () => {
    setMenuWindow(mainWindow);
  });

  mainWindow.on("closed", () => {
    setMenuWindow(null);
    mainWindow = null;
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  const appIcon = nativeImage.createFromPath(getWindowIconPath());
  if (process.platform === "darwin" && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }

  registerFileIpc();
  registerExportIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
