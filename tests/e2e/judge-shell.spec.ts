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
    page.getByRole("heading", { name: "A board game that rewrites itself." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Find 2 relics and return to Gatehouse before Threat reaches 10.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /top-down shifting vaults/i }),
  ).toBeVisible();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
  await expect(page.getByTestId("primary-journey-action")).toHaveText(
    /Next step/,
  );

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
  await expect(page.getByText("Watch the program run · 0 / 3")).toBeVisible();
  await expect(page.getByRole("button", { name: /Next step/ })).toBeVisible();
});

test("runtime inspector commits, undoes, and redoes a cell", async ({
  page,
}) => {
  await page.goto("/judge");
  await openAdvanced(page);
  const lab = page.locator("section.runtime-lab");
  const initialHash = await lab
    .getByTestId("language-state-hash")
    .textContent();

  await lab.getByRole("button", { name: "Run cell" }).click();
  await expect(lab.getByRole("status")).toContainText("Committed cell:1");
  const committedHash = await lab
    .getByTestId("language-state-hash")
    .textContent();
  expect(committedHash).not.toBe(initialHash);

  await lab.getByRole("button", { name: "Undo lab cell" }).click();
  await expect(lab.getByRole("status")).toHaveText("Applied inverse patch.");
  await expect(lab.getByTestId("language-state-hash")).toHaveText(initialHash!);

  await lab.getByRole("button", { name: "Redo lab cell" }).click();
  await expect(lab.getByRole("status")).toHaveText("Applied forward patch.");
  await expect(lab.getByTestId("language-state-hash")).toHaveText(
    committedHash!,
  );
});

test("semantic game action updates the Pixi-projected state and resets", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/judge");
  const initialHash = await page.getByTestId("game-state-hash").textContent();

  await clickLegalAction(page, "Move Mara to Azure Gate");
  await expect(page.getByRole("status").first()).toContainText(
    "Mara to Azure Gate",
  );
  await expect(page.getByText(/Mara · Azure Gate/)).toBeVisible();
  const movedHash = await page.getByTestId("game-state-hash").textContent();
  expect(movedHash).not.toBe(initialHash);

  await openAdvanced(page);
  await page.getByRole("button", { name: "Undo last move" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText(/Mara · Clockwork Archive/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(initialHash!);
  await openAdvanced(page);
  await page.getByRole("button", { name: "Redo last move" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText(/Mara · Azure Gate/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(movedHash!);

  await page
    .getByRole("button", { name: "Skip replay and take control" })
    .click();
  await expect(page.getByText(/Mara · Clockwork Archive/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(initialHash!);
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByText(/Mara · Gatehouse/)).toBeVisible();
  await expect(page.getByText("Round 1")).toBeVisible();
  await expect(
    page.getByLabel("Game status").getByText("2 / 10"),
  ).toBeVisible();
});

test("complete deterministic game reaches a real ending", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/judge");

  await clickLegalAction(page, "Move Mara to Azure Gate");
  await clickLegalAction(page, "Move Mara to Glass Gallery");
  await clickLegalAction(page, "End Mara's turn");
  await clickLegalAction(page, "End Ivo's turn");
  await clickLegalAction(page, "Search Glass Gallery");
  await clickLegalAction(page, "Move Mara to Azure Gate");
  await clickLegalAction(page, "End Mara's turn");
  await clickLegalAction(page, "End Ivo's turn");
  await clickLegalAction(page, "Move Mara to Clockwork Archive");
  await clickLegalAction(page, "Move Mara to Gatehouse");

  await expect(
    page.getByRole("status").filter({ hasText: "Mara escaped the vault" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Mara · Gatehouse · \d AP · 2\/2 relics/),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Legal actions" })).toHaveCount(
    0,
  );
});

test("mobile game controls remain semantic and touch-sized", async ({
  page,
}) => {
  await page.goto("/judge");
  await page
    .getByRole("button", { name: "Skip replay and take control" })
    .click();
  const move = page.getByTestId("primary-journey-action");
  await expect(move).toHaveText(/Move Mara to Azure Gate/);
  await expect(move).toBeVisible();
  const box = await move.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await move.click();
  await expect(page.getByText(/Mara · Azure Gate/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("selecting an explorer then a glowing room proposes one move cell", async ({
  page,
}) => {
  await page.goto("/judge");
  const canvas = page.locator("canvas.table-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = (value: number) => box!.x + (value / 720) * box!.width;
  const y = (value: number) => box!.y + (value / 500) * box!.height;

  await page.mouse.click(x(323), y(252));
  await page.mouse.click(x(347), y(96));

  await expect(page.getByText(/Mara · Azure Gate/)).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "Mara to Azure Gate",
  );
});

test("AI fallback keeps the Designer rule and AI seat playable", async ({
  page,
}) => {
  await page.goto("/judge");
  const beforeRule = await page.getByTestId("game-state-hash").textContent();
  await page.getByRole("button", { name: "Change rules" }).click();
  await page.getByRole("button", { name: "Try the example rule" }).click();
  await page.getByRole("button", { name: "Change rules" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Labelled example rule validated" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await expect(
    page.getByText(/Designer rule · Labelled example/),
  ).toBeVisible();
  await expect(page.getByRole("code").first()).toContainText(
    'Scenario("blue-gate-rotates-linked-room"',
  );
  expect(await page.getByTestId("game-state-hash").textContent()).not.toBe(
    beforeRule,
  );

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await clickLegalAction(page, "End Mara's turn");
  await page
    .getByRole("button", { name: "Use deterministic Ivo fallback" })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "deterministic fallback completed",
  );
  await expect(
    page.getByLabel("Game status").getByText("Mara", { exact: true }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Change rules" }).click();
  await page.getByRole("button", { name: "Ask GPT-5.6 Designer" }).click();
  await page.getByRole("button", { name: "Change rules" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Mocked live blue-gate rule" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await expect(page.getByText(/Designer rule · Mocked live/)).toBeVisible();

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await clickLegalAction(page, "End Mara's turn");
  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByRole("status").first()).toContainText(
    "Live gpt-5.6-luna: Use the first legal path",
  );
});

test("judge path links replay, takeover, AI, rule, and trigger", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await installMockedAi(page);
  const started = Date.now();
  await page.goto("/judge");
  await expect(page.getByText("Watch the program run · 0 / 3")).toBeVisible();

  for (let step = 1; step <= 3; step += 1) {
    await page.getByTestId("primary-journey-action").click();
    await expect(
      page.getByText(`Watch the program run · ${String(step)} / 3`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Program", exact: true }).click();
    await expect(
      page.getByRole("list", { name: "Replay execution trace" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Play", exact: true }).click();
  }
  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByText("Takeover · Human")).toBeVisible();
  const humanMove = page.getByTestId("primary-journey-action");
  await expect(humanMove).toHaveText(/Move Mara to Azure Gate/);
  await humanMove.click();

  await expect(page.getByText("Takeover · AI player")).toBeVisible();
  await page.getByTestId("primary-journey-action").click();
  await expect(
    page.locator('.stage-progress li[aria-current="step"]'),
  ).toContainText("Change the rules");
  await expect(
    page.getByRole("button", { name: "Change rules", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByText("Rule committed · Trigger setup")).toBeVisible();

  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByText("Rule committed · Trigger now")).toBeVisible();
  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByText("Hero path complete")).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "new rule fired",
  );
  expect(Date.now() - started).toBeLessThan(90_000);
});

test("reset demo and replay from start reproduce the judge path", async ({
  page,
}) => {
  await page.goto("/judge");
  await page
    .getByRole("button", { name: "Skip replay and take control" })
    .click();
  await page.getByTestId("primary-journey-action").click();
  await page.getByRole("button", { name: "Return to demo checkpoint" }).click();
  await expect(page.getByText("Takeover · Human")).toBeVisible();
  await expect(page.getByText(/Mara · Clockwork Archive/)).toBeVisible();
  await expect(
    page.getByLabel("Game status").getByText("Round 3"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Replay from start" }).click();
  await expect(page.getByText("Watch the program run · 0 / 3")).toBeVisible();
  await expect(
    page.getByLabel("Game status").getByText("Round 1"),
  ).toBeVisible();
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByText("Fresh deterministic copy")).toBeVisible();
  await expect(page.getByText(/Mara · Gatehouse/)).toBeVisible();
});

test("judge path completes with AI fallback and example rule", async ({
  page,
}) => {
  await page.goto("/judge");
  await page
    .getByRole("button", { name: "Skip replay and take control" })
    .click();
  await page.getByTestId("primary-journey-action").click();
  await page
    .getByRole("button", { name: "Use deterministic Ivo fallback" })
    .click();
  await expect(
    page.locator('.stage-progress li[aria-current="step"]'),
  ).toContainText("Change the rules");
  await page.getByRole("button", { name: "Try the example rule" }).click();
  await page.getByTestId("primary-journey-action").click();
  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByText("Hero path complete")).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    "new rule fired",
  );
});

test("two-client room converges through one canonical order", async ({
  page,
  browser,
}) => {
  await page.goto("/judge");
  await createSharedRoomUi(page);
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  const playerUrl = await page
    .getByRole("link", { name: "Open Player link" })
    .getAttribute("href");
  expect(playerUrl).not.toBeNull();

  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await player.goto(playerUrl!);
  await showSharedRoom(player);
  await expect(player.getByText(/connected · player · seq 0/)).toBeVisible();

  await clickLegalAction(page, "Move Mara to Azure Gate");
  await showSharedRoom(page);
  await showSharedRoom(player);
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
  await createSharedRoomUi(page);
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  const playerUrl = await page
    .getByRole("link", { name: "Open Player link" })
    .getAttribute("href");
  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await player.goto(playerUrl!);
  await showSharedRoom(player);
  await expect(player.getByText(/connected · player · seq 0/)).toBeVisible();

  const dispatchAt = Date.now() + 500;
  const designerMove = await prepareLegalAction(
    page,
    "Move Mara to Azure Gate",
  );
  const playerMove = await prepareLegalAction(
    player,
    "Move Mara to Azure Gate",
  );
  await Promise.all([
    designerMove.evaluate(
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
    playerMove.evaluate(
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
  await showSharedRoom(page);
  await showSharedRoom(player);
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
  await createSharedRoomUi(page);
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  await clickLegalAction(page, "Move Mara to Azure Gate");
  await showSharedRoom(page);
  await expect(page.getByText(/connected · designer · seq 1/)).toBeVisible();
  const hash = await page.getByTestId("game-state-hash").textContent();

  await page.reload();
  await showSharedRoom(page);
  await expect(page.getByText(/connected · designer · seq 1/)).toBeVisible();
  await expect(page.getByTestId("game-state-hash")).toHaveText(hash!);
});

test("fork from here copies a prefix and leaves the parent live", async ({
  page,
  browser,
}) => {
  await page.goto("/judge");
  await createSharedRoomUi(page);
  await expect(page.getByText(/connected · designer · seq 0/)).toBeVisible();
  const baseHash = await page.getByTestId("game-state-hash").textContent();
  await clickLegalAction(page, "Move Mara to Azure Gate");
  await showSharedRoom(page);
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
  await showSharedRoom(fork);
  await expect(fork.getByText(/connected · designer · seq 0/)).toBeVisible();
  await expect(fork.getByTestId("game-state-hash")).toHaveText(baseHash!);

  await page.getByRole("button", { name: "Return live" }).click();
  await expect(page.getByTestId("game-state-hash")).toHaveText(liveHash!);
  await expect(page.getByText(/Timeline 1 \/ 1 · live/)).toBeVisible();
  await forkContext.close();
});

test("AI cancellation leaves explicit retry and fallback controls", async ({
  page,
}) => {
  await page.route("**/api/ai/designer", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.fulfill({ status: 503, body: "disabled" });
  });
  await page.goto("/judge");
  await page.getByRole("button", { name: "Change rules" }).click();
  await page.getByRole("button", { name: "Ask GPT-5.6 Designer" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel Designer request" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel Designer request" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByText(/Designer request cancelled/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry GPT-5.6 Designer" }),
  ).toBeVisible();

  await page.route("**/api/ai/player", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.fulfill({ status: 503, body: "disabled" });
  });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page
    .getByRole("button", { name: "Skip replay and take control" })
    .click();
  await page.getByTestId("primary-journey-action").click();
  await page.getByTestId("primary-journey-action").click();
  await expect(
    page.getByRole("button", { name: "Cancel Luna request" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel Luna request" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByText(/Luna request cancelled/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use deterministic Ivo fallback" }),
  ).toBeVisible();
});

test("clean browser completes fallback path without console-breaking errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/judge");
  await page
    .getByRole("button", { name: "Skip replay and take control" })
    .click();
  await page.getByTestId("primary-journey-action").click();
  await page
    .getByRole("button", { name: "Use deterministic Ivo fallback" })
    .click();
  await page.getByRole("button", { name: "Try the example rule" }).click();
  await page.getByTestId("primary-journey-action").click();
  await page.getByTestId("primary-journey-action").click();
  await expect(page.getByText("Hero path complete")).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("human-first hierarchy keeps one primary action and hides technical diagnostics", async ({
  page,
}) => {
  await page.goto("/judge");
  const primary = page.getByTestId("primary-journey-action");
  await expect(primary).toHaveCount(1);
  await expect(primary).toBeVisible();

  const action = await prepareLegalAction(page, "Move Mara to Azure Gate");
  const legalLabels = await page
    .getByRole("list", { name: "Legal actions" })
    .getByRole("button")
    .allTextContents();
  expect(legalLabels.join(" ")).not.toMatch(
    /azure-gate|clockwork-archive|explorer-mara|gear-\d|sprint-\d|ward-\d/,
  );

  await action.focus();
  const focusStyle = await action.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(focusStyle.style).not.toBe("none");
  expect(Number.parseFloat(focusStyle.width)).toBeGreaterThanOrEqual(3);

  await page.getByRole("button", { name: "Program", exact: true }).click();
  const advanced = page.locator("details.advanced-panel");
  await expect(advanced).not.toHaveAttribute("open", "");
  await expect(page.getByText("Game state hash")).not.toBeVisible();

  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog", { name: "How to play" })).toBeVisible();
  await expect(page.getByText("Spend 2 AP")).toBeVisible();
  await expect(page.getByText("Match doors")).toBeVisible();
});

test("mobile navigation reaches all product surfaces without document travel", async ({
  page,
}) => {
  await page.goto("/judge");
  const scrollBefore = await page.evaluate(() => window.scrollY);
  for (const [button, surface] of [
    ["Change rules", "Change rules"],
    ["Program", "Program and replay"],
    ["Play", "Play"],
  ] as const) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByRole("region", { name: surface })).toBeVisible();
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  const nav = await page
    .getByRole("navigation", { name: "Product sections" })
    .boundingBox();
  if (page.viewportSize()!.width <= 820) {
    expect(nav!.y + nav!.height).toBeGreaterThanOrEqual(
      page.viewportSize()!.height - 2,
    );
  }
});

test("fresh game can reach the vault-collapse ending through the UI", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/judge");
  await page.getByRole("button", { name: "New game" }).click();
  for (let turn = 0; turn < 20; turn += 1) {
    if (await page.getByText("The vault collapsed.").count()) break;
    await clickEndTurn(page);
  }
  await expect(
    page.getByRole("status").filter({ hasText: "The vault collapsed" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Game status").getByText("10 / 10"),
  ).toBeVisible();
});

async function openAdvanced(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Program", exact: true }).click();
  const details = page.locator("details.advanced-panel");
  if ((await details.getAttribute("open")) === null)
    await details.getByText("Advanced diagnostics").click();
}

async function prepareLegalAction(
  page: import("@playwright/test").Page,
  name: string,
) {
  const play = page.getByRole("button", { name: "Play", exact: true });
  if ((await play.getAttribute("aria-current")) !== "page") await play.click();
  const details = page.locator("details.all-actions");
  if ((await details.getAttribute("open")) === null)
    await details
      .getByText(/All legal moves/)
      .evaluate((summary: HTMLElement) => summary.click());
  return details.getByRole("button", { name, exact: true });
}

async function clickLegalAction(
  page: import("@playwright/test").Page,
  name: string,
) {
  await (await prepareLegalAction(page, name)).click();
}

async function clickEndTurn(page: import("@playwright/test").Page) {
  const play = page.getByRole("button", { name: "Play", exact: true });
  if ((await play.getAttribute("aria-current")) !== "page") await play.click();
  const details = page.locator("details.all-actions");
  if ((await details.getAttribute("open")) === null)
    await details
      .getByText(/All legal moves/)
      .evaluate((summary: HTMLElement) => summary.click());
  await details
    .getByRole("button", { name: /^End (Mara|Ivo)'s turn$/ })
    .evaluate((button: HTMLButtonElement) => button.click());
}

async function showSharedRoom(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Change rules" }).click();
  const details = page.locator("details.room-sharing");
  if ((await details.getAttribute("open")) === null)
    await details.getByText("Share this room").click();
}

async function createSharedRoomUi(page: import("@playwright/test").Page) {
  await showSharedRoom(page);
  await page.getByRole("button", { name: "Create shared room" }).click();
}

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
