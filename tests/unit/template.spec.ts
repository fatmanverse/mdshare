import { describe, expect, it } from "vitest";
import { buildExportHtml } from "../../src/lib/markdown/template";

describe("export template", () => {
  it("includes inline code and fenced code styles", () => {
    const html = buildExportHtml({
      title: "demo",
      theme: "light",
      toc: [{ id: "section", text: "Section", level: 2 }],
      html: '<h2 id="section">Section</h2><p>inline <code>value</code></p><pre class="hljs"><code class="language-ts"><span class="hljs-keyword">const</span> value = 1;</code></pre>',
    });

    expect(html).toContain('<article class="export-body">');
    expect(html).toContain('.export-body :not(pre) > code');
    expect(html).toContain('.export-body .hljs-keyword');
  });
});
