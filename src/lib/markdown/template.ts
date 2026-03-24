import { getExportPreset, type ExportPreset } from "./export-preset";
import { buildRenderStyleCssVariableText } from "./render-style";
import type { TocItem } from "./parser";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderToc(toc: TocItem[]) {
  if (toc.length === 0) {
    return "";
  }

  const items = toc
    .map((item) => `<li class="toc-item level-${item.level}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`)
    .join("");

  return `<aside class="export-toc"><h2>目录</h2><ul>${items}</ul></aside>`;
}

export function buildExportHtml(payload: {
  title: string;
  html: string;
  toc: TocItem[];
  theme: "light" | "dark";
  exportPreset: ExportPreset;
}) {
  const preset = getExportPreset(payload.exportPreset);
  const hasToc = preset.showToc && payload.toc.length > 0;
  const renderStyleVariables = buildRenderStyleCssVariableText(preset.renderStyle);
  const escapedTitle = escapeHtml(payload.title);
  const headerMarkup = preset.headerText ? `<header class="export-header">${escapeHtml(preset.headerText)}</header>` : "";
  const titleBlockMarkup = preset.showTitleBlock
    ? `<section class="export-title-block"><p class="export-eyebrow">${escapeHtml(preset.titleBlockEyebrow)}</p><h1 class="export-title">${escapedTitle}</h1><p class="export-description">${escapeHtml(preset.titleBlockDescription)}</p></section>`
    : "";
  const footerMarkup = preset.footerText ? `<footer class="export-footer">${escapeHtml(preset.footerText)}</footer>` : "";

  return `<!doctype html>
<html lang="zh-CN" data-theme="${payload.theme}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapedTitle}</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f8fafc;
        --panel: #ffffff;
        --code-inline: #e0e7ff;
        --text: #0f172a;
        --muted: #64748b;
        --border: #dbe2ea;
        --accent: #2563eb;
        --accent-soft: rgba(37, 99, 235, 0.12);
        --code: #0f172a;
        --code-text: #e2e8f0;
        --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        ${renderStyleVariables}
      }
      html[data-theme="dark"] {
        --bg: #020617;
        --panel: #0f172a;
        --code-inline: rgba(148, 163, 184, 0.18);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --border: #1e293b;
        --accent: #60a5fa;
        --accent-soft: rgba(96, 165, 250, 0.18);
        --code: #020617;
        --code-text: #e2e8f0;
        --shadow: none;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .export-shell {
        max-width: var(--mdshare-page-max-width, 1200px);
        margin: 0 auto;
        padding: var(--mdshare-page-padding, 48px 32px 80px);
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .export-header,
      .export-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--panel);
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }
      .export-title-block {
        padding: 24px 28px;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: linear-gradient(180deg, var(--panel) 0%, rgba(37, 99, 235, 0.06) 100%);
        box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
      }
      .export-eyebrow {
        margin: 0 0 10px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .export-title {
        margin: 0;
        font-size: clamp(30px, 5vw, 42px);
        line-height: 1.15;
      }
      .export-description {
        max-width: min(72ch, 100%);
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.75;
      }
      .page {
        gap: 32px;
      }
      .page--with-toc {
        display: grid;
        grid-template-columns: minmax(220px, var(--mdshare-toc-width, 240px)) minmax(0, 1fr);
      }
      .page--without-toc {
        display: block;
      }
      .export-toc {
        position: sticky;
        top: 24px;
        align-self: start;
        padding: 20px;
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 16px;
      }
      .export-toc h2 {
        margin: 0 0 12px;
        font-size: 18px;
        line-height: 1.4;
      }
      .export-toc ul { list-style: none; padding: 0; margin: 0; }
      .export-toc a { color: var(--muted); text-decoration: none; }
      .export-toc .level-2, .export-toc .level-3, .export-toc .level-4 { margin-left: 12px; }
      .export-body {
        width: 100%;
        max-width: var(--mdshare-content-max-width, 100%);
        min-width: 0;
        margin: 0 auto;
        line-height: var(--mdshare-line-height, 1.8);
      }
      .export-body > :first-child { margin-top: 0; }
      .export-body > :last-child { margin-bottom: 0; }
      .export-body h1,
      .export-body h2,
      .export-body h3,
      .export-body h4,
      .export-body h5,
      .export-body h6 {
        color: var(--text);
        line-height: 1.35;
      }
      .export-body h1 { margin: 0 0 20px; font-size: clamp(28px, 5vw, var(--mdshare-h1-size, 34px)); }
      .export-body h2 { margin: 32px 0 16px; font-size: clamp(24px, 4.3vw, var(--mdshare-h2-size, 28px)); }
      .export-body h3 { margin: 28px 0 14px; font-size: clamp(20px, 3.8vw, var(--mdshare-h3-size, 22px)); }
      .export-body h4 { margin: 24px 0 12px; font-size: clamp(18px, 3.4vw, var(--mdshare-h4-size, 18px)); }
      .export-body p,
      .export-body ul,
      .export-body ol,
      .export-body blockquote,
      .export-body pre,
      .export-body table {
        margin: 0 0 var(--mdshare-block-gap, 16px);
      }
      .export-body ul,
      .export-body ol {
        padding-left: 24px;
      }
      .export-body li + li {
        margin-top: 6px;
      }
      .export-body .callout {
        padding: 14px 16px 16px;
        border: 1px solid var(--callout-border, rgba(37, 99, 235, 0.22));
        border-left: 4px solid var(--callout-accent, var(--accent));
        border-radius: 18px;
        background: var(--callout-bg, var(--panel-secondary));
        color: var(--text);
      }
      .export-body .callout > :last-child {
        margin-bottom: 0;
      }
      .export-body .callout__title {
        margin: 0 0 10px;
        color: var(--callout-accent, var(--accent));
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .export-body .callout--tip {
        --callout-accent: #0f766e;
        --callout-border: rgba(13, 148, 136, 0.28);
        --callout-bg: rgba(20, 184, 166, 0.1);
      }
      .export-body .callout--note {
        --callout-accent: #2563eb;
        --callout-border: rgba(37, 99, 235, 0.24);
        --callout-bg: rgba(37, 99, 235, 0.08);
      }
      .export-body .callout--warning {
        --callout-accent: #d97706;
        --callout-border: rgba(217, 119, 6, 0.28);
        --callout-bg: rgba(245, 158, 11, 0.1);
      }
      .export-body .callout--important {
        --callout-accent: #7c3aed;
        --callout-border: rgba(124, 58, 237, 0.28);
        --callout-bg: rgba(139, 92, 246, 0.1);
      }
      .export-body .callout--caution {
        --callout-accent: #dc2626;
        --callout-border: rgba(220, 38, 38, 0.28);
        --callout-bg: rgba(239, 68, 68, 0.1);
      }
      .export-body a {
        color: var(--accent);
        font-weight: 600;
        text-decoration: underline;
        text-decoration-color: rgba(37, 99, 235, 0.35);
        text-decoration-thickness: 1.5px;
        text-underline-offset: 0.18em;
        border-radius: 6px;
        transition: color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, text-decoration-color 0.16s ease;
      }
      .export-body a:hover {
        color: var(--text);
        background: var(--accent-soft);
        text-decoration-color: transparent;
        box-shadow: 0 0 0 4px var(--accent-soft);
      }
      .export-body pre {
        overflow: auto;
        padding: 16px;
        border-radius: 12px;
        background: var(--code);
        color: var(--code-text);
      }
      .export-body code {
        font-family: "SFMono-Regular", Consolas, monospace;
      }
      .export-body :not(pre) > code {
        padding: 0.15em 0.45em;
        border-radius: 6px;
        background: var(--code-inline);
        color: var(--text);
        font-size: 0.92em;
      }
      .export-body pre code {
        display: block;
        white-space: pre;
        background: transparent;
        color: inherit;
      }
      .export-body .hljs {
        color: var(--code-text);
        background: transparent;
      }
      .export-body .hljs-comment,
      .export-body .hljs-quote {
        color: #94a3b8;
      }
      .export-body .hljs-keyword,
      .export-body .hljs-selector-tag,
      .export-body .hljs-literal,
      .export-body .hljs-type {
        color: #c084fc;
      }
      .export-body .hljs-string,
      .export-body .hljs-title,
      .export-body .hljs-section,
      .export-body .hljs-attribute {
        color: #86efac;
      }
      .export-body .hljs-number,
      .export-body .hljs-symbol,
      .export-body .hljs-bullet {
        color: #fbbf24;
      }
      .export-body .hljs-variable,
      .export-body .hljs-template-variable,
      .export-body .hljs-selector-class,
      .export-body .hljs-selector-id,
      .export-body .hljs-property {
        color: #7dd3fc;
      }
      .export-body .hljs-emphasis {
        font-style: italic;
      }
      .export-body .hljs-strong {
        font-weight: 700;
      }


      .export-body pre.hljs[data-language] {
        position: relative;
        padding-top: 52px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }
      .export-body pre.hljs[data-language]::before {
        content: attr(data-language-label);
        position: absolute;
        top: 12px;
        left: 14px;
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: rgba(15, 23, 42, 0.92);
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .export-body pre.hljs[data-language]::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        border-radius: 12px 12px 0 0;
        background: var(--code-language-accent, #60a5fa);
      }
      .export-body pre.hljs[data-language="shell"] {
        --code-language-accent: #22c55e;
        background: linear-gradient(180deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="shell"]::before {
        border-color: rgba(34, 197, 94, 0.26);
        background: rgba(20, 83, 45, 0.5);
        color: #bbf7d0;
      }
      .export-body pre.hljs[data-language="yaml"] {
        --code-language-accent: #f59e0b;
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="yaml"]::before {
        border-color: rgba(245, 158, 11, 0.26);
        background: rgba(120, 53, 15, 0.5);
        color: #fde68a;
      }
      .export-body pre.hljs[data-language="javascript"] {
        --code-language-accent: #facc15;
        background: linear-gradient(180deg, rgba(250, 204, 21, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="javascript"]::before {
        border-color: rgba(250, 204, 21, 0.26);
        background: rgba(133, 77, 14, 0.48);
        color: #fef08a;
      }
      .export-body pre.hljs[data-language="java"] {
        --code-language-accent: #f97316;
        background: linear-gradient(180deg, rgba(249, 115, 22, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="java"]::before {
        border-color: rgba(249, 115, 22, 0.26);
        background: rgba(124, 45, 18, 0.52);
        color: #fdba74;
      }
      .export-body pre.hljs[data-language="text"] {
        --code-language-accent: #a78bfa;
        background: linear-gradient(180deg, rgba(167, 139, 250, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="text"]::before {
        border-color: rgba(167, 139, 250, 0.26);
        background: rgba(76, 29, 149, 0.42);
        color: #ddd6fe;
      }
      .export-body pre.hljs[data-language="python"] {
        --code-language-accent: #3b82f6;
        background: linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="python"]::before {
        border-color: rgba(59, 130, 246, 0.26);
        background: rgba(30, 64, 175, 0.42);
        color: #bfdbfe;
      }
      .export-body pre.hljs[data-language="sql"],
      .export-body pre.hljs[data-language="postgres"],
      .export-body pre.hljs[data-language="postgresql"],
      .export-body pre.hljs[data-language="mysql"],
      .export-body pre.hljs[data-language="mariadb"],
      .export-body pre.hljs[data-language="sqlite"],
      .export-body pre.hljs[data-language="sqlite3"] {
        --code-language-accent: #06b6d4;
        background: linear-gradient(180deg, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="sql"]::before,
      .export-body pre.hljs[data-language="postgres"]::before,
      .export-body pre.hljs[data-language="postgresql"]::before,
      .export-body pre.hljs[data-language="mysql"]::before,
      .export-body pre.hljs[data-language="mariadb"]::before,
      .export-body pre.hljs[data-language="sqlite"]::before,
      .export-body pre.hljs[data-language="sqlite3"]::before {
        border-color: rgba(6, 182, 212, 0.26);
        background: rgba(8, 47, 73, 0.52);
        color: #a5f3fc;
      }
      .export-body pre.hljs[data-language="json"],
      .export-body pre.hljs[data-language="json5"] {
        --code-language-accent: #ef4444;
        background: linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="json"]::before,
      .export-body pre.hljs[data-language="json5"]::before {
        border-color: rgba(239, 68, 68, 0.26);
        background: rgba(127, 29, 29, 0.5);
        color: #fecaca;
      }
      .export-body pre.hljs[data-language="rust"] {
        --code-language-accent: #f97316;
        background: linear-gradient(180deg, rgba(251, 146, 60, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="rust"]::before {
        border-color: rgba(249, 115, 22, 0.26);
        background: rgba(124, 45, 18, 0.48);
        color: #fdba74;
      }
      .export-body pre.hljs[data-language="go"] {
        --code-language-accent: #14b8a6;
        background: linear-gradient(180deg, rgba(20, 184, 166, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="go"]::before {
        border-color: rgba(20, 184, 166, 0.26);
        background: rgba(17, 94, 89, 0.48);
        color: #99f6e4;
      }
      .export-body pre.hljs[data-language="dockerfile"] {
        --code-language-accent: #60a5fa;
        background: linear-gradient(180deg, rgba(96, 165, 250, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="dockerfile"]::before {
        border-color: rgba(96, 165, 250, 0.26);
        background: rgba(30, 58, 138, 0.48);
        color: #bfdbfe;
      }
      .export-body pre.hljs[data-language="vue"] {
        --code-language-accent: #34d399;
        background: linear-gradient(180deg, rgba(52, 211, 153, 0.12) 0%, rgba(15, 23, 42, 0) 28%), #0f172a;
      }
      .export-body pre.hljs[data-language="vue"]::before {
        border-color: rgba(52, 211, 153, 0.26);
        background: rgba(6, 78, 59, 0.48);
        color: #a7f3d0;
      }
      .export-body pre.hljs[data-language="shell"] .hljs-meta,
      .export-body pre.hljs[data-language="shell"] .hljs-prompt {
        color: #4ade80;
      }
      .export-body pre.hljs[data-language="shell"] .hljs-built_in,
      .export-body pre.hljs[data-language="shell"] .hljs-keyword,
      .export-body pre.hljs[data-language="shell"] .hljs-operator {
        color: #93c5fd;
      }
      .export-body pre.hljs[data-language="shell"] .hljs-string,
      .export-body pre.hljs[data-language="shell"] .hljs-variable,
      .export-body pre.hljs[data-language="shell"] .hljs-subst {
        color: #fcd34d;
      }
      .export-body pre.hljs[data-language="yaml"] .hljs-attr,
      .export-body pre.hljs[data-language="yaml"] .hljs-property {
        color: #7dd3fc;
      }
      .export-body pre.hljs[data-language="yaml"] .hljs-string {
        color: #86efac;
      }
      .export-body pre.hljs[data-language="yaml"] .hljs-number,
      .export-body pre.hljs[data-language="yaml"] .hljs-literal,
      .export-body pre.hljs[data-language="yaml"] .hljs-bullet {
        color: #fbbf24;
      }
      .export-body pre.hljs[data-language="java"] .hljs-keyword,
      .export-body pre.hljs[data-language="java"] .hljs-modifier {
        color: #c084fc;
      }
      .export-body pre.hljs[data-language="java"] .hljs-title,
      .export-body pre.hljs[data-language="java"] .hljs-title.class_,
      .export-body pre.hljs[data-language="java"] .hljs-type {
        color: #fdba74;
      }
      .export-body pre.hljs[data-language="java"] .hljs-annotation {
        color: #f472b6;
      }
      .export-body pre.hljs[data-language="java"] .hljs-string {
        color: #86efac;
      }
      .export-body pre.hljs[data-language="python"] .hljs-keyword,
      .export-body pre.hljs[data-language="python"] .hljs-built_in {
        color: #facc15;
      }
      .export-body pre.hljs[data-language="python"] .hljs-string,
      .export-body pre.hljs[data-language="python"] .hljs-title {
        color: #86efac;
      }
      .export-body pre.hljs[data-language="python"] .hljs-number,
      .export-body pre.hljs[data-language="python"] .hljs-literal {
        color: #f9a8d4;
      }
      .export-body pre.hljs[data-language="sql"] .hljs-keyword,
      .export-body pre.hljs[data-language="postgres"] .hljs-keyword,
      .export-body pre.hljs[data-language="postgresql"] .hljs-keyword,
      .export-body pre.hljs[data-language="mysql"] .hljs-keyword,
      .export-body pre.hljs[data-language="mariadb"] .hljs-keyword,
      .export-body pre.hljs[data-language="sqlite"] .hljs-keyword,
      .export-body pre.hljs[data-language="sqlite3"] .hljs-keyword {
        color: #67e8f9;
      }
      .export-body pre.hljs[data-language="sql"] .hljs-string,
      .export-body pre.hljs[data-language="postgres"] .hljs-string,
      .export-body pre.hljs[data-language="postgresql"] .hljs-string,
      .export-body pre.hljs[data-language="mysql"] .hljs-string,
      .export-body pre.hljs[data-language="mariadb"] .hljs-string,
      .export-body pre.hljs[data-language="sqlite"] .hljs-string,
      .export-body pre.hljs[data-language="sqlite3"] .hljs-string {
        color: #86efac;
      }
      .export-body pre.hljs[data-language="json"] .hljs-attr,
      .export-body pre.hljs[data-language="json5"] .hljs-attr,
      .export-body pre.hljs[data-language="json"] .hljs-property,
      .export-body pre.hljs[data-language="json5"] .hljs-property {
        color: #7dd3fc;
      }
      .export-body pre.hljs[data-language="json"] .hljs-string,
      .export-body pre.hljs[data-language="json5"] .hljs-string {
        color: #86efac;
      }
      .export-body pre.hljs[data-language="json"] .hljs-number,
      .export-body pre.hljs[data-language="json5"] .hljs-number,
      .export-body pre.hljs[data-language="json"] .hljs-literal,
      .export-body pre.hljs[data-language="json5"] .hljs-literal {
        color: #fca5a5;
      }
      .export-body pre.hljs[data-language="rust"] .hljs-keyword,
      .export-body pre.hljs[data-language="rust"] .hljs-built_in {
        color: #fdba74;
      }
      .export-body pre.hljs[data-language="rust"] .hljs-type,
      .export-body pre.hljs[data-language="rust"] .hljs-title {
        color: #c4b5fd;
      }
      .export-body pre.hljs[data-language="go"] .hljs-keyword,
      .export-body pre.hljs[data-language="go"] .hljs-built_in {
        color: #5eead4;
      }
      .export-body pre.hljs[data-language="go"] .hljs-string,
      .export-body pre.hljs[data-language="go"] .hljs-title {
        color: #86efac;
      }
      .export-body pre.hljs[data-language="dockerfile"] .hljs-keyword,
      .export-body pre.hljs[data-language="dockerfile"] .hljs-built_in {
        color: #93c5fd;
      }
      .export-body pre.hljs[data-language="dockerfile"] .hljs-string,
      .export-body pre.hljs[data-language="dockerfile"] .hljs-variable,
      .export-body pre.hljs[data-language="dockerfile"] .hljs-subst {
        color: #fcd34d;
      }
      .export-body pre.hljs[data-language="vue"] .hljs-tag,
      .export-body pre.hljs[data-language="vue"] .hljs-name,
      .export-body pre.hljs[data-language="vue"] .hljs-selector-tag {
        color: #6ee7b7;
      }
      .export-body pre.hljs[data-language="vue"] .hljs-attr,
      .export-body pre.hljs[data-language="vue"] .hljs-attribute {
        color: #93c5fd;
      }
      .export-body pre.hljs[data-language="vue"] .hljs-string {
        color: #fcd34d;
      }
      .export-body table {
        width: 100%;
        border-collapse: collapse;
      }
      .export-body th, .export-body td {
        border: 1px solid var(--border);
        padding: 10px 12px;
      }
      .export-body blockquote {
        padding-left: 16px;
        border-left: 4px solid var(--accent);
        color: var(--muted);
      }
      .export-body img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 18px 0;
        border-radius: var(--mdshare-image-radius, 16px);
        box-shadow: var(--mdshare-image-shadow, var(--shadow));
      }
      .export-body .mermaid-preview {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: linear-gradient(180deg, var(--panel) 0%, var(--accent-soft) 100%);
        overflow: auto;
      }
      .export-body .mermaid-preview[data-mermaid-layout="wide"] {
        align-items: flex-start;
      }
      .export-body .mermaid-preview__diagram {
        width: min(100%, var(--mermaid-fit-width, 960px));
        max-width: 100%;
        min-width: 0;
      }
      .export-body .mermaid-preview[data-mermaid-layout="wide"] .mermaid-preview__diagram {
        margin: 0;
      }
      .export-body .mermaid-preview:not([data-mermaid-layout="wide"]) .mermaid-preview__diagram {
        margin: 0 auto;
      }
      .export-body .mermaid-preview svg {
        display: block;
        width: 100% !important;
        max-width: none;
        height: auto !important;
        margin: 0;
      }
      .export-body .mermaid-preview__code {
        width: 100%;
        min-width: 0;
        margin: 0;
        padding-top: 16px;
      }
      .export-body .mermaid-preview[data-mermaid-state="error"] {
        justify-content: center;
        min-height: 164px;
        border-color: rgba(245, 158, 11, 0.28);
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, rgba(245, 158, 11, 0.06) 100%);
        box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.08);
        overflow: hidden;
      }
      .export-body .mermaid-preview__error {
        display: grid;
        gap: 8px;
        width: 100%;
        min-height: 100%;
        padding: 18px 20px;
        border: 1px solid rgba(245, 158, 11, 0.26);
        border-radius: 14px;
        background: rgba(255, 251, 235, 0.78);
        color: #b45309;
        font-size: 13px;
        line-height: 1.6;
        align-content: center;
      }
      .export-body .mermaid-preview__error-title {
        color: #92400e;
        font-size: 12px;
        font-weight: 800;
      }
      .export-body .mermaid-preview__error-message {
        color: inherit;
        word-break: break-word;
      }
      .export-body .mermaid-preview__error-hint {
        color: #a16207;
      }
      html[data-theme="dark"] .export-body .mermaid-preview[data-mermaid-state="error"] {
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.16) 0%, rgba(120, 53, 15, 0.14) 100%);
      }
      html[data-theme="dark"] .export-body .mermaid-preview__error {
        border-color: rgba(251, 191, 36, 0.24);
        background: rgba(68, 35, 7, 0.42);
        color: #fcd34d;
      }
      html[data-theme="dark"] .export-body .mermaid-preview__error-title {
        color: #fde68a;
      }
      html[data-theme="dark"] .export-body .mermaid-preview__error-hint {
        color: #fbbf24;
      }
      @media (max-width: 900px) {
        .export-shell {
          padding: 32px 20px 56px;
        }
        .export-title-block {
          padding: 20px;
        }
        .export-title {
          font-size: clamp(26px, 8vw, 34px);
        }
        .page {
          gap: 20px;
        }
        .page--with-toc {
          grid-template-columns: 1fr;
        }
        .export-toc {
          position: static;
          top: auto;
        }
      }
      @media print {
        .export-shell {
          display: block;
          max-width: none;
          padding: 16mm 14mm;
        }
        .export-header,
        .export-footer,
        .export-title-block {
          box-shadow: none;
        }
        .page {
          display: block;
        }
        .export-toc {
          position: static;
          margin-bottom: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="export-shell">
      ${headerMarkup}
      ${titleBlockMarkup}
      <main class="page ${hasToc ? "page--with-toc" : "page--without-toc"}">
        ${hasToc ? renderToc(payload.toc) : ""}
        <article class="export-body">${payload.html}</article>
      </main>
      ${footerMarkup}
    </div>
  </body>
</html>`;
}
