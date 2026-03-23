import type { TocItem } from "./parser";

function renderToc(toc: TocItem[]) {
  if (toc.length === 0) {
    return "";
  }

  const items = toc
    .map(
      (item) =>
        `<li class="toc-item level-${item.level}"><a href="#${item.id}">${item.text}</a></li>`,
    )
    .join("");

  return `<aside class="export-toc"><h2>目录</h2><ul>${items}</ul></aside>`;
}

export function buildExportHtml(payload: {
  title: string;
  html: string;
  toc: TocItem[];
  theme: "light" | "dark";
}) {
  return `<!doctype html>
<html lang="zh-CN" data-theme="${payload.theme}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${payload.title}</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #ffffff;
        --panel: #f8fafc;
        --code-inline: #eef2ff;
        --text: #0f172a;
        --muted: #475569;
        --border: #e2e8f0;
        --accent: #2563eb;
        --code: #0f172a;
        --code-text: #e2e8f0;
      }
      html[data-theme="dark"] {
        --bg: #0f172a;
        --panel: #111827;
        --code-inline: rgba(148, 163, 184, 0.18);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --border: #1f2937;
        --accent: #60a5fa;
        --code: #020617;
        --code-text: #e5e7eb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 48px 32px 80px;
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 32px;
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
      .export-body { min-width: 0; line-height: 1.8; }
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
      .export-body h1 { margin: 0 0 20px; font-size: 34px; }
      .export-body h2 { margin: 32px 0 16px; font-size: 28px; }
      .export-body h3 { margin: 28px 0 14px; font-size: 22px; }
      .export-body h4 { margin: 24px 0 12px; font-size: 18px; }
      .export-body p,
      .export-body ul,
      .export-body ol,
      .export-body blockquote,
      .export-body pre,
      .export-body table {
        margin: 0 0 16px;
      }
      .export-body ul,
      .export-body ol {
        padding-left: 24px;
      }
      .export-body li + li {
        margin-top: 6px;
      }
      .export-body a { color: var(--accent); }
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
      .export-body table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 12px;
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
      @media print {
        .page {
          display: block;
          max-width: none;
          padding: 16mm 14mm;
        }
        .export-toc {
          position: static;
          margin-bottom: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      ${renderToc(payload.toc)}
      <article class="export-body">${payload.html}</article>
    </main>
  </body>
</html>`;
}
