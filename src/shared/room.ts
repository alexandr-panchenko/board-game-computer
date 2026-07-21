import { z } from "zod";

import { APP_FRAMEWORK_VERSION, APP_LANGUAGE_VERSION } from "./versions";

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const stateHash = z.string().min(1).max(128);
const source = z.string().min(1).max(32_768);

export const RoomRoleSchema = z.enum(["designer", "player"]);
export const CellKindSchema = z.enum(["system", "code", "action", "chat"]);

export const CellAuthorSchema = z
  .object({
    clientId: id,
    seatId: id.optional(),
    role: RoomRoleSchema,
    displayName: z.string().min(1).max(80).optional(),
  })
  .strict();

export const CellProposalSchema = z
  .object({
    commandId: id,
    roomId: id,
    baseSeq: z.number().int().min(0),
    baseStateHash: stateHash,
    kind: CellKindSchema,
    source: source.optional(),
    chatText: z.string().min(1).max(4_096).optional(),
    author: CellAuthorSchema,
    clientLanguageVersion: z.literal(APP_LANGUAGE_VERSION),
    clientFrameworkVersion: z.literal(APP_FRAMEWORK_VERSION),
    proposedPostStateHash: stateHash.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "chat") {
      if (value.chatText === undefined)
        context.addIssue({ code: "custom", message: "Chat text is required" });
      if (value.source !== undefined)
        context.addIssue({
          code: "custom",
          message: "Chat cannot contain source",
        });
      return;
    }
    if (value.source === undefined)
      context.addIssue({
        code: "custom",
        message: "Executable source is required",
      });
    if (value.chatText !== undefined)
      context.addIssue({
        code: "custom",
        message: "Executable cells cannot contain chat text",
      });
    if (value.proposedPostStateHash === undefined)
      context.addIssue({
        code: "custom",
        message: "Executable cells require a post-state hash",
      });
  });

export const CommittedCellSchema = CellProposalSchema.and(
  z
    .object({
      seq: z.number().int().positive(),
      committedAt: z.string().min(1),
      sourceHash: stateHash.optional(),
      canonicalPostStateHash: stateHash.optional(),
    })
    .strict(),
);

export const CreateRoomRequestSchema = z
  .object({
    templateId: id.default("shifting-vaults-judge-v1"),
    initialStateHash: stateHash,
  })
  .strict();

export const ForkRoomRequestSchema = z
  .object({ seq: z.number().int().min(0) })
  .strict();

export const RoomJoinSchema = z
  .object({
    type: z.literal("room.join"),
    capability: z.string().min(24).max(256),
    clientId: id,
    lastSeq: z.number().int().min(0).default(0),
  })
  .strict();

export const RoomTailRequestSchema = z
  .object({
    type: z.literal("room.tail.request"),
    afterSeq: z.number().int().min(0),
  })
  .strict();

export const CellProposeMessageSchema = z
  .object({ type: z.literal("cell.propose"), proposal: CellProposalSchema })
  .strict();

export const StateHashReportSchema = z
  .object({
    type: z.literal("state.hash.report"),
    seq: z.number().int().min(0),
    stateHash,
  })
  .strict();

export const ClientRoomMessageSchema = z.discriminatedUnion("type", [
  RoomJoinSchema,
  RoomTailRequestSchema,
  CellProposeMessageSchema,
  StateHashReportSchema,
]);

export type RoomRole = z.infer<typeof RoomRoleSchema>;
export type CellKind = z.infer<typeof CellKindSchema>;
export type CellProposal = z.infer<typeof CellProposalSchema>;
export type CommittedCell = z.infer<typeof CommittedCellSchema>;

export interface RoomSnapshot {
  roomId: string;
  templateId: string;
  headSeq: number;
  headStateHash: string;
  languageVersion: typeof APP_LANGUAGE_VERSION;
  frameworkVersion: typeof APP_FRAMEWORK_VERSION;
  parentRoomId?: string;
  parentSeq?: number;
  cells: CommittedCell[];
}

export interface RoomCreation {
  roomId: string;
  designerUrl: string;
  playerUrl: string;
  snapshot: RoomSnapshot;
}
