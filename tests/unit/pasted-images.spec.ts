import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PASTED_IMAGE_MAX_DIMENSION,
  buildPastedImageAssetDir,
  getFittedImageSize,
  normalizeRelativePath,
  resolveNextPastedImagePath,
} from "../../electron/main/services/pasted-images";

describe("pasted image helpers", () => {
  it("uses a unified assets directory beside the markdown file", () => {
    const assetDir = buildPastedImageAssetDir("/Users/demo/docs/readme.md");

    expect(assetDir).toBe(path.join("/Users/demo/docs", "assets"));
  });

  it("keeps smaller images unchanged", () => {
    expect(getFittedImageSize(800, 600)).toEqual({
      width: 800,
      height: 600,
      resized: false,
    });
  });

  it("resizes larger images proportionally", () => {
    expect(getFittedImageSize(3200, 1600)).toEqual({
      width: PASTED_IMAGE_MAX_DIMENSION,
      height: 800,
      resized: true,
    });
  });

  it("allocates short sequential image names", async () => {
    const nextPath = await resolveNextPastedImagePath("/tmp/assets", async () => ["img-001.png", "img-002.png"]);

    expect(nextPath).toBe("/tmp/assets/img-003.png");
  });

  it("normalizes relative paths to slash style", () => {
    expect(normalizeRelativePath(`assets${path.sep}img-001.png`)).toBe("assets/img-001.png");
  });
});
