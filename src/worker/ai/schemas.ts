export const proposeRoomCellTool = {
  type: "function",
  name: "propose_room_cell",
  description:
    "Propose one Board Game Computer Designer cell for local validation.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["source", "summary", "expected_effects"],
    properties: {
      source: { type: "string" },
      summary: { type: "string" },
      expected_effects: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;

export function chooseLegalActionTool(optionIds: string[]) {
  return {
    type: "function" as const,
    name: "choose_legal_action",
    description: "Choose exactly one currently offered legal action option.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["option_id", "reason"],
      properties: {
        option_id: { type: "string", enum: optionIds },
        reason: { type: "string" },
      },
    },
  } as const;
}
