import type { Expression, ObjectExpression, Property } from "estree";

import { parseCell } from "../../runtime/parser/parse-cell";
import { validateCell } from "../../runtime/validator/validate-cell";
import type {
  FrameworkData,
  LegalActionOption,
  RuntimePatch,
} from "../../runtime";
import type { CommittedCell } from "../../shared/room";
import { validateFoundryDesignerCandidate } from "./designer";
import { PrismFoundryRoom } from "./room";

export interface CanonicalAction {
  actionId: string;
  actorId: string;
  parameters: Record<string, FrameworkData>;
}

export interface RebuiltSharedRoom {
  game: PrismFoundryRoom;
  patches: Array<{
    cell: CommittedCell;
    patch: { forward: RuntimePatch; inverse: RuntimePatch } | null;
  }>;
}

export function rebuildSharedRoom(
  cells: CommittedCell[],
  expectedHash: string,
): RebuiltSharedRoom {
  const game = new PrismFoundryRoom();
  const patches = cells.map((cell) => {
    const result = applySharedCell(game, cell);
    if (result !== null && !result.ok)
      throw new Error(result.diagnostic.message);
    return {
      cell,
      patch:
        result === null
          ? null
          : { forward: result.forward, inverse: result.inverse },
    };
  });
  if (game.snapshot().stateHash !== expectedHash)
    throw new Error("Rebuilt state differs from the canonical attestation");
  return { game, patches };
}

export function decodeCanonicalAction(source: string): CanonicalAction {
  const parsed = parseCell(source);
  validateCell(parsed.program, "player");
  const statement = parsed.program.body[0];
  if (
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "CallExpression"
  )
    throw new Error("Expected one canonical action call");
  const call = statement.expression;
  const action = call.arguments[0];
  const parameters = call.arguments[1];
  if (
    action?.type !== "Literal" ||
    typeof action.value !== "string" ||
    parameters?.type !== "ObjectExpression"
  )
    throw new Error("Canonical action arguments are invalid");
  const values = objectValue(parameters);
  const actorId = values.actorId;
  if (typeof actorId !== "string")
    throw new Error("Canonical action requires actorId");
  delete values.actorId;
  return { actionId: action.value, actorId, parameters: values };
}

export function resolveCanonicalAction(
  game: PrismFoundryRoom,
  source: string,
): LegalActionOption {
  const decoded = decodeCanonicalAction(source);
  const encodedParameters = JSON.stringify(sortRecord(decoded.parameters));
  const option = game
    .legalActions(decoded.actorId)
    .find(
      (candidate) =>
        candidate.actionId === decoded.actionId &&
        JSON.stringify(sortRecord(candidate.parameters)) === encodedParameters,
    );
  if (option === undefined)
    throw new Error(`Action ${decoded.actionId} is no longer legal`);
  return option;
}

export function applySharedCell(
  game: PrismFoundryRoom,
  cell: Pick<CommittedCell, "kind" | "source">,
) {
  if (cell.kind === "chat") return null;
  if (cell.source === undefined)
    throw new Error("Executable cell has no source");
  if (cell.kind === "action")
    return game.perform(resolveCanonicalAction(game, cell.source));
  if (cell.kind === "code") {
    const validation = validateFoundryDesignerCandidate(cell.source);
    if (!validation.ok)
      throw new Error(
        `${validation.diagnostic.code}: ${validation.diagnostic.message}`,
      );
    return game.commitDesigner(cell.source);
  }
  throw new Error("System cells are valid only in immutable templates");
}

function objectValue(
  expression: ObjectExpression,
): Record<string, FrameworkData> {
  const output: Record<string, FrameworkData> = {};
  for (const candidate of expression.properties) {
    if (candidate.type !== "Property")
      throw new Error("Spread properties are not canonical action data");
    output[propertyKey(candidate)] = expressionValue(
      candidate.value as Expression,
    );
  }
  return output;
}

function propertyKey(property: Property): string {
  if (!property.computed && property.key.type === "Identifier")
    return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string")
    return property.key.value;
  throw new Error("Action property names must be static");
}

function expressionValue(expression: Expression): FrameworkData {
  if (expression.type === "Literal") {
    if (
      expression.value === null ||
      typeof expression.value === "string" ||
      typeof expression.value === "number" ||
      typeof expression.value === "boolean"
    )
      return expression.value;
    throw new Error("Unsupported action literal");
  }
  if (expression.type === "ArrayExpression")
    return expression.elements.map((item) => {
      if (item === null || item.type === "SpreadElement")
        throw new Error(
          "Sparse or spread arrays are not canonical action data",
        );
      return expressionValue(item);
    });
  if (expression.type === "ObjectExpression") return objectValue(expression);
  throw new Error("Action values must be serializable literals");
}

function sortRecord(
  value: Record<string, FrameworkData>,
): Record<string, FrameworkData> {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, sortValue(item)]),
  );
}

function sortValue(value: FrameworkData): FrameworkData {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") return sortRecord(value);
  return value;
}
