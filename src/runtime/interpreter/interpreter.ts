import type {
  ArrayExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  Expression,
  ForOfStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Literal,
  LogicalExpression,
  MemberExpression,
  Node,
  ObjectExpression,
  Program,
  Statement,
  TemplateLiteral,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
} from "estree";

import { fault, RuntimeFault } from "../parser/diagnostics";
import { TransactionalStore } from "../store/transactional-store";
import { UNDEFINED, type RuntimeValue, type ScopeId } from "../store/types";

type Completion =
  | { type: "normal"; value: RuntimeValue }
  | { type: "return"; value: RuntimeValue }
  | { type: "break" }
  | { type: "continue" };

export interface InterpreterLimits {
  fuel: number;
  maxCallDepth: number;
  maxCollectionSize: number;
  maxHeapObjects?: number;
}

const defaultLimits: InterpreterLimits = {
  fuel: 50_000,
  maxCallDepth: 64,
  maxCollectionSize: 2_000,
  maxHeapObjects: 10_000,
};

export class Interpreter {
  private fuel = 0;
  private callDepth = 0;

  constructor(
    readonly store: TransactionalStore,
    private readonly limits: InterpreterLimits = defaultLimits,
  ) {}

  execute(program: Program): RuntimeValue {
    this.fuel = this.limits.fuel;
    this.callDepth = 0;
    const completion = this.executeStatements(
      program.body as Statement[],
      this.store.globalScopeId,
    );
    if (completion.type !== "normal") {
      throw fault(
        "TS_INVALID_CONTROL_FLOW",
        "execute",
        `${completion.type} outside valid context`,
        program,
      );
    }
    return completion.value;
  }

  private executeStatements(
    statements: Statement[],
    scopeId: ScopeId,
  ): Completion {
    let value = UNDEFINED;
    for (const statement of statements) {
      const completion = this.executeStatement(statement, scopeId);
      if (completion.type !== "normal") return completion;
      value = completion.value;
    }
    return { type: "normal", value };
  }

  private executeStatement(statement: Statement, scopeId: ScopeId): Completion {
    this.consume(statement);
    switch (statement.type) {
      case "VariableDeclaration":
        return this.executeVariableDeclaration(statement, scopeId);
      case "FunctionDeclaration":
        return this.executeFunctionDeclaration(statement, scopeId);
      case "BlockStatement": {
        const blockScope = this.store.createScope(scopeId);
        return this.executeStatements(statement.body, blockScope);
      }
      case "ExpressionStatement": {
        const value = this.evaluate(statement.expression, scopeId);
        return { type: "normal", value };
      }
      case "IfStatement": {
        if (this.truthy(this.evaluate(statement.test, scopeId)))
          return this.executeStatement(statement.consequent, scopeId);
        return statement.alternate == null
          ? { type: "normal", value: UNDEFINED }
          : this.executeStatement(statement.alternate, scopeId);
      }
      case "ForOfStatement":
        return this.executeForOf(statement, scopeId);
      case "ReturnStatement":
        return {
          type: "return",
          value:
            statement.argument == null
              ? UNDEFINED
              : this.evaluate(statement.argument, scopeId),
        };
      case "BreakStatement":
        return { type: "break" };
      case "ContinueStatement":
        return { type: "continue" };
      case "EmptyStatement":
        return { type: "normal", value: UNDEFINED };
      default:
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          `${statement.type} is not executable`,
          statement,
        );
    }
  }

  private executeVariableDeclaration(
    declaration: VariableDeclaration,
    scopeId: ScopeId,
  ): Completion {
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== "Identifier")
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Only identifier bindings are supported",
          declarator.id,
        );
      const initialized = declarator.init != null;
      const value = initialized
        ? this.evaluate(declarator.init as Expression, scopeId)
        : UNDEFINED;
      try {
        this.store.createBinding(
          scopeId,
          declarator.id.name,
          declaration.kind === "let",
          value,
          initialized,
        );
      } catch (error) {
        throw this.bindingFault(error, declarator.id);
      }
    }
    return { type: "normal", value: UNDEFINED };
  }

  private executeFunctionDeclaration(
    declaration: FunctionDeclaration,
    scopeId: ScopeId,
  ): Completion {
    if (declaration.id === null)
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "execute",
        "Function declaration needs a name",
        declaration,
      );
    const value = this.createFunction(
      declaration,
      scopeId,
      declaration.id.name,
    );
    try {
      if (scopeId === this.store.globalScopeId)
        this.store.replaceTopLevelBinding(declaration.id.name, value);
      else this.store.createBinding(scopeId, declaration.id.name, false, value);
    } catch (error) {
      throw this.bindingFault(error, declaration);
    }
    return { type: "normal", value };
  }

  private executeForOf(
    statement: ForOfStatement,
    scopeId: ScopeId,
  ): Completion {
    const iterable = this.evaluate(statement.right, scopeId);
    const items = this.arrayItems(iterable, statement.right);
    if (items.length > this.limits.maxCollectionSize) {
      throw fault(
        "TS_COLLECTION_LIMIT",
        "execute",
        "Collection exceeds iteration limit",
        statement.right,
      );
    }
    let last = UNDEFINED;
    for (const item of items) {
      this.consume(statement);
      const iterationScope = this.store.createScope(scopeId);
      if (statement.left.type === "VariableDeclaration") {
        const declaration = statement.left.declarations[0];
        if (
          statement.left.declarations.length !== 1 ||
          declaration?.id.type !== "Identifier"
        ) {
          throw fault(
            "TS_UNSUPPORTED_NODE",
            "execute",
            "for...of requires one identifier declaration",
            statement.left,
          );
        }
        this.store.createBinding(
          iterationScope,
          declaration.id.name,
          statement.left.kind === "let",
          item,
        );
      } else if (statement.left.type === "Identifier") {
        this.assignIdentifier(statement.left, scopeId, item);
      } else {
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Unsupported for...of target",
          statement.left,
        );
      }
      const completion = this.executeStatement(statement.body, iterationScope);
      if (completion.type === "break") break;
      if (completion.type === "return") return completion;
      if (completion.type === "normal") last = completion.value;
    }
    return { type: "normal", value: last };
  }

  private evaluate(expression: Expression, scopeId: ScopeId): RuntimeValue {
    this.consume(expression);
    switch (expression.type) {
      case "Identifier":
        return this.evaluateIdentifier(expression, scopeId);
      case "Literal":
        return this.evaluateLiteral(expression);
      case "TemplateLiteral":
        return this.evaluateTemplate(expression, scopeId);
      case "ArrayExpression":
        return this.evaluateArray(expression, scopeId);
      case "ObjectExpression":
        return this.evaluateObject(expression, scopeId);
      case "UnaryExpression":
        return this.evaluateUnary(expression, scopeId);
      case "BinaryExpression":
        return this.evaluateBinary(expression, scopeId);
      case "LogicalExpression":
        return this.evaluateLogical(expression, scopeId);
      case "ConditionalExpression":
        return this.truthy(this.evaluate(expression.test, scopeId))
          ? this.evaluate(expression.consequent, scopeId)
          : this.evaluate(expression.alternate, scopeId);
      case "MemberExpression":
        return this.evaluateMember(expression, scopeId);
      case "AssignmentExpression":
        return this.evaluateAssignment(expression, scopeId);
      case "UpdateExpression":
        return this.evaluateUpdate(expression, scopeId);
      case "CallExpression":
        return this.evaluateCall(expression, scopeId);
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return this.createFunction(
          expression,
          scopeId,
          expression.type === "FunctionExpression"
            ? expression.id?.name
            : undefined,
        );
      default:
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          `${expression.type} is not executable`,
          expression,
        );
    }
  }

  private evaluateIdentifier(
    identifier: Identifier,
    scopeId: ScopeId,
  ): RuntimeValue {
    if (this.store.resolveSlot(scopeId, identifier.name) === null) {
      if (this.nativeNames.has(identifier.name))
        return { type: "native-function", nativeId: identifier.name };
      throw fault(
        "TS_UNKNOWN_IDENTIFIER",
        "execute",
        `Unknown identifier ${identifier.name}`,
        identifier,
      );
    }
    try {
      return this.store.readBinding(scopeId, identifier.name);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Unknown identifier")
      ) {
        throw fault(
          "TS_UNKNOWN_IDENTIFIER",
          "execute",
          error.message,
          identifier,
        );
      }
      throw error;
    }
  }

  private evaluateLiteral(literal: Literal): RuntimeValue {
    const value = literal.value;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return this.store.fromHost(value);
    }
    throw fault(
      "TS_UNSUPPORTED_NODE",
      "execute",
      "Unsupported literal",
      literal,
    );
  }

  private evaluateTemplate(
    template: TemplateLiteral,
    scopeId: ScopeId,
  ): RuntimeValue {
    let result = "";
    template.quasis.forEach((quasi, index) => {
      result += quasi.value.cooked ?? quasi.value.raw;
      const expression = template.expressions[index];
      if (expression !== undefined)
        result += this.toString(this.evaluate(expression, scopeId));
    });
    return { type: "string", value: result };
  }

  private evaluateArray(
    expression: ArrayExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    const items = expression.elements.map((element) => {
      if (element === null || element.type === "SpreadElement")
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Array holes and spread are not supported",
          expression,
        );
      return this.evaluate(element, scopeId);
    });
    return this.allocateArray(items, expression);
  }

  private evaluateObject(
    expression: ObjectExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    const properties: Array<readonly [string, RuntimeValue]> = [];
    for (const candidate of expression.properties) {
      if (
        candidate.type !== "Property" ||
        candidate.kind !== "init" ||
        candidate.method ||
        candidate.shorthand
      ) {
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Only ordinary object properties are supported",
          candidate,
        );
      }
      const property = candidate;
      const key = property.computed
        ? this.toKey(this.evaluate(property.key, scopeId))
        : property.key.type === "Identifier"
          ? property.key.name
          : property.key.type === "Literal"
            ? String(property.key.value)
            : (() => {
                throw fault(
                  "TS_UNSUPPORTED_NODE",
                  "execute",
                  "Unsupported object property key",
                  property.key,
                );
              })();
      if (property.value.type === "AssignmentPattern")
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Assignment patterns are not supported",
          property.value,
        );
      properties.push([
        key,
        this.evaluate(property.value as Expression, scopeId),
      ]);
    }
    return this.allocateRecord(properties, expression);
  }

  private evaluateUnary(
    expression: UnaryExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    if (expression.operator === "delete") {
      if (expression.argument.type !== "MemberExpression")
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "delete requires an object property",
          expression.argument,
        );
      const object = this.evaluate(
        expression.argument.object as Expression,
        scopeId,
      );
      const key = this.memberKey(expression.argument, scopeId);
      return this.store.fromHost(this.store.deleteProperty(object, key));
    }
    const value = this.evaluate(expression.argument, scopeId);
    switch (expression.operator) {
      case "!":
        return this.store.fromHost(!this.truthy(value));
      case "+":
        return this.store.number(this.toNumber(value, expression));
      case "-":
        return this.store.number(-this.toNumber(value, expression));
      default:
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          `Unary ${expression.operator} is not supported`,
          expression,
        );
    }
  }

  private evaluateBinary(
    expression: BinaryExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    if (expression.left.type === "PrivateIdentifier") {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "execute",
        "Private identifiers are unsupported",
        expression.left,
      );
    }
    const left = this.evaluate(expression.left, scopeId);
    const right = this.evaluate(expression.right, scopeId);
    switch (expression.operator) {
      case "+":
        return left.type === "string" || right.type === "string"
          ? {
              type: "string",
              value: this.toString(left) + this.toString(right),
            }
          : this.store.number(
              this.toNumber(left, expression) +
                this.toNumber(right, expression),
            );
      case "-":
        return this.store.number(
          this.toNumber(left, expression) - this.toNumber(right, expression),
        );
      case "*":
        return this.store.number(
          this.toNumber(left, expression) * this.toNumber(right, expression),
        );
      case "/":
        return this.store.number(
          this.toNumber(left, expression) / this.toNumber(right, expression),
        );
      case "%":
        return this.store.number(
          this.toNumber(left, expression) % this.toNumber(right, expression),
        );
      case "<":
        return this.store.fromHost(this.compare(left, right) < 0);
      case "<=":
        return this.store.fromHost(this.compare(left, right) <= 0);
      case ">":
        return this.store.fromHost(this.compare(left, right) > 0);
      case ">=":
        return this.store.fromHost(this.compare(left, right) >= 0);
      case "===":
        return this.store.fromHost(this.equal(left, right));
      case "!==":
        return this.store.fromHost(!this.equal(left, right));
      default:
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          `Binary ${expression.operator} is not supported`,
          expression,
        );
    }
  }

  private evaluateLogical(
    expression: LogicalExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    const left = this.evaluate(expression.left, scopeId);
    if (expression.operator === "&&")
      return this.truthy(left)
        ? this.evaluate(expression.right, scopeId)
        : left;
    if (expression.operator === "||")
      return this.truthy(left)
        ? left
        : this.evaluate(expression.right, scopeId);
    if (expression.operator === "??")
      return left.type === "null" || left.type === "undefined"
        ? this.evaluate(expression.right, scopeId)
        : left;
    throw fault(
      "TS_UNSUPPORTED_NODE",
      "execute",
      "Logical operator is not supported",
      expression,
    );
  }

  private evaluateMember(
    expression: MemberExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    const object = this.evaluate(expression.object as Expression, scopeId);
    return this.store.getProperty(object, this.memberKey(expression, scopeId));
  }

  private evaluateAssignment(
    expression: AssignmentExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    if (
      expression.left.type !== "Identifier" &&
      expression.left.type !== "MemberExpression"
    ) {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "execute",
        "Unsupported assignment target",
        expression.left,
      );
    }
    if (expression.left.type === "MemberExpression") {
      const object = this.evaluate(
        expression.left.object as Expression,
        scopeId,
      );
      const key = this.memberKey(expression.left, scopeId);
      const before =
        expression.operator === "="
          ? UNDEFINED
          : this.store.getProperty(object, key);
      const right = this.evaluate(expression.right, scopeId);
      const value =
        expression.operator === "="
          ? right
          : this.applyCompound(expression.operator, before, right, expression);
      this.store.setProperty(object, key, value);
      return value;
    }
    const before =
      expression.operator === "="
        ? UNDEFINED
        : this.evaluateIdentifier(expression.left, scopeId);
    const right = this.evaluate(expression.right, scopeId);
    const value =
      expression.operator === "="
        ? right
        : this.applyCompound(expression.operator, before, right, expression);
    this.assignIdentifier(expression.left, scopeId, value);
    return value;
  }

  private evaluateUpdate(
    expression: UpdateExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    if (
      expression.argument.type !== "Identifier" &&
      expression.argument.type !== "MemberExpression"
    ) {
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "execute",
        "Unsupported update target",
        expression.argument,
      );
    }
    const identifier =
      expression.argument.type === "Identifier" ? expression.argument : null;
    const member =
      expression.argument.type === "MemberExpression"
        ? {
            object: this.evaluate(
              expression.argument.object as Expression,
              scopeId,
            ),
            key: this.memberKey(expression.argument, scopeId),
          }
        : null;
    const before =
      identifier === null
        ? this.store.getProperty(member!.object, member!.key)
        : this.evaluateIdentifier(identifier, scopeId);
    const number = this.toNumber(before, expression);
    const after = this.store.number(
      expression.operator === "++" ? number + 1 : number - 1,
    );
    if (identifier === null)
      this.store.setProperty(member!.object, member!.key, after);
    else this.assignIdentifier(identifier, scopeId, after);
    return expression.prefix ? after : before;
  }

  private evaluateCall(
    expression: CallExpression,
    scopeId: ScopeId,
  ): RuntimeValue {
    if ("optional" in expression && expression.optional)
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "execute",
        "Optional calls are not supported",
        expression,
      );
    if (expression.callee.type === "MemberExpression") {
      const receiver = this.evaluate(
        expression.callee.object as Expression,
        scopeId,
      );
      const method = this.memberKey(expression.callee, scopeId);
      const args = this.evaluateArguments(expression, scopeId);
      if (receiver.type === "object") {
        const member = this.store.getProperty(receiver, method);
        if (member.type !== "undefined")
          return this.callValue(member, args, expression);
      }
      return this.callMethod(receiver, method, args, expression);
    }
    const args = this.evaluateArguments(expression, scopeId);
    const callee = this.evaluate(expression.callee as Expression, scopeId);
    return this.callValue(callee, args, expression);
  }

  private evaluateArguments(
    expression: CallExpression,
    scopeId: ScopeId,
  ): RuntimeValue[] {
    return expression.arguments.map((argument) => {
      if (argument.type === "SpreadElement")
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Spread arguments are not supported",
          argument,
        );
      return this.evaluate(argument, scopeId);
    });
  }

  private callValue(
    callee: RuntimeValue,
    args: RuntimeValue[],
    node: Node,
  ): RuntimeValue {
    if (callee.type === "native-function")
      return this.callNative(callee.nativeId, args, node);
    if (callee.type !== "function")
      throw fault("TS_NOT_CALLABLE", "execute", "Value is not callable", node);
    if (this.callDepth >= this.limits.maxCallDepth)
      throw fault(
        "TS_CALL_DEPTH_EXCEEDED",
        "execute",
        "Maximum call depth exceeded",
        node,
      );
    this.callDepth += 1;
    try {
      const fn = this.store.getFunction(callee.functionId);
      const callScope = this.store.createScope(fn.closureScopeId);
      fn.parameters.forEach((parameter, index) => {
        if (parameter.type !== "Identifier")
          throw fault(
            "TS_UNSUPPORTED_NODE",
            "execute",
            "Only identifier parameters are supported",
            parameter,
          );
        this.store.createBinding(
          callScope,
          parameter.name,
          true,
          args[index] ?? UNDEFINED,
        );
      });
      if (fn.expressionBody)
        return this.evaluate(fn.body as Expression, callScope);
      const completion = this.executeStatements(
        (fn.body as BlockStatement).body,
        callScope,
      );
      return completion.type === "return" ? completion.value : UNDEFINED;
    } finally {
      this.callDepth -= 1;
    }
  }

  private callMethod(
    receiver: RuntimeValue,
    method: string,
    args: RuntimeValue[],
    node: Node,
  ): RuntimeValue {
    if (receiver.type === "string") {
      const argument = args[0] === undefined ? "" : this.toString(args[0]);
      switch (method) {
        case "includes":
          return this.store.fromHost(receiver.value.includes(argument));
        case "startsWith":
          return this.store.fromHost(receiver.value.startsWith(argument));
        case "endsWith":
          return this.store.fromHost(receiver.value.endsWith(argument));
        case "toLowerCase":
          return { type: "string", value: receiver.value.toLowerCase() };
        case "toUpperCase":
          return { type: "string", value: receiver.value.toUpperCase() };
      }
    }
    const items = this.arrayItems(receiver, node);
    switch (method) {
      case "push": {
        const after = [...items, ...args];
        this.checkCollectionSize(after, node);
        this.store.replaceArray(receiver, after);
        return this.store.number(after.length);
      }
      case "pop": {
        const after = [...items];
        const value = after.pop() ?? UNDEFINED;
        this.store.replaceArray(receiver, after);
        return value;
      }
      case "shift": {
        const after = [...items];
        const value = after.shift() ?? UNDEFINED;
        this.store.replaceArray(receiver, after);
        return value;
      }
      case "unshift": {
        const after = [...args, ...items];
        this.checkCollectionSize(after, node);
        this.store.replaceArray(receiver, after);
        return this.store.number(after.length);
      }
      case "slice": {
        const start = args[0] === undefined ? 0 : this.toNumber(args[0], node);
        const end =
          args[1] === undefined ? undefined : this.toNumber(args[1], node);
        return this.allocateArray(items.slice(start, end), node);
      }
      case "splice": {
        const requestedStart =
          args[0] === undefined ? 0 : Math.trunc(this.toNumber(args[0], node));
        const start =
          requestedStart < 0
            ? Math.max(items.length + requestedStart, 0)
            : Math.min(requestedStart, items.length);
        const deleteCount =
          args[1] === undefined
            ? items.length - start
            : Math.max(
                0,
                Math.min(
                  Math.trunc(this.toNumber(args[1], node)),
                  items.length - start,
                ),
              );
        const after = [...items];
        const removed = after.splice(start, deleteCount, ...args.slice(2));
        this.checkCollectionSize(after, node);
        this.store.replaceArray(receiver, after);
        return this.allocateArray(removed, node);
      }
      case "includes":
        return this.store.fromHost(
          items.some((item) => this.equal(item, args[0] ?? UNDEFINED)),
        );
      case "indexOf":
        return this.store.number(
          items.findIndex((item) => this.equal(item, args[0] ?? UNDEFINED)),
        );
      default:
        throw fault(
          "TS_UNKNOWN_METHOD",
          "execute",
          `Method ${method} is not available`,
          node,
        );
    }
  }

  private callNative(
    name: string,
    args: RuntimeValue[],
    node: Node,
  ): RuntimeValue {
    const numbers = () => args.map((argument) => this.toNumber(argument, node));
    switch (name) {
      case "min":
        return this.store.number(Math.min(...numbers()));
      case "max":
        return this.store.number(Math.max(...numbers()));
      case "abs":
        return this.store.number(
          Math.abs(this.toNumber(args[0] ?? UNDEFINED, node)),
        );
      case "floor":
        return this.store.number(
          Math.floor(this.toNumber(args[0] ?? UNDEFINED, node)),
        );
      case "ceil":
        return this.store.number(
          Math.ceil(this.toNumber(args[0] ?? UNDEFINED, node)),
        );
      case "round":
        return this.store.number(
          Math.round(this.toNumber(args[0] ?? UNDEFINED, node)),
        );
      case "clamp": {
        const [value = 0, minimum = 0, maximum = 0] = numbers();
        return this.store.number(Math.min(maximum, Math.max(minimum, value)));
      }
      case "range": {
        const start = this.toNumber(args[0] ?? UNDEFINED, node);
        const end = this.toNumber(args[1] ?? UNDEFINED, node);
        const length = Math.max(0, Math.ceil(end - start));
        if (length > this.limits.maxCollectionSize)
          throw fault(
            "TS_COLLECTION_LIMIT",
            "execute",
            "range exceeds collection limit",
            node,
          );
        return this.allocateArray(
          Array.from({ length }, (_, index) =>
            this.store.number(start + index),
          ),
          node,
        );
      }
      case "keys":
        return this.allocateArray(
          this.objectEntries(args[0] ?? UNDEFINED, node).map(([key]) => ({
            type: "string",
            value: key,
          })),
          node,
        );
      case "values":
        return this.allocateArray(
          this.objectEntries(args[0] ?? UNDEFINED, node).map(
            ([, value]) => value,
          ),
          node,
        );
      case "count":
        return this.store.number(
          this.arrayItems(args[0] ?? UNDEFINED, node).length,
        );
      case "assert": {
        if (!this.truthy(args[0] ?? UNDEFINED))
          throw fault(
            "TS_ASSERTION_FAILED",
            "execute",
            args[1] === undefined ? "Assertion failed" : this.toString(args[1]),
            node,
          );
        return UNDEFINED;
      }
      case "trace": {
        this.store.trace({
          type: "source.trace",
          label: args[0] === undefined ? "trace" : this.toString(args[0]),
          sourceStart: this.nodeOffset(node, "start"),
          sourceEnd: this.nodeOffset(node, "end"),
        });
        return UNDEFINED;
      }
      default:
        throw fault(
          "TS_UNKNOWN_IDENTIFIER",
          "execute",
          `Unknown native function ${name}`,
          node,
        );
    }
  }

  private objectEntries(
    value: RuntimeValue,
    node: Node,
  ): Array<[string, RuntimeValue]> {
    if (value.type !== "object")
      throw fault("TS_TYPE_ERROR", "execute", "Expected object", node);
    const object = this.store.getHeapObject(value.objectId);
    return object.kind === "array"
      ? object.items.map((item, index) => [String(index), item])
      : [...object.properties.entries()];
  }

  private arrayItems(value: RuntimeValue, node: Node): RuntimeValue[] {
    if (value.type !== "object")
      throw fault("TS_TYPE_ERROR", "execute", "Expected array", node);
    const object = this.store.getHeapObject(value.objectId);
    if (object.kind !== "array")
      throw fault("TS_TYPE_ERROR", "execute", "Expected array", node);
    return object.items;
  }

  private allocateArray(items: RuntimeValue[], node: Node): RuntimeValue {
    this.checkCollectionSize(items, node);
    this.checkHeapLimit(node);
    return this.store.allocateArray(items);
  }

  private checkCollectionSize(items: RuntimeValue[], node: Node): void {
    if (items.length > this.limits.maxCollectionSize)
      throw fault(
        "TS_COLLECTION_LIMIT",
        "execute",
        "Collection exceeds allocation limit",
        node,
      );
  }

  private allocateRecord(
    properties: ReadonlyArray<readonly [string, RuntimeValue]>,
    node: Node,
  ): RuntimeValue {
    this.checkHeapLimit(node);
    return this.store.allocateRecord(properties);
  }

  private checkHeapLimit(node: Node): void {
    if (this.store.heapObjectCount >= (this.limits.maxHeapObjects ?? 10_000)) {
      throw fault(
        "TS_HEAP_LIMIT",
        "execute",
        "Runtime heap object limit exceeded",
        node,
      );
    }
  }

  private createFunction(
    node: FunctionDeclaration | FunctionExpression | ArrowFunctionExpression,
    scopeId: ScopeId,
    name?: string,
  ): RuntimeValue {
    if (node.async || node.generator)
      throw fault(
        "TS_UNSUPPORTED_NODE",
        "execute",
        "Async and generator functions are unsupported",
        node,
      );
    const parameters = node.params;
    for (const parameter of parameters) {
      if (parameter.type !== "Identifier")
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          "Only identifier parameters are supported",
          parameter,
        );
    }
    return this.store.allocateFunction({
      ...(name === undefined ? {} : { name }),
      parameters,
      body: node.body,
      closureScopeId: scopeId,
      expressionBody: node.body.type !== "BlockStatement",
      node,
    });
  }

  private assignIdentifier(
    identifier: Identifier,
    scopeId: ScopeId,
    value: RuntimeValue,
  ): void {
    try {
      this.store.setBinding(scopeId, identifier.name, value);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Cannot assign const")
      ) {
        throw fault(
          "TS_CONST_ASSIGNMENT",
          "execute",
          error.message,
          identifier,
        );
      }
      if (
        error instanceof Error &&
        error.message.startsWith("Unknown identifier")
      ) {
        throw fault(
          "TS_UNKNOWN_IDENTIFIER",
          "execute",
          error.message,
          identifier,
        );
      }
      throw error;
    }
  }

  private applyCompound(
    operator: AssignmentExpression["operator"],
    left: RuntimeValue,
    right: RuntimeValue,
    node: Node,
  ): RuntimeValue {
    switch (operator) {
      case "+=":
        return left.type === "string" || right.type === "string"
          ? {
              type: "string",
              value: this.toString(left) + this.toString(right),
            }
          : this.store.number(
              this.toNumber(left, node) + this.toNumber(right, node),
            );
      case "-=":
        return this.store.number(
          this.toNumber(left, node) - this.toNumber(right, node),
        );
      case "*=":
        return this.store.number(
          this.toNumber(left, node) * this.toNumber(right, node),
        );
      case "/=":
        return this.store.number(
          this.toNumber(left, node) / this.toNumber(right, node),
        );
      case "%=":
        return this.store.number(
          this.toNumber(left, node) % this.toNumber(right, node),
        );
      default:
        throw fault(
          "TS_UNSUPPORTED_NODE",
          "execute",
          `Assignment ${operator} is not supported`,
          node,
        );
    }
  }

  private memberKey(member: MemberExpression, scopeId: ScopeId): string {
    if (!member.computed && member.property.type === "Identifier")
      return member.property.name;
    return this.toKey(this.evaluate(member.property as Expression, scopeId));
  }

  private toKey(value: RuntimeValue): string {
    if (value.type === "string") return value.value;
    if (value.type === "number") return String(value.value);
    throw new RuntimeFault({
      code: "TS_TYPE_ERROR",
      phase: "execute",
      message: "Property key must be a string or number",
    });
  }

  private toNumber(value: RuntimeValue, node: Node): number {
    if (value.type === "number") return value.value;
    if (value.type === "boolean") return value.value ? 1 : 0;
    if (value.type === "null") return 0;
    if (value.type === "string" && value.value.trim() !== "") {
      const number = Number(value.value);
      if (Number.isFinite(number)) return number;
    }
    throw fault("TS_TYPE_ERROR", "execute", "Expected a finite number", node);
  }

  private toString(value: RuntimeValue): string {
    switch (value.type) {
      case "undefined":
        return "undefined";
      case "null":
        return "null";
      case "boolean":
        return String(value.value);
      case "number":
        return String(value.value);
      case "string":
        return value.value;
      case "object":
        return `[object ${value.objectId}]`;
      case "function":
        return `[function ${value.functionId}]`;
      case "native-function":
        return `[native ${value.nativeId}]`;
    }
  }

  private truthy(value: RuntimeValue): boolean {
    switch (value.type) {
      case "undefined":
      case "null":
        return false;
      case "boolean":
        return value.value;
      case "number":
        return value.value !== 0;
      case "string":
        return value.value.length > 0;
      default:
        return true;
    }
  }

  private equal(left: RuntimeValue, right: RuntimeValue): boolean {
    if (left.type !== right.type) return false;
    switch (left.type) {
      case "undefined":
      case "null":
        return true;
      case "boolean":
        return left.value === (right as typeof left).value;
      case "number":
        return left.value === (right as typeof left).value;
      case "string":
        return left.value === (right as typeof left).value;
      case "object":
        return left.objectId === (right as typeof left).objectId;
      case "function":
        return left.functionId === (right as typeof left).functionId;
      case "native-function":
        return left.nativeId === (right as typeof left).nativeId;
    }
  }

  private compare(left: RuntimeValue, right: RuntimeValue): number {
    if (left.type === "string" && right.type === "string")
      return left.value < right.value ? -1 : left.value > right.value ? 1 : 0;
    return (
      this.toNumber(left, { type: "Identifier", name: "comparison" }) -
      this.toNumber(right, { type: "Identifier", name: "comparison" })
    );
  }

  private bindingFault(error: unknown, node: Node): RuntimeFault {
    if (
      error instanceof Error &&
      error.message.startsWith("Duplicate binding")
    ) {
      return fault("TS_DUPLICATE_BINDING", "execute", error.message, node);
    }
    if (error instanceof RuntimeFault) return error;
    return fault(
      "TS_RUNTIME_ERROR",
      "execute",
      error instanceof Error ? error.message : "Binding failed",
      node,
    );
  }

  private consume(node: Node): void {
    this.fuel -= 1;
    if (this.fuel < 0)
      throw fault(
        "TS_FUEL_EXHAUSTED",
        "execute",
        "Cell execution exhausted its fuel budget",
        node,
      );
  }

  private nodeOffset(node: Node, key: "start" | "end"): number {
    const value = (node as Node & { start?: number; end?: number })[key];
    return value ?? -1;
  }

  private readonly nativeNames = new Set([
    "min",
    "max",
    "abs",
    "floor",
    "ceil",
    "round",
    "clamp",
    "range",
    "keys",
    "values",
    "count",
    "assert",
    "trace",
  ]);
}
