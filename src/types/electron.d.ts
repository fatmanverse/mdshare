export {};

declare global {
  type ElectronMenuAction =
    | { type: "file:new" }
    | { type: "file:open" }
    | { type: "file:save" }
    | { type: "file:save-as" }
    | { type: "file:export-html" }
    | { type: "file:export-pdf" }
    | { type: "file:open-recent"; filePath: string }
    | { type: "settings:set-theme"; theme: "light" | "dark" | "system" }
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

  interface Window {
    electronApi: {
      openFile: () => Promise<{ filePath: string; title: string; content: string } | null>;
      openFileByPath: (filePath: string) => Promise<{ filePath: string; title: string; content: string } | null>;
      openRecentFile: (filePath: string) => Promise<{ filePath: string; title: string; content: string } | null>;
      removeRecentFile: (filePath: string) => Promise<{ ok: true }>;
      clearRecentFiles: () => Promise<{ ok: true }>;
      saveFile: (payload: {
        filePath: string | null;
        content: string;
        suggestedName?: string;
      }) => Promise<{ filePath: string; title: string } | null>;
      saveFileAs: (payload: {
        filePath: string | null;
        content: string;
        suggestedName?: string;
      }) => Promise<{ filePath: string; title: string } | null>;
      savePastedImage: (payload: { markdownFilePath: string }) => Promise<{ filePath: string; relativePath: string } | null>;
      pickLocalImage: (payload: { markdownFilePath: string | null }) => Promise<{ filePath: string; relativePath: string } | null>;
      validateLocalImageSources: (payload: { markdownFilePath: string; sources: string[] }) => Promise<string[]>;
      getRecentFiles: () => Promise<string[]>;
      getLastOpenedFilePath: () => Promise<string | null>;
      readRecoveryDraft: () => Promise<{ filePath: string | null; content: string } | null>;
      saveRecoveryDraft: (payload: { filePath: string | null; content: string }) => Promise<{ ok: true }>;
      getAppSettings: () => Promise<{ theme: "light" | "dark" | "system"; reopenLastFile: boolean; renderStyle: "default" | "compact" | "article"; exportPreset: "default-doc" | "sop" | "share-article"; showPreview: boolean; autoSave: boolean }>;
      updateAppSettings: (payload: {
        theme?: "light" | "dark" | "system";
        reopenLastFile?: boolean;
        renderStyle?: "default" | "compact" | "article";
        exportPreset?: "default-doc" | "sop" | "share-article";
        showPreview?: boolean;
        autoSave?: boolean;
      }) => Promise<{ theme: "light" | "dark" | "system"; reopenLastFile: boolean; renderStyle: "default" | "compact" | "article"; exportPreset: "default-doc" | "sop" | "share-article"; showPreview: boolean; autoSave: boolean }>;
      copyText: (text: string) => Promise<{ ok: true }>;
      readClipboardImageDataUrl: () => Promise<string | null>;
      exportHtml: (payload: {
        title: string;
        html: string;
        markdownFilePath: string | null;
      }) => Promise<{ filePath: string } | null>;
      exportPdf: (payload: {
        title: string;
        html: string;
        markdownFilePath: string | null;
      }) => Promise<{ filePath: string } | null>;
      onMenuAction: (listener: (action: ElectronMenuAction) => void) => () => void;
    };
  }
}
