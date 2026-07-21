export {};

const baseUrl = (
  process.env.PRODUCTION_URL ?? "https://boardgamecomputer.com"
).replace(/\/$/, "");
const expectedCommit = process.env.EXPECTED_COMMIT;

const [healthResponse, versionResponse, judgeResponse] = await Promise.all([
  fetch(`${baseUrl}/api/health`, { redirect: "error" }),
  fetch(`${baseUrl}/api/version`, { redirect: "error" }),
  fetch(`${baseUrl}/judge`, { redirect: "error" }),
]);

if (!healthResponse.ok || !versionResponse.ok || !judgeResponse.ok)
  throw new Error(
    `Production smoke failed: health=${String(healthResponse.status)} version=${String(versionResponse.status)} judge=${String(judgeResponse.status)}`,
  );

const health: unknown = await healthResponse.json();
const version: unknown = await versionResponse.json();
if (!isRecord(health) || health.ok !== true)
  throw new Error("Production health payload is invalid");
if (!isRecord(version) || typeof version.commit !== "string")
  throw new Error("Production version payload is invalid");
if (expectedCommit !== undefined && version.commit !== expectedCommit)
  throw new Error(
    `Production commit mismatch: expected ${expectedCommit}, received ${version.commit}`,
  );

const csp = judgeResponse.headers.get("content-security-policy");
if (csp === null || !csp.includes("frame-ancestors 'none'"))
  throw new Error("Production judge response is missing the security policy");

console.log(
  JSON.stringify({
    ok: true,
    baseUrl,
    commit: version.commit,
    judgeStatus: judgeResponse.status,
    securityHeaders: true,
  }),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
