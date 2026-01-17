// Player ID generation utilities

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generatePlayerId = (): string => {
  const randomChars = Array.from(
    { length: 4 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');

  return `AGENT_${randomChars}`;
};

export const generateLobbyCode = (): string => {
  return Array.from(
    { length: 6 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
};

export const getOrCreatePlayerId = (): string => {
  let playerId = localStorage.getItem('player_id');

  if (!playerId) {
    playerId = generatePlayerId();
    localStorage.setItem('player_id', playerId);
    localStorage.setItem('player_username', playerId);
  }

  return playerId;
};

export const getPlayerId = (): string | null => {
  return localStorage.getItem('player_id');
};

export const clearPlayerId = (): void => {
  localStorage.removeItem('player_id');
  localStorage.removeItem('player_username');
};

export const DIFFICULTY_PRESETS = {
  easy: {
    forbiddenWordsCount: 4,
    timePerRound: 180,
    searchesAllowed: 5,
    hintsAvailable: 2,
    description: 'Perfect for beginners!',
    examples: "'Pizza', 'Christmas', 'The Eiffel Tower'"
  },
  medium: {
    forbiddenWordsCount: 6,
    timePerRound: 120,
    searchesAllowed: 3,
    hintsAvailable: 1,
    description: 'Balanced challenge!',
    examples: "'Bitcoin', 'The Moon Landing', 'Harry Potter'"
  },
  hard: {
    forbiddenWordsCount: 8,
    timePerRound: 90,
    searchesAllowed: 2,
    hintsAvailable: 0,
    description: 'For experts only!',
    examples: "'Quantum Entanglement', 'The Suez Crisis'"
  },
  custom: {
    forbiddenWordsCount: 5,
    timePerRound: 120,
    searchesAllowed: 3,
    hintsAvailable: 1,
    description: 'Configure every setting manually',
    examples: 'Your choice!'
  }
};


export const generateAgentName = (): string => {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `Agent ${code}`;
};

export const getOrCreatePlayerName = (requestedName?: string): string => {
  if (requestedName && requestedName.trim().length > 0) {
    localStorage.setItem('player_username', requestedName.trim());
    return requestedName.trim();
  }

  let name = localStorage.getItem('player_username');
  if (!name) {
    name = generateAgentName();
    localStorage.setItem('player_username', name);
  }
  return name;
};

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'custom';
  rounds: number;
  timePerRound: number;
  minPlayers: number;
  isPublic: boolean;
  category: string;
  rhythmMode: boolean;
  // Advanced options
  forbiddenWordsCount?: number;
  redactionIntensity?: 'low' | 'medium' | 'high';
  hintCooldown?: number;
  searchCooldown?: number;
  enableChat?: boolean;
  autoRotateRoles?: boolean;
  spectatorMode?: boolean;
}

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  role: 'searcher' | 'guesser' | null;
  isReady?: boolean;
  score?: number;
}

export interface Lobby {
  code: string;
  hostId: string;
  settings: GameSettings;
  players: Player[];
  status: 'waiting' | 'starting' | 'in_progress' | 'finished';
  chatMessages: ChatMessage[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
}

export const CATEGORIES = [
  { value: 'general', label: 'General Knowledge' },
  { value: 'pop-culture', label: 'Pop Culture' },
  { value: 'history', label: 'History' },
  { value: 'science', label: 'Science & Technology' },
  { value: 'geography', label: 'Geography' },
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'mixed', label: 'Mixed (Random)' }
];
