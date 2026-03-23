import { clipboard, contextBridge, ipcRenderer } from "electron";

const electronApi = {
  openFile: () => ipcRenderer.invoke("file:open"),
  openFileByPath: (filePath: string) => ipcRenderer.invoke("file:open-by-path", filePath),
  openRecentFile: (filePath: string) => ipcRenderer.invoke("file:open-recent", filePath),
  saveFile: (payload: { filePath: string | null; content: string; suggestedName?: string }) => {
    if (!payload.filePath) {
      return ipcRenderer.invoke("file:save-as", payload);
    }

    return ipcRenderer.invoke("file:save", payload);
  },
  saveFileAs: (payload: { filePath: string | null; content: string; suggestedName?: string }) =>
    ipcRenderer.invoke("file:save-as", payload),
  getRecentFiles: () => ipcRenderer.invoke("file:get-recent"),
  getLastOpenedFilePath: () => ipcRenderer.invoke("file:get-last-opened"),
  readRecoveryDraft: () => ipcRenderer.invoke("file:read-draft"),
  saveRecoveryDraft: (payload: { filePath: string | null; content: string }) =>
    ipcRenderer.invoke("file:save-draft", payload),
  getAppSettings: () => ipcRenderer.invoke("settings:get"),
  updateAppSettings: (payload: { theme?: "light" | "dark" | "system"; reopenLastFile?: boolean }) =>
    ipcRenderer.invoke("settings:update", payload),
  copyText: async (text: string) => {
    clipboard.writeText(text);
    return { ok: true } as const;
  },
  onMenuAction: (
    listener: (action:
      | { type: "file:new" }
      | { type: "file:open" }
      | { type: "file:save" }
      | { type: "file:save-as" }
      | { type: "file:export-html" }
      | { type: "file:export-pdf" }
      | { type: "file:open-recent"; filePath: string }
      | { type: "settings:set-theme"; theme: "light" | "dark" | "system" }
      | { type: "settings:set-reopen-last-file"; enabled: boolean }) => void,
  ) => {
    const wrappedListener = (_event: Electron.IpcRendererEvent, action: Parameters<typeof listener>[0]) => {
      listener(action);
    };

    ipcRenderer.on("menu:action", wrappedListener);
    return () => {
      ipcRenderer.removeListener("menu:action", wrappedListener);
    };
  },
  exportHtml: (payload: { title: string; html: string; markdownFilePath: string | null }) =>
    ipcRenderer.invoke("export:html", payload),
  exportPdf: (payload: { title: string; html: string; markdownFilePath: string | null }) =>
    ipcRenderer.invoke("export:pdf", payload),
};

contextBridge.exposeInMainWorld("electronApi", electronApi);
