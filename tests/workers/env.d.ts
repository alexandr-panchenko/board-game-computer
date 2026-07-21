import type { Env as WorkerEnv } from "../../src/worker/index";

declare global {
  namespace Cloudflare {
    // Declaration merging requires an interface for the Workers runtime environment.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Env extends WorkerEnv {}

    interface GlobalProps {
      mainModule: typeof import("../../src/worker/index");
      durableNamespaces: "RoomObject";
    }
  }
}

export {};
