// User ID and session management utilities

const USER_ID_KEY = 'redacted_user_id';
const PLAYER_NAME_KEY = 'redacted_player_name';
const CURRENT_LOBBY_KEY = 'redacted_current_lobby';

/**
 * Generate a unique user ID using crypto.randomUUID
 */
export function generateUserId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a random player name in AGENT_XXXX format
 */
export function generatePlayerName(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomChars = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `AGENT_${randomChars}`;
}

/**
 * Get or create a persistent user ID
 */
export function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Get or create a player name
 */
export function getOrCreatePlayerName(): string {
  let playerName = localStorage.getItem(PLAYER_NAME_KEY);
  if (!playerName) {
    playerName = generatePlayerName();
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }
  return playerName;
}

/**
 * Update player name preference
 */
export function setPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

/**
 * Get the current user ID (returns null if not set)
 */
export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

/**
 * Get the current player name (returns null if not set)
 */
export function getPlayerName(): string | null {
  return localStorage.getItem(PLAYER_NAME_KEY);
}

/**
 * Store current lobby info
 */
export function setCurrentLobby(lobbyId: string, lobbyCode: string): void {
  localStorage.setItem(CURRENT_LOBBY_KEY, JSON.stringify({ lobbyId, lobbyCode }));
}

/**
 * Get current lobby info
 */
export function getCurrentLobby(): { lobbyId: string; lobbyCode: string } | null {
  const data = localStorage.getItem(CURRENT_LOBBY_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Clear current lobby info
 */
export function clearCurrentLobby(): void {
  localStorage.removeItem(CURRENT_LOBBY_KEY);
}

/**
 * Clear all user data (for logout/reset)
 */
export function clearUserData(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(PLAYER_NAME_KEY);
  localStorage.removeItem(CURRENT_LOBBY_KEY);
}
