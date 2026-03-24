import type { DocumentDiagnostic } from "../lib/markdown/diagnostics";
import { summarizeDiagnostics } from "../lib/markdown/diagnostics";
import { PaneHeader } from "./PaneHeader";

type DocumentHealthPanelProps = {
  diagnostics: DocumentDiagnostic[];
  onSelectDiagnostic: (diagnostic: DocumentDiagnostic) => void;
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v6c0 4.97 2.84 8.7 7 10 4.16-1.3 7-5.03 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.7" />
    </svg>
  );
}

function getDiagnosticSeverityLabel(severity: DocumentDiagnostic["severity"]) {
  switch (severity) {
    case "error":
      return "错误";
    case "warning":
      return "警告";
    default:
      return "提示";
  }
}

export function DocumentHealthPanel(props: DocumentHealthPanelProps) {
  const summary = summarizeDiagnostics(props.diagnostics);
  const headerMeta =
    props.diagnostics.length === 0 ? "当前文档未发现明显交付风险" : `错误 ${summary.error} · 警告 ${summary.warning} · 提示 ${summary.info}`;

  return (
    <aside className="document-health-panel">
      <PaneHeader title="健康检查" meta={headerMeta} badge={String(summary.total)} icon={<ShieldIcon />} />
      {props.diagnostics.length === 0 ? (
        <p className="document-health-panel__empty">看起来很不错，目前没有发现会明显影响交付的结构问题。</p>
      ) : (
        <ul className="document-health-panel__list">
          {props.diagnostics.map((diagnostic) => (
            <li key={diagnostic.id} className={`document-health-panel__item document-health-panel__item--${diagnostic.severity}`}>
              <button type="button" className="document-health-panel__button" onClick={() => props.onSelectDiagnostic(diagnostic)}>
                <span className={`document-health-panel__severity document-health-panel__severity--${diagnostic.severity}`}>
                  {getDiagnosticSeverityLabel(diagnostic.severity)}
                </span>
                <span className="document-health-panel__content">
                  <strong className="document-health-panel__title">{diagnostic.title}</strong>
                  <span className="document-health-panel__description">{diagnostic.description}</span>
                </span>
                {diagnostic.line ? <span className="document-health-panel__line">L{diagnostic.line}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
