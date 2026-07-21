import { expect, test } from "@playwright/test";

test("production shell opens the responsive judge route", async ({ page }) => {
  await page.goto("/judge");

  await expect(
    page.getByRole("heading", { name: "Shifting Vaults" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /primitive top-down/i }),
  ).toBeVisible();
  await expect(page.getByText("Judge route ready")).toBeVisible();

  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(viewportFits).toBe(true);

  const health = await page.request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({
    ok: true,
    phase: "vertical-slice",
  });
});

test("runtime inspector commits, undoes, and redoes a cell", async ({
  page,
}) => {
  await page.goto("/judge");
  const initialHash = await page.getByText(/^[0-9a-f]{16}$/).textContent();

  await page.getByRole("button", { name: "Run cell" }).click();
  await expect(page.getByRole("status")).toContainText("Committed cell:1");
  const committedHash = await page.getByText(/^[0-9a-f]{16}$/).textContent();
  expect(committedHash).not.toBe(initialHash);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("status")).toHaveText("Applied inverse patch.");
  await expect(page.getByText(/^[0-9a-f]{16}$/)).toHaveText(initialHash!);

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByRole("status")).toHaveText("Applied forward patch.");
  await expect(page.getByText(/^[0-9a-f]{16}$/)).toHaveText(committedHash!);
});
