import { useEffect, useMemo, useRef, useState } from "react";
import { PaneHeader } from "./PaneHeader";

type TocItem = {
  id: string;
  text: string;
  level: number;
};

type TocPanelProps = {
  toc: TocItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

type TocMeta = TocItem & {
  index: number;
  parentIds: string[];
  hasChildren: boolean;
};

function buildTocMeta(toc: TocItem[]) {
  const stack: Array<{ id: string; level: number }> = [];

  return toc.map((item, index) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    const parentIds = stack.map((entry) => entry.id);
    const nextItem = toc[index + 1];
    const hasChildren = Boolean(nextItem && nextItem.level > item.level);
    const meta: TocMeta = {
      ...item,
      index,
      parentIds,
      hasChildren,
    };

    stack.push({ id: item.id, level: item.level });
    return meta;
  });
}

function TocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function TocPanel(props: TocPanelProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const tocMeta = useMemo(() => buildTocMeta(props.toc), [props.toc]);
  const activeIndex = useMemo(() => tocMeta.findIndex((item) => item.id === props.activeId), [props.activeId, tocMeta]);

  useEffect(() => {
    if (!props.activeId || !listRef.current) {
      return;
    }

    const activeElement = listRef.current.querySelector<HTMLElement>(`[data-toc-id="${props.activeId}"]`);
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [props.activeId]);

  useEffect(() => {
    const validIds = new Set(tocMeta.map((item) => item.id));
    setCollapsedIds((current) => {
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [tocMeta]);

  useEffect(() => {
    if (!props.activeId) {
      return;
    }

    const activeItem = tocMeta.find((item) => item.id === props.activeId);
    if (!activeItem) {
      return;
    }

    setCollapsedIds((current) => {
      const next = new Set(current);
      let changed = false;

      activeItem.parentIds.forEach((id) => {
        if (next.delete(id)) {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [props.activeId, tocMeta]);

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <aside className="toc-panel">
      <PaneHeader
        title="目录"
        meta={props.toc.length === 0 ? "当前文档暂无标题" : "当前文档结构"}
        badge={String(props.toc.length)}
        icon={<TocIcon />}
      />
      <div className="toc-panel__body">
        {props.toc.length === 0 ? (
          <p className="toc-panel__empty">暂无标题</p>
        ) : (
          <ul ref={listRef} className="toc-panel__list">
            {tocMeta.map((item) => {
              const isActive = props.activeId === item.id;
              const isRead = activeIndex >= 0 && item.index < activeIndex;
              const canCollapse = item.hasChildren && item.level <= 3;
              const isCollapsed = collapsedIds.has(item.id);
              const isHidden = item.parentIds.some((id) => collapsedIds.has(id));

              return (
                <li
                  key={item.id}
                  className={`toc-panel__item toc-panel__item--level-${item.level}${isHidden ? " toc-panel__item--hidden" : ""}`}
                >
                  <div className="toc-panel__row">
                    {canCollapse ? (
                      <button
                        type="button"
                        className={`toc-panel__toggle${isCollapsed ? " toc-panel__toggle--collapsed" : ""}`}
                        onClick={() => handleToggleCollapse(item.id)}
                        aria-label={isCollapsed ? `展开 ${item.text}` : `折叠 ${item.text}`}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="toc-panel__toggle-icon" aria-hidden="true">
                          <ChevronIcon />
                        </span>
                      </button>
                    ) : (
                      <span className="toc-panel__toggle-spacer" aria-hidden="true" />
                    )}
                    <button
                      type="button"
                      className={`toc-panel__link${isActive ? " toc-panel__link--active" : ""}${isRead ? " toc-panel__link--read" : ""}`}
                      data-toc-id={item.id}
                      onClick={() => props.onSelect(item.id)}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {item.text}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
