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
    | { type: "settings:set-reopen-last-file"; enabled: boolean };

  interface Window {
    electronApi: {
      openFile: () => Promise<{ filePath: string; title: string; content: string } | null>;
      openFileByPath: (filePath: string) => Promise<{ filePath: string; title: string; content: string } | null>;
      openRecentFile: (filePath: string) => Promise<{ filePath: string; title: string; content: string } | null>;
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
      getRecentFiles: () => Promise<string[]>;
      getLastOpenedFilePath: () => Promise<string | null>;
      readRecoveryDraft: () => Promise<{ filePath: string | null; content: string } | null>;
      saveRecoveryDraft: (payload: { filePath: string | null; content: string }) => Promise<{ ok: true }>;
      getAppSettings: () => Promise<{ theme: "light" | "dark" | "system"; reopenLastFile: boolean }>;
      updateAppSettings: (payload: {
        theme?: "light" | "dark" | "system";
        reopenLastFile?: boolean;
      }) => Promise<{ theme: "light" | "dark" | "system"; reopenLastFile: boolean }>;
      copyText: (text: string) => Promise<{ ok: true }>;
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
