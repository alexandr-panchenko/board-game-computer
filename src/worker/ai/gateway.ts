import OpenAI from "openai";

import {
  DesignerCandidateSchema,
  PlayerChoiceSchema,
  type DesignerCandidate,
  type PlayerChoice,
} from "../../shared/ai";
import { chooseLegalActionTool, proposeRoomCellTool } from "./schemas";

export interface GatewayResult<T> {
  value: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiGateway {
  proposeDesigner(input: {
    model: string;
    prompt: string;
    safetyIdentifier: string;
    signal: AbortSignal;
  }): Promise<GatewayResult<DesignerCandidate>>;
  choosePlayer(input: {
    model: string;
    prompt: string;
    optionIds: string[];
    safetyIdentifier: string;
    signal: AbortSignal;
  }): Promise<GatewayResult<PlayerChoice>>;
}

export class OpenAiGateway implements AiGateway {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async proposeDesigner(input: {
    model: string;
    prompt: string;
    safetyIdentifier: string;
    signal: AbortSignal;
  }): Promise<GatewayResult<DesignerCandidate>> {
    const response = await this.client.responses.create(
      {
        model: input.model,
        input: input.prompt,
        tools: [proposeRoomCellTool],
        tool_choice: { type: "function", name: proposeRoomCellTool.name },
        parallel_tool_calls: false,
        reasoning: { effort: "medium" },
        max_output_tokens: 1_600,
        store: false,
        safety_identifier: input.safetyIdentifier,
      },
      { signal: input.signal },
    );
    return resultFromResponse(
      response,
      proposeRoomCellTool.name,
      DesignerCandidateSchema,
    );
  }

  async choosePlayer(input: {
    model: string;
    prompt: string;
    optionIds: string[];
    safetyIdentifier: string;
    signal: AbortSignal;
  }): Promise<GatewayResult<PlayerChoice>> {
    const tool = chooseLegalActionTool(input.optionIds);
    const response = await this.client.responses.create(
      {
        model: input.model,
        input: input.prompt,
        tools: [tool],
        tool_choice: { type: "function", name: tool.name },
        parallel_tool_calls: false,
        reasoning: { effort: "low" },
        max_output_tokens: 300,
        store: false,
        safety_identifier: input.safetyIdentifier,
      },
      { signal: input.signal },
    );
    return resultFromResponse(response, tool.name, PlayerChoiceSchema);
  }
}

interface ResponseLike {
  model: string;
  output: Array<unknown>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  } | null;
}

interface Schema<T> {
  parse(value: unknown): T;
}

function resultFromResponse<T>(
  response: ResponseLike,
  toolName: string,
  schema: Schema<T>,
): GatewayResult<T> {
  const call = response.output.find(
    (
      item,
    ): item is { type: "function_call"; name: string; arguments: string } =>
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      item.type === "function_call" &&
      "name" in item &&
      item.name === toolName &&
      "arguments" in item &&
      typeof item.arguments === "string",
  );
  if (call === undefined)
    throw new AiGatewayError(
      "AI_MALFORMED_TOOL_OUTPUT",
      `Model did not return ${toolName}`,
      false,
    );
  let decoded: unknown;
  try {
    decoded = JSON.parse(call.arguments);
  } catch {
    throw new AiGatewayError(
      "AI_MALFORMED_TOOL_OUTPUT",
      "Tool arguments were not valid JSON",
      false,
    );
  }
  try {
    return {
      value: schema.parse(decoded),
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  } catch {
    throw new AiGatewayError(
      "AI_MALFORMED_TOOL_OUTPUT",
      "Tool arguments did not match the strict application schema",
      false,
    );
  }
}

export class AiGatewayError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
