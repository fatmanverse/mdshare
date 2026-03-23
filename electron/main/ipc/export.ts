import { BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import { inlineLocalImagesInHtml } from "../services/export-assets.js";

type HtmlExportPayload = {
  title: string;
  html: string;
  markdownFilePath: string | null;
};

type PdfExportPayload = {
  title: string;
  html: string;
  markdownFilePath: string | null;
};

export function registerExportIpc() {
  ipcMain.handle("export:html", async (_event, payload: HtmlExportPayload) => {
    const result = await dialog.showSaveDialog({
      title: "导出 HTML",
      defaultPath: `${payload.title || "untitled"}.html`,
      filters: [{ name: "HTML", extensions: ["html"] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const exportHtml = await inlineLocalImagesInHtml(payload.html, payload.markdownFilePath);
    await fs.writeFile(result.filePath, exportHtml, "utf-8");

    return { filePath: result.filePath };
  });

  ipcMain.handle("export:pdf", async (_event, payload: PdfExportPayload) => {
    const result = await dialog.showSaveDialog({
      title: "导出 PDF",
      defaultPath: `${payload.title || "untitled"}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const exportHtml = await inlineLocalImagesInHtml(payload.html, payload.markdownFilePath);
    const exportWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
      },
    });

    await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(exportHtml)}`);
    await exportWindow.webContents.executeJavaScript(
      "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
      true,
    );

    const pdf = await exportWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    await fs.writeFile(result.filePath, pdf);
    exportWindow.destroy();

    return { filePath: result.filePath };
  });
}
