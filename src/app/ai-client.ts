import {
  DesignerCandidateSchema,
  PlayerChoiceResponseSchema,
  type DesignerCandidate,
  type DesignerRequest,
  type DesignerStreamEvent,
  type PlayerChoiceResponse,
  type PlayerRequest,
} from "../shared/ai";

export async function requestDesignerCandidate(
  request: DesignerRequest,
  onEvent: (event: DesignerStreamEvent) => void,
  signal?: AbortSignal,
): Promise<DesignerCandidate> {
  const response = await fetch("/api/ai/designer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok || response.body === null)
    throw new Error(`AI_DESIGNER_HTTP_${String(response.status)}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let candidate: DesignerCandidate | undefined;
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value, { stream: !chunk.done });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);
      if (data === undefined) continue;
      const event = JSON.parse(data) as DesignerStreamEvent;
      onEvent(event);
      if (event.type === "error") throw new Error(event.code);
      if (event.type === "candidate")
        candidate = DesignerCandidateSchema.parse(event.candidate);
    }
    if (chunk.done) break;
  }
  if (candidate === undefined) throw new Error("AI_MISSING_CANDIDATE");
  return candidate;
}

export async function requestPlayerChoice(
  request: PlayerRequest,
  signal?: AbortSignal,
): Promise<PlayerChoiceResponse> {
  const response = await fetch("/api/ai/player", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok)
    throw new Error(`AI_PLAYER_HTTP_${String(response.status)}`);
  return PlayerChoiceResponseSchema.parse(await response.json());
}
