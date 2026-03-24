import { describe, expect, it } from "vitest";
import {
  createCalloutSnippet,
  createCodeBlockSnippet,
  createDividerSnippet,
  createMermaidFlowchartSnippet,
  createMermaidSequenceSnippet,
  getAutoClosedFenceInsertion,
  getEditorSnippet,
  getInlineMarkdownCompletion,
  getSmartLineContinuation,
} from "../../src/lib/markdown/editor-snippets";

describe("editor snippets", () => {
  it("builds a code block snippet with cursor inside the block", () => {
    const snippet = createCodeBlockSnippet("shell");

    expect(snippet.text).toBe("```shell\n\n```");
    expect(snippet.cursorOffset).toBe("```shell\n".length);
  });

  it("returns snippet for supported editor insert actions", () => {
    const snippet = getEditorSnippet("editor:insert-table");

    expect(snippet?.text).toContain("| 列 1 | 列 2 |");
  });

  it("builds mermaid flowchart snippet", () => {
    const snippet = createMermaidFlowchartSnippet();

    expect(snippet.text).toContain("```mermaid");
    expect(snippet.text).toContain("flowchart TD");
    expect(snippet.statusMessage).toBe("已插入 Mermaid 流程图");
  });

  it("builds mermaid sequence snippet", () => {
    const snippet = createMermaidSequenceSnippet();

    expect(snippet.text).toContain("sequenceDiagram");
    expect(snippet.text).toContain("participant U as 用户");
    expect(snippet.statusMessage).toBe("已插入 Mermaid 时序图");
  });

  it("builds callout and divider snippets", () => {
    expect(createCalloutSnippet()).toEqual({
      text: "> [!TIP]\n> ",
      cursorOffset: 11,
      statusMessage: "已插入提示块",
    });

    expect(createDividerSnippet()).toEqual({
      text: "---",
      cursorOffset: 3,
      statusMessage: "已插入分隔线",
    });
  });

  it("returns snippet for new editor insert actions", () => {
    expect(getEditorSnippet("editor:insert-mermaid-flowchart")?.text).toContain("flowchart TD");
    expect(getEditorSnippet("editor:insert-mermaid-sequence")?.text).toContain("sequenceDiagram");
    expect(getEditorSnippet("editor:insert-callout")?.text).toContain("> [!TIP]");
    expect(getEditorSnippet("editor:insert-divider")?.text).toBe("---");
  });

  it("auto closes fenced code blocks on newline", () => {
    const completion = getAutoClosedFenceInsertion("```shell", "");

    expect(completion).toEqual({
      text: "\n\n```",
      cursorOffset: 1,
    });
  });

  it("does not auto close when text already exists after the cursor", () => {
    expect(getAutoClosedFenceInsertion("```shell", "echo 1")).toBeNull();
  });

  it("wraps selected text when entering bold syntax", () => {
    expect(getInlineMarkdownCompletion("*", "重点")).toEqual({
      text: "**重点**",
      selectionStartOffset: 2,
      selectionEndOffset: 4,
      statusMessage: "已包裹粗体语法",
    });
  });

  it("inserts link template when typing bracket syntax", () => {
    expect(getInlineMarkdownCompletion("[", "官网")).toEqual({
      text: "[官网]()",
      selectionStartOffset: 5,
      selectionEndOffset: 5,
      statusMessage: "已插入链接模板",
    });
  });

  it("continues markdown list and quote blocks on newline", () => {
    expect(getSmartLineContinuation("- 项目一", "")).toEqual({
      text: "\n- ",
      cursorOffset: 3,
    });
    expect(getSmartLineContinuation("> 引用内容", "")).toEqual({
      text: "\n> ",
      cursorOffset: 3,
    });
  });

  it("adds blank line after headings on newline", () => {
    expect(getSmartLineContinuation("## 小节标题", "")).toEqual({
      text: "\n\n",
      cursorOffset: 1,
    });
  });
});
