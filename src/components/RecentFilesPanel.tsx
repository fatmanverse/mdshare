import { PaneHeader } from "./PaneHeader";

type RecentFilesPanelProps = {
  currentFilePath: string | null;
  files: string[];
  onOpenFile: (filePath: string) => void;
  onRemoveFile: (filePath: string) => void;
  onClearFiles: () => void;
};

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function RecentFilesPanel(props: RecentFilesPanelProps) {
  return (
    <section className="recent-files-panel">
      <PaneHeader
        title="最近文件"
        meta={props.files.length === 0 ? "还没有历史记录" : "本地历史快速打开"}
        badge={String(props.files.length)}
        icon={<HistoryIcon />}
        actions={
          props.files.length > 0 ? (
            <button type="button" className="pane__header-action" onClick={props.onClearFiles} title="清空最近历史">
              清空历史
            </button>
          ) : null
        }
      />
      {props.files.length === 0 ? (
        <p className="recent-files-panel__empty">还没有最近打开的 Markdown 文件</p>
      ) : (
        <ul className="recent-files-panel__list">
          {props.files.map((filePath) => {
            const active = props.currentFilePath === filePath;
            const fileName = getFileName(filePath);

            return (
              <li
                key={filePath}
                className={`recent-files-panel__item${active ? " recent-files-panel__item--active" : ""}`}
                title={filePath}
              >
                <button
                  type="button"
                  className="recent-files-panel__button"
                  onClick={() => props.onOpenFile(filePath)}
                  title={filePath}
                >
                  <span className="recent-files-panel__content">
                    <span className="recent-files-panel__name" title={fileName}>
                      {fileName}
                    </span>
                    <span className="recent-files-panel__path" title={filePath}>
                      {filePath}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="recent-files-panel__remove"
                  onClick={() => props.onRemoveFile(filePath)}
                  aria-label={`从最近历史中删除 ${fileName}`}
                  title={`从最近历史中删除 ${fileName}`}
                >
                  <RemoveIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
