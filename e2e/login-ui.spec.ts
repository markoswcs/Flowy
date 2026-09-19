import { expect, test } from "@playwright/test";

test("renders the login UI without browser errors", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Que bom ter você de volta" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);

  await testInfo.attach("login-page", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
