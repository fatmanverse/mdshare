import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inlineLocalImagesInHtml } from "../../electron/main/services/export-assets";

describe("export asset inlining", () => {
  it("inlines local image files as data uri", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mdshare-test-"));
    const imagePath = path.join(tempDir, "demo.svg");
    const markdownPath = path.join(tempDir, "demo.md");

    await fs.writeFile(imagePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf-8");
    await fs.writeFile(markdownPath, "# demo", "utf-8");

    const html = '<p><img src="./demo.svg" alt="demo"></p>';
    const result = await inlineLocalImagesInHtml(html, markdownPath);

    expect(result).toContain("data:image/svg+xml;base64,");
  });

  it("keeps remote images unchanged", async () => {
    const html = '<p><img src="https://example.com/demo.png" alt="demo"></p>';
    const result = await inlineLocalImagesInHtml(html, null);

    expect(result).toContain('src="https://example.com/demo.png"');
  });
});
