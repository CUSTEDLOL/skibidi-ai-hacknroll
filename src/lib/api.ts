// API utility functions for backend communication

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export interface CreateLobbyRequest {
  isPublic: boolean;
}

export interface CreateLobbyResponse {
  lobbyId: string;
  lobbyCode: string;
  createdAt: string;
  isPublic: boolean;
}

export interface JoinLobbyRequest {
  playerName?: string;
}

export interface JoinLobbyResponse {
  lobbyId: string;
  userId: string;
  playerName: string;
  players: Array<{
    playerId: string;
    playerName: string;
    role: string | null;
    isConnected?: boolean;
  }>;
  message: string;
}

export interface LobbyInfo {
  lobbyId: string;
  lobbyCode: string;
  isPublic: boolean;
  createdAt: string;
  players: Array<{
    playerId: string;
    playerName: string;
    role: string | null;
    isConnected?: boolean;
  }>;
  status: "waiting" | "in_game" | "finished";
  gameConfig: {
    difficulty: string;
    rounds: number;
    timePerRound: number;
    isRhythmEnabled: boolean;
  } | null;
  gameId: string | null;
}

export interface SearchRequest {
  query: string;
  lobbyId?: string;
  room_key?: string;
}

export interface SearchResponse {
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    link: string;
    displayLink: string;
  }>;
  count: number;
}

export interface RedactedSearchRequest {
  query: string;
  forbidden_words: string[];
  secret_topic: string;
}

export interface RedactedSearchResponse {
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    link: string;
    displayLink: string;
  }>;
  count: number;
}

export interface ValidateQueryRequest {
  query: string;
  forbidden_words: string[];
}

export interface ValidateQueryResponse {
  valid: boolean;
  violations: string[];
  message: string;
}

export interface TopicResponse {
  topic: string;
  forbidden_words: string[];
}

export interface StartGameRequest {
  difficulty?: string;
  rounds?: number;
  timePerRound?: number;
  isRhythmEnabled?: boolean;
}

export interface StartGameResponse {
  gameId: string;
  lobbyId: string;
  message: string;
  gameConfig: {
    difficulty: string;
    rounds: number;
    timePerRound: number;
    isRhythmEnabled: boolean;
  };
  players: Array<{
    playerId: string;
    playerName: string;
    role: string | null;
  }>;
}

// API Functions

export async function createLobby(
  data: CreateLobbyRequest,
): Promise<CreateLobbyResponse> {
  const response = await fetch(`${API_BASE}/api/create-lobby`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to create lobby");
  }

  return response.json();
}

export async function joinLobby(
  lobbyCode: string,
  data: JoinLobbyRequest,
): Promise<JoinLobbyResponse> {
  const response = await fetch(`${API_BASE}/api/join-lobby/${lobbyCode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to join lobby");
  }

  return response.json();
}

export async function joinRandomPublicLobby(
  data: JoinLobbyRequest,
): Promise<JoinLobbyResponse & { lobbyCode: string }> {
  const response = await fetch(`${API_BASE}/api/join-random-public-lobby`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to join random lobby");
  }

  return response.json();
}

export async function getLobby(lobbyId: string): Promise<{ lobby: LobbyInfo }> {
  const response = await fetch(`${API_BASE}/api/lobby/${lobbyId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to get lobby");
  }

  return response.json();
}

export async function getLobbyByCode(
  lobbyCode: string,
): Promise<{ lobby: LobbyInfo }> {
  const response = await fetch(`${API_BASE}/api/lobby-by-code/${lobbyCode}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to get lobby");
  }

  return response.json();
}

export async function startGame(
  lobbyId: string,
  data: StartGameRequest = {},
): Promise<StartGameResponse> {
  const response = await fetch(`${API_BASE}/api/start-game/${lobbyId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to start game");
  }

  return response.json();
}

export async function search(data: SearchRequest): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to perform search");
  }

  return response.json();
}

export async function searchRedacted(
  data: RedactedSearchRequest,
): Promise<RedactedSearchResponse> {
  const response = await fetch(`${API_BASE}/api/search/redacted`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to perform redacted search");
  }

  return response.json();
}

export async function validateQuery(
  data: ValidateQueryRequest,
): Promise<ValidateQueryResponse> {
  const response = await fetch(`${API_BASE}/api/validate-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to validate query");
  }

  return response.json();
}

export async function getRandomTopic(): Promise<TopicResponse> {
  const response = await fetch(`${API_BASE}/api/topics/random`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to get random topic");
  }

  return response.json();
}

export async function healthCheck(): Promise<{
  status: string;
  google_search_available: boolean;
  gemini_available: boolean;
}> {
  const response = await fetch(`${API_BASE}/api/health`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Health check failed");
  }

  return response.json();
}

// Round Management APIs

export interface SelectTopicRequest {
  lobbyId: string;
  userId: string;
  topic: string;
  forbiddenWords: string[];
  roundNumber: number;
  timeLimit: number;
}

export interface SelectTopicResponse {
  roundState: any;
  initialResults: Array<{
    title: string;
    snippet: string;
    link: string;
    displayLink: string;
  }>;
  redactedResults: Array<{
    title: string;
    snippet: string;
    link: string;
    displayLink: string;
  }>;
  message: string;
}

export interface SendResultRequest {
  lobbyId: string;
  userId: string;
  query: string;
  results: any[];
}

export interface SendResultResponse {
  success: boolean;
  cooldownRemaining: number;
  message: string;
}

export interface RoundStateResponse {
  roundState: any;
  timeRemaining: number;
  cooldownRemaining: number;
}

export interface RoundResultsResponse {
  results: Array<{
    playerId: string;
    playerName: string;
    role: string;
    score: number;
    roundScore: number;
    roundBreakdown: any;
    guessCount: number;
    searchCount: number;
    timeUsed: number;
  }>;
  roundNumber: number;
}

export interface MakeGuessRequest {
  lobbyId: string;
  userId: string;
  guess: string;
}

export interface MakeGuessResponse {
  correct: boolean;
  attempts: number;
  message?: string;
  score?: number;
}

export async function selectTopic(
  data: SelectTopicRequest,
): Promise<SelectTopicResponse> {
  const response = await fetch(`${API_BASE}/api/round/select-topic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to select topic");
  }

  return response.json();
}

export async function sendResult(
  data: SendResultRequest,
): Promise<SendResultResponse> {
  const response = await fetch(`${API_BASE}/api/round/send-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to send result");
  }

  return response.json();
}

export async function getRoundState(
  lobbyId: string,
): Promise<RoundStateResponse> {
  const response = await fetch(`${API_BASE}/api/round/state/${lobbyId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to get round state");
  }

  return response.json();
}

export async function getRoundResults(
  lobbyId: string,
): Promise<RoundResultsResponse> {
  const response = await fetch(`${API_BASE}/api/round/results/${lobbyId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to get round results");
  }

  return response.json();
}

export async function makeGuess(
  data: MakeGuessRequest,
): Promise<MakeGuessResponse> {
  const response = await fetch(`${API_BASE}/api/round/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to make guess");
  }

  return response.json();
}
