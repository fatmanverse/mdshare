import { dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import {
  addRecentFile,
  getAppSettings,
  getLastOpenedFilePath,
  getRecentFiles,
  readRecoveryDraft,
  saveLastOpenedFilePath,
  saveRecoveryDraft,
  updateAppSettings,
} from "../services/recent-files.js";
import { rebuildApplicationMenu } from "../menu.js";

type SavePayload = {
  filePath: string | null;
  content: string;
  suggestedName?: string;
};

type OpenFileResult = {
  filePath: string;
  title: string;
  content: string;
};

type SettingsPayload = {
  theme?: "light" | "dark" | "system";
  reopenLastFile?: boolean;
};

const MARKDOWN_FILE_PATTERN = /\.(md|markdown)$/i;

function buildTitle(filePath: string | null) {
  if (!filePath) {
    return "Untitled";
  }

  return path.basename(filePath, path.extname(filePath));
}

function assertMarkdownFile(filePath: string) {
  if (!MARKDOWN_FILE_PATTERN.test(filePath)) {
    throw new Error("仅支持打开 Markdown 文件");
  }
}

async function readMarkdownFile(filePath: string): Promise<OpenFileResult> {
  assertMarkdownFile(filePath);

  const content = await fs.readFile(filePath, "utf-8");
  await addRecentFile(filePath);
  await saveLastOpenedFilePath(filePath);
  await rebuildApplicationMenu();

  return {
    filePath,
    title: buildTitle(filePath),
    content,
  };
}

export function registerFileIpc() {
  ipcMain.handle("file:open", async () => {
    const result = await dialog.showOpenDialog({
      title: "打开 Markdown 文件",
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return readMarkdownFile(result.filePaths[0]);
  });

  ipcMain.handle("file:open-by-path", async (_event, filePath: string) => {
    if (!filePath) {
      return null;
    }

    return readMarkdownFile(filePath);
  });

  ipcMain.handle("file:open-recent", async (_event, filePath: string) => {
    if (!filePath) {
      return null;
    }

    return readMarkdownFile(filePath);
  });

  ipcMain.handle("file:save", async (_event, payload: SavePayload) => {
    if (!payload.filePath) {
      return null;
    }

    await fs.writeFile(payload.filePath, payload.content, "utf-8");
    await addRecentFile(payload.filePath);
    await saveLastOpenedFilePath(payload.filePath);
    await rebuildApplicationMenu();

    return {
      filePath: payload.filePath,
      title: buildTitle(payload.filePath),
    };
  });

  ipcMain.handle("file:save-as", async (_event, payload: SavePayload) => {
    const result = await dialog.showSaveDialog({
      title: "另存为",
      defaultPath: payload.suggestedName ?? "untitled.md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, payload.content, "utf-8");
    await addRecentFile(result.filePath);
    await saveLastOpenedFilePath(result.filePath);
    await rebuildApplicationMenu();

    return {
      filePath: result.filePath,
      title: buildTitle(result.filePath),
    };
  });

  ipcMain.handle("file:get-recent", async () => getRecentFiles());
  ipcMain.handle("file:get-last-opened", async () => getLastOpenedFilePath());
  ipcMain.handle("file:read-draft", async () => readRecoveryDraft());
  ipcMain.handle("file:save-draft", async (_event, payload: { content: string; filePath: string | null }) => {
    await saveRecoveryDraft(payload);
    return { ok: true };
  });
  ipcMain.handle("settings:get", async () => getAppSettings());
  ipcMain.handle("settings:update", async (_event, payload: SettingsPayload) => {
    const nextSettings = await updateAppSettings(payload);
    await rebuildApplicationMenu();
    return nextSettings;
  });
}
