import { describe, expect, it } from "vitest";
import { buildToc, renderMarkdown } from "../../src/lib/markdown/parser";

describe("markdown parser", () => {
  it("builds toc items from headings", () => {
    const toc = buildToc("# 标题\n\n## 小节\n\n正文");

    expect(toc).toEqual([
      { id: "标题", text: "标题", level: 1 },
      { id: "小节", text: "小节", level: 2 },
    ]);
  });

  it("renders heading ids into html", () => {
    const rendered = renderMarkdown("# Hello World");

    expect(rendered.html).toContain('<h1 id="hello-world">Hello World</h1>');
    expect(rendered.toc[0]).toEqual({ id: "hello-world", text: "Hello World", level: 1 });
  });

  it("preserves inline heading markup while adding heading ids", () => {
    const rendered = renderMarkdown("### 3.1 为什么 MVP 选 `Electron`");

    expect(rendered.html).toContain('<h3 id="31-为什么-mvp-选-electron">3.1 为什么 MVP 选 <code>Electron</code></h3>');
    expect(rendered.toc[0]).toEqual({
      id: "31-为什么-mvp-选-electron",
      text: "3.1 为什么 MVP 选 Electron",
      level: 3,
    });
  });

  it("generates unique ids for duplicate headings", () => {
    const toc = buildToc("## 重复标题\n\n## 重复标题");

    expect(toc).toEqual([
      { id: "重复标题", text: "重复标题", level: 2 },
      { id: "重复标题-2", text: "重复标题", level: 2 },
    ]);
  });

  it("renders fenced code blocks with highlight markup", () => {
    const rendered = renderMarkdown("```ts\nconst value = 1;\n```");

    expect(rendered.html).toContain('<pre class="hljs"><code class="language-ts">');
    expect(rendered.html).toContain("hljs-keyword");
  });
});
