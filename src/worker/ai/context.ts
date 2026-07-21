import type { DesignerRequest, PlayerRequest } from "../../shared/ai";

export const AI_CONTEXT_MAX_CHARS = 48_000;

const languageContract = `Board Game Computer Designer contract v1
- Return exactly one source cell through the required tool.
- Source is a deliberate JavaScript subset, never native JavaScript.
- No eval, Function, browser, network, time, promises, classes, imports, or prototype access.
- The showcased supported Prism Foundry rule declaration is:
  addHouseRule("Ruby resonance", {
    when: "buy-ruby",
    then: "gain-prism"
  });
- Do not invent framework names. Failed candidates are never committed.
- The browser will parse, validate, and speculatively execute the candidate.`;

export function buildDesignerContext(request: DesignerRequest): string {
  const fixed = [
    languageContract,
    `User request:\n${redactSensitive(request.request)}`,
    `Current base: sequence ${String(request.baseSeq)}, hash ${request.baseHash}`,
    `Runtime inspection:\n${redactSensitive(request.inspection)}`,
    request.diagnostics.length === 0
      ? "Prior diagnostics: none"
      : `Prior diagnostics:\n${JSON.stringify(request.diagnostics)}`,
  ];
  const prioritized = [...request.sourceCells].sort(
    (left, right) => priority(left.kind) - priority(right.kind),
  );
  const sourceSections: string[] = [];
  for (const cell of prioritized) {
    const section = `[${cell.kind}:${cell.id}]\n${redactSensitive(cell.source)}`;
    const proposed = [
      ...fixed,
      "Room source:",
      ...sourceSections,
      section,
    ].join("\n\n");
    if (proposed.length > AI_CONTEXT_MAX_CHARS) continue;
    sourceSections.push(section);
  }
  const result = [...fixed, "Room source:", ...sourceSections].join("\n\n");
  return result.slice(0, AI_CONTEXT_MAX_CHARS);
}

export function buildPlayerContext(request: PlayerRequest): string {
  const options = request.options
    .map(
      (option) => `${option.optionId}: ${option.label} — ${option.consequence}`,
    )
    .join("\n");
  return redactSensitive(
    `Choose one listed legal option for Ivo in Prism Foundry. Return only the required tool call.\n` +
      `State hash: ${request.baseHash}\nInspection:\n${request.inspection}\nOptions:\n${options}`,
  ).slice(0, AI_CONTEXT_MAX_CHARS);
}

export function redactSensitive(value: string): string {
  return value
    .replace(/\b(?:sk|sess|pat|ghp|cf)[-_][A-Za-z0-9_-]{12,}\b/gi, "[redacted]")
    .replace(/authorization\s*:\s*[^\s]+/gi, "authorization: [redacted]");
}

function priority(
  kind: DesignerRequest["sourceCells"][number]["kind"],
): number {
  switch (kind) {
    case "setup":
      return 0;
    case "rule":
      return 1;
    case "action":
      return 2;
    case "chat":
      return 3;
  }
}
