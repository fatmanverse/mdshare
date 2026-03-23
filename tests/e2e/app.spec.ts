import path from "node:path";
import { test, expect } from "playwright/test";
import { _electron as electron } from "playwright";

test("launches the desktop shell", async () => {
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), ".")],
  });

  const window = await electronApp.firstWindow();

  await expect(window.getByText("mdshare")).toBeVisible();
  await expect(window.getByText("Markdown")).toBeVisible();
  await expect(window.getByText("Preview")).toBeVisible();

  await electronApp.close();
});
