import { useEffect, useMemo, useState } from "react";
import type { DocumentDiagnostic } from "../lib/markdown/diagnostics";
import { summarizeDiagnostics } from "../lib/markdown/diagnostics";

type DiagnosticSeverityFilter = "all" | DocumentDiagnostic["severity"];

type DocumentHealthDialogProps = {
  diagnostics: DocumentDiagnostic[];
  mode: "manual" | "export";
  exportKind?: "html" | "pdf";
  onClose: () => void;
  onSelectDiagnostic: (diagnostic: DocumentDiagnostic) => void;
  onPreviewDiagnostic: (diagnostic: DocumentDiagnostic) => void;
  onConfirmExport?: () => void;
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v6c0 4.97 2.84 8.7 7 10 4.16-1.3 7-5.03 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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

export function DocumentHealthDialog(props: DocumentHealthDialogProps) {
  const [severityFilter, setSeverityFilter] = useState<DiagnosticSeverityFilter>("all");
  const [activeDiagnosticId, setActiveDiagnosticId] = useState<string | null>(props.diagnostics[0]?.id ?? null);
  const summary = summarizeDiagnostics(props.diagnostics);
  const hasIssues = props.diagnostics.length > 0;
  const filteredDiagnostics = useMemo(() => {
    if (severityFilter === "all") {
      return props.diagnostics;
    }

    return props.diagnostics.filter((diagnostic) => diagnostic.severity === severityFilter);
  }, [props.diagnostics, severityFilter]);
  const activeDiagnostic = filteredDiagnostics.find((diagnostic) => diagnostic.id === activeDiagnosticId) ?? filteredDiagnostics[0] ?? null;
  const hasFilteredIssues = filteredDiagnostics.length > 0;
  const heading = props.mode === "export" ? `导出前检查 · ${props.exportKind?.toUpperCase() ?? "导出"}` : "健康检查";
  const subheading = hasIssues
    ? `错误 ${summary.error} · 警告 ${summary.warning} · 提示 ${summary.info}`
    : "当前文档未发现明显交付风险";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.onClose]);

  useEffect(() => {
    if (filteredDiagnostics.length === 0) {
      setActiveDiagnosticId(null);
      return;
    }

    if (!filteredDiagnostics.some((diagnostic) => diagnostic.id === activeDiagnosticId)) {
      setActiveDiagnosticId(filteredDiagnostics[0].id);
    }
  }, [activeDiagnosticId, filteredDiagnostics]);

  const handleJumpToNextDiagnostic = () => {
    if (filteredDiagnostics.length === 0) {
      return;
    }

    const currentIndex = activeDiagnostic ? filteredDiagnostics.findIndex((diagnostic) => diagnostic.id === activeDiagnostic.id) : -1;
    const nextDiagnostic = filteredDiagnostics[(currentIndex + 1 + filteredDiagnostics.length) % filteredDiagnostics.length];
    setActiveDiagnosticId(nextDiagnostic.id);
    props.onPreviewDiagnostic(nextDiagnostic);
  };

  const filterOptions: Array<{ key: DiagnosticSeverityFilter; label: string; count: number }> = [
    { key: "all", label: "全部", count: summary.total },
    { key: "error", label: "错误", count: summary.error },
    { key: "warning", label: "警告", count: summary.warning },
    { key: "info", label: "提示", count: summary.info },
  ];

  const nextActionLabel = severityFilter === "all" ? "跳到下一条问题" : `跳到下一条${getDiagnosticSeverityLabel(severityFilter)}`;

  return (
    <div className="health-check-dialog" role="dialog" aria-modal="true" aria-label={heading} onClick={props.onClose}>
      <div className="health-check-dialog__panel" onClick={(event) => event.stopPropagation()}>
        <div className="health-check-dialog__header">
          <div className="health-check-dialog__title-wrap">
            <span className="health-check-dialog__icon" aria-hidden="true">
              <ShieldIcon />
            </span>
            <div className="health-check-dialog__copy">
              <strong className="health-check-dialog__title">{heading}</strong>
              <span className="health-check-dialog__meta">{subheading}</span>
            </div>
          </div>
          <button type="button" className="health-check-dialog__close" onClick={props.onClose} aria-label="关闭健康检查弹窗">
            <CloseIcon />
          </button>
        </div>

        {hasIssues ? (
          <div className="health-check-dialog__toolbar">
            <div className="health-check-dialog__filters" aria-label="按严重级别筛选">
              {filterOptions.map((option) => {
                const active = severityFilter === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`health-check-dialog__filter ${active ? "health-check-dialog__filter--active" : ""}`}
                    aria-pressed={active}
                    onClick={() => setSeverityFilter(option.key)}
                  >
                    <span>{option.label}</span>
                    <span className="health-check-dialog__filter-count">{option.count}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="health-check-dialog__jump" onClick={handleJumpToNextDiagnostic} disabled={!hasFilteredIssues}>
              {nextActionLabel}
            </button>
          </div>
        ) : null}

        {hasFilteredIssues ? (
          <ul className="health-check-dialog__list">
            {filteredDiagnostics.map((diagnostic) => (
              <li
                key={diagnostic.id}
                className={`document-health-panel__item document-health-panel__item--${diagnostic.severity} ${activeDiagnostic?.id === diagnostic.id ? "document-health-panel__item--active" : ""}`}
              >
                <button
                  type="button"
                  className="document-health-panel__button"
                  onClick={() => props.onSelectDiagnostic(diagnostic)}
                >
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
        ) : hasIssues ? (
          <p className="health-check-dialog__empty">当前筛选条件下没有问题，可以切换严重级别查看其他检查结果。</p>
        ) : (
          <p className="health-check-dialog__empty">看起来很不错，目前没有发现会明显影响交付的结构问题。</p>
        )}

        <div className="health-check-dialog__footer">
          {props.mode === "export" ? (
            <>
              <button type="button" className="health-check-dialog__action" onClick={props.onClose}>
                取消导出
              </button>
              <button type="button" className="health-check-dialog__action health-check-dialog__action--primary" onClick={props.onConfirmExport}>
                继续导出 {props.exportKind?.toUpperCase()}
              </button>
            </>
          ) : (
            <button type="button" className="health-check-dialog__action health-check-dialog__action--primary" onClick={props.onClose}>
              知道了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
