import type { CallExpression, ObjectExpression, Program } from "estree";

import { diagnosticFromUnknown, fault } from "../../runtime/parser/diagnostics";
import { parseCell } from "../../runtime/parser/parse-cell";
import { validateCell } from "../../runtime/validator/validate-cell";
import type { RuntimeDiagnosticInput } from "../../shared/ai";
import type { ShiftingVaultsGame } from "./game";

export const BLUE_GATE_HERO_SOURCE = `Scenario("blue-gate-rotates-linked-room", {
  given: "explorer-enters-blue-gate",
  when: "after",
  then: "rotate-linked-room-clockwise-if-empty"
});`;

const requiredRule = {
  given: "explorer-enters-blue-gate",
  when: "after",
  then: "rotate-linked-room-clockwise-if-empty",
} as const;

export type DesignerValidation =
  { ok: true } | { ok: false; diagnostic: RuntimeDiagnosticInput };

export function validateDesignerCandidate(source: string): DesignerValidation {
  try {
    const parsed = parseCell(source);
    validateCell(parsed.program, "designer");
    validateHeroScenario(parsed.program);
    return { ok: true };
  } catch (error) {
    const diagnostic = diagnosticFromUnknown(
      error,
      error instanceof SyntaxError ? "parse" : "validate",
    );
    return {
      ok: false,
      diagnostic: {
        code: diagnostic.code,
        phase: diagnostic.phase,
        message: diagnostic.message,
        ...(diagnostic.line === undefined ? {} : { line: diagnostic.line }),
        ...(diagnostic.column === undefined
          ? {}
          : { column: diagnostic.column }),
        hints: [
          "Use the documented Scenario declaration and only supported literal values.",
        ],
      },
    };
  }
}

export function commitDesignerCandidate(
  game: ShiftingVaultsGame,
  source: string,
): DesignerValidation {
  const validation = validateDesignerCandidate(source);
  if (!validation.ok) return validation;
  const result = game.registerBlueGateScenario();
  if (result.ok) return { ok: true };
  return {
    ok: false,
    diagnostic: {
      code: result.failure.code,
      phase:
        result.failure.code === "TS_INVARIANT_FAILED" ? "invariant" : "execute",
      message: result.failure.message,
    },
  };
}

export function speculateDesignerCandidate(
  game: ShiftingVaultsGame,
  source: string,
): DesignerValidation {
  const validation = validateDesignerCandidate(source);
  if (!validation.ok) return validation;
  const beforeHash = game.snapshot().stateHash;
  const result = game.registerBlueGateScenario();
  if (!result.ok)
    return {
      ok: false,
      diagnostic: {
        code: result.failure.code,
        phase:
          result.failure.code === "TS_INVARIANT_FAILED"
            ? "invariant"
            : "execute",
        message: result.failure.message,
      },
    };
  if (!game.runtime.undo() || game.snapshot().stateHash !== beforeHash)
    return {
      ok: false,
      diagnostic: {
        code: "TS_STATE_HASH_MISMATCH",
        phase: "execute",
        message: "Speculative Designer transaction did not roll back exactly.",
      },
    };
  return { ok: true };
}

function validateHeroScenario(program: Program): void {
  const statement = program.body[0];
  if (
    program.body.length !== 1 ||
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "CallExpression"
  )
    throw candidateFault(
      "Designer cell must contain exactly one Scenario call",
    );
  const call = statement.expression;
  if (
    call.callee.type !== "Identifier" ||
    call.callee.name !== "Scenario" ||
    call.arguments.length !== 2
  )
    throw candidateFault(
      "Only the supported Scenario declaration is available",
    );
  const id = literalString(call.arguments[0]);
  const options = call.arguments[1];
  if (
    id !== "blue-gate-rotates-linked-room" ||
    options?.type !== "ObjectExpression"
  )
    throw candidateFault("Scenario id or options are unsupported");
  const properties = objectStrings(options);
  for (const [key, expected] of Object.entries(requiredRule))
    if (properties[key] !== expected)
      throw candidateFault(`Scenario property ${key} must be ${expected}`);
  if (Object.keys(properties).length !== Object.keys(requiredRule).length)
    throw candidateFault("Scenario contains unsupported properties");
  void (call as CallExpression);
}

function objectStrings(object: ObjectExpression): Record<string, string> {
  const result: Record<string, string> = {};
  for (const property of object.properties) {
    if (
      property.type !== "Property" ||
      property.computed ||
      property.kind !== "init" ||
      property.method ||
      property.shorthand
    )
      throw candidateFault(
        "Scenario options must use plain literal properties",
      );
    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : literalString(property.key);
    const value = literalString(property.value);
    if (key === null || value === null)
      throw candidateFault("Scenario option names and values must be strings");
    result[key] = value;
  }
  return result;
}

function literalString(value: unknown): string | null {
  return typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "Literal" &&
    "value" in value &&
    typeof value.value === "string"
    ? value.value
    : null;
}

function candidateFault(message: string): Error {
  return fault("TS_INVALID_REFERENCE", "validate", message);
}
