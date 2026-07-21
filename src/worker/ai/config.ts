import { AI_MODELS } from "../../shared/ai";
import type { Env } from "../env";

export interface AiConfig {
  enabled: boolean;
  designerModel: string;
  playerModel: string;
  maxRequestsPerDay: number;
  maxEstimatedInputTokensPerDay: number;
  maxRequestsPerRoomPerHour: number;
  requestTimeoutMs: number;
}

export function readAiConfig(env: Env): AiConfig {
  return {
    enabled:
      env.AI_ENABLED !== "false" &&
      typeof env.OPENAI_API_KEY === "string" &&
      env.OPENAI_API_KEY.length > 0,
    designerModel: env.AI_DESIGNER_MODEL ?? AI_MODELS.designer,
    playerModel: env.AI_PLAYER_MODEL ?? AI_MODELS.player,
    maxRequestsPerDay: positiveInt(env.AI_MAX_REQUESTS_PER_DAY, 200),
    maxEstimatedInputTokensPerDay: positiveInt(
      env.AI_MAX_ESTIMATED_INPUT_TOKENS_PER_DAY,
      250_000,
    ),
    maxRequestsPerRoomPerHour: positiveInt(
      env.AI_MAX_REQUESTS_PER_ROOM_PER_HOUR,
      20,
    ),
    requestTimeoutMs: positiveInt(env.AI_REQUEST_TIMEOUT_MS, 20_000),
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
