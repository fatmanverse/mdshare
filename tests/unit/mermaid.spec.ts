import { describe, expect, it } from "vitest";
import {
  buildMermaidErrorMarkup,
  extractMermaidSvgErrorMessage,
  getMermaidThemeVariables,
  renderMermaidPreview,
  resolveMermaidDiagramMetrics,
  resolveMermaidErrorDetails,
} from "../../src/lib/markdown/mermaid";

describe("mermaid theme variables", () => {
  it("uses high-contrast colors for light theme", () => {
    const variables = getMermaidThemeVariables("light");

    expect(variables.darkMode).toBe(false);
    expect(variables.textColor).toBe("#0f172a");
    expect(variables.classText).toBe("#0f172a");
    expect(variables.actorTextColor).toBe("#0f172a");
    expect(variables.lineColor).toBe("#475569");
    expect(variables.edgeLabelBackground).toBe("#ffffff");
  });

  it("uses high-contrast colors for dark theme", () => {
    const variables = getMermaidThemeVariables("dark");

    expect(variables.darkMode).toBe(true);
    expect(variables.textColor).toBe("#e2e8f0");
    expect(variables.classText).toBe("#e2e8f0");
    expect(variables.actorTextColor).toBe("#e2e8f0");
    expect(variables.lineColor).toBe("#94a3b8");
    expect(variables.edgeLabelBackground).toBe("#0f172a");
  });
});

describe("mermaid layout metrics", () => {
  it("keeps compact diagrams centered at natural width", () => {
    expect(resolveMermaidDiagramMetrics("0 0 360 240")).toEqual({
      naturalWidth: 360,
      naturalHeight: 240,
      fitWidth: 360,
      layout: "compact",
      preserveAspectRatio: "xMidYMin meet",
    });
  });

  it("clamps wide diagrams and aligns from the start edge", () => {
    expect(resolveMermaidDiagramMetrics("0 0 1800 600")).toEqual({
      naturalWidth: 1800,
      naturalHeight: 600,
      fitWidth: 1200,
      layout: "wide",
      preserveAspectRatio: "xMinYMin meet",
    });
  });

  it("marks placeholder blocks with source state", () => {
    const html = renderMermaidPreview("flowchart TD\nA[开始] --> B[结束]");

    expect(html).toContain('data-mermaid-state="source"');
    expect(html).toContain('class="mermaid-preview"');
    expect(html).toContain('class="language-mermaid"');
  });

  it("extracts Mermaid syntax errors from returned svg output", () => {
    const svg = `<svg><g><text>Syntax error in text</text><text>mermaid version 11.13.0</text></g></svg>`;

    expect(extractMermaidSvgErrorMessage(svg)).toBe("Syntax error in text");
  });

  it("compresses Mermaid syntax errors into friendly chinese guidance", () => {
    const details = resolveMermaidErrorDetails(new Error("Syntax error in text mermaid version 11.13.0"));

    expect(details).toEqual({
      title: "Mermaid 语法有误",
      message: "当前 Mermaid 语法无法解析，已直接显示错误提示并停止渲染。",
      hint: "请重点检查箭头连接、节点括号、关键字拼写、缩进以及换行结构是否完整。",
      rawMessage: "Syntax error in text",
    });
  });

  it("renders error-only markup instead of falling back to Mermaid source code", () => {
    const html = buildMermaidErrorMarkup(resolveMermaidErrorDetails(new Error("UnknownDiagramError: No diagram type detected")));

    expect(html).toContain('class="mermaid-preview__error"');
    expect(html).toContain("未识别 Mermaid 图表类型");
    expect(html).not.toContain("mermaid-preview__code");
    expect(html).not.toContain("<pre");
  });

  it("identifies invalid first-line diagram declarations", () => {
    const details = resolveMermaidErrorDetails(new Error("Parse error on line 1"), "flowchat TD\nA --> B");

    expect(details.title).toBe("Mermaid 首行类型声明不正确");
  });

  it("identifies unbalanced bracket issues before generic syntax hints", () => {
    const details = resolveMermaidErrorDetails(new Error("Syntax error in text"), "flowchart TD\nA[开始 --> B[结束]");

    expect(details.title).toBe("Mermaid 括号未闭合");
  });

  it("identifies invalid link operator usage", () => {
    const details = resolveMermaidErrorDetails(new Error("Syntax error in text"), "flowchart TD\nA -> B");

    expect(details.title).toBe("Mermaid 连线符号不正确");
  });

  it("identifies newline and indentation issues from parser hints", () => {
    const details = resolveMermaidErrorDetails(
      new Error("Parse error on line 3: Expecting 'NEWLINE', 'SEMI', 'EOF'"),
      "flowchart TD\nsubgraph Demo\nA --> B",
    );

    expect(details.title).toBe("Mermaid 换行或缩进不正确");
  });

});
