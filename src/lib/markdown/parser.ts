import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { renderMermaidPreview } from "./mermaid";

export type TocItem = {
  id: string;
  text: string;
  level: number;
  line: number;
};

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type HighlightPresentation = {
  displayLanguage: string;
  displayLabel: string;
  highlightLanguage: string | null;
};

type CalloutKind = "tip" | "note" | "warning" | "important" | "caution";

type CalloutDescriptor = {
  kind: CalloutKind;
  label: string;
  body: string;
};

const LANGUAGE_ALIASES: Record<string, Omit<HighlightPresentation, "highlightLanguage"> & { highlightLanguage: string }> = {
  shell: { displayLanguage: "shell", displayLabel: "Shell", highlightLanguage: "bash" },
  sh: { displayLanguage: "shell", displayLabel: "Shell", highlightLanguage: "bash" },
  bash: { displayLanguage: "shell", displayLabel: "Shell", highlightLanguage: "bash" },
  zsh: { displayLanguage: "shell", displayLabel: "Shell", highlightLanguage: "bash" },
  console: { displayLanguage: "shell", displayLabel: "Shell", highlightLanguage: "bash" },
  shellsession: { displayLanguage: "shell", displayLabel: "Shell", highlightLanguage: "bash" },
  text: { displayLanguage: "text", displayLabel: "Text", highlightLanguage: "text" },
  txt: { displayLanguage: "text", displayLabel: "Text", highlightLanguage: "text" },
  plain: { displayLanguage: "text", displayLabel: "Text", highlightLanguage: "text" },
  plaintext: { displayLanguage: "text", displayLabel: "Text", highlightLanguage: "text" },
  yaml: { displayLanguage: "yaml", displayLabel: "YAML", highlightLanguage: "yaml" },
  yml: { displayLanguage: "yaml", displayLabel: "YAML", highlightLanguage: "yaml" },
  javascript: { displayLanguage: "javascript", displayLabel: "JavaScript", highlightLanguage: "javascript" },
  js: { displayLanguage: "javascript", displayLabel: "JavaScript", highlightLanguage: "javascript" },
  jsx: { displayLanguage: "javascript", displayLabel: "JavaScript", highlightLanguage: "jsx" },
  python: { displayLanguage: "python", displayLabel: "Python", highlightLanguage: "python" },
  py: { displayLanguage: "python", displayLabel: "Python", highlightLanguage: "python" },
  sql: { displayLanguage: "sql", displayLabel: "SQL", highlightLanguage: "sql" },
  json: { displayLanguage: "json", displayLabel: "JSON", highlightLanguage: "json" },
  jsonc: { displayLanguage: "json", displayLabel: "JSON", highlightLanguage: "json" },
  rust: { displayLanguage: "rust", displayLabel: "Rust", highlightLanguage: "rust" },
  rs: { displayLanguage: "rust", displayLabel: "Rust", highlightLanguage: "rust" },
  go: { displayLanguage: "go", displayLabel: "Go", highlightLanguage: "go" },
  java: { displayLanguage: "java", displayLabel: "Java", highlightLanguage: "java" },
  react: { displayLanguage: "react", displayLabel: "React", highlightLanguage: "jsx" },
  vue: { displayLanguage: "vue", displayLabel: "Vue", highlightLanguage: "xml" },
  svelte: { displayLanguage: "svelte", displayLabel: "Svelte", highlightLanguage: "xml" },
  astro: { displayLanguage: "astro", displayLabel: "Astro", highlightLanguage: "xml" },
  json5: { displayLanguage: "json5", displayLabel: "JSON5", highlightLanguage: "json" },
  env: { displayLanguage: "env", displayLabel: "ENV", highlightLanguage: "properties" },
  dotenv: { displayLanguage: "dotenv", displayLabel: "Dotenv", highlightLanguage: "properties" },
  node: { displayLanguage: "node", displayLabel: "Node.js", highlightLanguage: "javascript" },
  nodejs: { displayLanguage: "nodejs", displayLabel: "Node.js", highlightLanguage: "javascript" },
  golang: { displayLanguage: "go", displayLabel: "Go", highlightLanguage: "go" },
  "objective-c": { displayLanguage: "objective-c", displayLabel: "Objective-C", highlightLanguage: "objc" },
  postgres: { displayLanguage: "postgres", displayLabel: "PostgreSQL", highlightLanguage: "pgsql" },
  postgresql: { displayLanguage: "postgresql", displayLabel: "PostgreSQL", highlightLanguage: "pgsql" },
  mysql: { displayLanguage: "mysql", displayLabel: "MySQL", highlightLanguage: "sql" },
  mariadb: { displayLanguage: "mariadb", displayLabel: "MariaDB", highlightLanguage: "sql" },
  sqlite: { displayLanguage: "sqlite", displayLabel: "SQLite", highlightLanguage: "sql" },
  sqlite3: { displayLanguage: "sqlite3", displayLabel: "SQLite", highlightLanguage: "sql" },
  docker: { displayLanguage: "dockerfile", displayLabel: "Dockerfile", highlightLanguage: "dockerfile" },
  dockerfile: { displayLanguage: "dockerfile", displayLabel: "Dockerfile", highlightLanguage: "dockerfile" },
  "docker-compose": { displayLanguage: "docker-compose", displayLabel: "Docker Compose", highlightLanguage: "yaml" },
};

function normalizeLanguage(language: string) {
  return language.trim().toLowerCase().replace(/^(language|lang)-/, "");
}

function formatDisplayLabel(language: string) {
  if (!language) {
    return "Code";
  }

  if (language.length <= 4) {
    return language.toUpperCase();
  }

  return language
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((segment) => (segment.length <= 3 ? segment.toUpperCase() : `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`))
    .join(" ");
}

function resolveHighlightPresentation(language: string): HighlightPresentation {
  const normalized = normalizeLanguage(language);
  const alias = LANGUAGE_ALIASES[normalized];
  if (alias) {
    return {
      displayLanguage: alias.displayLanguage,
      displayLabel: alias.displayLabel,
      highlightLanguage: hljs.getLanguage(alias.highlightLanguage) ? alias.highlightLanguage : null,
    };
  }

  return {
    displayLanguage: normalized,
    displayLabel: formatDisplayLabel(normalized),
    highlightLanguage: hljs.getLanguage(normalized) ? normalized : null,
  };
}

function buildCodeBlockMetaAttributes(presentation: HighlightPresentation) {
  return ` data-language="${escapeHtmlAttribute(presentation.displayLanguage)}" data-language-label="${escapeHtmlAttribute(presentation.displayLabel)}"`;
}

function toHtmlBlockToken(token: any, content: string) {
  token.type = "html_block";
  token.tag = "";
  token.nesting = 0;
  token.attrs = null;
  token.map = null;
  token.markup = "";
  token.info = "";
  token.meta = null;
  token.block = true;
  token.hidden = false;
  token.content = content;
  token.children = null;

  return token;
}

function parseCalloutDescriptor(content: string): CalloutDescriptor | null {
  const [firstLine = "", ...restLines] = content.split("\n");
  const match = firstLine.match(/^\[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\](?:[ \t]+(.*))?$/i);
  if (!match) {
    return null;
  }

  const label = match[1].toUpperCase();
  const inlineBody = match[2] ?? "";
  const bodyLines = inlineBody ? [inlineBody, ...restLines] : restLines;

  return {
    kind: label.toLowerCase() as CalloutKind,
    label,
    body: bodyLines.join("\n"),
  };
}

function findClosingBlockquoteIndex(tokens: any[], startIndex: number) {
  let depth = 1;

  for (let index = startIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].type === "blockquote_open") {
      depth += 1;
      continue;
    }

    if (tokens[index].type === "blockquote_close") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function transformCalloutBlockquotes(tokens: any[]) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== "blockquote_open") {
      continue;
    }

    const closeIndex = findClosingBlockquoteIndex(tokens, index);
    if (closeIndex === -1) {
      continue;
    }

    const firstParagraphOpen = tokens[index + 1];
    const firstInline = tokens[index + 2];
    const firstParagraphClose = tokens[index + 3];

    if (firstParagraphOpen?.type !== "paragraph_open" || firstInline?.type !== "inline" || firstParagraphClose?.type !== "paragraph_close") {
      continue;
    }

    const callout = parseCalloutDescriptor(firstInline.content ?? "");
    if (!callout) {
      continue;
    }

    toHtmlBlockToken(tokens[index], `<blockquote class="callout callout--${callout.kind}">\n<p class="callout__title">${callout.label}</p>`);

    let adjustedCloseIndex = closeIndex;
    if (callout.body.trim().length > 0) {
      toHtmlBlockToken(firstParagraphOpen, `<p>${md.renderInline(callout.body)}</p>`);
      tokens.splice(index + 2, 2);
      adjustedCloseIndex -= 2;
    } else {
      tokens.splice(index + 1, 3);
      adjustedCloseIndex -= 3;
    }

    toHtmlBlockToken(tokens[adjustedCloseIndex], "</blockquote>");
  }
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code: string, language: string) {
    if (language) {
      const normalizedLanguage = normalizeLanguage(language);
      const presentation = resolveHighlightPresentation(language);
      const metaAttributes = buildCodeBlockMetaAttributes(presentation);
      const requestedClassLanguage = escapeHtmlAttribute(presentation.highlightLanguage ?? (normalizedLanguage || "text"));

      if (presentation.highlightLanguage) {
        return `<pre class="hljs"${metaAttributes}><code class="language-${requestedClassLanguage}">${hljs.highlight(code, { language: presentation.highlightLanguage }).value}</code></pre>`;
      }

      const autoDetected = hljs.highlightAuto(code);
      if (autoDetected.language) {
        return `<pre class="hljs"${metaAttributes}><code class="language-${escapeHtmlAttribute(autoDetected.language)}">${autoDetected.value}</code></pre>`;
      }

      return `<pre class="hljs"${metaAttributes}><code class="language-${requestedClassLanguage}">${md.utils.escapeHtml(code)}</code></pre>`;
    }

    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

const defaultFenceRenderer = md.renderer.rules.fence?.bind(md.renderer) ?? ((tokens: any[], index: number, options: any, _env: any, self: any) => self.renderToken(tokens, index, options));

md.renderer.rules.fence = (tokens: any[], index: number, options: any, env: any, self: any) => {
  const token = tokens[index];
  const language = token.info.trim().split(/\s+/)[0]?.toLowerCase();

  if (language === "mermaid") {
    const mermaidMarkup = renderMermaidPreview(token.content);
    if (mermaidMarkup) {
      return mermaidMarkup;
    }
  }

  return defaultFenceRenderer(tokens, index, options, env, self);
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function collectHeadings(tokens: any[]): TocItem[] {
  const toc: TocItem[] = [];
  const slugCounts = new Map<string, number>();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open") {
      continue;
    }

    const inlineToken = tokens[index + 1];
    if (!inlineToken || inlineToken.type !== "inline") {
      continue;
    }

    const level = Number.parseInt(token.tag.replace("h", ""), 10);
    const text = extractInlineText(inlineToken).trim();
    const baseSlug = slugify(text) || "section";
    const duplicateCount = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, duplicateCount);
    const id = duplicateCount === 1 ? baseSlug : `${baseSlug}-${duplicateCount}`;

    token.attrSet("id", id);
    toc.push({
      id,
      text,
      level,
      line: Array.isArray(token.map) ? token.map[0] ?? 0 : 0,
    });
  }

  return toc;
}

function extractInlineText(inlineToken: any) {
  if (!inlineToken.children || inlineToken.children.length === 0) {
    return inlineToken.content ?? "";
  }

  return inlineToken.children.map((child: any) => child.content ?? "").join("");
}

export function buildToc(markdown: string) {
  return collectHeadings(md.parse(markdown, {}));
}

export function renderMarkdown(markdown: string) {
  const tokens = md.parse(markdown, {});
  const toc = collectHeadings(tokens);
  transformCalloutBlockquotes(tokens);
  const html = md.renderer.render(tokens, md.options, {});

  return { html, toc };
}
