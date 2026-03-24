import { describe, expect, it } from "vitest";
import { buildImageMarkdown, buildPastedImageMarkdown, insertTextAtRange } from "../../src/lib/markdown/paste-image";

describe("pasted image markdown", () => {
  it("builds markdown using image extension inferred from mime type", () => {
    const markdown = buildPastedImageMarkdown("data:image/png;base64,abc", "image/png");

    expect(markdown).toBe("![pasted-image.png](data:image/png;base64,abc)");
  });

  it("builds markdown using relative local asset path", () => {
    const markdown = buildPastedImageMarkdown("assets/img-001.png", "image/png");

    expect(markdown).toBe("![pasted-image.png](assets/img-001.png)");
  });

  it("builds markdown for local image using inferred alt text", () => {
    const markdown = buildImageMarkdown("assets/diagram.png");

    expect(markdown).toBe("![diagram](assets/diagram.png)");
  });

  it("inserts text into the selected range", () => {
    const nextValue = insertTextAtRange("hello world", "markdown", 6, 11);

    expect(nextValue).toBe("hello markdown");
  });
});
