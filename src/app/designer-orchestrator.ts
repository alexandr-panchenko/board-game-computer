import type { DesignerCandidate, RuntimeDiagnosticInput } from "../shared/ai";

export type CandidateCheck =
  { ok: true } | { ok: false; diagnostic: RuntimeDiagnosticInput };

export type DesignerLoopResult =
  | {
      ok: true;
      candidate: DesignerCandidate;
      attempts: number;
      revalidated: boolean;
    }
  | {
      ok: false;
      attempts: number;
      diagnostics: RuntimeDiagnosticInput[];
      error?: string;
    };

export async function runDesignerRepairLoop(input: {
  baseHash: string;
  currentHash(): string;
  generate(
    attempt: number,
    diagnostics: RuntimeDiagnosticInput[],
  ): Promise<DesignerCandidate>;
  validate(source: string): CandidateCheck;
  commit(source: string): CandidateCheck;
  onRejected?(diagnostic: RuntimeDiagnosticInput, attempt: number): void;
}): Promise<DesignerLoopResult> {
  let diagnostics: RuntimeDiagnosticInput[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let candidate: DesignerCandidate;
    try {
      candidate = await input.generate(attempt, diagnostics);
    } catch (error) {
      return {
        ok: false,
        attempts: attempt,
        diagnostics,
        error: error instanceof Error ? error.message : "AI request failed",
      };
    }
    const revalidated = input.currentHash() !== input.baseHash;
    const validation = input.validate(candidate.source);
    if (!validation.ok) {
      diagnostics = [validation.diagnostic];
      input.onRejected?.(validation.diagnostic, attempt);
      continue;
    }
    const committed = input.commit(candidate.source);
    if (!committed.ok) {
      diagnostics = [committed.diagnostic];
      input.onRejected?.(committed.diagnostic, attempt);
      continue;
    }
    return { ok: true, candidate, attempts: attempt, revalidated };
  }
  return { ok: false, attempts: 3, diagnostics };
}

export function resolveChosenOption<T extends { id: string }>(input: {
  offered: Map<string, T>;
  chosenOptionId: string;
  current: readonly T[];
}): T | undefined {
  const selected = input.offered.get(input.chosenOptionId);
  if (selected === undefined) return undefined;
  return input.current.find((option) => option.id === selected.id);
}
