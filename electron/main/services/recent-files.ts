import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

type DraftPayload = {
  content: string;
  filePath: string | null;
};

type LocalStore = {
  recentFiles: string[];
  draft: DraftPayload | null;
};

const storePath = path.join(app.getPath("userData"), "mdshare-store.json");

async function readStore(): Promise<LocalStore> {
  try {
    const content = await fs.readFile(storePath, "utf-8");
    const parsed = JSON.parse(content) as Partial<LocalStore>;

    return {
      recentFiles: Array.isArray(parsed.recentFiles) ? parsed.recentFiles : [],
      draft: parsed.draft ?? null,
    };
  } catch {
    return {
      recentFiles: [],
      draft: null,
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

export async function saveRecoveryDraft(payload: DraftPayload) {
  const store = await readStore();
  await writeStore({ ...store, draft: payload });
}

export async function readRecoveryDraft() {
  const store = await readStore();
  return store.draft;
}

