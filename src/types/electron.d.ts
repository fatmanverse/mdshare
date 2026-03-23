export {};

declare global {
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
      readRecoveryDraft: () => Promise<{ filePath: string | null; content: string } | null>;
      saveRecoveryDraft: (payload: { filePath: string | null; content: string }) => Promise<{ ok: true }>;
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
    };
  }
}
