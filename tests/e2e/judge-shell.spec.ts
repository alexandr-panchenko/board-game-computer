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
