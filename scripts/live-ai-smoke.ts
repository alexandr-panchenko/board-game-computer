import { validateDesignerCandidate } from "../src/sample";
import { AI_MODELS } from "../src/shared/ai";
import { OpenAiGateway } from "../src/worker/ai/gateway";
import { readFile } from "node:fs/promises";

if (
  process.env.LIVE_AI_TEST !== "true" ||
  process.env.LIVE_AI_BUDGET_OK !== "true" ||
  process.env.LIVE_AI_MAX_CALLS !== "2"
) {
  console.error(
    "Live AI smoke is opt-in and exactly two bounded calls. Set LIVE_AI_TEST=true LIVE_AI_BUDGET_OK=true LIVE_AI_MAX_CALLS=2.",
  );
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY ?? (await localOpenAiKey());
if (apiKey === undefined || apiKey.length === 0) {
  console.error(
    "OPENAI_API_KEY is unavailable in the environment or .dev.vars.",
  );
  process.exit(1);
}

const gateway = new OpenAiGateway(apiKey);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort("live-smoke-timeout"), 45_000);
try {
  const designer = await gateway.proposeDesigner({
    model: AI_MODELS.designer,
    prompt: `Return the required tool call with exactly this supported Board Game Computer rule shape. Do not add commentary or other source:\nScenario("blue-gate-rotates-linked-room", { given: "explorer-enters-blue-gate", when: "after", then: "rotate-linked-room-clockwise-if-empty" });`,
    safetyIdentifier: "board-game-computer-live-smoke",
    signal: controller.signal,
  });
  const validation = validateDesignerCandidate(designer.value.source);
  if (!validation.ok)
    throw new Error(
      `Live Designer candidate failed ${validation.diagnostic.code}`,
    );
  const player = await gateway.choosePlayer({
    model: AI_MODELS.player,
    prompt:
      "Choose exactly one offered legal option for Ivo. opaque-1 searches the current room; opaque-2 ends the turn.",
    optionIds: ["opaque-1", "opaque-2"],
    safetyIdentifier: "board-game-computer-live-smoke",
    signal: controller.signal,
  });
  if (!new Set(["opaque-1", "opaque-2"]).has(player.value.option_id))
    throw new Error("Live player selected an option that was not offered");
  console.log(
    JSON.stringify({
      ok: true,
      designer: {
        model: designer.model,
        locallyValidated: true,
        inputTokens: designer.inputTokens,
        outputTokens: designer.outputTokens,
      },
      player: {
        model: player.model,
        selectedOfferedOption: true,
        inputTokens: player.inputTokens,
        outputTokens: player.outputTokens,
      },
    }),
  );
} finally {
  clearTimeout(timer);
}

async function localOpenAiKey(): Promise<string | undefined> {
  let contents: string;
  try {
    contents = await readFile(".dev.vars", "utf8");
  } catch {
    return undefined;
  }
  const line = contents
    .split(/\r?\n/)
    .find((candidate: string) => /^\s*OPENAI_API_KEY\s*=/.test(candidate));
  if (line === undefined) return undefined;
  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}
