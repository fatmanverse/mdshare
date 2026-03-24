import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { EXPORT_PRESET_OPTIONS, getExportPreset, type ExportPreset } from "../lib/markdown/export-preset";
import { renderMermaidDiagrams, renderMermaidPreview } from "../lib/markdown/mermaid";
import { buildRenderStyleCssVariables, type RenderStyle } from "../lib/markdown/render-style";
import { PaneHeader } from "./PaneHeader";

type PreviewPaneProps = {
  title: string;
  html: string;
  theme: "light" | "dark";
  containerRef: RefObject<HTMLDivElement>;
  renderStyle: RenderStyle;
  exportPreset: ExportPreset;
  onExportPresetChange: (exportPreset: ExportPreset) => void;
  onTogglePreview: () => void;
  onActiveHeadingChange: (id: string | null) => void;
  onNotify: (message: string) => void;
  onScrollSync: (ratio: number) => void;
  onHeadingClick: (id: string) => void;
};

type PreviewImage = {
  alt: string;
  src: string;
};

type PreviewMermaid = {
  title: string;
  source: string;
};

type Offset = {
  x: number;
  y: number;
};

type DragState = {
  origin: Offset;
  startX: number;
  startY: number;
};

const MIN_PREVIEW_SCALE = 1;
const MAX_PREVIEW_SCALE = 4;
const PREVIEW_SCALE_STEP = 0.25;
const PREVIEW_WHEEL_GUARD_MS = 320;

function getPreviewTimestamp() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function resolvePreviewRestoreScrollTop(container: Pick<HTMLDivElement, "scrollTop">, previousScrollTop: number) {
  return Number.isFinite(container.scrollTop) ? container.scrollTop : previousScrollTop;
}

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function resolveActiveHeading(container: HTMLDivElement) {
  const headings = Array.from(container.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"));
  if (headings.length === 0) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  const threshold = 72;
  let activeId = headings[0].id;

  for (const heading of headings) {
    const distance = heading.getBoundingClientRect().top - containerRect.top;
    if (distance <= threshold) {
      activeId = heading.id;
      continue;
    }

    break;
  }

  return activeId;
}

function clampScale(value: number) {
  return Math.min(MAX_PREVIEW_SCALE, Math.max(MIN_PREVIEW_SCALE, Number(value.toFixed(2))));
}

function getScrollRatio(container: HTMLDivElement) {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  if (maxScrollTop === 0) {
    return 0;
  }

  return container.scrollTop / maxScrollTop;
}

function readPreviewImages(container: HTMLDivElement) {
  const imageElements = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  const images = imageElements
    .map((image) => ({
      alt: image.alt || "预览图片",
      src: image.currentSrc || image.src,
    }))
    .filter((image) => image.src);

  return {
    imageElements,
    images,
  };
}

function decodePreviewMermaidSource(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readPreviewMermaid(block: HTMLElement): PreviewMermaid | null {
  const encodedSource = block.dataset.mermaidSource;
  if (!encodedSource) {
    return null;
  }

  const source = decodePreviewMermaidSource(encodedSource);
  if (!source.trim()) {
    return null;
  }

  return {
    title: "Mermaid 图表",
    source,
  };
}

function decorateMermaidPreviewBlocks(container: HTMLDivElement) {
  const mermaidBlocks = Array.from(container.querySelectorAll<HTMLElement>(".mermaid-preview[data-mermaid-source]"));

  mermaidBlocks.forEach((block) => {
    block.querySelector(".mermaid-preview__controls")?.remove();
    delete block.dataset.mermaidZoomable;

    if (block.dataset.mermaidState !== "diagram") {
      return;
    }

    const controls = document.createElement("div");
    controls.className = "mermaid-preview__controls";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mermaid-preview__expand";
    button.dataset.mermaidAction = "expand";
    button.textContent = "全屏查看";
    button.setAttribute("aria-label", "全屏查看 Mermaid 图表");

    controls.appendChild(button);
    block.insertBefore(controls, block.firstChild);
    block.dataset.mermaidZoomable = "true";
  });
}

export function PreviewPane(props: PreviewPaneProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewMermaid, setPreviewMermaid] = useState<PreviewMermaid | null>(null);
  const [previewScale, setPreviewScale] = useState(MIN_PREVIEW_SCALE);
  const [previewOffset, setPreviewOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const lightboxFrameRef = useRef<HTMLDivElement | null>(null);
  const lightboxImageRef = useRef<HTMLImageElement | null>(null);
  const lightboxMermaidRef = useRef<HTMLDivElement | null>(null);
  const previewDragRef = useRef<DragState | null>(null);
  const previewScrollTopRef = useRef(0);
  const isRestoringPreviewScrollRef = useRef(false);
  const previewOverlayOpenedAtRef = useRef(0);

  const previewImage = previewIndex === null ? null : previewImages[previewIndex] ?? null;
  const hasPreviewOverlay = previewImage !== null || previewMermaid !== null;
  const activeExportPreset = useMemo(() => getExportPreset(props.exportPreset), [props.exportPreset]);
  const hasPreviousPreviewImage = previewIndex !== null && previewIndex > 0;
  const hasNextPreviewImage = previewIndex !== null && previewIndex < previewImages.length - 1;
  const hasPreviewTransform = previewScale > MIN_PREVIEW_SCALE || previewOffset.x !== 0 || previewOffset.y !== 0;
  const previewVariables = useMemo(() => buildRenderStyleCssVariables(props.renderStyle) as CSSProperties, [props.renderStyle]);
  const previewTitle = props.title.trim() || "Untitled";

  const restorePreviewScrollPosition = useCallback((container: HTMLDivElement, scrollTop: number) => {
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextScrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);

    if (Math.abs(container.scrollTop - nextScrollTop) < 1) {
      previewScrollTopRef.current = nextScrollTop;
      return;
    }

    isRestoringPreviewScrollRef.current = true;
    container.scrollTop = nextScrollTop;
    previewScrollTopRef.current = nextScrollTop;

    window.requestAnimationFrame(() => {
      isRestoringPreviewScrollRef.current = false;
    });
  }, []);

  const clampPreviewOffset = useCallback((offset: Offset, scale: number) => {
    if (scale <= MIN_PREVIEW_SCALE) {
      return { x: 0, y: 0 };
    }

    const frame = lightboxFrameRef.current;
    const content = lightboxImageRef.current ?? lightboxMermaidRef.current;
    if (!frame || !content) {
      return offset;
    }

    const maxX = Math.max(0, (content.offsetWidth * scale - frame.clientWidth) / 2);
    const maxY = Math.max(0, (content.offsetHeight * scale - frame.clientHeight) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
  }, []);

  const resetPreviewTransform = useCallback(() => {
    previewDragRef.current = null;
    setIsDraggingPreview(false);
    setPreviewScale(MIN_PREVIEW_SCALE);
    setPreviewOffset({ x: 0, y: 0 });
  }, []);

  const closePreviewOverlay = useCallback(() => {
    previewDragRef.current = null;
    setIsDraggingPreview(false);
    setPreviewImages([]);
    setPreviewIndex(null);
    setPreviewMermaid(null);
    setPreviewScale(MIN_PREVIEW_SCALE);
    setPreviewOffset({ x: 0, y: 0 });
  }, []);

  const applyPreviewScale = useCallback(
    (nextScaleOrUpdater: number | ((currentScale: number) => number)) => {
      setPreviewScale((currentScale) => {
        const nextScale = clampScale(
          typeof nextScaleOrUpdater === "function" ? nextScaleOrUpdater(currentScale) : nextScaleOrUpdater,
        );

        setPreviewOffset((currentOffset) => (nextScale === MIN_PREVIEW_SCALE ? { x: 0, y: 0 } : clampPreviewOffset(currentOffset, nextScale)));
        return nextScale;
      });
    },
    [clampPreviewOffset],
  );

  const goToPreviewImage = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= previewImages.length) {
        return;
      }

      previewDragRef.current = null;
      setIsDraggingPreview(false);
      setPreviewIndex(nextIndex);
      setPreviewScale(MIN_PREVIEW_SCALE);
      setPreviewOffset({ x: 0, y: 0 });
    },
    [previewImages.length],
  );

  const openPreviewMermaid = useCallback((block: HTMLElement) => {
    const mermaid = readPreviewMermaid(block);
    if (!mermaid) {
      return;
    }

    previewOverlayOpenedAtRef.current = getPreviewTimestamp();
    previewDragRef.current = null;
    setIsDraggingPreview(false);
    setPreviewImages([]);
    setPreviewIndex(null);
    setPreviewMermaid(mermaid);
    setPreviewScale(MIN_PREVIEW_SCALE);
    setPreviewOffset({ x: 0, y: 0 });
  }, []);
  const showPreviousPreviewImage = useCallback(() => {
    if (previewIndex === null || !hasPreviousPreviewImage) {
      return;
    }

    goToPreviewImage(previewIndex - 1);
  }, [goToPreviewImage, hasPreviousPreviewImage, previewIndex]);

  const showNextPreviewImage = useCallback(() => {
    if (previewIndex === null || !hasNextPreviewImage) {
      return;
    }

    goToPreviewImage(previewIndex + 1);
  }, [goToPreviewImage, hasNextPreviewImage, previewIndex]);

  const zoomInPreviewImage = useCallback(() => {
    applyPreviewScale((currentScale) => currentScale + PREVIEW_SCALE_STEP);
  }, [applyPreviewScale]);

  const zoomOutPreviewImage = useCallback(() => {
    applyPreviewScale((currentScale) => currentScale - PREVIEW_SCALE_STEP);
  }, [applyPreviewScale]);

  useEffect(() => {
    const container = props.containerRef.current;
    if (!container) {
      return;
    }

    let disposed = false;
    let restoreFrameId = 0;
    const savedScrollTop = resolvePreviewRestoreScrollTop(container, previewScrollTopRef.current);
    previewScrollTopRef.current = savedScrollTop;

    const scheduleScrollRestore = () => {
      if (restoreFrameId) {
        window.cancelAnimationFrame(restoreFrameId);
      }

      restoreFrameId = window.requestAnimationFrame(() => {
        restoreFrameId = 0;
        restorePreviewScrollPosition(container, savedScrollTop);
      });
    };

    void renderMermaidDiagrams(container, props.theme)
      .then(() => {
        if (disposed) {
          return;
        }

        decorateMermaidPreviewBlocks(container);
        scheduleScrollRestore();
      })
      .catch((error) => {
        console.error("Failed to render Mermaid diagrams", error);
        if (!disposed) {
          scheduleScrollRestore();
        }
      });

    return () => {
      disposed = true;
      if (restoreFrameId) {
        window.cancelAnimationFrame(restoreFrameId);
      }
    };
  }, [props.containerRef, props.html, props.theme, restorePreviewScrollPosition]);

  useEffect(() => {
    const container = props.containerRef.current;
    if (!container) {
      props.onActiveHeadingChange(null);
      return;
    }

    const updateActiveHeading = () => {
      props.onActiveHeadingChange(resolveActiveHeading(container));
    };

    updateActiveHeading();
    container.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      container.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [props.containerRef, props.html, props.onActiveHeadingChange]);

  useEffect(() => {
    const container = props.containerRef.current;
    if (!container) {
      return;
    }

    previewScrollTopRef.current = container.scrollTop;

    let frameId = 0;
    const emitScrollSync = () => {
      frameId = 0;
      previewScrollTopRef.current = container.scrollTop;

      if (isRestoringPreviewScrollRef.current) {
        return;
      }

      props.onScrollSync(getScrollRatio(container));
    };

    const handleScroll = () => {
      previewScrollTopRef.current = container.scrollTop;

      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(emitScrollSync);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [props.containerRef, props.onScrollSync]);

  useEffect(() => {
    const container = props.containerRef.current;
    if (!container) {
      return;
    }

    const cleanups: Array<() => void> = [];
    const preElements = Array.from(container.querySelectorAll<HTMLPreElement>("pre"));

    preElements.forEach((preElement) => {
      const codeElement = preElement.querySelector<HTMLElement>("code");
      const codeText = codeElement?.innerText ?? preElement.innerText;
      if (!codeText.trim()) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "preview__code-copy";
      button.textContent = "复制代码";
      preElement.classList.add("preview__code-block");
      preElement.appendChild(button);

      let resetTimer: number | null = null;

      const resetButton = () => {
        button.dataset.state = "default";
        button.textContent = "复制代码";
      };

      const handleClick = async (event: Event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
          await window.electronApi.copyText(codeText);
          button.dataset.state = "success";
          button.textContent = "已复制";
          props.onNotify("代码已复制");
        } catch {
          button.dataset.state = "error";
          button.textContent = "复制失败";
          props.onNotify("复制代码失败");
        }

        if (resetTimer) {
          window.clearTimeout(resetTimer);
        }

        resetTimer = window.setTimeout(resetButton, 1600);
      };

      button.addEventListener("click", handleClick);
      cleanups.push(() => {
        button.removeEventListener("click", handleClick);
        if (resetTimer) {
          window.clearTimeout(resetTimer);
        }
        button.remove();
        preElement.classList.remove("preview__code-block");
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [props.containerRef, props.html, props.onNotify]);

  useEffect(() => {
    const container = lightboxMermaidRef.current;
    if (!previewMermaid || !container) {
      return;
    }

    const markup = renderMermaidPreview(previewMermaid.source) ?? "";
    if (!markup) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = markup;
    let disposed = false;

    void renderMermaidDiagrams(container, props.theme).catch((error) => {
      if (!disposed) {
        console.error("Failed to render Mermaid lightbox", error);
      }
    });

    return () => {
      disposed = true;
      container.innerHTML = "";
    };
  }, [previewMermaid, props.theme]);

  useEffect(() => {
    if (!hasPreviewOverlay) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreviewOverlay();
        return;
      }

      if (previewImage && event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousPreviewImage();
        return;
      }

      if (previewImage && event.key === "ArrowRight") {
        event.preventDefault();
        showNextPreviewImage();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomInPreviewImage();
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomOutPreviewImage();
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        resetPreviewTransform();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePreviewOverlay, hasPreviewOverlay, previewImage, resetPreviewTransform, showNextPreviewImage, showPreviousPreviewImage, zoomInPreviewImage, zoomOutPreviewImage]);

  useEffect(() => {
    if (!isDraggingPreview || !hasPreviewOverlay) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = previewDragRef.current;
      if (!dragState) {
        return;
      }

      event.preventDefault();
      const nextOffset = {
        x: dragState.origin.x + event.clientX - dragState.startX,
        y: dragState.origin.y + event.clientY - dragState.startY,
      };

      setPreviewOffset(clampPreviewOffset(nextOffset, previewScale));
    };

    const stopDragging = () => {
      previewDragRef.current = null;
      setIsDraggingPreview(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [clampPreviewOffset, hasPreviewOverlay, isDraggingPreview, previewScale]);

  useEffect(() => {
    if (!hasPreviewOverlay) {
      return;
    }

    const handleResize = () => {
      setPreviewOffset((currentOffset) => clampPreviewOffset(currentOffset, previewScale));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPreviewOffset, hasPreviewOverlay, previewScale]);

  const handlePreviewClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const container = props.containerRef.current;
      const target = event.target;
      if (!container || !(target instanceof HTMLElement)) {
        return;
      }

      const image = target.closest("img");
      if (image instanceof HTMLImageElement) {
        event.preventDefault();
        const { imageElements, images } = readPreviewImages(container);
        const nextIndex = imageElements.findIndex((item) => item === image);
        if (nextIndex < 0 || !images[nextIndex]) {
          return;
        }

        previewOverlayOpenedAtRef.current = getPreviewTimestamp();
        setPreviewMermaid(null);
        setPreviewImages(images);
        setPreviewIndex(nextIndex);
        setPreviewScale(MIN_PREVIEW_SCALE);
        setPreviewOffset({ x: 0, y: 0 });
        setIsDraggingPreview(false);
        previewDragRef.current = null;
        return;
      }

      const mermaidAction = target.closest<HTMLElement>("[data-mermaid-action='expand']");
      const mermaidBlock = target.closest<HTMLElement>(".mermaid-preview[data-mermaid-zoomable='true']");
      const mermaidDiagram = target.closest<HTMLElement>(".mermaid-preview__diagram");
      if (mermaidBlock && (mermaidAction || (mermaidDiagram && !target.closest("a, button")))) {
        event.preventDefault();
        openPreviewMermaid(mermaidBlock);
        return;
      }

      const heading = target.closest<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]");
      if (heading?.id) {
        props.onHeadingClick(heading.id);
      }
    },
    [openPreviewMermaid, props.containerRef, props.onHeadingClick],
  );

  const handlePreviewWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (getPreviewTimestamp() - previewOverlayOpenedAtRef.current < PREVIEW_WHEEL_GUARD_MS) {
        return;
      }

      if (event.deltaY < 0) {
        zoomInPreviewImage();
        return;
      }

      zoomOutPreviewImage();
    },
    [zoomInPreviewImage, zoomOutPreviewImage],
  );

  const handlePreviewPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (previewScale <= MIN_PREVIEW_SCALE || event.button !== 0) {
        return;
      }

      previewDragRef.current = {
        origin: previewOffset,
        startX: event.clientX,
        startY: event.clientY,
      };
      setIsDraggingPreview(true);
    },
    [previewOffset, previewScale],
  );

  const handlePreviewDoubleClick = useCallback(() => {
    applyPreviewScale((currentScale) => (currentScale > MIN_PREVIEW_SCALE ? MIN_PREVIEW_SCALE : 2));
  }, [applyPreviewScale]);

  const handlePreviewImageLoad = useCallback(() => {
    setPreviewOffset((currentOffset) => clampPreviewOffset(currentOffset, previewScale));
  }, [clampPreviewOffset, previewScale]);

  const previewLightboxLabel = previewMermaid ? "Mermaid 图表预览" : "图片预览";
  const previewLightboxHint = previewMermaid ? "滚轮缩放 · 拖拽查看 · 双击快速放大" : "← → 切换 · 滚轮缩放 · 双击快速放大";
  const previewLightboxCaption = previewMermaid?.title ?? previewImage?.alt ?? "";
  const previewLightboxStatus =
    previewScale > MIN_PREVIEW_SCALE
      ? "已放大，可直接拖拽查看细节，按 0 可重置"
      : previewMermaid
        ? "当前为 Mermaid 全屏预览，双击或滚轮缩放，Esc 可快速关闭"
        : "双击或滚轮缩放，Esc 可快速关闭";
  return (
    <>
      <section className="pane pane--preview">
        <PaneHeader
          title="Preview"
          meta="实时成品预览"
          badge="Live"
          icon={<PreviewIcon />}
          actions={
            <>
              <div className="preview-style-switch" role="group" aria-label="导出预设切换">
                {EXPORT_PRESET_OPTIONS.map((option) => {
                  const active = props.exportPreset === option.value;
                  const tooltipId = `preview-preset-tooltip-${option.value}`;
                  return (
                    <span key={option.value} className="preview-style-switch__item">
                      <button
                        type="button"
                        className={`preview-style-switch__button${active ? " preview-style-switch__button--active" : ""}`}
                        onClick={() => props.onExportPresetChange(option.value)}
                        aria-pressed={active}
                        aria-describedby={tooltipId}
                      >
                        {option.shortLabel}
                      </button>
                      <span id={tooltipId} role="tooltip" className="preview-style-switch__tooltip">
                        <strong className="preview-style-switch__tooltip-title">{option.label}</strong>
                        <span className="preview-style-switch__tooltip-text">{option.description}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
              <button type="button" className="pane__header-action" onClick={props.onTogglePreview}>
                收起预览
              </button>
            </>
          }
        />
        <div
          ref={props.containerRef}
          className="preview"
          style={previewVariables}
          onClick={handlePreviewClick}
        >
          <div className="preview__document">
            {activeExportPreset.headerText ? <div className="preview__header">{activeExportPreset.headerText}</div> : null}
            {activeExportPreset.showTitleBlock ? (
              <section className="preview__title-block">
                <p className="preview__eyebrow">{activeExportPreset.titleBlockEyebrow}</p>
                <h1 className="preview__title">{previewTitle}</h1>
                <p className="preview__description">{activeExportPreset.titleBlockDescription}</p>
              </section>
            ) : null}
            <div className="preview__body markdown-body" dangerouslySetInnerHTML={{ __html: props.html }} />
            {activeExportPreset.footerText ? <div className="preview__footer">{activeExportPreset.footerText}</div> : null}
          </div>
        </div>
      </section>

      {hasPreviewOverlay ? (
        <div className="preview-lightbox" role="dialog" aria-modal="true" aria-label={previewLightboxLabel} onClick={closePreviewOverlay}>
          <div className={`preview-lightbox__dialog${previewMermaid ? " preview-lightbox__dialog--mermaid" : ""}`} onClick={(event) => event.stopPropagation()}>
            <div className="preview-lightbox__toolbar">
              <div className="preview-lightbox__meta">
                <span className="preview-lightbox__counter">
                  {previewImage ? `${previewIndex === null ? 0 : previewIndex + 1} / ${previewImages.length}` : "Mermaid"}
                </span>
                <span className="preview-lightbox__toolbar-hint">{previewLightboxHint}</span>
              </div>

              <div className="preview-lightbox__actions">
                {previewImage ? (
                  <button type="button" className="preview-lightbox__action" onClick={showPreviousPreviewImage} disabled={!hasPreviousPreviewImage}>
                    上一张
                  </button>
                ) : null}
                <button type="button" className="preview-lightbox__action" onClick={zoomOutPreviewImage} disabled={previewScale <= MIN_PREVIEW_SCALE}>
                  缩小
                </button>
                <span className="preview-lightbox__zoom-value">{Math.round(previewScale * 100)}%</span>
                <button type="button" className="preview-lightbox__action" onClick={zoomInPreviewImage} disabled={previewScale >= MAX_PREVIEW_SCALE}>
                  放大
                </button>
                <button type="button" className="preview-lightbox__action" onClick={resetPreviewTransform} disabled={!hasPreviewTransform}>
                  重置
                </button>
                {previewImage ? (
                  <button type="button" className="preview-lightbox__action" onClick={showNextPreviewImage} disabled={!hasNextPreviewImage}>
                    下一张
                  </button>
                ) : null}
                <button type="button" className="preview-lightbox__close" onClick={closePreviewOverlay} aria-label={`关闭${previewLightboxLabel}`}>
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div
              ref={lightboxFrameRef}
              className={`preview-lightbox__frame${previewMermaid ? " preview-lightbox__frame--mermaid" : ""}${previewScale > MIN_PREVIEW_SCALE ? " preview-lightbox__frame--zoomed" : ""}${isDraggingPreview ? " preview-lightbox__frame--dragging" : ""}`}
              onWheel={handlePreviewWheel}
              onPointerDown={handlePreviewPointerDown}
              onDoubleClick={handlePreviewDoubleClick}
            >
              {previewImage ? (
                <img
                  ref={lightboxImageRef}
                  className="preview-lightbox__image"
                  src={previewImage.src}
                  alt={previewImage.alt}
                  draggable={false}
                  onLoad={handlePreviewImageLoad}
                  style={{ transform: `translate3d(${previewOffset.x}px, ${previewOffset.y}px, 0) scale(${previewScale})` }}
                />
              ) : previewMermaid ? (
                <div
                  ref={lightboxMermaidRef}
                  className="preview-lightbox__mermaid markdown-body"
                  style={{
                    transform: `translate3d(${previewOffset.x}px, ${previewOffset.y}px, 0) scale(${previewScale})`,
                  } as CSSProperties}
                />
              ) : null}
            </div>

            <div className="preview-lightbox__footer">
              <div className="preview-lightbox__caption">{previewLightboxCaption}</div>
              <div className="preview-lightbox__status">{previewLightboxStatus}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
