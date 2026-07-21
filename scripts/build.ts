import { execFileSync, spawn } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

const previewVarsPath = "dist/board_game_computer/.dev.vars";
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const builtAt = new Date().toISOString();

if (existsSync(previewVarsPath)) unlinkSync(previewVarsPath);

try {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn("vite", ["build"], {
      env: {
        ...process.env,
        BUILD_COMMIT_SHA: process.env.BUILD_COMMIT_SHA ?? commit,
        BUILD_TIMESTAMP: process.env.BUILD_TIMESTAMP ?? builtAt,
        WRANGLER_LOG_PATH:
          process.env.WRANGLER_LOG_PATH ??
          "/tmp/board-game-computer-wrangler.log",
      },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) process.exit(exitCode);
} finally {
  // The Cloudflare Vite plugin copies local dev vars solely for `vite preview`.
  // Production deployment does not need them, and release artifacts must not retain them.
  if (existsSync(previewVarsPath)) unlinkSync(previewVarsPath);
}
