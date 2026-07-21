import type { CallExpression, ObjectExpression, Program } from "estree";

import { diagnosticFromUnknown, fault } from "../../runtime/parser/diagnostics";
import { parseCell } from "../../runtime/parser/parse-cell";
import { validateCell } from "../../runtime/validator/validate-cell";
import type { RuntimeDiagnosticInput } from "../../shared/ai";

export const RUBY_RESONANCE_SOURCE = `addHouseRule("Ruby resonance", {
  when: "buy-ruby",
  then: "gain-prism"
});`;

export type DesignerValidation =
  { ok: true } | { ok: false; diagnostic: RuntimeDiagnosticInput };

export function validateFoundryDesignerCandidate(
  source: string,
): DesignerValidation {
  try {
    const parsed = parseCell(source);
    validateCell(parsed.program, "designer");
    validateRubyResonance(parsed.program);
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
          "Use addHouseRule with the supported buy-ruby and gain-prism literals.",
        ],
      },
    };
  }
}

function validateRubyResonance(program: Program): void {
  const statement = program.body[0];
  if (
    program.body.length !== 1 ||
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "CallExpression"
  )
    throw candidateFault("Designer cell must contain one addHouseRule call");
  const call = statement.expression;
  if (
    call.callee.type !== "Identifier" ||
    call.callee.name !== "addHouseRule" ||
    call.arguments.length !== 2
  )
    throw candidateFault(
      "Only the supported House Rule declaration is available",
    );
  const name = literalString(call.arguments[0]);
  const options = call.arguments[1];
  if (name !== "Ruby resonance" || options?.type !== "ObjectExpression")
    throw candidateFault("House Rule name or options are unsupported");
  const values = objectStrings(options);
  if (values.when !== "buy-ruby" || values.then !== "gain-prism")
    throw candidateFault("House Rule must map buy-ruby to gain-prism");
  if (Object.keys(values).length !== 2)
    throw candidateFault("House Rule contains unsupported properties");
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
      throw candidateFault("House Rule options must be plain literals");
    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : literalString(property.key);
    const value = literalString(property.value);
    if (key === null || value === null)
      throw candidateFault(
        "House Rule option names and values must be strings",
      );
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
