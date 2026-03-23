import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { EditorPane } from "../components/EditorPane";
import { PreviewPane } from "../components/PreviewPane";
import { RecentFilesPanel } from "../components/RecentFilesPanel";
import { StatusBar } from "../components/StatusBar";
import { TocPanel } from "../components/TocPanel";
import { Toolbar } from "../components/Toolbar";
import { preparePreviewHtml } from "../lib/markdown/images";
import { renderMarkdown } from "../lib/markdown/parser";
import { buildExportHtml } from "../lib/markdown/template";
import { useDocumentStore } from "./store/document-store";

type OpenedFile = {
  filePath: string;
  title: string;
  content: string;
};

type DragFile = File & {
  path?: string;
};

const MARKDOWN_FILE_PATTERN = /\.(md|markdown)$/i;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "发生未知错误";
}

function buildRecoveredTitle(filePath: string | null) {
  if (!filePath) {
    return "Recovered";
  }

  return filePath.split(/[\\/]/).pop()?.replace(/\.md$/, "") ?? "Recovered";
}

function getDroppedMarkdownPath(dataTransfer: DataTransfer) {
  const files = Array.from(dataTransfer.files) as DragFile[];
  const markdownFile = files.find((file) => file.path && MARKDOWN_FILE_PATTERN.test(file.path));
  return markdownFile?.path ?? null;
}

function hasFileTransfer(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes("Files");
}

export function App() {
  const [message, setMessage] = useState("准备就绪");
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  const filePath = useDocumentStore((state) => state.filePath);
  const title = useDocumentStore((state) => state.title);
  const content = useDocumentStore((state) => state.content);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const theme = useDocumentStore((state) => state.theme);
  const lastSavedAt = useDocumentStore((state) => state.lastSavedAt);
  const lastAutosavedAt = useDocumentStore((state) => state.lastAutosavedAt);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setContent = useDocumentStore((state) => state.setContent);
  const setTheme = useDocumentStore((state) => state.setTheme);

  const rendered = useMemo(() => renderMarkdown(content), [content]);
  const previewHtml = useMemo(() => preparePreviewHtml(rendered.html, filePath), [filePath, rendered.html]);
  const exportHtml = useMemo(
    () =>
      buildExportHtml({
        title,
        html: previewHtml,
        toc: rendered.toc,
        theme,
      }),
    [previewHtml, rendered.toc, theme, title],
  );

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lines = content.split("\n").length;

  const refreshRecentFiles = useCallback(async () => {
    const files = await window.electronApi.getRecentFiles();
    setRecentFiles(files);
  }, []);

  const applyOpenedFile = useCallback(
    (file: OpenedFile) => {
      setDocument({
        filePath: file.filePath,
        title: file.title,
        content: file.content,
        isDirty: false,
        lastSavedAt: Date.now(),
        lastAutosavedAt: null,
      });
    },
    [setDocument],
  );

  const confirmDiscardChanges = useCallback(
    (actionLabel: string) => {
      if (!isDirty) {
        return true;
      }

      return window.confirm(`当前文档有未保存修改，确认继续${actionLabel}吗？`);
    },
    [isDirty],
  );

  const handleNew = useCallback(() => {
    if (!confirmDiscardChanges("新建文档")) {
      return;
    }

    setDocument({
      filePath: null,
      title: "Untitled",
      content: "# 新文档\n\n开始写作吧。\n",
      isDirty: false,
      lastSavedAt: null,
      lastAutosavedAt: null,
    });
    setMessage("已新建文档");
  }, [confirmDiscardChanges, setDocument]);

  const openFileByPath = useCallback(
    async (targetFilePath: string, successMessagePrefix = "已打开") => {
      const file = await window.electronApi.openFileByPath(targetFilePath);
      if (!file) {
        return;
      }

      applyOpenedFile(file);
      await refreshRecentFiles();
      setMessage(`${successMessagePrefix} ${file.title}`);
    },
    [applyOpenedFile, refreshRecentFiles],
  );

  const handleOpen = useCallback(async () => {
    if (!confirmDiscardChanges("打开其他文件")) {
      return;
    }

    try {
      const file = await window.electronApi.openFile();
      if (!file) {
        return;
      }

      applyOpenedFile(file);
      await refreshRecentFiles();
      setMessage(`已打开 ${file.title}`);
    } catch (error) {
      setMessage(`打开失败：${getErrorMessage(error)}`);
    }
  }, [applyOpenedFile, confirmDiscardChanges, refreshRecentFiles]);

  const handleOpenRecent = useCallback(
    async (targetFilePath: string) => {
      if (!confirmDiscardChanges("打开最近文件")) {
        return;
      }

      try {
        await openFileByPath(targetFilePath);
      } catch (error) {
        setMessage(`打开最近文件失败：${getErrorMessage(error)}`);
      }
    },
    [confirmDiscardChanges, openFileByPath],
  );

  const handleSave = useCallback(
    async (saveAs = false) => {
      const payload = {
        filePath: saveAs ? null : filePath,
        content,
        suggestedName: `${title || "untitled"}.md`,
      };

      try {
        const result = saveAs
          ? await window.electronApi.saveFileAs(payload)
          : await window.electronApi.saveFile(payload);
        if (!result) {
          return;
        }

        setDocument({
          filePath: result.filePath,
          title: result.title,
          isDirty: false,
          lastSavedAt: Date.now(),
        });
        await refreshRecentFiles();
        setMessage(`已保存 ${result.title}`);
      } catch (error) {
        setMessage(`保存失败：${getErrorMessage(error)}`);
      }
    },
    [content, filePath, refreshRecentFiles, setDocument, title],
  );

  const handleExport = useCallback(
    async (kind: "html" | "pdf") => {
      const payload = {
        title,
        html: exportHtml,
        markdownFilePath: filePath,
      };

      try {
        const result =
          kind === "html"
            ? await window.electronApi.exportHtml(payload)
            : await window.electronApi.exportPdf(payload);
        if (!result) {
          return;
        }

        setMessage(`已导出 ${kind.toUpperCase()}：${result.filePath}`);
      } catch (error) {
        setMessage(`导出失败：${getErrorMessage(error)}`);
      }
    },
    [exportHtml, filePath, title],
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      if (!hasFileTransfer(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragActive(false);

      const droppedFilePath = getDroppedMarkdownPath(event.dataTransfer);
      if (!droppedFilePath) {
        setMessage("仅支持拖拽 .md 或 .markdown 文件");
        return;
      }

      if (!confirmDiscardChanges("拖拽打开文件")) {
        return;
      }

      try {
        await openFileByPath(droppedFilePath, "已拖拽打开");
      } catch (error) {
        setMessage(`拖拽打开失败：${getErrorMessage(error)}`);
      }
    },
    [confirmDiscardChanges, openFileByPath],
  );

  useEffect(() => {
    setDocument({ html: rendered.html, toc: rendered.toc });
  }, [rendered.html, rendered.toc, setDocument]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        await window.electronApi.saveRecoveryDraft({
          filePath,
          content,
        });
        setDocument({ lastAutosavedAt: Date.now() });
      } catch {
        setMessage("自动保存失败");
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [content, filePath, setDocument]);

  useEffect(() => {
    void (async () => {
      try {
        const [draft, files] = await Promise.all([
          window.electronApi.readRecoveryDraft(),
          window.electronApi.getRecentFiles(),
        ]);

        setRecentFiles(files);

        if (draft?.content) {
          setDocument({
            content: draft.content,
            filePath: draft.filePath,
            title: buildRecoveredTitle(draft.filePath),
            isDirty: true,
            lastSavedAt: null,
          });
          setMessage("已恢复上次草稿");
        }
      } catch (error) {
        setMessage(`初始化失败：${getErrorMessage(error)}`);
      }
    })();
  }, [setDocument]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const withModifier = event.metaKey || event.ctrlKey;
      if (!withModifier) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        void handleSave(event.shiftKey);
        return;
      }

      if (key === "o") {
        event.preventDefault();
        void handleOpen();
        return;
      }

      if (key === "n") {
        event.preventDefault();
        handleNew();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNew, handleOpen, handleSave]);

  return (
    <div
      className="app-shell"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar
        title={title}
        theme={theme}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={() => void handleSave(false)}
        onSaveAs={() => void handleSave(true)}
        onExportHtml={() => void handleExport("html")}
        onExportPdf={() => void handleExport("pdf")}
        onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
      />

      <main className="workspace">
        <div className="workspace__content">
          <EditorPane value={content} theme={theme} onChange={setContent} />
          <PreviewPane html={previewHtml} />
        </div>
        <div className="sidebar">
          <TocPanel toc={rendered.toc} />
          <RecentFilesPanel currentFilePath={filePath} files={recentFiles} onOpenFile={handleOpenRecent} />
        </div>
      </main>

      <StatusBar
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        lastAutosavedAt={lastAutosavedAt}
        words={words}
        lines={lines}
      />

      <div className="toast">{message}</div>
      {isDragActive ? <div className="drop-overlay">拖拽 Markdown 文件到这里打开</div> : null}
    </div>
  );
}
