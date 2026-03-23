import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code: string, language: string) {
    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs"><code class="language-${language}">${hljs.highlight(code, { language }).value}</code></pre>`;
    }

    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

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
    toc.push({ id, text, level });
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
  const html = md.renderer.render(tokens, md.options, {});

  return { html, toc };
}
