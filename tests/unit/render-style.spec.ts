import { describe, expect, it } from "vitest";
import { buildRenderStyleCssVariables, isRenderStyle } from "../../src/lib/markdown/render-style";

describe("render style presets", () => {
  it("recognizes supported render styles", () => {
    expect(isRenderStyle("default")).toBe(true);
    expect(isRenderStyle("compact")).toBe(true);
    expect(isRenderStyle("article")).toBe(true);
    expect(isRenderStyle("unknown")).toBe(false);
  });

  it("builds css variables for article preset", () => {
    const variables = buildRenderStyleCssVariables("article");

    expect(variables["--mdshare-content-max-width"]).toBe("780px");
    expect(variables["--mdshare-line-height"]).toBe("1.92");
  });
});
