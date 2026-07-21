import { expect, test, type Page } from "@playwright/test";

const designerSource = `addHouseRule("Ruby resonance", {
  when: "buy-ruby",
  then: "gain-prism"
});`;

test("first viewport is a player-first tabletop with one obvious action", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "1440 × 900 desktop gate");
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = collectErrors(page);
  await page.goto("/judge");
  await expect(
    page.getByRole("heading", { name: "Play the game. Rewrite the rules." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Collect crystals, build your engine, and ask the table to add a new rule while you play.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prism Foundry" }),
  ).toBeVisible();
  await expect(
    page.getByText("Be the first player to reach 8 Prestige."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "On your turn: take two different crystals or buy one card.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Mara's turn", { exact: true })).toBeVisible();
  const table = page.getByRole("img", { name: /Mara and Ivo player mats/ });
  await expect(table).toBeVisible();
  const tableBox = await page.locator(".interactive-table").boundingBox();
  expect(tableBox).not.toBeNull();
  expect(tableBox!.y + tableBox!.height).toBeLessThanOrEqual(900);
  await expect(page.locator("[data-primary-action=true]")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /Select Ruby crystal stack/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Select Sapphire crystal stack/ }),
  ).toBeVisible();
  await expect(page.getByText("Local game")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Create shared room/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    1440,
  );
  expect(errors).toEqual([]);
});

test("crystals are selected on the bank and Ivo plays automatically", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  let releasePlayer!: () => void;
  const playerGate = new Promise<void>((resolve) => {
    releasePlayer = resolve;
  });
  await installMockedAi(page, { playerGate });
  await page.goto("/judge");
  const ruby = page.getByRole("button", {
    name: /Select Ruby crystal stack/,
  });
  const sapphire = page.getByRole("button", {
    name: /Select Sapphire crystal stack/,
  });
  await ruby.click();
  await expect(page.locator(".token-hotspot.ruby")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await sapphire.click();
  await expect(page.locator(".token-hotspot.sapphire")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const commit = page.getByRole("button", {
    name: "Take Ruby + Sapphire",
    exact: true,
  });
  await expect(commit).toBeVisible();
  await commit.click();
  if (testInfo.project.name === "desktop")
    await expect(page.locator(".table-motion.token")).not.toHaveCount(0);
  await expect(page.locator(".turn-card strong")).toHaveText("Ivo's turn");
  await expect(page.locator(".ivo-thinking")).toContainText(
    "Ivo is choosing a move",
  );
  releasePlayer();
  await expect(page.locator(".table-announcement")).toContainText(
    "Ivo has finished; Mara is up next",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Table Agent", exact: true }).click();
  await expect(page.getByText("Ivo · Player", { exact: true })).toBeVisible();
  await expect(
    page.getByText("I took Amber and Emerald to prepare future purchases."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Table Agent" }).click();
  await page
    .getByRole("button", {
      name: testInfo.project.name === "desktop" ? /Program 18/ : "Program",
      exact: testInfo.project.name !== "desktop",
    })
    .click();
  await expect(
    page.locator('.program-cell[data-cell-number="18"]'),
  ).toBeVisible();
});

test("Table Agent adds a rule without replacing the table and the card purchase fires it", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await installMockedAi(page);
  await page.goto("/judge");
  await takeRecommendedPair(page);
  await expect(page.locator(".table-announcement")).toContainText(
    "Mara is up next",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Change a rule" }).click();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
  await expect(
    page.getByText("Designer · Rules", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ask the Designer" }).click();
  await expect(page.locator(".agent-message.designer").last()).toContainText(
    "Ruby Resonance is now part of this game",
  );
  await expect(page.locator(".house-rule-hotspot")).toHaveClass(/active/);
  await page.getByRole("button", { name: "Close Table Agent" }).click();

  await page
    .getByRole("button", { name: /Crimson Relay\. Affordable/ })
    .click();
  const purchase = page.getByLabel("Crimson Relay purchase details");
  await expect(purchase).toContainText("Cost");
  await expect(purchase).toContainText("Owned");
  await expect(purchase).toContainText("Discounts");
  await expect(purchase).toContainText("Final payment");
  await expect(purchase).toContainText("Prestige");
  await expect(purchase).toContainText("Ability");
  await page.getByRole("button", { name: "Buy Crimson Relay" }).click();
  await expect(page.locator(".table-announcement")).toContainText(
    "The new rule fired",
  );
  await expect(page.getByText("Your new rule fired")).toBeVisible();
  await expect(page.locator(".cell-toast")).toContainText("Cell 20 added");
  await page.getByRole("button", { name: "View source" }).click();
  await expect(page.locator(".program-cell.selected")).toHaveAttribute(
    "data-cell-number",
    "20",
  );
  await expect(page.getByText(designerSource, { exact: false })).toBeVisible();
});

test("unaffordable cards remain inspectable without pretending to be purchasable", async ({
  page,
}) => {
  await page.goto("/judge");
  await page
    .getByRole("button", { name: /Crimson Relay\. Not currently affordable/ })
    .click();
  const purchase = page.getByLabel("Crimson Relay purchase details");
  await expect(purchase).toBeVisible();
  await expect(
    purchase.getByRole("button", { name: "Not enough crystals" }),
  ).toBeDisabled();
});

test("physical Rulebook replaces the old bottom rules grid", async ({
  page,
}) => {
  await page.goto("/judge");
  await page
    .getByRole("button", { name: "Open the Prism Foundry Rulebook" })
    .click();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
  await expect(page.getByText("Reach 8 Prestige first.")).toBeVisible();
  await expect(
    page.getByText("Take two different crystals OR buy one card.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".rule-grid")).toHaveCount(0);
});

test("Program is continuous syntax-highlighted source beside the table", async ({
  page,
}, testInfo) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: /^Program/ }).click();
  await expect(
    page.getByRole("heading", { name: "Live room program" }),
  ).toBeVisible();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
  await expect(page.locator(".program-cell")).toHaveCount(16);
  await expect(page.locator(".syntax-keyword").first()).toBeVisible();
  await expect(page.locator(".syntax-string").first()).toBeVisible();
  await expect(page.locator(".syntax-call").first()).toBeVisible();
  await expect(page.locator(".cell-inspector")).not.toHaveAttribute("open", "");
  await expect(
    page.getByText("One chronological executable history"),
  ).toHaveCount(0);
  await expect(page.getByText("Genesis is not hidden setup")).toHaveCount(0);
  const cells = await page
    .locator(".program-cell")
    .evaluateAll((items) =>
      items.map((item) => Number(item.getAttribute("data-cell-number"))),
    );
  expect(cells).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
  if (testInfo.project.name === "desktop") {
    const panel = await page.locator(".side-panel").boundingBox();
    expect(panel!.width / page.viewportSize()!.width).toBeLessThanOrEqual(0.36);
  } else {
    await expect(
      page.getByRole("button", { name: "Close Program" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("default play copy is free of developer diagnostics", async ({ page }) => {
  await page.goto("/judge");
  const copy = await page.locator("body").innerText();
  for (const forbidden of [
    "One chronological executable history",
    "Genesis is not hidden setup",
    "Acorn parses",
    "speculatively",
    "inverse patch",
    "state hash",
    "source-cell boundary",
    "canonical",
  ])
    expect(copy).not.toContain(forbidden);
  expect(copy).not.toMatch(/central-bank|crimson-relay|take:|actorId/);
});

test("normal game has no forced demo prose and can reopen the guided path", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Guided demo")).toHaveCount(0);
  await expect(page.getByText("Demo · 1 of 4")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Guided demo" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Select Ruby crystal stack/ }),
  ).toBeVisible();
});

test("AI-disabled path uses labelled player and rule fallbacks", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.route("**/api/ai/player", (route) =>
    route.fulfill({ status: 503, body: "disabled" }),
  );
  await page.route("**/api/ai/designer", (route) =>
    route.fulfill({ status: 503, body: "disabled" }),
  );
  await page.goto("/judge");
  await takeRecommendedPair(page);
  await expect(page.locator(".table-announcement")).toContainText(
    "Mara is up next",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Table Agent", exact: true }).click();
  await expect(page.locator(".agent-message.ivo")).toContainText(
    "deterministic fallback",
  );
  await page.getByRole("button", { name: "Ask the Designer" }).click();
  await expect(page.locator(".agent-message.designer").last()).toContainText(
    "offline example",
  );
  await page
    .getByRole("button", { name: "Use labelled offline example" })
    .click();
  await expect(page.locator(".house-rule-hotspot")).toHaveClass(/active/);
});

test("mobile keeps table context and uses touch-safe drawer navigation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Pixel 7 mobile gate");
  await page.goto("/judge");
  const navigation = page.getByRole("navigation", { name: "Table tools" });
  const navBox = await navigation.boundingBox();
  expect(navBox!.y + navBox!.height).toBeGreaterThanOrEqual(
    page.viewportSize()!.height - 10,
  );
  const token = page.getByRole("button", { name: /Select Ruby crystal stack/ });
  const tokenBox = await token.boundingBox();
  expect(tokenBox!.width).toBeGreaterThanOrEqual(44);
  expect(tokenBox!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Table Agent", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close Table Agent" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Live room program" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("shared room exposes the Player invite and preserves convergence, reconnect, rollback, and fork", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One desktop room journey");
  test.setTimeout(150_000);
  await installMockedAi(page);
  await page.goto("/judge");
  await page.getByRole("button", { name: /Create shared room/ }).click();
  await expect(page).toHaveURL(/\/room\/[A-Za-z0-9._:-]+$/);
  await expect(
    page.getByRole("heading", { name: "Invite another player" }),
  ).toBeVisible();
  await expect(page.getByText("Designer", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy player invite" }),
  ).toBeVisible();
  await expect(page.locator(".room-facts .connection")).toHaveText(
    "Connected",
    { timeout: 30_000 },
  );
  const invite = await page
    .getByRole("link", { name: "Open player view" })
    .getAttribute("href");
  expect(invite).not.toBeNull();
  const roomPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Close Share room" }).click();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto(invite!);
  await expect(second).toHaveURL(new RegExp(`${escapeRegex(roomPath)}$`));
  expect(new URL(second.url()).hash).toBe("");
  await second.locator(".room-state").click();
  await expect(second.locator(".room-facts .connection")).toHaveText(
    "Connected",
    { timeout: 30_000 },
  );
  await expect(second.getByText("Player", { exact: true })).toBeVisible();
  await second.getByRole("button", { name: "Close Share room" }).click();

  await takeRecommendedPair(page);
  await expect(page.getByRole("button", { name: /Program 18/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(second.getByRole("button", { name: /Program 18/ })).toBeVisible({
    timeout: 30_000,
  });
  await second.reload();
  await expect(second.getByRole("button", { name: /Program 18/ })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: /Program 18/ }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Fork here" }).click();
  await expect(page.locator(".table-announcement")).toContainText(
    "original room is unchanged",
  );
  await page.getByRole("button", { name: /^Program/ }).click();
  await page.getByRole("button", { name: "Redo" }).click();
  await secondContext.close();
});

test("keyboard focus remains visible", async ({ page }) => {
  await page.goto("/judge");
  const action = page.getByRole("button", {
    name: /Select Ruby crystal stack/,
  });
  await action.focus();
  const outline = await action.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: Number.parseFloat(style.outlineWidth),
      kind: style.outlineStyle,
    };
  });
  expect(outline.kind).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(3);
});

async function takeRecommendedPair(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Select Ruby crystal stack/ }).click();
  await page
    .getByRole("button", { name: /Select Sapphire crystal stack/ })
    .click();
  await page.getByRole("button", { name: "Take Ruby + Sapphire" }).click();
}

async function installMockedAi(
  page: Page,
  options: { playerDelay?: number; playerGate?: Promise<void> } = {},
): Promise<void> {
  await page.route("**/api/ai/player", async (route) => {
    if (options.playerGate !== undefined) await options.playerGate;
    if ((options.playerDelay ?? 0) > 0)
      await new Promise((resolve) => setTimeout(resolve, options.playerDelay));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choice: {
          option_id: "take:amber:emerald",
          reason: "I took Amber and Emerald to prepare future purchases.",
        },
        model: "gpt-5.6-luna",
        latencyMs: 8,
      }),
    });
  });
  await page.route("**/api/ai/designer", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: candidate\ndata: ${JSON.stringify({
        type: "candidate",
        candidate: {
          source: designerSource,
          summary: "Ruby resonance",
          expected_effects: ["Ruby purchases gain Prism"],
        },
        model: "gpt-5.6",
        latencyMs: 10,
      })}\n\n`,
    }),
  );
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
