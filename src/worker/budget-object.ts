import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

import type { Env } from "./env";

const ReserveSchema = z
  .object({
    roomKey: z.string().min(16).max(128),
    estimatedChars: z.number().int().nonnegative(),
    maxRequestsPerDay: z.number().int().positive(),
    maxEstimatedInputTokensPerDay: z.number().int().positive(),
    maxRequestsPerRoomPerHour: z.number().int().positive(),
  })
  .strict();

const RecordSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    model: z.string().min(1).max(128),
    outcome: z.enum(["success", "failure", "timeout"]),
  })
  .strict();

export class BudgetObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS daily_usage (
        day TEXT PRIMARY KEY,
        requests INTEGER NOT NULL,
        estimated_tokens INTEGER NOT NULL,
        actual_input_tokens INTEGER NOT NULL,
        actual_output_tokens INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS room_hour_usage (
        room_key TEXT NOT NULL,
        hour TEXT NOT NULL,
        requests INTEGER NOT NULL,
        PRIMARY KEY (room_key, hour)
      );
      CREATE TABLE IF NOT EXISTS model_outcomes (
        day TEXT NOT NULL,
        model TEXT NOT NULL,
        outcome TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (day, model, outcome)
      );
    `);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST")
      return Response.json({ error: "method" }, { status: 405 });
    const url = new URL(request.url);
    if (url.pathname === "/reserve") return this.reserve(await request.json());
    if (url.pathname === "/record") return this.record(await request.json());
    if (url.pathname === "/status") return this.status();
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  private reserve(value: unknown): Response {
    const parsed = ReserveSchema.safeParse(value);
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "AI_BUDGET_BAD_REQUEST" },
        { status: 400 },
      );
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const hour = now.toISOString().slice(0, 13);
    const estimatedTokens = Math.ceil(parsed.data.estimatedChars / 4);
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO daily_usage VALUES (?, 0, 0, 0, 0)",
      day,
    );
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO room_hour_usage VALUES (?, ?, 0)",
      parsed.data.roomKey,
      hour,
    );
    const daily = this.ctx.storage.sql
      .exec<{ requests: number; estimated_tokens: number }>(
        "SELECT requests, estimated_tokens FROM daily_usage WHERE day = ?",
        day,
      )
      .one();
    const room = this.ctx.storage.sql
      .exec<{ requests: number }>(
        "SELECT requests FROM room_hour_usage WHERE room_key = ? AND hour = ?",
        parsed.data.roomKey,
        hour,
      )
      .one();
    if (daily.requests >= parsed.data.maxRequestsPerDay)
      return limited("AI_GLOBAL_REQUEST_LIMIT");
    if (
      daily.estimated_tokens + estimatedTokens >
      parsed.data.maxEstimatedInputTokensPerDay
    )
      return limited("AI_GLOBAL_TOKEN_LIMIT");
    if (room.requests >= parsed.data.maxRequestsPerRoomPerHour)
      return limited("AI_ROOM_REQUEST_LIMIT");
    this.ctx.storage.sql.exec(
      "UPDATE daily_usage SET requests = requests + 1, estimated_tokens = estimated_tokens + ? WHERE day = ?",
      estimatedTokens,
      day,
    );
    this.ctx.storage.sql.exec(
      "UPDATE room_hour_usage SET requests = requests + 1 WHERE room_key = ? AND hour = ?",
      parsed.data.roomKey,
      hour,
    );
    return Response.json({ ok: true, estimatedTokens });
  }

  private record(value: unknown): Response {
    const parsed = RecordSchema.safeParse(value);
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "AI_BUDGET_BAD_REQUEST" },
        { status: 400 },
      );
    const day = new Date().toISOString().slice(0, 10);
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO daily_usage VALUES (?, 0, 0, 0, 0)",
      day,
    );
    this.ctx.storage.sql.exec(
      "UPDATE daily_usage SET actual_input_tokens = actual_input_tokens + ?, actual_output_tokens = actual_output_tokens + ? WHERE day = ?",
      parsed.data.inputTokens,
      parsed.data.outputTokens,
      day,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO model_outcomes VALUES (?, ?, ?, 1) ON CONFLICT(day, model, outcome) DO UPDATE SET count = count + 1",
      day,
      parsed.data.model,
      parsed.data.outcome,
    );
    return Response.json({ ok: true });
  }

  private status(): Response {
    const day = new Date().toISOString().slice(0, 10);
    const rows = this.ctx.storage.sql
      .exec<{
        requests: number;
        estimated_tokens: number;
        actual_input_tokens: number;
        actual_output_tokens: number;
      }>(
        "SELECT requests, estimated_tokens, actual_input_tokens, actual_output_tokens FROM daily_usage WHERE day = ?",
        day,
      )
      .toArray();
    return Response.json({ ok: true, day, usage: rows[0] ?? null });
  }
}

function limited(code: string): Response {
  return Response.json({ ok: false, code }, { status: 429 });
}
