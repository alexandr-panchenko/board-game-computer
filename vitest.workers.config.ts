import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify("workers-test"),
    __BUILD_TIMESTAMP__: JSON.stringify("workers-test"),
  },
  plugins: [
    cloudflareTest({
      main: "./src/worker/index.ts",
      wrangler: {
        configPath: "./wrangler.jsonc",
        environment: "test",
      },
    }),
  ],
  test: {
    include: ["tests/workers/**/*.test.ts"],
  },
});
