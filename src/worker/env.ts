export interface WorkerFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerNamespace {
  getByName(name: string): WorkerFetcher;
}

export interface Env {
  ASSETS: WorkerFetcher;
  ROOMS: WorkerNamespace;
  AI_BUDGET: WorkerNamespace;
  OPENAI_API_KEY?: string;
  AI_ENABLED?: string;
  AI_DESIGNER_MODEL?: string;
  AI_PLAYER_MODEL?: string;
  AI_MAX_REQUESTS_PER_DAY?: string;
  AI_MAX_ESTIMATED_INPUT_TOKENS_PER_DAY?: string;
  AI_MAX_REQUESTS_PER_ROOM_PER_HOUR?: string;
  AI_REQUEST_TIMEOUT_MS?: string;
}
