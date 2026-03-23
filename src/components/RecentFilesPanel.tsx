import { PaneHeader } from "./PaneHeader";

type RecentFilesPanelProps = {
  currentFilePath: string | null;
  files: string[];
  onOpenFile: (filePath: string) => void;
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

export function RecentFilesPanel(props: RecentFilesPanelProps) {
  return (
    <section className="recent-files-panel">
      <PaneHeader
        title="最近文件"
        meta={props.files.length === 0 ? "还没有历史记录" : "本地历史快速打开"}
        badge={String(props.files.length)}
        icon={<HistoryIcon />}
      />
      {props.files.length === 0 ? (
        <p className="recent-files-panel__empty">还没有最近打开的 Markdown 文件</p>
      ) : (
        <ul className="recent-files-panel__list">
          {props.files.map((filePath) => {
            const active = props.currentFilePath === filePath;

            return (
              <li key={filePath}>
                <button
                  type="button"
                  className={`recent-files-panel__button${active ? " recent-files-panel__button--active" : ""}`}
                  onClick={() => props.onOpenFile(filePath)}
                >
                  <span className="recent-files-panel__name">{getFileName(filePath)}</span>
                  <span className="recent-files-panel__path">{filePath}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
