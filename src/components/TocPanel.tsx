type TocPanelProps = {
  toc: Array<{ id: string; text: string; level: number }>;
};

export function TocPanel(props: TocPanelProps) {
  return (
    <aside className="toc-panel">
      <div className="pane__header">目录</div>
      {props.toc.length === 0 ? (
        <p className="toc-panel__empty">暂无标题</p>
      ) : (
        <ul className="toc-panel__list">
          {props.toc.map((item) => (
            <li key={item.id} className={`toc-panel__item toc-panel__item--level-${item.level}`}>
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

