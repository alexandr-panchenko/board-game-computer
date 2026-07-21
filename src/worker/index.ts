export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  ROOMS: {
    getByName(name: string): {
      fetch(request: Request): Promise<Response>;
    };
  };
}

const json = (value: unknown, status = 200): Response =>
  Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "board-game-computer",
        phase: "vertical-slice",
      });
    }

    if (url.pathname === "/api/version") {
      return json({
        service: "board-game-computer",
        commit: __BUILD_COMMIT__,
        builtAt: __BUILD_TIMESTAMP__,
        languageVersion: "board-game-computer-js-0.1",
        frameworkVersion: "board-game-computer-framework-0.1",
      });
    }

    if (url.pathname === "/api/room-health") {
      const room = env.ROOMS.getByName("vertical-slice-health");
      return room.fetch(new Request("https://room.internal/health"));
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;

export { RoomObject } from "./room-object";
