import { parse } from "acorn";
import type { Program } from "estree";

import { stableHash } from "../store/hash";
import { RuntimeFault } from "./diagnostics";

export interface ParsedCell {
  source: string;
  sourceHash: string;
  program: Program;
}

const cache = new Map<string, ParsedCell>();

export function parseCell(source: string, maximumBytes = 32_768): ParsedCell {
  if (new TextEncoder().encode(source).byteLength > maximumBytes) {
    throw new RuntimeFault({
      code: "TS_SOURCE_LIMIT",
      phase: "parse",
      message: `Cell source exceeds ${String(maximumBytes)} bytes`,
    });
  }
  const sourceHash = stableHash(source);
  const cached = cache.get(sourceHash);
  if (cached !== undefined && cached.source === source) return cached;

  try {
    const program = parse(source, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
      ranges: true,
      allowAwaitOutsideFunction: false,
      allowReturnOutsideFunction: false,
    }) as Program;
    const parsed = { source, sourceHash, program };
    cache.set(sourceHash, parsed);
    return parsed;
  } catch (error) {
    const candidate = error as {
      message?: unknown;
      loc?: { line: number; column: number };
    };
    throw new RuntimeFault({
      code: "TS_PARSE_SYNTAX",
      phase: "parse",
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : "Invalid syntax",
      ...(candidate.loc === undefined
        ? {}
        : { line: candidate.loc.line, column: candidate.loc.column }),
    });
  }
}
