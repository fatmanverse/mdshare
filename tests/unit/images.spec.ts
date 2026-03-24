import { describe, expect, it } from "vitest";
import { preparePreviewHtml, resolveImageSourceForPreview } from "../../src/lib/markdown/images";

describe("preview image path handling", () => {
  it("resolves relative image sources against markdown file path", () => {
    const resolved = resolveImageSourceForPreview("./images/demo.png", "/Users/demo/docs/readme.md");

    expect(resolved).toBe("file:///Users/demo/docs/images/demo.png");
  });

  it("keeps remote image sources unchanged", () => {
    const resolved = resolveImageSourceForPreview("https://example.com/demo.png", "/Users/demo/docs/readme.md");

    expect(resolved).toBe("https://example.com/demo.png");
  });

  it("keeps data uri image sources unchanged", () => {
    const resolved = resolveImageSourceForPreview("data:image/png;base64,abc", "/Users/demo/docs/readme.md");

    expect(resolved).toBe("data:image/png;base64,abc");
  });

  it("rewrites image tags inside preview html", () => {
    const html = '<p><img src="./demo.png" alt="demo"></p>';
    const previewHtml = preparePreviewHtml(html, "/Users/demo/docs/readme.md");

    expect(previewHtml).toContain('src="file:///Users/demo/docs/demo.png"');
  });
});
