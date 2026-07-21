import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const repositoryFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const patterns: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  {
    name: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
];

const excluded = new Set([".env.example", ".dev.vars.example"]);
const failures: string[] = [];

function scanFile(path: string) {
  if (
    excluded.has(path) ||
    !existsSync(path) ||
    statSync(path).size > 5_000_000
  )
    return;
  const text = readFileSync(path, "utf8");
  for (const candidate of patterns) {
    candidate.pattern.lastIndex = 0;
    if (candidate.pattern.test(text))
      failures.push(`${path}: ${candidate.name}`);
  }

  for (const name of ["OPENAI_API_KEY", "CLOUDFLARE_API_TOKEN"] as const) {
    const assignment = new RegExp(
      `^\\s*(?:export\\s+)?${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s#]+))\\s*$`,
      "gm",
    );
    for (const match of text.matchAll(assignment)) {
      const value = match[1] ?? match[2] ?? match[3] ?? "";
      if (value.length > 0)
        failures.push(`${path}: non-empty ${name} assignment`);
    }
  }
}

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

for (const path of repositoryFiles) scanFile(path);
const generatedFiles = walk("dist");
for (const path of generatedFiles) scanFile(path);

if (failures.length > 0) {
  console.error(`Secret scan failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log(
  `Secret scan passed (${String(repositoryFiles.length)} repository files${generatedFiles.length ? " plus build output" : ""}).`,
);
