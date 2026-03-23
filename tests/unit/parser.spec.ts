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
});
