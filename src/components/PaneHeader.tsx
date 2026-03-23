import type { ReactNode } from "react";

type PaneHeaderProps = {
  title: string;
  meta: string;
  badge?: string;
  icon: ReactNode;
};

export function PaneHeader(props: PaneHeaderProps) {
  return (
    <div className="pane__header">
      <div className="pane__header-main">
        <span className="pane__header-icon" aria-hidden="true">
          {props.icon}
        </span>
        <div className="pane__header-copy">
          <strong className="pane__header-title">{props.title}</strong>
          <span className="pane__header-meta">{props.meta}</span>
        </div>
      </div>
      {props.badge ? <span className="pane__header-badge">{props.badge}</span> : null}
    </div>
  );
}
