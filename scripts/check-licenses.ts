import { existsSync, readFileSync } from "node:fs";

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface InstalledManifest {
  version?: string;
  license?: string;
}

const allowed = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
]);
const root = JSON.parse(
  readFileSync("package.json", "utf8"),
) as PackageManifest;
const direct = [
  ...Object.keys(root.dependencies ?? {}),
  ...Object.keys(root.devDependencies ?? {}),
].sort();
const failures: string[] = [];

for (const name of direct) {
  const manifestPath = `node_modules/${name}/package.json`;
  if (!existsSync(manifestPath)) {
    failures.push(`${name}: not installed`);
    continue;
  }

  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as InstalledManifest;
  const normalized = manifest.license ?? "UNKNOWN";
  const licenses = normalized.split(/\s+(?:OR|AND)\s+|\s*\/\s*/);
  if (!licenses.some((license) => allowed.has(license.replace(/[()]/g, "")))) {
    failures.push(`${name}@${manifest.version ?? "unknown"}: ${normalized}`);
  }
}

if (failures.length > 0) {
  console.error(`License check failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log(
  `License check passed for ${String(direct.length)} direct dependencies.`,
);
