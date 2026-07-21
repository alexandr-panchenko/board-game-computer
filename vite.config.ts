import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(
      process.env.BUILD_COMMIT_SHA ?? "development",
    ),
    __BUILD_TIMESTAMP__: JSON.stringify(
      process.env.BUILD_TIMESTAMP ?? "development",
    ),
  },
  plugins: [react(), cloudflare()],
});
