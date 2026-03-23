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
        --text: #0f172a;
        --muted: #475569;
        --border: #e2e8f0;
        --accent: #2563eb;
        --code: #0f172a;
      }
      html[data-theme="dark"] {
        --bg: #0f172a;
        --panel: #111827;
        --text: #e5e7eb;
        --muted: #94a3b8;
        --border: #1f2937;
        --accent: #60a5fa;
        --code: #020617;
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
      .export-toc ul { list-style: none; padding: 0; margin: 0; }
      .export-toc a { color: var(--muted); text-decoration: none; }
      .export-toc .level-2, .export-toc .level-3, .export-toc .level-4 { margin-left: 12px; }
      article { min-width: 0; }
      h1, h2, h3, h4, h5, h6 { color: var(--text); }
      p, li, blockquote { line-height: 1.8; }
      a { color: var(--accent); }
      pre {
        overflow: auto;
        padding: 16px;
        border-radius: 12px;
        background: var(--code);
      }
      code { font-family: "SFMono-Regular", Consolas, monospace; }
      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 12px;
      }
      th, td {
        border: 1px solid var(--border);
        padding: 10px 12px;
      }
      blockquote {
        margin: 0;
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
      <article>${payload.html}</article>
    </main>
  </body>
</html>`;
}

