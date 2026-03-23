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
      return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`;
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

export function buildToc(markdown: string): TocItem[] {
  return markdown
    .split("\n")
    .map((line) => /^(#{1,6})\s+(.+)$/.exec(line))
    .filter((item): item is RegExpExecArray => Boolean(item))
    .map((match) => ({
      level: match[1].length,
      text: match[2].trim(),
      id: slugify(match[2]),
    }));
}

export function renderMarkdown(markdown: string) {
  const toc = buildToc(markdown);
  const rawHtml = md.render(markdown);
  const html = toc.reduce((output, item) => {
    const pattern = new RegExp(`<h${item.level}>${escapeRegExp(item.text)}</h${item.level}>`);
    return output.replace(pattern, `<h${item.level} id="${item.id}">${item.text}</h${item.level}>`);
  }, rawHtml);

  return { html, toc };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

