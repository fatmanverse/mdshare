import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { PaneHeader } from "./PaneHeader";

type PreviewPaneProps = {
  html: string;
  containerRef: RefObject<HTMLDivElement>;
  onActiveHeadingChange: (id: string | null) => void;
  onNotify: (message: string) => void;
};

type PreviewImage = {
  alt: string;
  src: string;
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

export function PreviewPane(props: PreviewPaneProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewScale, setPreviewScale] = useState(MIN_PREVIEW_SCALE);
  const [previewOffset, setPreviewOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const lightboxFrameRef = useRef<HTMLDivElement | null>(null);
  const lightboxImageRef = useRef<HTMLImageElement | null>(null);
  const previewDragRef = useRef<DragState | null>(null);

  const previewImage = previewIndex === null ? null : previewImages[previewIndex] ?? null;
  const hasPreviousPreviewImage = previewIndex !== null && previewIndex > 0;
  const hasNextPreviewImage = previewIndex !== null && previewIndex < previewImages.length - 1;
  const hasPreviewTransform = previewScale > MIN_PREVIEW_SCALE || previewOffset.x !== 0 || previewOffset.y !== 0;

  const clampPreviewOffset = useCallback((offset: Offset, scale: number) => {
    if (scale <= MIN_PREVIEW_SCALE) {
      return { x: 0, y: 0 };
    }

    const frame = lightboxFrameRef.current;
    const image = lightboxImageRef.current;
    if (!frame || !image) {
      return offset;
    }

    const maxX = Math.max(0, (image.offsetWidth * scale - frame.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * scale - frame.clientHeight) / 2);

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

  const closePreviewImage = useCallback(() => {
    previewDragRef.current = null;
    setIsDraggingPreview(false);
    setPreviewImages([]);
    setPreviewIndex(null);
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
    if (!previewImage) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreviewImage();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousPreviewImage();
        return;
      }

      if (event.key === "ArrowRight") {
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
  }, [closePreviewImage, previewImage, resetPreviewTransform, showNextPreviewImage, showPreviousPreviewImage, zoomInPreviewImage, zoomOutPreviewImage]);

  useEffect(() => {
    if (!isDraggingPreview || !previewImage) {
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
  }, [clampPreviewOffset, isDraggingPreview, previewImage, previewScale]);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    const handleResize = () => {
      setPreviewOffset((currentOffset) => clampPreviewOffset(currentOffset, previewScale));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPreviewOffset, previewImage, previewScale]);

  const handlePreviewClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const container = props.containerRef.current;
      const target = event.target;
      if (!container || !(target instanceof HTMLElement)) {
        return;
      }

      const image = target.closest("img");
      if (!(image instanceof HTMLImageElement)) {
        return;
      }

      event.preventDefault();
      const { imageElements, images } = readPreviewImages(container);
      const nextIndex = imageElements.findIndex((item) => item === image);
      if (nextIndex < 0 || !images[nextIndex]) {
        return;
      }

      setPreviewImages(images);
      setPreviewIndex(nextIndex);
      setPreviewScale(MIN_PREVIEW_SCALE);
      setPreviewOffset({ x: 0, y: 0 });
      setIsDraggingPreview(false);
      previewDragRef.current = null;
    },
    [props.containerRef],
  );

  const handlePreviewWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
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

  return (
    <>
      <section className="pane pane--preview">
        <PaneHeader title="Preview" meta="实时成品预览" badge="Live" icon={<PreviewIcon />} />
        <div
          ref={props.containerRef}
          className="preview markdown-body"
          dangerouslySetInnerHTML={{ __html: props.html }}
          onClick={handlePreviewClick}
        />
      </section>

      {previewImage ? (
        <div className="preview-lightbox" role="dialog" aria-modal="true" aria-label="图片预览" onClick={closePreviewImage}>
          <div className="preview-lightbox__dialog" onClick={(event) => event.stopPropagation()}>
            <div className="preview-lightbox__toolbar">
              <div className="preview-lightbox__meta">
                <span className="preview-lightbox__counter">
                  {previewIndex === null ? 0 : previewIndex + 1} / {previewImages.length}
                </span>
                <span className="preview-lightbox__toolbar-hint">← → 切换 · 滚轮缩放 · 双击快速放大</span>
              </div>

              <div className="preview-lightbox__actions">
                <button type="button" className="preview-lightbox__action" onClick={showPreviousPreviewImage} disabled={!hasPreviousPreviewImage}>
                  上一张
                </button>
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
                <button type="button" className="preview-lightbox__action" onClick={showNextPreviewImage} disabled={!hasNextPreviewImage}>
                  下一张
                </button>
                <button type="button" className="preview-lightbox__close" onClick={closePreviewImage} aria-label="关闭图片预览">
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div
              ref={lightboxFrameRef}
              className={`preview-lightbox__frame${previewScale > MIN_PREVIEW_SCALE ? " preview-lightbox__frame--zoomed" : ""}${isDraggingPreview ? " preview-lightbox__frame--dragging" : ""}`}
              onWheel={handlePreviewWheel}
              onPointerDown={handlePreviewPointerDown}
              onDoubleClick={handlePreviewDoubleClick}
            >
              <img
                ref={lightboxImageRef}
                className="preview-lightbox__image"
                src={previewImage.src}
                alt={previewImage.alt}
                draggable={false}
                onLoad={handlePreviewImageLoad}
                style={{ transform: `translate3d(${previewOffset.x}px, ${previewOffset.y}px, 0) scale(${previewScale})` }}
              />
            </div>

            <div className="preview-lightbox__footer">
              <div className="preview-lightbox__caption">{previewImage.alt}</div>
              <div className="preview-lightbox__status">
                {previewScale > MIN_PREVIEW_SCALE ? "已放大，可直接拖拽查看细节，按 0 可重置" : "双击或滚轮缩放，Esc 可快速关闭"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
