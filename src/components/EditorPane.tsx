import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  getInlineMarkdownCompletion,
  getSmartLineContinuation,
  getEditorSnippet,
  type EditorSnippet,
  type EditorInlineCompletion,
} from "../lib/markdown/editor-snippets";
import { buildImageMarkdown, buildPastedImageMarkdown, insertTextAtRange } from "../lib/markdown/paste-image";
import type { TocItem } from "../lib/markdown/parser";
import { PaneHeader } from "./PaneHeader";

type EditorPaneProps = {
  filePath: string | null;
  value: string;
  theme: "light" | "dark";
  toc: TocItem[];
  onChange: (value: string) => void;
  onStatusMessage?: (message: string) => void;
};

export type EditorPaneHandle = {
  scrollToRatio: (ratio: number) => void;
  scrollToHeading: (id: string) => void;
  scrollToLine: (lineNumber: number) => void;
};

type PastedImageResult = {
  markdown: string;
  statusMessage: string;
};

type CodeMirrorSupport = {
  Compartment: any;
  Decoration: any;
  EditorState: any;
  markdown: () => unknown;
  oneDark: unknown;
  EditorView: any;
  ViewPlugin: any;
  WidgetType: any;
  basicSetup: unknown;
};

let codeMirrorSupportPromise: Promise<CodeMirrorSupport | null> | null = null;

async function readBlobAsDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("读取图片失败"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败"));
    reader.readAsDataURL(blob);
  });
}

async function getPastedImageMarkdown(dataTransfer: DataTransfer | null, markdownFilePath: string | null): Promise<PastedImageResult | null> {
  if (!dataTransfer) {
    return null;
  }

  const imageItem = Array.from(dataTransfer.items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
  const imageFile = imageItem?.getAsFile();
  if (!imageFile) {
    return null;
  }

  if (markdownFilePath) {
    const savedImage = await window.electronApi.savePastedImage({ markdownFilePath });
    if (savedImage) {
      return {
        markdown: buildPastedImageMarkdown(savedImage.relativePath, "image/png"),
        statusMessage: `已粘贴图片并保存到 ${savedImage.relativePath}`,
      };
    }
  }

  const clipboardImageDataUrl = await window.electronApi.readClipboardImageDataUrl();
  if (clipboardImageDataUrl) {
    return {
      markdown: buildPastedImageMarkdown(clipboardImageDataUrl, "image/png"),
      statusMessage: markdownFilePath ? "已粘贴图片到编辑区" : "当前文档未保存，已使用内嵌图片",
    };
  }

  const dataUrl = await readBlobAsDataUrl(imageFile);
  return {
    markdown: buildPastedImageMarkdown(dataUrl, imageFile.type),
    statusMessage: markdownFilePath ? "已粘贴图片到编辑区" : "当前文档未保存，已使用内嵌图片",
  };
}

function insertSnippetIntoCodeMirrorView(view: any, snippet: EditorSnippet) {
  const selection = view.state.selection.main;
  view.focus();
  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: snippet.text,
    },
    selection: {
      anchor: selection.from + snippet.cursorOffset,
    },
  });
}

function insertSnippetIntoTextarea(textarea: HTMLTextAreaElement, value: string, snippet: EditorSnippet, onChange: (value: string) => void) {
  const selectionStart = textarea.selectionStart ?? value.length;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const nextValue = insertTextAtRange(value, snippet.text, selectionStart, selectionEnd);
  const nextCursor = selectionStart + snippet.cursorOffset;

  onChange(nextValue);

  window.requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
  });
}

function createLightEditorTheme(EditorView: any) {
  return EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "var(--editor-bg)",
      color: "var(--text)",
    },
    ".cm-content": {
      fontFamily: '"SFMono-Regular", Consolas, monospace',
      fontSize: "14px",
      lineHeight: "1.7",
      padding: "20px",
    },
    ".cm-gutters": {
      backgroundColor: "var(--editor-bg)",
      color: "var(--muted)",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "rgba(37, 99, 235, 0.08)",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(37, 99, 235, 0.18)",
    },
    ".editor-image-chip": {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      maxWidth: "100%",
      margin: "0 2px",
      padding: "4px 10px",
      border: "1px solid rgba(37, 99, 235, 0.18)",
      borderRadius: "999px",
      background: "rgba(37, 99, 235, 0.08)",
      color: "var(--text)",
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "12px",
      lineHeight: "1.4",
      boxShadow: "0 6px 16px rgba(37, 99, 235, 0.08)",
      cursor: "pointer",
    },
    ".editor-image-chip:hover": {
      background: "rgba(37, 99, 235, 0.12)",
      borderColor: "rgba(37, 99, 235, 0.28)",
    },
    ".editor-image-chip__emoji": {
      flex: "0 0 auto",
    },
    ".editor-image-chip__name": {
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontWeight: "600",
    },
    ".editor-image-chip__alt": {
      color: "var(--muted)",
      whiteSpace: "nowrap",
    },
  });
}

async function loadCodeMirrorSupport(): Promise<CodeMirrorSupport | null> {
  if (!codeMirrorSupportPromise) {
    codeMirrorSupportPromise = (async () => {
      try {
        const [stateModule, markdownModule, darkThemeModule, viewModule, codeMirrorModule] = await Promise.all([
          import(/* @vite-ignore */ "@codemirror/state"),
          import(/* @vite-ignore */ "@codemirror/lang-markdown"),
          import(/* @vite-ignore */ "@codemirror/theme-one-dark"),
          import(/* @vite-ignore */ "@codemirror/view"),
          import(/* @vite-ignore */ "codemirror"),
        ]);

        return {
          Compartment: stateModule.Compartment,
          Decoration: viewModule.Decoration,
          EditorState: stateModule.EditorState,
          markdown: markdownModule.markdown,
          oneDark: darkThemeModule.oneDark,
          EditorView: viewModule.EditorView,
          ViewPlugin: viewModule.ViewPlugin,
          WidgetType: viewModule.WidgetType,
          basicSetup: codeMirrorModule.basicSetup,
        } satisfies CodeMirrorSupport;
      } catch {
        return null;
      }
    })();
  }

  return codeMirrorSupportPromise;
}

function getShortImageName(source: string) {
  if (source.startsWith("data:")) {
    return "内嵌图片";
  }

  const normalizedSource = source.split(/[?#]/)[0] ?? source;
  return normalizedSource.split(/[\\/]/).pop() ?? normalizedSource;
}

function selectionIntersectsRange(selection: any, from: number, to: number) {
  return selection.ranges.some((range: any) => {
    const start = Math.min(range.from, range.to);
    const end = Math.max(range.from, range.to);

    if (start === end) {
      return start >= from && start <= to;
    }

    return start < to && end > from;
  });
}

function createImageTokenExtension(support: CodeMirrorSupport) {
  const { Decoration, ViewPlugin, WidgetType } = support;
  const imagePattern = /!\[([^\]]*)\]\(([^)\n]+)\)/g;

  class ImageTokenWidget extends WidgetType {
    constructor(
      private readonly alt: string,
      private readonly src: string,
      private readonly from: number,
      private readonly to: number,
    ) {
      super();
    }

    eq(other: ImageTokenWidget) {
      return other.alt === this.alt && other.src === this.src && other.from === this.from && other.to === this.to;
    }

    toDOM() {
      const element = document.createElement("span");
      element.className = "editor-image-chip";
      element.dataset.imageFrom = String(this.from);
      element.dataset.imageTo = String(this.to);
      element.title = this.src;

      const emoji = document.createElement("span");
      emoji.className = "editor-image-chip__emoji";
      emoji.textContent = "🖼";

      const name = document.createElement("span");
      name.className = "editor-image-chip__name";
      name.textContent = getShortImageName(this.src);

      const alt = document.createElement("span");
      alt.className = "editor-image-chip__alt";
      alt.textContent = this.alt ? `· ${this.alt}` : "· 图片";

      element.append(emoji, name, alt);
      return element;
    }

    ignoreEvent() {
      return false;
    }
  }

  const buildDecorations = (view: any) => {
    const decorations: any[] = [];
    const source = view.state.doc.toString();
    imagePattern.lastIndex = 0;

    for (const match of source.matchAll(imagePattern)) {
      const matchedText = match[0] ?? "";
      const alt = match[1] ?? "";
      const src = match[2] ?? "";
      const from = match.index ?? 0;
      const to = from + matchedText.length;

      if (!src || selectionIntersectsRange(view.state.selection, from, to)) {
        continue;
      }

      decorations.push(
        Decoration.replace({
          widget: new ImageTokenWidget(alt, src, from, to),
          inclusive: false,
        }).range(from, to),
      );
    }

    return Decoration.set(decorations, true);
  };

  return ViewPlugin.fromClass(
    class {
      decorations: any;

      constructor(view: any) {
        this.decorations = buildDecorations(view);
      }

      update(update: any) {
        if (update.docChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (value: { decorations: any }) => value.decorations,
    },
  );
}

function applyInlineCompletionToCodeMirror(view: any, completion: EditorInlineCompletion) {
  const selection = view.state.selection.main;
  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: completion.text,
    },
    selection: {
      anchor: selection.from + completion.selectionStartOffset,
      head: selection.from + completion.selectionEndOffset,
    },
  });
}

function applyInlineCompletionToTextarea(
  textarea: HTMLTextAreaElement,
  value: string,
  completion: EditorInlineCompletion,
  onChange: (value: string) => void,
) {
  const selectionStart = textarea.selectionStart ?? value.length;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const nextValue = insertTextAtRange(value, completion.text, selectionStart, selectionEnd);
  const nextSelectionStart = selectionStart + completion.selectionStartOffset;
  const nextSelectionEnd = selectionStart + completion.selectionEndOffset;

  onChange(nextValue);

  window.requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
  });
}

function getEditorScroller(view: any, textarea: HTMLTextAreaElement | null) {
  return (view?.scrollDOM as HTMLElement | undefined) ?? textarea;
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function getDocumentOffsetForLine(content: string, lineNumber: number) {
  if (lineNumber <= 1) {
    return 0;
  }

  let currentLine = 1;
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      currentLine += 1;
      if (currentLine === lineNumber) {
        return index + 1;
      }
    }
  }

  return content.length;
}

function getTextareaLineHeight(textarea: HTMLTextAreaElement) {
  const computedStyle = window.getComputedStyle(textarea);
  const numericLineHeight = Number.parseFloat(computedStyle.lineHeight);
  return Number.isFinite(numericLineHeight) ? numericLineHeight : 24;
}

function EditorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5v15" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane(props, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const viewRef = useRef<any>(null);
  const themeCompartmentRef = useRef<any>(null);
  const onChangeRef = useRef(props.onChange);
  const onStatusMessageRef = useRef(props.onStatusMessage);
  const filePathRef = useRef(props.filePath);
  const valueRef = useRef(props.value);
  const tocRef = useRef(props.toc);
  const suppressChangeRef = useRef(false);
  const [support, setSupport] = useState<CodeMirrorSupport | null>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);

  const isCodeMirrorReady = useMemo(() => Boolean(support), [support]);

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(() => {
    onStatusMessageRef.current = props.onStatusMessage;
  }, [props.onStatusMessage]);

  useEffect(() => {
    filePathRef.current = props.filePath;
  }, [props.filePath]);

  useEffect(() => {
    valueRef.current = props.value;
  }, [props.value]);

  useEffect(() => {
    tocRef.current = props.toc;
  }, [props.toc]);

  useEffect(() => {
    let active = true;

    void loadCodeMirrorSupport().then((loadedSupport) => {
      if (!active) {
        return;
      }

      setSupport(loadedSupport);
      setLoadAttempted(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => {
      const scrollToLine = (lineNumber: number) => {
        const targetLineNumber = Math.max(1, lineNumber);
        const view = viewRef.current;
        if (view) {
          const clampedLineNumber = Math.min(targetLineNumber, view.state.doc.lines);
          const line = view.state.doc.line(clampedLineNumber);
          const lineBlock = view.lineBlockAt(line.from);
          view.dispatch({ selection: { anchor: line.from } });
          view.scrollDOM.scrollTo({
            top: Math.max(0, lineBlock.top - 24),
            behavior: "smooth",
          });
          view.focus();
          return;
        }

        const textarea = textareaRef.current;
        if (!textarea) {
          return;
        }

        const offset = getDocumentOffsetForLine(valueRef.current, targetLineNumber);
        const nextTop = Math.max(0, (targetLineNumber - 1) * getTextareaLineHeight(textarea) - 24);
        textarea.focus();
        textarea.setSelectionRange(offset, offset);
        textarea.scrollTo({ top: nextTop, behavior: "smooth" });
      };

      return {
        scrollToRatio(ratio: number) {
          const scroller = getEditorScroller(viewRef.current, textareaRef.current);
          if (!scroller) {
            return;
          }

          const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          scroller.scrollTop = maxScrollTop * clampRatio(ratio);
        },
        scrollToHeading(id: string) {
          const tocItem = tocRef.current.find((item) => item.id === id);
          if (!tocItem) {
            return;
          }

          scrollToLine(Math.max(1, tocItem.line + 1));
        },
        scrollToLine,
      };
    },
    [],
  );

  useEffect(() => {
    if (!support || !hostRef.current) {
      return;
    }

    const { Compartment, EditorState, EditorView, basicSetup, markdown, oneDark } = support;
    const themeCompartment = new Compartment();
    themeCompartmentRef.current = themeCompartment;

    const view = new EditorView({
      state: EditorState.create({
        doc: props.value,
        extensions: [
          basicSetup,
          markdown(),
          createImageTokenExtension(support),
          EditorView.lineWrapping,
          themeCompartment.of(props.theme === "dark" ? oneDark : createLightEditorTheme(EditorView)),
          EditorView.domEventHandlers({
            click: (event: MouseEvent, editorView: any) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return false;
              }

              const imageChip = target.closest<HTMLElement>(".editor-image-chip");
              if (!imageChip) {
                return false;
              }

              const from = Number.parseInt(imageChip.dataset.imageFrom ?? "", 10);
              const to = Number.parseInt(imageChip.dataset.imageTo ?? "", 10);
              if (!Number.isFinite(from) || !Number.isFinite(to)) {
                return false;
              }

              event.preventDefault();
              editorView.dispatch({
                selection: { anchor: from, head: to },
              });
              editorView.focus();
              return true;
            },
            paste: (event: ClipboardEvent, editorView: any) => {
              void (async () => {
                const pastedImage = await getPastedImageMarkdown(event.clipboardData, filePathRef.current);
                if (!pastedImage) {
                  return;
                }

                const selection = editorView.state.selection.main;
                const insertText = selection.from > 0 && !/^\n/.test(pastedImage.markdown) ? `\n${pastedImage.markdown}\n` : `${pastedImage.markdown}\n`;

                editorView.dispatch({
                  changes: {
                    from: selection.from,
                    to: selection.to,
                    insert: insertText,
                  },
                  selection: {
                    anchor: selection.from + insertText.length,
                  },
                });

                onStatusMessageRef.current?.(pastedImage.statusMessage);
              })().catch((error: unknown) => {
                const message = error instanceof Error ? error.message : "粘贴图片失败";
                onStatusMessageRef.current?.(message);
              });

              if (Array.from(event.clipboardData?.items ?? []).some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
                event.preventDefault();
                return true;
              }

              return false;
            },
            keydown: (event: KeyboardEvent, editorView: any) => {
              if (!event.metaKey && !event.ctrlKey && !event.altKey) {
                const selection = editorView.state.selection.main;
                const selectedText = editorView.state.sliceDoc(selection.from, selection.to);
                const inlineCompletion = getInlineMarkdownCompletion(event.key, selectedText);
                if (inlineCompletion) {
                  event.preventDefault();
                  applyInlineCompletionToCodeMirror(editorView, inlineCompletion);
                  onStatusMessageRef.current?.(inlineCompletion.statusMessage);
                  return true;
                }
              }

              if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.altKey) {
                return false;
              }

              const selection = editorView.state.selection.main;
              const line = editorView.state.doc.lineAt(selection.from);
              const beforeLineText = line.text.slice(0, selection.from - line.from);
              const afterLineText = line.text.slice(selection.to - line.from);
              const completion = getSmartLineContinuation(beforeLineText, afterLineText);
              if (!completion) {
                return false;
              }

              event.preventDefault();
              editorView.dispatch({
                changes: {
                  from: selection.from,
                  to: selection.to,
                  insert: completion.text,
                },
                selection: {
                  anchor: selection.from + completion.cursorOffset,
                },
              });
              return true;
            },
          }),
          EditorView.updateListener.of((update: any) => {
            if (!update.docChanged || suppressChangeRef.current) {
              return;
            }

            onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: hostRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      themeCompartmentRef.current = null;
    };
  }, [support]);

  const insertSnippet = (snippet: EditorSnippet) => {
    const view = viewRef.current;
    if (view) {
      insertSnippetIntoCodeMirrorView(view, snippet);
      onStatusMessageRef.current?.(snippet.statusMessage);
      return;
    }

    const textarea = textareaRef.current;
    if (textarea) {
      insertSnippetIntoTextarea(textarea, valueRef.current, snippet, onChangeRef.current);
      onStatusMessageRef.current?.(snippet.statusMessage);
    }
  };

  const insertLocalImage = async () => {
    try {
      const pickedImage = await window.electronApi.pickLocalImage({ markdownFilePath: filePathRef.current });
      if (!pickedImage) {
        return;
      }

      insertSnippet({
        text: buildImageMarkdown(pickedImage.relativePath),
        cursorOffset: 2,
        statusMessage: `已插入本地图片 ${pickedImage.relativePath}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "插入本地图片失败";
      onStatusMessageRef.current?.(message);
    }
  };

  useEffect(() => {
    return window.electronApi.onMenuAction((action) => {
      if (action.type === "editor:insert-local-image") {
        void insertLocalImage();
        return;
      }

      const snippet = getEditorSnippet(action.type);
      if (!snippet) {
        return;
      }

      insertSnippet(snippet);
    });
  }, []);

  const handleFallbackPaste = async (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    try {
      const pastedImage = await getPastedImageMarkdown(event.clipboardData, props.filePath);
      if (!pastedImage) {
        return;
      }

      event.preventDefault();
      const target = event.currentTarget;
      const selectionStart = target.selectionStart ?? props.value.length;
      const selectionEnd = target.selectionEnd ?? selectionStart;
      const insertText = selectionStart > 0 ? `\n${pastedImage.markdown}\n` : `${pastedImage.markdown}\n`;
      const nextValue = insertTextAtRange(props.value, insertText, selectionStart, selectionEnd);
      props.onChange(nextValue);
      props.onStatusMessage?.(pastedImage.statusMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "粘贴图片失败";
      props.onStatusMessage?.(message);
    }
  };

  const handleFallbackKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const selectionStart = target.selectionStart ?? props.value.length;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    const selectedText = props.value.slice(selectionStart, selectionEnd);

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      const inlineCompletion = getInlineMarkdownCompletion(event.key, selectedText);
      if (inlineCompletion) {
        event.preventDefault();
        applyInlineCompletionToTextarea(target, props.value, inlineCompletion, props.onChange);
        props.onStatusMessage?.(inlineCompletion.statusMessage);
        return;
      }
    }

    if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const lineStart = props.value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextBreakIndex = props.value.indexOf("\n", selectionEnd);
    const lineEnd = nextBreakIndex < 0 ? props.value.length : nextBreakIndex;
    const beforeLineText = props.value.slice(lineStart, selectionStart);
    const afterLineText = props.value.slice(selectionEnd, lineEnd);
    const completion = getSmartLineContinuation(beforeLineText, afterLineText);

    if (!completion) {
      return;
    }

    event.preventDefault();
    const nextValue = insertTextAtRange(props.value, completion.text, selectionStart, selectionEnd);
    const nextCursor = selectionStart + completion.cursorOffset;
    props.onChange(nextValue);
    window.requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(nextCursor, nextCursor);
    });
  };

  useEffect(() => {
    const view = viewRef.current;
    if (!support || !view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (currentValue === props.value) {
      return;
    }

    suppressChangeRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: props.value,
      },
    });
    suppressChangeRef.current = false;
  }, [props.value, support]);

  useEffect(() => {
    const view = viewRef.current;
    const themeCompartment = themeCompartmentRef.current;
    if (!support || !view || !themeCompartment) {
      return;
    }

    const { EditorView, oneDark } = support;
    view.dispatch({
      effects: themeCompartment.reconfigure(props.theme === "dark" ? oneDark : createLightEditorTheme(EditorView)),
    });
  }, [props.theme, support]);

  return (
    <section className="pane pane--editor">
      <PaneHeader title="Markdown" meta="本地纯文本编辑" badge={isCodeMirrorReady ? "CodeMirror" : "Textarea"} icon={<EditorIcon />} />
      <div className="editor-surface">
        {isCodeMirrorReady ? (
          <div ref={hostRef} className="editor-host" />
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-fallback"
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            onKeyDown={handleFallbackKeyDown}
            onPaste={(event) => {
              void handleFallbackPaste(event);
            }}
            spellCheck={false}
            aria-label={loadAttempted ? "Markdown editor fallback" : "Markdown editor loading"}
          />
        )}
      </div>
    </section>
  );
});
