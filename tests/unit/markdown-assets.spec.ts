import { describe, expect, it } from "vitest";
import { findMissingLocalAssetSources, isLocalMarkdownAssetSource, resolveMarkdownAssetPath } from "../../electron/main/services/markdown-assets";

describe("markdown asset helpers", () => {
  it("recognizes local markdown asset sources", () => {
    expect(isLocalMarkdownAssetSource("assets/demo.png")).toBe(true);
    expect(isLocalMarkdownAssetSource("https://example.com/demo.png")).toBe(false);
    expect(isLocalMarkdownAssetSource("data:image/png;base64,abc")).toBe(false);
  });

  it("resolves relative asset path beside markdown file", () => {
    expect(resolveMarkdownAssetPath("assets/demo.png", "/tmp/docs/demo.md")).toBe("/tmp/docs/assets/demo.png");
  });

  it("finds missing local asset sources", async () => {
    const missing = await findMissingLocalAssetSources(
      "/tmp/docs/demo.md",
      ["assets/one.png", "assets/two.png"],
      async (targetPath) => targetPath.endsWith("one.png"),
    );

    expect(missing).toEqual(["assets/two.png"]);
  });
});
