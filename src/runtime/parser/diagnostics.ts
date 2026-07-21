import type { Node } from "estree";

export type DiagnosticPhase = "parse" | "validate" | "execute" | "conflict";

export interface RuntimeDiagnostic {
  code: string;
  phase: DiagnosticPhase;
  message: string;
  cellId?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  hints?: string[];
  availableNames?: string[];
}

export class RuntimeFault extends Error {
  readonly diagnostic: RuntimeDiagnostic;

  constructor(diagnostic: RuntimeDiagnostic) {
    super(diagnostic.message);
    this.name = "RuntimeFault";
    this.diagnostic = diagnostic;
  }
}

export function fault(
  code: string,
  phase: DiagnosticPhase,
  message: string,
  node?: Node,
): RuntimeFault {
  const location = node?.loc;
  return new RuntimeFault({
    code,
    phase,
    message,
    ...(location === undefined || location === null
      ? {}
      : {
          line: location.start.line,
          column: location.start.column,
          endLine: location.end.line,
          endColumn: location.end.column,
        }),
  });
}

export function diagnosticFromUnknown(
  error: unknown,
  phase: DiagnosticPhase,
): RuntimeDiagnostic {
  if (error instanceof RuntimeFault) return error.diagnostic;
  return {
    code: phase === "execute" ? "TS_RUNTIME_ERROR" : "TS_PARSE_ERROR",
    phase,
    message: error instanceof Error ? error.message : "Unknown runtime failure",
  };
}
