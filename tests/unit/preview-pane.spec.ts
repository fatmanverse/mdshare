import { describe, expect, it } from "vitest";
import { resolvePreviewRestoreScrollTop } from "../../src/components/PreviewPane";

describe("preview scroll restore", () => {
  it("prefers the container's current scrollTop after preview DOM updates", () => {
    expect(resolvePreviewRestoreScrollTop({ scrollTop: 240 }, 120)).toBe(240);
  });

  it("falls back to the previous scrollTop when current scrollTop is invalid", () => {
    expect(resolvePreviewRestoreScrollTop({ scrollTop: Number.NaN }, 120)).toBe(120);
  });
});
