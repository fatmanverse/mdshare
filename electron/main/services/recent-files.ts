import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export type ThemePreference = "light" | "dark" | "system";
export type RenderStylePreference = "default" | "compact" | "article";
export type ExportPresetPreference = "default-doc" | "sop" | "share-article";

export type DraftPayload = {
  content: string;
  filePath: string | null;
};

export type AppSettings = {
  theme: ThemePreference;
  reopenLastFile: boolean;
  renderStyle: RenderStylePreference;
  exportPreset: ExportPresetPreference;
  showPreview: boolean;
  autoSave: boolean;
};

type LocalStore = {
  recentFiles: string[];
  draft: DraftPayload | null;
  settings: AppSettings;
  lastOpenedFilePath: string | null;
};

const storePath = path.join(app.getPath("userData"), "mdshare-store.json");

const defaultSettings: AppSettings = {
  theme: "system",
  reopenLastFile: false,
  renderStyle: "default",
  exportPreset: "default-doc",
  showPreview: true,
  autoSave: false,
};

function normalizeSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  const renderStyle =
    value?.renderStyle === "default" || value?.renderStyle === "compact" || value?.renderStyle === "article"
      ? value.renderStyle
      : defaultSettings.renderStyle;

  const exportPreset =
    value?.exportPreset === "default-doc" || value?.exportPreset === "sop" || value?.exportPreset === "share-article"
      ? value.exportPreset
      : renderStyle === "compact"
        ? "sop"
        : renderStyle === "article"
          ? "share-article"
          : defaultSettings.exportPreset;

  return {
    theme: value?.theme === "light" || value?.theme === "dark" || value?.theme === "system" ? value.theme : defaultSettings.theme,
    reopenLastFile: typeof value?.reopenLastFile === "boolean" ? value.reopenLastFile : defaultSettings.reopenLastFile,
    renderStyle: exportPreset === "sop" ? "compact" : exportPreset === "share-article" ? "article" : "default",
    exportPreset,
    showPreview: typeof value?.showPreview === "boolean" ? value.showPreview : defaultSettings.showPreview,
    autoSave: typeof value?.autoSave === "boolean" ? value.autoSave : defaultSettings.autoSave,
  };
}

async function readStore(): Promise<LocalStore> {
  try {
    const content = await fs.readFile(storePath, "utf-8");
    const parsed = JSON.parse(content) as Partial<LocalStore>;

    return {
      recentFiles: Array.isArray(parsed.recentFiles) ? parsed.recentFiles : [],
      draft: parsed.draft ?? null,
      settings: normalizeSettings(parsed.settings),
      lastOpenedFilePath: typeof parsed.lastOpenedFilePath === "string" ? parsed.lastOpenedFilePath : null,
    };
  } catch {
    return {
      recentFiles: [],
      draft: null,
      settings: defaultSettings,
      lastOpenedFilePath: null,
    };
  }
}

async function writeStore(store: LocalStore) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

export async function addRecentFile(filePath: string) {
  const store = await readStore();
  const nextRecentFiles = [filePath, ...store.recentFiles.filter((item) => item !== filePath)].slice(0, 10);
  await writeStore({ ...store, recentFiles: nextRecentFiles });
}

export async function getRecentFiles() {
  const store = await readStore();
  return store.recentFiles;
}

export async function removeRecentFile(filePath: string) {
  const store = await readStore();
  const recentFiles = store.recentFiles.filter((item) => item !== filePath);
  const lastOpenedFilePath = store.lastOpenedFilePath === filePath ? null : store.lastOpenedFilePath;
  await writeStore({ ...store, recentFiles, lastOpenedFilePath });
}

export async function clearRecentFiles() {
  const store = await readStore();
  await writeStore({ ...store, recentFiles: [], lastOpenedFilePath: null });
}

export async function saveRecoveryDraft(payload: DraftPayload) {
  const store = await readStore();
  await writeStore({ ...store, draft: payload });
}

export async function readRecoveryDraft() {
  const store = await readStore();
  return store.draft;
}

export async function getAppSettings() {
  const store = await readStore();
  return store.settings;
}

export async function updateAppSettings(payload: Partial<AppSettings>) {
  const store = await readStore();
  const settings = normalizeSettings({ ...store.settings, ...payload });
  await writeStore({ ...store, settings });
  return settings;
}

export async function getLastOpenedFilePath() {
  const store = await readStore();
  return store.lastOpenedFilePath;
}

export async function saveLastOpenedFilePath(filePath: string | null) {
  const store = await readStore();
  await writeStore({ ...store, lastOpenedFilePath: filePath });
}
