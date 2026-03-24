import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { EditorPane, type EditorPaneHandle } from "../components/EditorPane";
import { DocumentHealthDialog } from "../components/DocumentHealthDialog";
import { PreviewPane } from "../components/PreviewPane";
import { RecentFilesPanel } from "../components/RecentFilesPanel";
import { StatusBar } from "../components/StatusBar";
import { TocPanel } from "../components/TocPanel";
import { Toolbar } from "../components/Toolbar";
import { buildDocumentDiagnostics, getLocalImageSources, type DocumentDiagnostic } from "../lib/markdown/diagnostics";
import { getExportPreset, type ExportPreset } from "../lib/markdown/export-preset";
import { preparePreviewHtml } from "../lib/markdown/images";
import { renderMermaidHtml } from "../lib/markdown/mermaid";
import { renderMarkdown } from "../lib/markdown/parser";
import type { RenderStyle } from "../lib/markdown/render-style";
import { buildExportHtml } from "../lib/markdown/template";
import { useDocumentStore } from "./store/document-store";

type ThemePreference = "light" | "dark" | "system";

type AppSettings = {
  theme: ThemePreference;
  reopenLastFile: boolean;
  renderStyle: RenderStyle;
  exportPreset: ExportPreset;
  showPreview: boolean;
  autoSave: boolean;
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
  renderStyle: "default",
  exportPreset: "default-doc",
  showPreview: true,
  autoSave: false,
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
  const [missingLocalImageSources, setMissingLocalImageSources] = useState<string[]>([]);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemThemePreference());
  const [isInitialized, setIsInitialized] = useState(false);
  const [healthCheckDialogState, setHealthCheckDialogState] = useState<{ mode: "manual" | "export"; exportKind?: "html" | "pdf" } | null>(null);
  const dragDepthRef = useRef(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorPaneHandle | null>(null);

  const filePath = useDocumentStore((state) => state.filePath);
  const title = useDocumentStore((state) => state.title);
  const content = useDocumentStore((state) => state.content);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const lastSavedAt = useDocumentStore((state) => state.lastSavedAt);
  const lastAutosavedAt = useDocumentStore((state) => state.lastAutosavedAt);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setContent = useDocumentStore((state) => state.setContent);

  const resolvedTheme = useMemo(() => resolveTheme(settings.theme, systemTheme), [settings.theme, systemTheme]);
  const activeExportPreset = useMemo(() => getExportPreset(settings.exportPreset), [settings.exportPreset]);
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  const previewHtml = useMemo(() => preparePreviewHtml(rendered.html, filePath), [filePath, rendered.html]);
  const buildPreparedExportHtml = useCallback(async () => {
    const mermaidRenderedHtml = await renderMermaidHtml(previewHtml, resolvedTheme);

    return buildExportHtml({
      title,
      html: mermaidRenderedHtml,
      toc: rendered.toc,
      theme: resolvedTheme,
      exportPreset: settings.exportPreset,
    });
  }, [previewHtml, rendered.toc, resolvedTheme, settings.exportPreset, title]);
  const diagnostics = useMemo(
    () =>
      buildDocumentDiagnostics({
        markdown: content,
        toc: rendered.toc,
        markdownFilePath: filePath,
        missingImageSources: missingLocalImageSources,
      }),
    [content, filePath, missingLocalImageSources, rendered.toc],
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

  const handleTogglePreview = useCallback(
    async (enabled: boolean) => {
      try {
        await persistSettings({ showPreview: enabled });
        if (!enabled) {
          setActiveTocId(null);
        }
        setMessage(enabled ? "已打开实时预览" : "已关闭实时预览");
      } catch (error) {
        setMessage(`预览开关设置失败：${getErrorMessage(error)}`);
      }
    },
    [persistSettings],
  );

  const handleToggleAutoSave = useCallback(
    async (enabled: boolean) => {
      try {
        await persistSettings({ autoSave: enabled });
        setMessage(enabled ? "已开启自动保存（仅对已保存文件生效）" : "已关闭自动保存");
      } catch (error) {
        setMessage(`自动保存设置失败：${getErrorMessage(error)}`);
      }
    },
    [persistSettings],
  );

  const handleExportPresetChange = useCallback(
    async (nextExportPreset: ExportPreset) => {
      if (nextExportPreset === settings.exportPreset) {
        return;
      }

      try {
        const nextPreset = getExportPreset(nextExportPreset);
        await persistSettings({ exportPreset: nextExportPreset, renderStyle: nextPreset.renderStyle });
        setMessage(`导出预设已切换为 ${nextPreset.label}`);
      } catch (error) {
        setMessage(`导出预设设置失败：${getErrorMessage(error)}`);
      }
    },
    [persistSettings, settings.exportPreset],
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

  const handleRemoveRecent = useCallback(
    async (targetFilePath: string) => {
      if (typeof window.electronApi.removeRecentFile !== "function") {
        setMessage("当前版本缺少最近历史删除接口，请重启应用");
        return;
      }

      try {
        await window.electronApi.removeRecentFile(targetFilePath);
        await refreshRecentFiles();
        const removedName = targetFilePath.split(/[\/]/).pop() ?? targetFilePath;
        setMessage(`已从最近历史移除 ${removedName}`);
      } catch (error) {
        setMessage(`移除最近历史失败：${getErrorMessage(error)}`);
      }
    },
    [refreshRecentFiles],
  );

  const handleClearRecent = useCallback(
    async () => {
      if (typeof window.electronApi.clearRecentFiles !== "function") {
        setMessage("当前版本缺少最近历史清空接口，请重启应用");
        return;
      }

      try {
        await window.electronApi.clearRecentFiles();
        await refreshRecentFiles();
        setMessage("已清空最近历史");
      } catch (error) {
        setMessage(`清空最近历史失败：${getErrorMessage(error)}`);
      }
    },
    [refreshRecentFiles],
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

  const runExport = useCallback(
    async (kind: "html" | "pdf") => {
      try {
        const payload = {
          title,
          html: await buildPreparedExportHtml(),
          markdownFilePath: filePath,
        };

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
    [buildPreparedExportHtml, filePath, title],
  );

  const openHealthCheckDialog = useCallback((mode: "manual" | "export", exportKind?: "html" | "pdf") => {
    setHealthCheckDialogState({ mode, exportKind });
  }, []);

  const closeHealthCheckDialog = useCallback(() => {
    setHealthCheckDialogState(null);
  }, []);

  const handleExport = useCallback(
    async (kind: "html" | "pdf") => {
      const blockingDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
      const warningDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");

      if (blockingDiagnostics.length > 0 || warningDiagnostics.length > 0) {
        openHealthCheckDialog("export", kind);
        return;
      }

      await runExport(kind);
    },
    [diagnostics, openHealthCheckDialog, runExport],
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
    let cancelled = false;
    const localImageSources = Array.from(new Set(getLocalImageSources(content).map((image) => image.source)));

    if (!filePath || localImageSources.length === 0) {
      setMissingLocalImageSources([]);
      return () => {
        cancelled = true;
      };
    }

    void window.electronApi
      .validateLocalImageSources({ markdownFilePath: filePath, sources: localImageSources })
      .then((missingSources) => {
        if (!cancelled) {
          setMissingLocalImageSources(missingSources);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMissingLocalImageSources([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content, filePath]);

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
    if (!isInitialized || !settings.autoSave || !filePath || !isDirty) {
      return;
    }

    const snapshot = {
      filePath,
      content,
      title,
    };

    const timer = window.setTimeout(async () => {
      try {
        const result = await window.electronApi.saveFile({
          filePath: snapshot.filePath,
          content: snapshot.content,
          suggestedName: `${snapshot.title || "untitled"}.md`,
        });
        if (!result) {
          return;
        }

        const latestDocument = useDocumentStore.getState();
        if (latestDocument.filePath !== snapshot.filePath || latestDocument.content !== snapshot.content) {
          return;
        }

        const savedAt = Date.now();
        setDocument({
          filePath: result.filePath,
          title: result.title,
          isDirty: false,
          lastSavedAt: savedAt,
          lastAutosavedAt: savedAt,
        });
      } catch (error) {
        setMessage(`自动保存失败：${getErrorMessage(error)}`);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [content, filePath, isDirty, isInitialized, setDocument, settings.autoSave, title]);

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
      setActiveTocId(id);
      editorRef.current?.scrollToHeading(id);
      return;
    }

    const heading = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!heading) {
      setActiveTocId(id);
      editorRef.current?.scrollToHeading(id);
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
    editorRef.current?.scrollToHeading(id);
  }, []);

  const handlePreviewHeadingSelect = useCallback((id: string) => {
    setActiveTocId(id);
    editorRef.current?.scrollToHeading(id);
  }, []);

  const handlePreviewScrollSync = useCallback((ratio: number) => {
    editorRef.current?.scrollToRatio(ratio);
  }, []);

  const focusDiagnostic = useCallback(
    (diagnostic: DocumentDiagnostic) => {
      if (diagnostic.headingId) {
        handleSelectTocItem(diagnostic.headingId);
        return;
      }

      if (diagnostic.line) {
        editorRef.current?.scrollToLine(diagnostic.line);
      }
    },
    [handleSelectTocItem],
  );

  const handleSelectDiagnostic = useCallback(
    (diagnostic: DocumentDiagnostic) => {
      closeHealthCheckDialog();

      focusDiagnostic(diagnostic);
    },
    [closeHealthCheckDialog, focusDiagnostic],
  );

  const handlePreviewDiagnostic = useCallback(
    (diagnostic: DocumentDiagnostic) => {
      focusDiagnostic(diagnostic);
    },
    [focusDiagnostic],
  );

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
        case "settings:set-auto-save":
          void handleToggleAutoSave(action.enabled);
          break;
      }
    });
  }, [handleExport, handleNew, handleOpen, handleOpenRecent, handleSave, handleThemePreferenceChange, handleToggleAutoSave, handleToggleReopenLastFile]);

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
        autoSave={settings.autoSave}
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
        onOpenHealthCheck={() => openHealthCheckDialog("manual")}
        onThemePreferenceChange={(nextTheme) => void handleThemePreferenceChange(nextTheme)}
        onToggleReopenLastFile={(enabled) => void handleToggleReopenLastFile(enabled)}
        onToggleAutoSave={(enabled) => void handleToggleAutoSave(enabled)}
        onToggleTheme={() => void handleThemePreferenceChange(resolvedTheme === "light" ? "dark" : "light")}
        showPreview={settings.showPreview}
        onTogglePreview={() => void handleTogglePreview(!settings.showPreview)}
      />

      <main className="workspace">
        <div className={`workspace__content${settings.showPreview ? "" : " workspace__content--single"}`}>
          <EditorPane ref={editorRef} filePath={filePath} value={content} theme={resolvedTheme} toc={rendered.toc} onChange={setContent} onStatusMessage={setMessage} />
          {settings.showPreview ? (
            <PreviewPane
              title={title}
              html={previewHtml}
              theme={resolvedTheme}
              containerRef={previewRef}
              renderStyle={activeExportPreset.renderStyle}
              exportPreset={settings.exportPreset}
              onExportPresetChange={handleExportPresetChange}
              onTogglePreview={() => void handleTogglePreview(false)}
              onActiveHeadingChange={setActiveTocId}
              onNotify={setMessage}
              onScrollSync={handlePreviewScrollSync}
              onHeadingClick={handlePreviewHeadingSelect}
            />
          ) : null}
        </div>
        <div className="sidebar sidebar--two-panels">
          <TocPanel toc={rendered.toc} activeId={activeTocId} onSelect={handleSelectTocItem} />
          <RecentFilesPanel
            currentFilePath={filePath}
            files={recentFiles}
            onOpenFile={handleOpenRecent}
            onRemoveFile={handleRemoveRecent}
            onClearFiles={handleClearRecent}
          />
        </div>
      </main>

      <StatusBar
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        lastAutosavedAt={lastAutosavedAt}
        words={words}
        lines={lines}
      />

      {healthCheckDialogState ? (
        <DocumentHealthDialog
          diagnostics={diagnostics}
          mode={healthCheckDialogState.mode}
          exportKind={healthCheckDialogState.exportKind}
          onClose={() => {
            if (healthCheckDialogState.mode === "export") {
              setMessage("已取消导出，请先处理文档中的风险项");
            }
            closeHealthCheckDialog();
          }}
          onSelectDiagnostic={handleSelectDiagnostic}
          onPreviewDiagnostic={handlePreviewDiagnostic}
          onConfirmExport={
            healthCheckDialogState.mode === "export" && healthCheckDialogState.exportKind
              ? () => {
                  closeHealthCheckDialog();
                  void runExport(healthCheckDialogState.exportKind!);
                }
              : undefined
          }
        />
      ) : null}
      {message !== DEFAULT_MESSAGE ? <div className="toast">{message}</div> : null}
      {isDragActive ? <div className="drop-overlay">拖拽 Markdown 文件到这里打开</div> : null}
    </div>
  );
}
