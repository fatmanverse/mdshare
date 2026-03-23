import { create } from "zustand";

type ThemeMode = "light" | "dark";

type DocumentStore = {
  filePath: string | null;
  title: string;
  content: string;
  html: string;
  toc: Array<{ id: string; text: string; level: number }>;
  isDirty: boolean;
  theme: ThemeMode;
  lastSavedAt: number | null;
  lastAutosavedAt: number | null;
  setDocument: (payload: Partial<DocumentStore>) => void;
  setContent: (content: string) => void;
  setTheme: (theme: ThemeMode) => void;
};

export const useDocumentStore = create<DocumentStore>((set) => ({
  filePath: null,
  title: "Untitled",
  content: "# 欢迎使用 mdshare\n\n在左侧输入 Markdown，在右侧查看成品预览。\n\n- 支持标题\n- 支持列表\n- 支持代码块\n\n```ts\nconsole.log('mdshare');\n```\n",
  html: "",
  toc: [],
  isDirty: false,
  theme: "light",
  lastSavedAt: null,
  lastAutosavedAt: null,
  setDocument: (payload) => set((state) => ({ ...state, ...payload })),
  setContent: (content) => set((state) => ({ content, isDirty: true })),
  setTheme: (theme) => set(() => ({ theme })),
}));

