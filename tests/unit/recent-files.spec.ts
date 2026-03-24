import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let userDataPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataPath,
  },
}));

describe("recent files store", () => {
  beforeEach(async () => {
    userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "mdshare-recent-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await fs.rm(userDataPath, { recursive: true, force: true });
  });

  it("removes recent file and clears last opened path when needed", async () => {
    const service = await import("../../electron/main/services/recent-files");

    await service.addRecentFile("/tmp/demo-a.md");
    await service.addRecentFile("/tmp/demo-b.md");
    await service.saveLastOpenedFilePath("/tmp/demo-b.md");
    await service.removeRecentFile("/tmp/demo-b.md");

    expect(await service.getRecentFiles()).toEqual(["/tmp/demo-a.md"]);
    expect(await service.getLastOpenedFilePath()).toBeNull();
  });

  it("clears all recent files and local reopen pointer", async () => {
    const service = await import("../../electron/main/services/recent-files");

    await service.addRecentFile("/tmp/demo-a.md");
    await service.addRecentFile("/tmp/demo-b.md");
    await service.saveLastOpenedFilePath("/tmp/demo-b.md");
    await service.clearRecentFiles();

    expect(await service.getRecentFiles()).toEqual([]);
    expect(await service.getLastOpenedFilePath()).toBeNull();
  });

  it("persists export preset and derived render style inside local settings", async () => {
    const service = await import("../../electron/main/services/recent-files");

    await service.updateAppSettings({ exportPreset: "share-article" });

    expect(await service.getAppSettings()).toMatchObject({
      exportPreset: "share-article",
      renderStyle: "article",
    });
  });

  it("persists preview visibility setting", async () => {
    const service = await import("../../electron/main/services/recent-files");

    await service.updateAppSettings({ showPreview: false });

    expect(await service.getAppSettings()).toMatchObject({
      showPreview: false,
    });
  });

  it("persists auto save setting", async () => {
    const service = await import("../../electron/main/services/recent-files");

    await service.updateAppSettings({ autoSave: true });

    expect(await service.getAppSettings()).toMatchObject({
      autoSave: true,
    });
  });
});
