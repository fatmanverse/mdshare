import { describe, expect, it } from "vitest";
import { getExportPreset, isExportPreset, mapRenderStyleToExportPreset } from "../../src/lib/markdown/export-preset";

describe("export presets", () => {
  it("recognizes supported presets", () => {
    expect(isExportPreset("default-doc")).toBe(true);
    expect(isExportPreset("sop")).toBe(true);
    expect(isExportPreset("share-article")).toBe(true);
    expect(isExportPreset("unknown")).toBe(false);
  });

  it("maps render styles to scenario presets", () => {
    expect(mapRenderStyleToExportPreset("default")).toBe("default-doc");
    expect(mapRenderStyleToExportPreset("compact")).toBe("sop");
    expect(mapRenderStyleToExportPreset("article")).toBe("share-article");
  });

  it("returns preset config with delivery metadata", () => {
    expect(getExportPreset("share-article")).toMatchObject({
      renderStyle: "article",
      showToc: false,
      showTitleBlock: true,
      headerText: null,
      footerText: "Published with mdshare",
      label: "分享长文",
    });
  });

  it("hides header and title block for sop export", () => {
    expect(getExportPreset("sop")).toMatchObject({
      showTitleBlock: false,
      headerText: null,
      footerText: null,
    });
  });
});
