import { DurableObject } from "cloudflare:workers";

import type { Env } from "./index";

export class RoomObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room_health (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        initialized_at TEXT NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO room_health (id, initialized_at) VALUES (1, datetime('now'))",
    );
  }

  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const row = this.ctx.storage.sql
      .exec<{ initialized_at: string }>(
        "SELECT initialized_at FROM room_health WHERE id = 1",
      )
      .one();

    return Response.json({
      ok: true,
      durableObject: "RoomObject",
      storage: "sqlite",
      initialized: typeof row.initialized_at === "string",
    });
  }
}
