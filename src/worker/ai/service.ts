import type {
  DesignerCandidate,
  DesignerRequest,
  PlayerChoice,
  PlayerRequest,
} from "../../shared/ai";
import type { Env } from "../env";
import type { AiConfig } from "./config";
import { buildDesignerContext, buildPlayerContext } from "./context";
import { AiGatewayError, type AiGateway, type GatewayResult } from "./gateway";

export interface AiServiceResult<T> {
  value: T;
  model: string;
  latencyMs: number;
}

export class AiServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export async function generateDesignerCandidate(
  request: DesignerRequest,
  env: Env,
  config: AiConfig,
  gateway: AiGateway,
  requestSignal: AbortSignal,
): Promise<AiServiceResult<DesignerCandidate>> {
  const prompt = buildDesignerContext(request);
  return runModelCall({
    roomId: request.roomId,
    prompt,
    model: config.designerModel,
    env,
    config,
    requestSignal,
    call: (signal, safetyIdentifier) =>
      gateway.proposeDesigner({
        model: config.designerModel,
        prompt,
        safetyIdentifier,
        signal,
      }),
  });
}

export async function choosePlayerAction(
  request: PlayerRequest,
  env: Env,
  config: AiConfig,
  gateway: AiGateway,
  requestSignal: AbortSignal,
): Promise<AiServiceResult<PlayerChoice>> {
  const prompt = buildPlayerContext(request);
  return runModelCall({
    roomId: request.roomId,
    prompt,
    model: config.playerModel,
    env,
    config,
    requestSignal,
    call: (signal, safetyIdentifier) =>
      gateway.choosePlayer({
        model: config.playerModel,
        prompt,
        optionIds: request.options.map((option) => option.optionId),
        safetyIdentifier,
        signal,
      }),
  });
}

async function runModelCall<T>(input: {
  roomId: string;
  prompt: string;
  model: string;
  env: Env;
  config: AiConfig;
  requestSignal: AbortSignal;
  call(
    signal: AbortSignal,
    safetyIdentifier: string,
  ): Promise<GatewayResult<T>>;
}): Promise<AiServiceResult<T>> {
  if (!input.config.enabled)
    throw new AiServiceError(
      "AI_DISABLED",
      "Live AI is disabled; use the labelled deterministic fallback.",
      503,
      false,
    );
  const roomKey = await digest(`budget:${input.roomId}`);
  const reserved = await input.env.AI_BUDGET.getByName("global").fetch(
    new Request("https://budget.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomKey,
        estimatedChars: input.prompt.length,
        maxRequestsPerDay: input.config.maxRequestsPerDay,
        maxEstimatedInputTokensPerDay:
          input.config.maxEstimatedInputTokensPerDay,
        maxRequestsPerRoomPerHour: input.config.maxRequestsPerRoomPerHour,
      }),
    }),
  );
  if (!reserved.ok) {
    const detail: unknown = await reserved.json();
    const code =
      typeof detail === "object" &&
      detail !== null &&
      "code" in detail &&
      typeof detail.code === "string"
        ? detail.code
        : "AI_BUDGET_LIMIT";
    throw new AiServiceError(
      code,
      "The live AI budget is unavailable; use the labelled fallback.",
      reserved.status,
      false,
    );
  }
  const controller = new AbortController();
  const relayAbort = () => controller.abort(input.requestSignal.reason);
  input.requestSignal.addEventListener("abort", relayAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort("timeout"),
    input.config.requestTimeoutMs,
  );
  const started = performance.now();
  let outcome: "success" | "failure" | "timeout" = "failure";
  let usage = { inputTokens: 0, outputTokens: 0 };
  try {
    const result = await input.call(
      controller.signal,
      await digest(`safety:${input.roomId}`),
    );
    usage = result;
    outcome = "success";
    return {
      value: result.value,
      model: result.model,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    if (controller.signal.aborted) {
      outcome = "timeout";
      throw new AiServiceError(
        input.requestSignal.aborted ? "AI_CANCELLED" : "AI_TIMEOUT",
        input.requestSignal.aborted
          ? "AI request was cancelled."
          : "AI request timed out; use the labelled fallback.",
        input.requestSignal.aborted ? 499 : 504,
        true,
      );
    }
    if (error instanceof AiGatewayError)
      throw new AiServiceError(error.code, error.message, 502, error.retryable);
    throw new AiServiceError(
      "AI_UPSTREAM_ERROR",
      "The model request failed; use the labelled fallback.",
      502,
      true,
    );
  } finally {
    clearTimeout(timer);
    input.requestSignal.removeEventListener("abort", relayAbort);
    const latencyMs = Math.round(performance.now() - started);
    console.info(
      JSON.stringify({
        event: "ai.request",
        model: input.model,
        outcome,
        latencyMs,
      }),
    );
    await input.env.AI_BUDGET.getByName("global").fetch(
      new Request("https://budget.internal/record", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...usage, model: input.model, outcome }),
      }),
    );
  }
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
