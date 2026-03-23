type StatusBarProps = {
  isDirty: boolean;
  lastSavedAt: number | null;
  lastAutosavedAt: number | null;
  words: number;
  lines: number;
};

function formatTime(timestamp: number | null) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleTimeString();
}

export function StatusBar(props: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span>{props.isDirty ? "未保存" : "已保存"}</span>
      <span>字数 {props.words}</span>
      <span>行数 {props.lines}</span>
      <span>上次保存 {formatTime(props.lastSavedAt)}</span>
      <span>自动保存 {formatTime(props.lastAutosavedAt)}</span>
    </footer>
  );
}

