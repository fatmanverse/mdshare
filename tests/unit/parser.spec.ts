import { describe, expect, it } from "vitest";
import { buildToc, renderMarkdown } from "../../src/lib/markdown/parser";

describe("markdown parser", () => {
  it("builds toc items from headings", () => {
    const toc = buildToc("# 标题\n\n## 小节\n\n正文");

    expect(toc).toEqual([
      { id: "标题", text: "标题", level: 1, line: 0 },
      { id: "小节", text: "小节", level: 2, line: 2 },
    ]);
  });

  it("renders heading ids into html", () => {
    const rendered = renderMarkdown("# Hello World");

    expect(rendered.html).toContain('<h1 id="hello-world">Hello World</h1>');
    expect(rendered.toc[0]).toEqual({ id: "hello-world", text: "Hello World", level: 1, line: 0 });
  });

  it("preserves inline heading markup while adding heading ids", () => {
    const rendered = renderMarkdown("### 3.1 为什么 MVP 选 `Electron`");

    expect(rendered.html).toContain('<h3 id="31-为什么-mvp-选-electron">3.1 为什么 MVP 选 <code>Electron</code></h3>');
    expect(rendered.toc[0]).toEqual({
      id: "31-为什么-mvp-选-electron",
      text: "3.1 为什么 MVP 选 Electron",
      level: 3,
      line: 0,
    });
  });

  it("generates unique ids for duplicate headings", () => {
    const toc = buildToc("## 重复标题\n\n## 重复标题");

    expect(toc).toEqual([
      { id: "重复标题", text: "重复标题", level: 2, line: 0 },
      { id: "重复标题-2", text: "重复标题", level: 2, line: 2 },
    ]);
  });

  it("renders fenced code blocks with highlight markup", () => {
    const rendered = renderMarkdown("```ts\nconst value = 1;\n```");

    expect(rendered.html).toContain('<pre class="hljs" data-language="ts" data-language-label="TS"><code class="language-ts">');
    expect(rendered.html).toContain("hljs-keyword");
  });

  it("adds presentation metadata for shell yaml java and javascript blocks", () => {
    const rendered = renderMarkdown("```bash\necho $HOME\n```\n\n```yml\nname: demo\n```\n\n```java\nclass Demo {}\n```\n\n```js\nconsole.log(1)\n```\n\n```javascript\nconsole.log(2)\n```");

    expect(rendered.html).toContain('data-language="shell" data-language-label="Shell"');
    expect(rendered.html).toContain('class="language-bash"');
    expect(rendered.html).toContain('data-language="yaml" data-language-label="YAML"');
    expect(rendered.html).toContain('class="language-yaml"');
    expect(rendered.html).toContain('data-language="java" data-language-label="Java"');
    expect(rendered.html).toContain('class="language-java"');
    expect(rendered.html).toContain('data-language="javascript" data-language-label="JavaScript"');
    expect(rendered.html).toContain('class="language-javascript"');
  });

  it("renders text fences with presentation metadata", () => {
    const rendered = renderMarkdown("```text\nhello world\n```\n");

    expect(rendered.html).toContain('data-language="text" data-language-label="Text"');
    expect(rendered.html).toContain('class="language-text"');
    expect(rendered.html).toContain("hello world");
  });

  it("maps common ecosystem aliases to supported highlighters", () => {
    const rendered = renderMarkdown(
      "```react\nconst App = () => <main>Hello</main>;\n```\n\n```vue\n<template><div>Hello</div></template>\n```\n\n```json5\n{\n  trailing: 'ok',\n}\n```\n\n```jsonc\n{\n  // ok\n  \"name\": \"demo\"\n}\n```\n\n```py\nprint(\"hello\")\n```\n\n```rs\nfn main() {}\n```\n\n```golang\npackage main\n```\n\n```docker\nFROM node:20\n```\n\n```dotenv\nAPP_NAME=demo\n```\n\n```postgresql\nselect * from users;\n```",
    );

    expect(rendered.html).toContain('data-language="react" data-language-label="React"');
    expect(rendered.html).toContain('class="language-jsx"');
    expect(rendered.html).toContain('data-language="vue" data-language-label="Vue"');
    expect(rendered.html).toContain('class="language-xml"');
    expect(rendered.html).toContain('data-language="json5" data-language-label="JSON5"');
    expect(rendered.html).toContain('class="language-json"');
    expect(rendered.html).toContain('data-language="json" data-language-label="JSON"');
    expect(rendered.html).toContain('data-language="python" data-language-label="Python"');
    expect(rendered.html).toContain('class="language-python"');
    expect(rendered.html).toContain('data-language="rust" data-language-label="Rust"');
    expect(rendered.html).toContain('class="language-rust"');
    expect(rendered.html).toContain('data-language="go" data-language-label="Go"');
    expect(rendered.html).toContain('class="language-go"');
    expect(rendered.html).toContain('data-language="dockerfile" data-language-label="Dockerfile"');
    expect(rendered.html).toContain('class="language-dockerfile"');
    expect(rendered.html).toContain('data-language="dotenv" data-language-label="Dotenv"');
    expect(rendered.html).toContain('class="language-properties"');
    expect(rendered.html).toContain('data-language="postgresql" data-language-label="PostgreSQL"');
    expect(rendered.html).toContain('class="language-pgsql"');
  });

  it("renders mermaid fences as runtime placeholders", () => {
    const rendered = renderMarkdown("```mermaid\nclassDiagram\n  Animal <|-- Duck\n  Animal : +int age\n```\n");

    expect(rendered.html).toContain('class="mermaid-preview"');
    expect(rendered.html).toContain("data-mermaid-source=");
    expect(rendered.html).toContain('class="language-mermaid"');
    expect(rendered.html).toContain("classDiagram");
    expect(rendered.html).not.toContain("<svg");
  });

  it("renders supported callout blockquotes", () => {
    const rendered = renderMarkdown(
      "> [!TIP]\n> remember `pnpm install`\n\n> [!NOTE]\n> keep this in sync\n\n> [!WARNING]\n> deploy after backup\n\n> [!IMPORTANT]\n> rotate the credentials first\n\n> [!CAUTION]\n> irreversible action\n",
    );

    expect(rendered.html).toContain('<blockquote class="callout callout--tip">');
    expect(rendered.html).toContain('<p class="callout__title">TIP</p>');
    expect(rendered.html).toContain("remember <code>pnpm install</code>");
    expect(rendered.html).toContain('<blockquote class="callout callout--note">');
    expect(rendered.html).toContain('<p class="callout__title">NOTE</p>');
    expect(rendered.html).toContain("keep this in sync");
    expect(rendered.html).toContain('<blockquote class="callout callout--warning">');
    expect(rendered.html).toContain('<p class="callout__title">WARNING</p>');
    expect(rendered.html).toContain("deploy after backup");
    expect(rendered.html).toContain('<blockquote class="callout callout--important">');
    expect(rendered.html).toContain('<p class="callout__title">IMPORTANT</p>');
    expect(rendered.html).toContain("rotate the credentials first");
    expect(rendered.html).toContain('<blockquote class="callout callout--caution">');
    expect(rendered.html).toContain('<p class="callout__title">CAUTION</p>');
    expect(rendered.html).toContain("irreversible action");
  });

  it("keeps standard blockquotes unchanged", () => {
    const rendered = renderMarkdown("> regular quote");

    expect(rendered.html).toContain("<blockquote>");
    expect(rendered.html).toContain("regular quote");
    expect(rendered.html).not.toContain("callout--tip");
  });
});
