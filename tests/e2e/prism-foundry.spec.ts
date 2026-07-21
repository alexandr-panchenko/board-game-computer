import { expect, test, type Page } from "@playwright/test";

const designerSource = `addHouseRule("Ruby resonance", {
  when: "buy-ruby",
  then: "gain-prism"
});`;

test("first impression explains the product, objective, player, and next action", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/judge");

  await expect(
    page.getByRole("heading", { name: "The board game is the program." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prism Foundry" }),
  ).toBeVisible();
  await expect(
    page.getByText("Objective: First to 8 Prestige wins."),
  ).toBeVisible();
  await expect(page.getByText("Mara to act")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Prism Foundry tabletop/ }),
  ).toBeVisible();
  await expect(page.locator("canvas.table-canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open the complete program" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Advanced diagnostics" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("State hash")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Program is the complete uninterrupted executable room history", async ({
  page,
}) => {
  await page.goto("/judge");
  await page.getByRole("button", { name: "Open the complete program" }).click();

  await expect(
    page.getByRole("heading", { name: "One chronological executable history" }),
  ).toBeVisible();
  const cells = page.locator(".cell-sequence > li");
  await expect(cells).toHaveCount(16);
  await expect(cells.nth(0)).toContainText("Cell 1");
  await expect(cells.nth(0)).toContainText("Create the physical table");
  await expect(cells.nth(15)).toContainText("Cell 16");
  await expect(cells.nth(15)).toContainText("begin Mara's first turn");
  await expect(
    page.getByText("const table = {", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("function buyCard(playerId, cardId)", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Cell 17")).toBeVisible();
});

test("judge path connects creation, human action, Luna, Designer, trigger, and undo", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await installMockedAi(page);
  await page.goto("/judge");

  await page.getByRole("button", { name: "Open the complete program" }).click();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Take Ruby + Sapphire" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take Ruby + Sapphire" }).click();
  await expect(page.getByRole("status")).toContainText("Mara committed");

  await page.getByRole("button", { name: "Let Ivo move" }).click();
  await expect(page.getByRole("status")).toContainText(
    "GPT-5.6 Luna chose from legal options",
  );
  await expect(
    page.getByRole("button", { name: "Open Change rules" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Change rules" }).click();
  await page.getByRole("button", { name: "Ask GPT-5.6 Designer" }).click();
  await expect(page.getByRole("status")).toContainText("valid reversible cell");

  const trigger = page.getByRole("button", {
    name: "Trigger the rule · Buy Crimson Relay",
  });
  await activate(trigger, testInfo.project.name === "mobile");
  await expect(page.getByRole("status")).toContainText("Buy Crimson Relay");
  await activate(
    page.getByRole("button", { name: /Program/ }),
    testInfo.project.name === "mobile",
  );
  await expect(page.locator(".cell-sequence > li")).toHaveCount(20);
  await expect(page.getByText("House Rule · Ruby resonance")).toBeVisible();
  await expect(page.getByText(designerSource, { exact: false })).toBeVisible();

  await activate(
    page.getByRole("button", { name: "Undo cell" }),
    testInfo.project.name === "mobile",
  );
  await expect(page.getByRole("status")).toContainText("inverse patch");
  await activate(
    page.getByRole("button", { name: "Redo cell" }),
    testInfo.project.name === "mobile",
  );
  await expect(page.getByRole("status")).toContainText("forward patch");
});

test("AI-disabled path stays fully playable with labelled deterministic fallbacks", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.route("**/api/ai/player", (route) =>
    route.fulfill({ status: 503, body: "disabled" }),
  );
  await page.route("**/api/ai/designer", (route) =>
    route.fulfill({ status: 503, body: "disabled" }),
  );
  await page.goto("/judge");
  await page.getByRole("button", { name: "Open the complete program" }).click();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Take Ruby + Sapphire" }).click();
  await page.getByRole("button", { name: "Let Ivo move" }).click();
  await expect(page.getByRole("status")).toContainText(
    "deterministic legal fallback",
  );
  await page.getByRole("button", { name: "Open Change rules" }).click();
  await page.getByRole("button", { name: "Ask GPT-5.6 Designer" }).click();
  await expect(page.getByRole("status")).toContainText(
    "labelled offline example",
  );
  await page
    .getByRole("button", { name: "Use labelled offline example" })
    .click();
  await expect(page.getByRole("status")).toContainText("valid reversible cell");
  await expect(
    page.getByRole("button", { name: "Buy Crimson Relay", exact: true }),
  ).toBeVisible();
});

test("legal action copy is human-readable and keyboard focus is visible", async ({
  page,
}) => {
  await page.goto("/judge");
  const labels = await page.locator(".chip-actions button").allTextContents();
  expect(labels.join(" ")).not.toMatch(
    /crimson-relay|take:|human|ruby-\d|central-bank/,
  );
  const action = page.getByRole("button", { name: "Ruby + Sapphire" });
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

test("mobile uses table-first fixed navigation without long document travel", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Mobile information architecture assertion",
  );
  await page.goto("/judge");
  const navigation = page.getByRole("navigation", { name: "Product surfaces" });
  const box = await navigation.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(viewport!.height - 12);
  for (const [tab, heading] of [
    ["Program", "One chronological executable history"],
    ["Change rules", "Change the game by appending source."],
    ["Table", "Prism Foundry"],
  ] as const) {
    const tabButton = page.getByRole("button", {
      name: new RegExp(`^${tab}`),
    });
    const target = await tabButton.boundingBox();
    expect(target?.height).toBeGreaterThanOrEqual(44);
    await activate(tabButton, true);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("persistent clients converge, reconnect, inspect rollback, and fork", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "One desktop protocol journey is sufficient",
  );
  test.setTimeout(120_000);
  await page.goto("/judge");
  await page.getByRole("button", { name: "Share room" }).click();
  await expect(page.locator(".connection")).toHaveText("connected", {
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Advanced diagnostics" }).click();
  const playerUrl = await page
    .getByRole("link", { name: "Open Player capability link" })
    .getAttribute("href");
  expect(playerUrl).not.toBeNull();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto(playerUrl!);
  await expect(second.locator(".connection")).toHaveText("connected", {
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Ruby + Sapphire" }).click();
  await expect(page.getByRole("button", { name: /Program 17/ })).toBeVisible({
    timeout: 20_000,
  });
  await expect(second.getByRole("button", { name: /Program 17/ })).toBeVisible({
    timeout: 20_000,
  });
  await second.reload();
  await expect(second.getByRole("button", { name: /Program 17/ })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: /Program 17/ }).click();
  await page.getByRole("button", { name: "Undo cell" }).click();
  await page.getByRole("button", { name: "Fork from here" }).click();
  await expect(page.getByRole("status")).toContainText("Fork ready");
  await page.getByRole("button", { name: "Redo cell" }).click();
  await secondContext.close();
});

async function installMockedAi(page: Page): Promise<void> {
  await page.route("**/api/ai/player", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choice: {
          option_id: "take:amber:emerald",
          reason: "Ivo takes two available colors.",
        },
        model: "gpt-5.6-luna",
        latencyMs: 8,
      }),
    }),
  );
  await page.route("**/api/ai/designer", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: candidate\ndata: ${JSON.stringify({
        type: "candidate",
        candidate: {
          source: designerSource,
          summary: "Ruby resonance adds a Prism after Ruby purchases.",
          expected_effects: ["House Rules gains Ruby resonance."],
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

async function activate(
  locator: import("@playwright/test").Locator,
  mobile: boolean,
): Promise<void> {
  if (mobile)
    await locator.evaluate((element: HTMLButtonElement) => element.click());
  else await locator.click();
}
