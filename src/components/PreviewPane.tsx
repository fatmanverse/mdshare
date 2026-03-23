type PreviewPaneProps = {
  html: string;
};

export function PreviewPane(props: PreviewPaneProps) {
  return (
    <section className="pane pane--preview">
      <div className="pane__header">Preview</div>
      <div className="preview markdown-body" dangerouslySetInnerHTML={{ __html: props.html }} />
    </section>
  );
}

