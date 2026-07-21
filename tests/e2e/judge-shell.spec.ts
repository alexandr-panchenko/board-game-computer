import { expect, test } from "@playwright/test";

test("production shell opens the responsive judge route", async ({ page }) => {
  const aiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/ai/")) aiRequests.push(request.url());
  });
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
  expect(aiRequests).toEqual([]);
});

test("main route opens the same immutable guided template", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Shifting Vaults" }),
  ).toBeVisible();
  await expect(page.getByText("Guided replay · 0 / 3")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next replay step" }),
  ).toBeVisible();
  await expect(page.getByText("Demo route ready")).toBeVisible();
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

  await page.getByRole("button", { name: "Take control now" }).click();
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

test("AI fallback keeps the Designer rule and AI seat playable", async ({
  page,
}) => {
  await page.goto("/judge");
  const beforeRule = await page.getByTestId("game-state-hash").textContent();
  await page.getByRole("button", { name: "Use labelled example rule" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Labelled example rule validated" }),
  ).toBeVisible();
  await expect(page.getByText(/Designer · Labelled example/)).toBeVisible();
  await expect(
    page.getByText(/Scenario\("blue-gate-rotates-linked-room"/),
  ).toBeVisible();
  expect(await page.getByTestId("game-state-hash").textContent()).not.toBe(
    beforeRule,
  );

  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page.getByRole("button", { name: "Run Ivo fallback turn" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Labelled deterministic fallback completed",
  );
  await expect(page.getByText("Mara turn")).toBeVisible();
});

test("mocked AI Designer and player use validated local paths", async ({
  page,
}) => {
  const source = `Scenario("blue-gate-rotates-linked-room", {
  given: "explorer-enters-blue-gate",
  when: "after",
  then: "rotate-linked-room-clockwise-if-empty"
});`;
  await page.route("**/api/ai/designer", async (route) => {
    const candidate = {
      type: "candidate",
      candidate: {
        source,
        summary: "Mocked live blue-gate rule.",
        expected_effects: ["Mirror Gallery rotates."],
      },
      model: "gpt-5.6-sol",
      latencyMs: 12,
    };
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body:
        `event: progress\ndata: ${JSON.stringify({ type: "progress", stage: "generating" })}\n\n` +
        `event: candidate\ndata: ${JSON.stringify(candidate)}\n\n`,
    });
  });
  await page.route("**/api/ai/player", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choice: {
          option_id: "ivo-option-1",
          reason: "Use the first legal path.",
        },
        model: "gpt-5.6-luna",
        latencyMs: 8,
      }),
    });
  });
  await page.goto("/judge");
  await page.getByRole("button", { name: "Ask GPT-5.6 Designer" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Mocked live blue-gate rule" }),
  ).toBeVisible();
  await expect(page.getByText(/Designer · Mocked live/)).toBeVisible();

  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page
    .getByRole("button", { name: "Ask GPT-5.6 Luna for Ivo move" })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "Live gpt-5.6-luna: Use the first legal path",
  );
});

test("judge path links replay, takeover, AI, rule, and trigger", async ({
  page,
}) => {
  await installMockedAi(page);
  const started = Date.now();
  await page.goto("/judge");
  await expect(page.getByText("Guided replay · 0 / 3")).toBeVisible();

  for (let step = 1; step <= 3; step += 1) {
    await page.getByRole("button", { name: "Next replay step" }).click();
    await expect(
      page.getByText(`Guided replay · ${String(step)} / 3`),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Replay execution trace" }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Take control now" }).click();
  await expect(page.getByText("Takeover · Human")).toBeVisible();
  const humanMove = page.getByRole("button", {
    name: "Move → azure-gate",
    exact: true,
  });
  await expect(humanMove).toHaveClass(/recommended-action/);
  await humanMove.click();

  await expect(page.getByText("Takeover · AI player")).toBeVisible();
  await page
    .getByRole("button", { name: "Ask GPT-5.6 Luna for Ivo move" })
    .click();
  await expect(page.getByText("Live design")).toBeVisible();
  await page.getByRole("button", { name: "Ask GPT-5.6 Designer" }).click();
  await expect(page.getByText("Rule committed · Trigger setup")).toBeVisible();

  await page
    .getByRole("button", { name: "Move → clockwork-archive", exact: true })
    .click();
  await expect(page.getByText("Rule committed · Trigger now")).toBeVisible();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await expect(page.getByText("Hero path complete")).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "Blue-gate Scenario fired",
  );
  expect(Date.now() - started).toBeLessThan(90_000);
});

test("reset demo and replay from start reproduce the judge path", async ({
  page,
}) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Take control now" }).click();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await page.getByRole("button", { name: "Return to demo checkpoint" }).click();
  await expect(page.getByText("Takeover · Human")).toBeVisible();
  await expect(page.getByText(/Mara: clockwork-archive/)).toBeVisible();
  await expect(page.getByText("Round 3")).toBeVisible();

  await page.getByRole("button", { name: "Replay from start" }).click();
  await expect(page.getByText("Guided replay · 0 / 3")).toBeVisible();
  await expect(page.getByText("Round 1")).toBeVisible();
  await page.getByRole("button", { name: "Fresh copy" }).click();
  await expect(page.getByText("Fresh deterministic copy")).toBeVisible();
  await expect(page.getByText(/Mara: gatehouse/)).toBeVisible();
});

test("judge path completes with AI fallback and example rule", async ({
  page,
}) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Take control now" }).click();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await page.getByRole("button", { name: "Run Ivo fallback turn" }).click();
  await expect(page.getByText("Live design")).toBeVisible();
  await page.getByRole("button", { name: "Use labelled example rule" }).click();
  await page
    .getByRole("button", { name: "Move → clockwork-archive", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await expect(page.getByText("Hero path complete")).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "Blue-gate Scenario fired",
  );
});

test("two-client room converges through one canonical order", async ({
  page,
  browser,
}) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Create shared room" }).click();
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  const playerUrl = await page
    .getByRole("link", { name: "Open Player link" })
    .getAttribute("href");
  expect(playerUrl).not.toBeNull();

  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await player.goto(playerUrl!);
  await expect(player.getByText(/connected · player · seq 0/)).toBeVisible();

  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await expect(page.getByText(/connected · designer · seq 1/)).toBeVisible();
  await expect(player.getByText(/connected · player · seq 1/)).toBeVisible();
  await expect
    .poll(async () => {
      const left = await page.getByTestId("game-state-hash").textContent();
      const right = await player.getByTestId("game-state-hash").textContent();
      return left === right;
    })
    .toBe(true);
  await playerContext.close();
});

test("two-client room rejects a concurrent stale move and still converges", async ({
  page,
  browser,
}) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Create shared room" }).click();
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  const playerUrl = await page
    .getByRole("link", { name: "Open Player link" })
    .getAttribute("href");
  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await player.goto(playerUrl!);
  await expect(player.getByText(/connected · player · seq 0/)).toBeVisible();

  const dispatchAt = Date.now() + 500;
  await Promise.all([
    page
      .getByRole("button", { name: "Move → azure-gate", exact: true })
      .evaluate(
        (button, at) =>
          new Promise<void>((resolve) => {
            window.setTimeout(
              () => {
                (button as HTMLButtonElement).click();
                resolve();
              },
              Math.max(0, at - Date.now()),
            );
          }),
        dispatchAt,
      ),
    player
      .getByRole("button", { name: "Move → azure-gate", exact: true })
      .evaluate(
        (button, at) =>
          new Promise<void>((resolve) => {
            window.setTimeout(
              () => {
                (button as HTMLButtonElement).click();
                resolve();
              },
              Math.max(0, at - Date.now()),
            );
          }),
        dispatchAt,
      ),
  ]);
  await expect(page.getByText(/seq 1/)).toBeVisible();
  await expect(player.getByText(/seq 1/)).toBeVisible();
  await expect
    .poll(async () => {
      const left = await page.getByTestId("game-state-hash").textContent();
      const right = await player.getByTestId("game-state-hash").textContent();
      return left === right;
    })
    .toBe(true);
  const statuses = [
    await page.getByText(/(?:connected|conflict) · designer · seq 1/).count(),
    await player.getByText(/(?:connected|conflict) · player · seq 1/).count(),
  ];
  expect(statuses).toEqual([1, 1]);
  await playerContext.close();
});

test("reconnect restores the persistent room tail", async ({ page }) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Create shared room" }).click();
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await expect(page.getByText(/connected · designer · seq 1/)).toBeVisible();
  const hash = await page.getByTestId("game-state-hash").textContent();

  await page.reload();
  await expect(page.getByText(/connected · designer · seq 1/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(hash!);
});

test("fork from here copies a prefix and leaves the parent live", async ({
  page,
  browser,
}) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Create shared room" }).click();
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  const baseHash = await page.getByTestId("game-state-hash").textContent();
  await page
    .getByRole("button", { name: "Move → azure-gate", exact: true })
    .click();
  await expect(page.getByText(/connected · designer · seq 1/)).toBeVisible();
  const liveHash = await page.getByTestId("game-state-hash").textContent();
  expect(liveHash).not.toBe(baseHash);

  await page.getByRole("button", { name: "Previous cell" }).click();
  await expect(
    page.getByText(/Timeline 0 \/ 1 · inspecting prefix/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fork from here" }).click();
  const forkUrl = await page
    .getByRole("link", { name: "Open forked room" })
    .getAttribute("href");
  expect(forkUrl).not.toBeNull();

  const forkContext = await browser.newContext();
  const fork = await forkContext.newPage();
  await fork.goto(forkUrl!);
  await expect(fork.getByText(/connected · designer · seq 0/)).toBeVisible();
  await expect(fork.getByTestId("game-state-hash")).toHaveText(baseHash!);

  await page.getByRole("button", { name: "Return live" }).click();
  await expect(page.getByTestId("game-state-hash")).toHaveText(liveHash!);
  await expect(page.getByText(/Timeline 1 \/ 1 · live/)).toBeVisible();
  await forkContext.close();
});

async function installMockedAi(page: import("@playwright/test").Page) {
  const source = `Scenario("blue-gate-rotates-linked-room", {
  given: "explorer-enters-blue-gate",
  when: "after",
  then: "rotate-linked-room-clockwise-if-empty"
});`;
  await page.route("**/api/ai/designer", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: candidate\ndata: ${JSON.stringify({
        type: "candidate",
        candidate: {
          source,
          summary: "Mocked hero rule.",
          expected_effects: ["Mirror Gallery rotates."],
        },
        model: "gpt-5.6-sol",
        latencyMs: 10,
      })}\n\n`,
    });
  });
  await page.route("**/api/ai/player", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choice: { option_id: "ivo-option-1", reason: "Choose a legal option." },
        model: "gpt-5.6-luna",
        latencyMs: 8,
      }),
    });
  });
}
