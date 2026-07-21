import { expect, test } from "@playwright/test";

test("production shell opens the responsive judge route", async ({ page }) => {
  await page.goto("/judge");

  await expect(
    page.getByRole("heading", { name: "Shifting Vaults" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /top-down shifting vaults/i }),
  ).toBeVisible();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
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
  const lab = page.locator("details.runtime-lab");
  await lab.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  const initialHash = await lab
    .getByTestId("language-state-hash")
    .textContent();

  await lab.getByRole("button", { name: "Run cell" }).click();
  await expect(lab.getByRole("status")).toContainText("Committed cell:1");
  const committedHash = await lab
    .getByTestId("language-state-hash")
    .textContent();
  expect(committedHash).not.toBe(initialHash);

  await lab.getByRole("button", { name: "Undo" }).click();
  await expect(lab.getByRole("status")).toHaveText("Applied inverse patch.");
  await expect(lab.getByTestId("language-state-hash")).toHaveText(initialHash!);

  await lab.getByRole("button", { name: "Redo" }).click();
  await expect(lab.getByRole("status")).toHaveText("Applied forward patch.");
  await expect(lab.getByTestId("language-state-hash")).toHaveText(
    committedHash!,
  );
});

test("semantic game action updates the Pixi-projected state and resets", async ({
  page,
}) => {
  await page.goto("/judge");
  const initialHash = await page.getByTestId("game-state-hash").textContent();

  await page.getByRole("button", { name: /Move → azure-gate/ }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Move committed as one reversible cell",
  );
  await expect(page.getByText(/Mara: azure-gate/)).toBeVisible();
  const movedHash = await page.getByTestId("game-state-hash").textContent();
  expect(movedHash).not.toBe(initialHash);

  await page.getByRole("button", { name: "Undo game cell" }).click();
  await expect(page.getByText(/Mara: clockwork-archive/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(initialHash!);
  await page.getByRole("button", { name: "Redo game cell" }).click();
  await expect(page.getByText(/Mara: azure-gate/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(movedHash!);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText(/Mara: clockwork-archive/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(initialHash!);
  await page.getByRole("button", { name: "Fresh copy" }).click();
  await expect(page.getByText(/Mara: gatehouse/)).toBeVisible();
  await expect(page.getByText("Round 1")).toBeVisible();
  await expect(page.getByText("Threat 2 / 10")).toBeVisible();
});

test("complete deterministic game reaches a real ending", async ({ page }) => {
  await page.goto("/judge");

  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move → glass-gallery", exact: true })
    .click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page
    .getByRole("button", { name: "Search → glass-gallery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page
    .getByRole("button", { name: "Move → clockwork-archive", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move → gatehouse", exact: true })
    .click();

  await expect(
    page.getByRole("status").filter({ hasText: "Mara escaped the vault" }),
  ).toBeVisible();
  await expect(page.getByText(/Mara: gatehouse, 2 relics/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Legal actions" })).toHaveCount(
    0,
  );
});

test("mobile game controls remain semantic and touch-sized", async ({
  page,
}) => {
  await page.goto("/judge");
  const move = page.getByRole("button", {
    name: "Move → azure-gate",
    exact: true,
  });
  await expect(move).toBeVisible();
  const box = await move.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await move.click();
  await expect(page.getByText(/Mara: azure-gate/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("dragging an explorer proposes exactly one legal move cell", async ({
  page,
}) => {
  await page.goto("/judge");
  const canvas = page.locator("canvas.table-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = (value: number) => box!.x + (value / 720) * box!.width;
  const y = (value: number) => box!.y + (value / 500) * box!.height;

  await page.mouse.move(x(323), y(252));
  await page.mouse.down();
  await page.mouse.move(x(347), y(96), { steps: 8 });
  await page.mouse.up();

  await expect(page.getByText(/Mara: azure-gate/)).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "Move committed as one reversible cell",
  );
});
