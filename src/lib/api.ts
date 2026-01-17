// API service for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface CreateLobbyRequest {
  isPublic: boolean;
  playerName: string;
  userId: string;
}

export interface CreateLobbyResponse {
  lobbyId: string;
  lobbyCode: string;
  createdAt: string;
  isPublic: boolean;
}

export interface JoinLobbyRequest {
  playerName: string;
  userId: string;
}

export interface JoinLobbyResponse {
  lobbyId: string;
  players: PlayerData[];
  message: string;
}

export interface JoinRandomLobbyResponse {
  lobbyId: string;
  lobbyCode: string;
  players: PlayerData[];
  message: string;
}

export interface PlayerData {
  playerId: string;
  playerName: string;
  role: 'searcher' | 'guesser' | null;
}

export interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  rounds: number;
  timePerRound: number;
  isRhythmEnabled: boolean;
}

export interface LobbyData {
  lobbyId: string;
  lobbyCode: string;
  isPublic: boolean;
  createdAt: string;
  players: PlayerData[];
  status: 'waiting' | 'in_game' | 'finished';
  gameConfig: GameConfig | null;
  gameId: string | null;
}

export interface StartGameRequest {
  difficulty: string;
  rounds: number;
  timePerRound: number;
  isRhythmEnabled: boolean;
}

export interface StartGameResponse {
  gameId: string;
  lobbyId: string;
  message: string;
  gameConfig: GameConfig;
  players: PlayerData[];
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  async createLobby(data: CreateLobbyRequest): Promise<CreateLobbyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/create-lobby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<CreateLobbyResponse>(response);
  },

  async joinLobby(lobbyCode: string, data: JoinLobbyRequest): Promise<JoinLobbyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/join-lobby/${lobbyCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<JoinLobbyResponse>(response);
  },

  async joinRandomPublicLobby(data: JoinLobbyRequest): Promise<JoinRandomLobbyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/join-random-public-lobby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<JoinRandomLobbyResponse>(response);
  },

  async getLobby(lobbyId: string): Promise<{ lobby: LobbyData }> {
    const response = await fetch(`${API_BASE_URL}/api/lobby/${lobbyId}`);
    return handleResponse<{ lobby: LobbyData }>(response);
  },

  async startGame(lobbyId: string, config: StartGameRequest): Promise<StartGameResponse> {
    const response = await fetch(`${API_BASE_URL}/api/start-game/${lobbyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<StartGameResponse>(response);
  },

  async healthCheck(): Promise<{ status: string; google_search_available: boolean; gemini_available: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse(response);
  },
};

export { ApiError };
