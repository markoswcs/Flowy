import { expect, test } from "@playwright/test";

test("renders the login page", async ({ request }) => {
  const response = await request.get("/login");

  expect(response.status()).toBe(200);
  await expect(response.text()).resolves.toContain("Entrar");
});

for (const path of [
  "/app",
  "/app/tasks",
  "/app/tasks?layout=kanban",
  "/app/notes",
  "/app/kanban",
  "/app/settings",
  "/app/trash",
]) {
  test(`protects ${path} without a session`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/login");
  });
}
