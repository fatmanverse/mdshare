import { app, BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { getAppSettings, getRecentFiles, type AppSettings, type ThemePreference } from "./services/recent-files.js";

export type NativeMenuAction =
  | { type: "file:new" }
  | { type: "file:open" }
  | { type: "file:save" }
  | { type: "file:save-as" }
  | { type: "file:export-html" }
  | { type: "file:export-pdf" }
  | { type: "file:open-recent"; filePath: string }
  | { type: "settings:set-theme"; theme: ThemePreference }
  | { type: "settings:set-reopen-last-file"; enabled: boolean }
  | { type: "settings:set-auto-save"; enabled: boolean }
  | { type: "editor:insert-code-block" }
  | { type: "editor:insert-table" }
  | { type: "editor:insert-task-list" }
  | { type: "editor:insert-image" }
  | { type: "editor:insert-local-image" }
  | { type: "editor:insert-mermaid-flowchart" }
  | { type: "editor:insert-mermaid-sequence" }
  | { type: "editor:insert-callout" }
  | { type: "editor:insert-divider" };

type BuildMenuOptions = {
  settings: AppSettings;
  recentFiles: string[];
  isDevelopment: boolean;
};

let menuWindow: BrowserWindow | null = null;

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function getTargetWindow() {
  return BrowserWindow.getFocusedWindow() ?? menuWindow;
}

function sendMenuAction(action: NativeMenuAction) {
  const targetWindow = getTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send("menu:action", action);
}

function buildRecentFilesSubmenu(recentFiles: string[]): MenuItemConstructorOptions[] {
  if (recentFiles.length === 0) {
    return [{ label: "暂无历史文件", enabled: false }];
  }

  return recentFiles.slice(0, 8).map((filePath) => ({
    label: getFileName(filePath),
    sublabel: filePath,
    toolTip: filePath,
    click: () => sendMenuAction({ type: "file:open-recent", filePath }),
  }));
}

export function buildMarkdownInsertSubmenu(sendAction: (action: NativeMenuAction) => void): MenuItemConstructorOptions[] {
  return [
    {
      label: "代码块",
      click: () => sendAction({ type: "editor:insert-code-block" }),
    },
    {
      label: "表格",
      click: () => sendAction({ type: "editor:insert-table" }),
    },
    {
      label: "任务列表",
      click: () => sendAction({ type: "editor:insert-task-list" }),
    },
    { type: "separator" },
    {
      label: "Mermaid 流程图",
      click: () => sendAction({ type: "editor:insert-mermaid-flowchart" }),
    },
    {
      label: "Mermaid 时序图",
      click: () => sendAction({ type: "editor:insert-mermaid-sequence" }),
    },
    {
      label: "提示块 Callout",
      click: () => sendAction({ type: "editor:insert-callout" }),
    },
    {
      label: "分隔线",
      click: () => sendAction({ type: "editor:insert-divider" }),
    },
    { type: "separator" },
    {
      label: "图片模板",
      click: () => sendAction({ type: "editor:insert-image" }),
    },
    {
      label: "本地图片...",
      click: () => sendAction({ type: "editor:insert-local-image" }),
    },
  ];
}

export function buildMenuTemplate(options: BuildMenuOptions): MenuItemConstructorOptions[] {
  const { settings, recentFiles, isDevelopment } = options;

  const fileMenu: MenuItemConstructorOptions = {
    label: "文件",
    submenu: [
      {
        label: "新建",
        accelerator: "CmdOrCtrl+N",
        click: () => sendMenuAction({ type: "file:new" }),
      },
      {
        label: "打开...",
        accelerator: "CmdOrCtrl+O",
        click: () => sendMenuAction({ type: "file:open" }),
      },
      {
        label: "打开最近",
        submenu: buildRecentFilesSubmenu(recentFiles),
      },
      { type: "separator" },
      {
        label: "保存",
        accelerator: "CmdOrCtrl+S",
        click: () => sendMenuAction({ type: "file:save" }),
      },
      {
        label: "另存为...",
        accelerator: "CmdOrCtrl+Shift+S",
        click: () => sendMenuAction({ type: "file:save-as" }),
      },
      { type: "separator" },
      {
        label: "导出",
        submenu: [
          {
            label: "HTML",
            accelerator: "CmdOrCtrl+Alt+H",
            click: () => sendMenuAction({ type: "file:export-html" }),
          },
          {
            label: "PDF",
            accelerator: "CmdOrCtrl+Alt+P",
            click: () => sendMenuAction({ type: "file:export-pdf" }),
          },
        ],
      },
      { type: "separator" },
      process.platform === "darwin" ? { role: "close" } : { role: "quit" },
    ],
  };

  const preferencesMenu: MenuItemConstructorOptions = {
    label: "偏好设置",
    submenu: [
      {
        label: "主题",
        submenu: [
          {
            label: "浅色",
            type: "radio",
            checked: settings.theme === "light",
            click: () => sendMenuAction({ type: "settings:set-theme", theme: "light" }),
          },
          {
            label: "深色",
            type: "radio",
            checked: settings.theme === "dark",
            click: () => sendMenuAction({ type: "settings:set-theme", theme: "dark" }),
          },
          {
            label: "跟随系统",
            type: "radio",
            checked: settings.theme === "system",
            click: () => sendMenuAction({ type: "settings:set-theme", theme: "system" }),
          },
        ],
      },
      { type: "separator" },
      {
        label: "启动时恢复上次文件",
        type: "checkbox",
        checked: settings.reopenLastFile,
        click: (menuItem) => {
          sendMenuAction({ type: "settings:set-reopen-last-file", enabled: menuItem.checked });
        },
      },
      {
        label: "自动保存已保存文件",
        type: "checkbox",
        checked: settings.autoSave,
        click: (menuItem) => {
          sendMenuAction({ type: "settings:set-auto-save", enabled: menuItem.checked });
        },
      },
    ],
  };

  const insertMenu: MenuItemConstructorOptions = {
    label: "插入",
    submenu: buildMarkdownInsertSubmenu(sendMenuAction),
  };

  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ];

  if (isDevelopment) {
    viewSubmenu.unshift(
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
    );
  }

  const helpMenu: MenuItemConstructorOptions = {
    role: "help",
    submenu: [
      {
        label: "项目主页",
        click: () => {
          void shell.openExternal("https://github.com/fatmanverse/mdshare");
        },
      },
    ],
  };

  return [
    ...(process.platform === "darwin" ? ([{ role: "appMenu" }] as MenuItemConstructorOptions[]) : []),
    fileMenu,
    { role: "editMenu" },
    insertMenu,
    preferencesMenu,
    { label: "视图", submenu: viewSubmenu },
    { role: "windowMenu" },
    helpMenu,
  ];
}

export function setMenuWindow(window: BrowserWindow | null) {
  menuWindow = window;
}

export async function rebuildApplicationMenu() {
  if (!app.isReady()) {
    return;
  }

  const [settings, recentFiles] = await Promise.all([getAppSettings(), getRecentFiles()]);
  const template = buildMenuTemplate({
    settings,
    recentFiles,
    isDevelopment: Boolean(process.env.VITE_DEV_SERVER_URL),
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
