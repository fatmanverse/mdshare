type RecentFilesPanelProps = {
  currentFilePath: string | null;
  files: string[];
  onOpenFile: (filePath: string) => void;
};

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

export function RecentFilesPanel(props: RecentFilesPanelProps) {
  return (
    <section className="recent-files-panel">
      <div className="pane__header">最近文件</div>
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
