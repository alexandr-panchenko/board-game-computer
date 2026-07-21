import { full } from "acorn-walk";
import type {
  CallExpression,
  FunctionDeclaration,
  MemberExpression,
  Node,
  Program,
} from "estree";

import { fault } from "../parser/diagnostics";

export type CellCapability = "designer" | "player" | "system";

const allowedNodes = new Set([
  "Program",
  "VariableDeclaration",
  "VariableDeclarator",
  "FunctionDeclaration",
  "BlockStatement",
  "ExpressionStatement",
  "IfStatement",
  "ForOfStatement",
  "ReturnStatement",
  "BreakStatement",
  "ContinueStatement",
  "EmptyStatement",
  "Identifier",
  "Literal",
  "TemplateLiteral",
  "TemplateElement",
  "ArrayExpression",
  "ObjectExpression",
  "Property",
  "UnaryExpression",
  "BinaryExpression",
  "LogicalExpression",
  "ConditionalExpression",
  "MemberExpression",
  "AssignmentExpression",
  "UpdateExpression",
  "CallExpression",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

const forbiddenIdentifiers = new Set([
  "eval",
  "Function",
  "globalThis",
  "window",
  "document",
  "self",
  "fetch",
  "WebSocket",
  "EventSource",
  "XMLHttpRequest",
  "setTimeout",
  "setInterval",
  "Date",
  "Math",
  "Promise",
]);

const forbiddenProperties = new Set(["__proto__", "prototype", "constructor"]);

function staticProperty(member: MemberExpression): string | null {
  if (!member.computed && member.property.type === "Identifier")
    return member.property.name;
  if (
    member.computed &&
    member.property.type === "Literal" &&
    typeof member.property.value === "string"
  ) {
    return member.property.value;
  }
  return null;
}

export function validateCell(
  program: Program,
  capability: CellCapability = "designer",
): void {
  full(program as never, (acornNode) => {
    const node = acornNode as Node;
    if (!allowedNodes.has(node.type)) {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "validate",
        `${node.type} is not supported`,
        node,
      );
    }
    if (node.type === "VariableDeclaration" && node.kind === "var") {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "validate",
        "var is not supported; use let or const",
        node,
      );
    }
    if (node.type === "ForOfStatement" && node.await) {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "validate",
        "for await is not supported",
        node,
      );
    }
    if (node.type === "Identifier" && forbiddenIdentifiers.has(node.name)) {
      throw fault(
        "TS_CAPABILITY_DENIED",
        "validate",
        `${node.name} is not available`,
        node,
      );
    }
    if (node.type === "MemberExpression") {
      const property = staticProperty(node);
      if (property !== null && forbiddenProperties.has(property)) {
        throw fault(
          "TS_FORBIDDEN_PROPERTY",
          "validate",
          `Property ${property} is forbidden`,
          node,
        );
      }
    }
    if (
      node.type === "Literal" &&
      (("regex" in node && node.regex !== undefined) ||
        ("bigint" in node && typeof node.bigint === "string"))
    ) {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "validate",
        "Regular expressions and BigInt are not supported",
        node,
      );
    }
  });

  rejectStaticRecursion(program);

  if (capability === "player" && !isCanonicalActionProgram(program)) {
    throw fault(
      "TS_CAPABILITY_DENIED",
      "validate",
      "Player cells must contain exactly one performAction call",
      program,
    );
  }
}

function rejectStaticRecursion(program: Program): void {
  const functions = program.body.filter(
    (statement): statement is FunctionDeclaration =>
      statement.type === "FunctionDeclaration" && statement.id !== null,
  );
  const names = new Set(
    functions
      .map((fn) => fn.id?.name)
      .filter((name): name is string => name !== undefined),
  );
  const graph = new Map<string, Set<string>>();
  const nodes = new Map<string, FunctionDeclaration>();
  for (const fn of functions) {
    if (fn.id === null) continue;
    nodes.set(fn.id.name, fn);
    const calls = new Set<string>();
    full(fn.body as never, (candidate) => {
      const node = candidate as Node;
      if (
        node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        names.has(node.callee.name)
      ) {
        calls.add(node.callee.name);
      }
    });
    graph.set(fn.id.name, calls);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (name: string): void => {
    if (visiting.has(name)) {
      throw fault(
        "TS_UNSUPPORTED_RECURSION",
        "validate",
        `Recursive call cycle involving ${name} is not supported`,
        nodes.get(name),
      );
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const target of graph.get(name) ?? []) visit(target);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of names) visit(name);
}

function isCanonicalActionProgram(program: Program): boolean {
  if (program.body.length !== 1) return false;
  const statement = program.body[0];
  if (
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "CallExpression"
  )
    return false;
  const call = statement.expression as CallExpression;
  return (
    call.callee.type === "Identifier" &&
    call.callee.name === "performAction" &&
    call.arguments.length === 2 &&
    call.arguments[0]?.type === "Literal" &&
    typeof call.arguments[0].value === "string" &&
    call.arguments[1]?.type === "ObjectExpression"
  );
}
