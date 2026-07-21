export interface WorkerFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerNamespace {
  getByName(name: string): WorkerFetcher;
}

export interface RoomNamespace extends WorkerNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface Env {
  ASSETS: WorkerFetcher;
  ROOMS: RoomNamespace;
  AI_BUDGET: WorkerNamespace;
  OPENAI_API_KEY?: string;
  AI_ENABLED?: string;
  AI_DESIGNER_MODEL?: string;
  AI_PLAYER_MODEL?: string;
  AI_MAX_REQUESTS_PER_DAY?: string;
  AI_MAX_ESTIMATED_INPUT_TOKENS_PER_DAY?: string;
  AI_MAX_REQUESTS_PER_ROOM_PER_HOUR?: string;
  AI_REQUEST_TIMEOUT_MS?: string;
  ROOM_MAX_CELL_BYTES?: string;
  ROOM_MAX_CELLS?: string;
  ROOM_MAX_CONNECTIONS?: string;
  ROOM_COMMANDS_PER_MINUTE?: string;
  ROOM_MAX_CHAT_MESSAGE_BYTES?: string;
}
