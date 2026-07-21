import { expect, test } from "@playwright/test";

test("judge route opens the responsive implementation shell", async ({
  page,
}) => {
  await page.goto("/judge");

  await expect(
    page.getByRole("heading", { name: "Shifting Vaults" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /primitive top-down/i }),
  ).toBeVisible();
  await expect(page.getByText("Judge route ready")).toBeVisible();
});
