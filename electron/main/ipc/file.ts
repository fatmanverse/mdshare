import { clipboard, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import {
  addRecentFile,
  clearRecentFiles,
  getAppSettings,
  getLastOpenedFilePath,
  getRecentFiles,
  readRecoveryDraft,
  removeRecentFile,
  saveLastOpenedFilePath,
  saveRecoveryDraft,
  updateAppSettings,
} from "../services/recent-files.js";
import {
  buildPastedImageAssetDir,
  getFittedImageSize,
  normalizeRelativePath,
  resolveNextPastedImagePath,
} from "../services/pasted-images.js";
import { rebuildApplicationMenu } from "../menu.js";
import { findMissingLocalAssetSources } from "../services/markdown-assets.js";

type SavePayload = {
  filePath: string | null;
  content: string;
  suggestedName?: string;
};

type SavePastedImagePayload = {
  markdownFilePath: string;
};

type PickLocalImagePayload = {
  markdownFilePath: string | null;
};

type ValidateLocalImageSourcesPayload = {
  markdownFilePath: string;
  sources: string[];
};

type OpenFileResult = {
  filePath: string;
  title: string;
  content: string;
};

type SettingsPayload = {
  theme?: "light" | "dark" | "system";
  reopenLastFile?: boolean;
  renderStyle?: "default" | "compact" | "article";
  exportPreset?: "default-doc" | "sop" | "share-article";
  showPreview?: boolean;
  autoSave?: boolean;
};

const MARKDOWN_FILE_PATTERN = /\.(md|markdown)$/i;
const LOCAL_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"];

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

function buildImportedImageBaseName(filePath: string) {
  const baseName = path.basename(filePath, path.extname(filePath)).trim();
  const sanitizedBaseName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return sanitizedBaseName.length > 0 ? sanitizedBaseName : "image";
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function resolveImportedImagePath(assetDir: string, sourceFilePath: string) {
  if (path.resolve(path.dirname(sourceFilePath)) === path.resolve(assetDir)) {
    return sourceFilePath;
  }

  const extension = path.extname(sourceFilePath).toLowerCase() || ".png";
  const baseName = buildImportedImageBaseName(sourceFilePath);

  let index = 1;
  while (true) {
    const suffix = index === 1 ? "" : `-${index}`;
    const outputPath = path.join(assetDir, `${baseName}${suffix}${extension}`);
    if (!(await fileExists(outputPath))) {
      return outputPath;
    }

    index += 1;
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

  ipcMain.handle("file:remove-recent", async (_event, filePath: string) => {
    if (!filePath) {
      return { ok: true };
    }

    await removeRecentFile(filePath);
    await rebuildApplicationMenu();
    return { ok: true } as const;
  });

  ipcMain.handle("file:clear-recent", async () => {
    await clearRecentFiles();
    await rebuildApplicationMenu();
    return { ok: true } as const;
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

  ipcMain.handle("file:validate-local-image-sources", async (_event, payload: ValidateLocalImageSourcesPayload) => {
    if (!payload.markdownFilePath) {
      return [];
    }

    assertMarkdownFile(payload.markdownFilePath);
    return findMissingLocalAssetSources(payload.markdownFilePath, payload.sources);
  });

  ipcMain.handle("file:pick-local-image", async (_event, payload: PickLocalImagePayload) => {
    if (!payload.markdownFilePath) {
      throw new Error("请先保存当前 Markdown 文档，再插入本地图片");
    }

    assertMarkdownFile(payload.markdownFilePath);

    const result = await dialog.showOpenDialog({
      title: "选择本地图片",
      filters: [{ name: "图片", extensions: LOCAL_IMAGE_EXTENSIONS }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourceFilePath = result.filePaths[0];
    const assetDir = buildPastedImageAssetDir(payload.markdownFilePath);

    await fs.mkdir(assetDir, { recursive: true });
    const outputPath = await resolveImportedImagePath(assetDir, sourceFilePath);

    if (path.resolve(sourceFilePath) !== path.resolve(outputPath)) {
      await fs.copyFile(sourceFilePath, outputPath);
    }

    return {
      filePath: outputPath,
      relativePath: normalizeRelativePath(path.relative(path.dirname(payload.markdownFilePath), outputPath)),
    };
  });

  ipcMain.handle("file:save-pasted-image", async (_event, payload: SavePastedImagePayload) => {
    if (!payload.markdownFilePath) {
      return null;
    }

    assertMarkdownFile(payload.markdownFilePath);

    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return null;
    }

    const originalSize = image.getSize();
    const fittedSize = getFittedImageSize(originalSize.width, originalSize.height);
    const optimizedImage = fittedSize.resized
      ? image.resize({ width: fittedSize.width, height: fittedSize.height, quality: "good" })
      : image;

    const assetDir = buildPastedImageAssetDir(payload.markdownFilePath);

    await fs.mkdir(assetDir, { recursive: true });
    const outputPath = await resolveNextPastedImagePath(assetDir);

    await fs.writeFile(outputPath, optimizedImage.toPNG());

    return {
      filePath: outputPath,
      relativePath: normalizeRelativePath(path.relative(path.dirname(payload.markdownFilePath), outputPath)),
    };
  });

  ipcMain.handle("file:get-recent", async () => getRecentFiles());
  ipcMain.handle("file:get-last-opened", async () => getLastOpenedFilePath());
  ipcMain.handle("file:read-draft", async () => readRecoveryDraft());
  ipcMain.handle("file:save-draft", async (_event, payload: { content: string; filePath: string | null }) => {
    await saveRecoveryDraft(payload);
    return { ok: true } as const;
  });
  ipcMain.handle("settings:get", async () => getAppSettings());
  ipcMain.handle("settings:update", async (_event, payload: SettingsPayload) => {
    const nextSettings = await updateAppSettings(payload);
    await rebuildApplicationMenu();
    return nextSettings;
  });
}
