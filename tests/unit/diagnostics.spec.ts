import { describe, expect, it } from "vitest";
import { buildDocumentDiagnostics, extractMarkdownImages, summarizeDiagnostics } from "../../src/lib/markdown/diagnostics";

describe("document diagnostics", () => {
  it("extracts image references with source line numbers", () => {
    const images = extractMarkdownImages("# Demo\n\n![one](assets/a.png)\n\n![two](https://example.com/b.png)");

    expect(images).toEqual([
      { alt: "one", source: "assets/a.png", line: 3 },
      { alt: "two", source: "https://example.com/b.png", line: 5 },
    ]);
  });

  it("builds diagnostics for duplicate headings, missing images and code block language", () => {
    const diagnostics = buildDocumentDiagnostics({
      markdown: "## 重复\n\n## 重复\n\n```\nconst value = 1;\n```\n\n![demo](assets/missing.png)",
      markdownFilePath: "/tmp/demo.md",
      missingImageSources: ["assets/missing.png"],
      toc: [
        { id: "重复", text: "重复", level: 2, line: 0 },
        { id: "重复-2", text: "重复", level: 2, line: 2 },
      ],
    });

    expect(diagnostics.some((item) => item.kind === "missing-image" && item.severity === "error")).toBe(true);
    expect(diagnostics.some((item) => item.kind === "duplicate-heading")).toBe(true);
    expect(diagnostics.some((item) => item.kind === "code-block-missing-language")).toBe(true);
  });

  it("summarizes diagnostics by severity", () => {
    const summary = summarizeDiagnostics([
      { id: "1", kind: "missing-image", severity: "error", title: "a", description: "a", line: 1 },
      { id: "2", kind: "duplicate-heading", severity: "warning", title: "b", description: "b", line: 2 },
      { id: "3", kind: "large-inline-image", severity: "info", title: "c", description: "c", line: 3 },
    ]);

    expect(summary).toEqual({ total: 3, error: 1, warning: 1, info: 1 });
  });
});
