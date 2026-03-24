import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Toolbar } from "../../src/components/Toolbar";

describe("toolbar", () => {
  it("groups export actions under a single export button", () => {
    const html = renderToStaticMarkup(
      createElement(Toolbar, {
        currentFilePath: null,
        recentFiles: [],
        reopenLastFile: false,
        autoSave: false,
        theme: "light",
        themePreference: "light",
        title: "demo",
        onNew: () => undefined,
        onOpen: () => undefined,
        onOpenRecentFile: () => undefined,
        onSave: () => undefined,
        onSaveAs: () => undefined,
        onExportHtml: () => undefined,
        onExportPdf: () => undefined,
        onOpenHealthCheck: () => undefined,
        onThemePreferenceChange: () => undefined,
        onToggleReopenLastFile: () => undefined,
        onToggleAutoSave: () => undefined,
        onToggleTheme: () => undefined,
        showPreview: true,
        onTogglePreview: () => undefined,
      }),
    );

    expect(html).toContain(">导出<");
    expect(html).not.toContain("导出 HTML");
    expect(html).not.toContain("导出 PDF");
  });

  it("keeps the export trigger styled as a primary action", () => {
    const css = readFileSync("src/styles/globals.css", "utf8");

    expect(css).toContain(".toolbar__action--primary.toolbar__action--menu {");
    expect(css).toContain("background: var(--accent);");
    expect(css).toContain("color: var(--button-primary-text);");
  });
});
