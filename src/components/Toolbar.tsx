type ToolbarProps = {
  title: string;
  theme: "light" | "dark";
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onToggleTheme: () => void;
};

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <strong className="toolbar__brand">mdshare</strong>
        <span className="toolbar__title">{props.title}</span>
      </div>
      <div className="toolbar__group toolbar__group--actions">
        <button onClick={props.onNew}>新建</button>
        <button onClick={props.onOpen}>打开</button>
        <button onClick={props.onSave}>保存</button>
        <button onClick={props.onSaveAs}>另存为</button>
        <button onClick={props.onExportHtml}>导出 HTML</button>
        <button onClick={props.onExportPdf}>导出 PDF</button>
        <button onClick={props.onToggleTheme}>{props.theme === "light" ? "深色" : "浅色"}</button>
      </div>
    </header>
  );
}

