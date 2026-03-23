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

type ThemePreference = "light" | "dark" | "system";

type AppSettings = {
  theme: ThemePreference;
  reopenLastFile: boolean;
};

type OpenedFile = {
  filePath: string;
  title: string;
  content: string;
};

type DragFile = File & {
  path?: string;
};

const MARKDOWN_FILE_PATTERN = /\.(md|markdown)$/i;
const defaultSettings: AppSettings = {
  theme: "system",
  reopenLastFile: false,
};
const DEFAULT_MESSAGE = "准备就绪";

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

function getSystemThemePreference() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemePreference, systemTheme: "light" | "dark") {
  return theme === "system" ? systemTheme : theme;
}

export function App() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemThemePreference());
  const [isInitialized, setIsInitialized] = useState(false);
  const dragDepthRef = useRef(0);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const filePath = useDocumentStore((state) => state.filePath);
  const title = useDocumentStore((state) => state.title);
  const content = useDocumentStore((state) => state.content);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const lastSavedAt = useDocumentStore((state) => state.lastSavedAt);
  const lastAutosavedAt = useDocumentStore((state) => state.lastAutosavedAt);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setContent = useDocumentStore((state) => state.setContent);

  const resolvedTheme = useMemo(() => resolveTheme(settings.theme, systemTheme), [settings.theme, systemTheme]);
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  const previewHtml = useMemo(() => preparePreviewHtml(rendered.html, filePath), [filePath, rendered.html]);
  const exportHtml = useMemo(
    () =>
      buildExportHtml({
        title,
        html: previewHtml,
        toc: rendered.toc,
        theme: resolvedTheme,
      }),
    [previewHtml, rendered.toc, resolvedTheme, title],
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

  const persistSettings = useCallback(async (payload: Partial<AppSettings>) => {
    const nextSettings = await window.electronApi.updateAppSettings(payload);
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  const handleThemePreferenceChange = useCallback(
    async (nextTheme: ThemePreference) => {
      try {
        await persistSettings({ theme: nextTheme });
        setMessage(nextTheme === "system" ? "主题已设置为跟随系统" : `主题已切换为${nextTheme === "light" ? "浅色" : "深色"}`);
      } catch (error) {
        setMessage(`主题设置失败：${getErrorMessage(error)}`);
      }
    },
    [persistSettings],
  );

  const handleToggleReopenLastFile = useCallback(
    async (enabled: boolean) => {
      try {
        await persistSettings({ reopenLastFile: enabled });
        setMessage(enabled ? "已开启启动恢复上次文件" : "已关闭启动恢复上次文件");
      } catch (error) {
        setMessage(`启动设置失败：${getErrorMessage(error)}`);
      }
    },
    [persistSettings],
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
        return false;
      }

      applyOpenedFile(file);
      await refreshRecentFiles();
      setMessage(`${successMessagePrefix} ${file.title}`);
      return true;
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
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");

    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

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
  }, [content, filePath, isInitialized, setDocument]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [draft, files, nextSettings, lastOpenedFilePath] = await Promise.all([
          window.electronApi.readRecoveryDraft(),
          window.electronApi.getRecentFiles(),
          window.electronApi.getAppSettings(),
          window.electronApi.getLastOpenedFilePath(),
        ]);

        if (cancelled) {
          return;
        }

        setRecentFiles(files);
        setSettings(nextSettings);

        if (nextSettings.reopenLastFile && lastOpenedFilePath) {
          if (draft?.content && draft.filePath && draft.filePath === lastOpenedFilePath) {
            setDocument({
              content: draft.content,
              filePath: draft.filePath,
              title: buildRecoveredTitle(draft.filePath),
              isDirty: true,
              lastSavedAt: null,
            });
            setMessage("已恢复上次编辑内容");
            return;
          }

          try {
            const opened = await openFileByPath(lastOpenedFilePath, "已恢复上次文件");
            if (opened || cancelled) {
              return;
            }
          } catch {
            // ignore and fall back to draft recovery
          }
        }

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
        if (!cancelled) {
          setMessage(`初始化失败：${getErrorMessage(error)}`);
        }
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openFileByPath, setDocument]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (message === DEFAULT_MESSAGE) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(DEFAULT_MESSAGE);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [message]);

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

  const handleSelectTocItem = useCallback((id: string) => {
    const container = previewRef.current;
    if (!container) {
      return;
    }

    const heading = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!heading) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const nextTop = container.scrollTop + (headingRect.top - containerRect.top) - 24;

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
    setActiveTocId(id);
  }, []);

  useEffect(() => {
    return window.electronApi.onMenuAction((action) => {
      switch (action.type) {
        case "file:new":
          handleNew();
          break;
        case "file:open":
          void handleOpen();
          break;
        case "file:save":
          void handleSave(false);
          break;
        case "file:save-as":
          void handleSave(true);
          break;
        case "file:export-html":
          void handleExport("html");
          break;
        case "file:export-pdf":
          void handleExport("pdf");
          break;
        case "file:open-recent":
          void handleOpenRecent(action.filePath);
          break;
        case "settings:set-theme":
          void handleThemePreferenceChange(action.theme);
          break;
        case "settings:set-reopen-last-file":
          void handleToggleReopenLastFile(action.enabled);
          break;
      }
    });
  }, [handleExport, handleNew, handleOpen, handleOpenRecent, handleSave, handleThemePreferenceChange, handleToggleReopenLastFile]);

  return (
    <div
      className="app-shell"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar
        currentFilePath={filePath}
        recentFiles={recentFiles}
        reopenLastFile={settings.reopenLastFile}
        theme={resolvedTheme}
        themePreference={settings.theme}
        title={title}
        onNew={handleNew}
        onOpen={handleOpen}
        onOpenRecentFile={(targetFilePath) => void handleOpenRecent(targetFilePath)}
        onSave={() => void handleSave(false)}
        onSaveAs={() => void handleSave(true)}
        onExportHtml={() => void handleExport("html")}
        onExportPdf={() => void handleExport("pdf")}
        onThemePreferenceChange={(nextTheme) => void handleThemePreferenceChange(nextTheme)}
        onToggleReopenLastFile={(enabled) => void handleToggleReopenLastFile(enabled)}
        onToggleTheme={() => void handleThemePreferenceChange(resolvedTheme === "light" ? "dark" : "light")}
      />

      <main className="workspace">
        <div className="workspace__content">
          <EditorPane value={content} theme={resolvedTheme} onChange={setContent} />
          <PreviewPane html={previewHtml} containerRef={previewRef} onActiveHeadingChange={setActiveTocId} onNotify={setMessage} />
        </div>
        <div className="sidebar">
          <TocPanel toc={rendered.toc} activeId={activeTocId} onSelect={handleSelectTocItem} />
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

      {message !== DEFAULT_MESSAGE ? <div className="toast">{message}</div> : null}
      {isDragActive ? <div className="drop-overlay">拖拽 Markdown 文件到这里打开</div> : null}
    </div>
  );
}
