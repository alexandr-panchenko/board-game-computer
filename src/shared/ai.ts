import { z } from "zod";

export const AI_MODELS = {
  designer: "gpt-5.6",
  player: "gpt-5.6-luna",
} as const;

export const RuntimeDiagnosticSchema = z
  .object({
    code: z.string().min(1).max(80),
    phase: z.enum([
      "parse",
      "validate",
      "execute",
      "trigger",
      "invariant",
      "conflict",
    ]),
    message: z.string().min(1).max(1_000),
    line: z.number().int().nonnegative().optional(),
    column: z.number().int().nonnegative().optional(),
    hints: z.array(z.string().max(300)).max(8).optional(),
  })
  .strict();

export const SourceCellContextSchema = z
  .object({
    id: z.string().min(1).max(128),
    kind: z.enum(["setup", "rule", "action", "chat"]),
    source: z.string().max(12_000),
  })
  .strict();

export const DesignerRequestSchema = z
  .object({
    roomId: z.string().min(1).max(128),
    request: z.string().min(1).max(1_000),
    baseSeq: z.number().int().nonnegative(),
    baseHash: z.string().min(1).max(128),
    sourceCells: z.array(SourceCellContextSchema).max(200),
    inspection: z.string().max(12_000),
    attempt: z.number().int().min(1).max(3),
    diagnostics: z.array(RuntimeDiagnosticSchema).max(12),
  })
  .strict();

export const DesignerCandidateSchema = z
  .object({
    source: z.string().min(1).max(12_000),
    summary: z.string().min(1).max(500),
    expected_effects: z.array(z.string().min(1).max(300)).max(8),
  })
  .strict();

export const LegalActionSummarySchema = z
  .object({
    optionId: z.string().min(1).max(128),
    label: z.string().min(1).max(160),
    consequence: z.string().min(1).max(300),
  })
  .strict();

export const PlayerRequestSchema = z
  .object({
    roomId: z.string().min(1).max(128),
    baseHash: z.string().min(1).max(128),
    inspection: z.string().max(8_000),
    options: z.array(LegalActionSummarySchema).min(1).max(64),
  })
  .strict();

export const PlayerChoiceSchema = z
  .object({
    option_id: z.string().min(1).max(128),
    reason: z.string().min(1).max(300),
  })
  .strict();

export const PlayerChoiceResponseSchema = z
  .object({
    choice: PlayerChoiceSchema,
    model: z.string().min(1).max(128),
    latencyMs: z.number().nonnegative(),
  })
  .strict();

export type RuntimeDiagnosticInput = z.infer<typeof RuntimeDiagnosticSchema>;
export type DesignerRequest = z.infer<typeof DesignerRequestSchema>;
export type DesignerCandidate = z.infer<typeof DesignerCandidateSchema>;
export type PlayerRequest = z.infer<typeof PlayerRequestSchema>;
export type PlayerChoice = z.infer<typeof PlayerChoiceSchema>;

export type DesignerStreamEvent =
  | { type: "progress"; stage: "accepted" | "budget" | "generating" }
  | {
      type: "candidate";
      candidate: DesignerCandidate;
      model: string;
      latencyMs: number;
    }
  | { type: "error"; code: string; message: string; retryable: boolean };

export type PlayerChoiceResponse = z.infer<typeof PlayerChoiceResponseSchema>;
