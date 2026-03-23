import { contextBridge, ipcRenderer } from "electron";

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
  readRecoveryDraft: () => ipcRenderer.invoke("file:read-draft"),
  saveRecoveryDraft: (payload: { filePath: string | null; content: string }) =>
    ipcRenderer.invoke("file:save-draft", payload),
  exportHtml: (payload: { title: string; html: string; markdownFilePath: string | null }) =>
    ipcRenderer.invoke("export:html", payload),
  exportPdf: (payload: { title: string; html: string; markdownFilePath: string | null }) =>
    ipcRenderer.invoke("export:pdf", payload),
};

contextBridge.exposeInMainWorld("electronApi", electronApi);
