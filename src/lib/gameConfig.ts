/**
 * Game Configuration Types and Presets
 * Defines difficulty levels, game settings, and preset configurations
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'veryHard' | 'custom';
export type RoundCount = 1 | 3 | 5 | 10 | 'endless';
export type Category = 'general' | 'popCulture' | 'history' | 'science' | 'tech';

export interface GameConfig {
  difficulty: Difficulty;
  rounds: RoundCount;
  timePerRound: number; // seconds
  rhythmMode: boolean;
  bpm: number;
  category: Category;
  forbiddenWordCount: number;
  fuzzyMatchThreshold: number; // 0-100
  hintFrequency: number; // seconds between hints
  hintsPerGame: number | 'unlimited';
}

export interface DifficultyPreset {
  name: string;
  description: string;
  forbiddenWordCount: number;
  timePerRound: number;
  fuzzyMatchThreshold: number;
  hintFrequency: number;
  hintsPerGame: number | 'unlimited';
  bpm: number;
}

export const DIFFICULTY_PRESETS: Record<Exclude<Difficulty, 'custom'>, DifficultyPreset> = {
  easy: {
    name: 'Easy',
    description: 'Relaxed pace with generous matching',
    forbiddenWordCount: 3,
    timePerRound: 120,
    fuzzyMatchThreshold: 70,
    hintFrequency: 30,
    hintsPerGame: 'unlimited',
    bpm: 60,
  },
  medium: {
    name: 'Medium',
    description: 'Balanced challenge for most players',
    forbiddenWordCount: 5,
    timePerRound: 90,
    fuzzyMatchThreshold: 85,
    hintFrequency: 45,
    hintsPerGame: 'unlimited',
    bpm: 90,
  },
  hard: {
    name: 'Hard',
    description: 'Strict timing and matching',
    forbiddenWordCount: 7,
    timePerRound: 60,
    fuzzyMatchThreshold: 95,
    hintFrequency: 0, // No auto hints
    hintsPerGame: 2,
    bpm: 120,
  },
  veryHard: {
    name: 'Very Hard',
    description: 'Expert mode - exact matches only',
    forbiddenWordCount: 10,
    timePerRound: 45,
    fuzzyMatchThreshold: 100,
    hintFrequency: 0,
    hintsPerGame: 0,
    bpm: 150,
  },
};

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'general', label: 'General Knowledge' },
  { value: 'popCulture', label: 'Pop Culture' },
  { value: 'history', label: 'History' },
  { value: 'science', label: 'Science' },
  { value: 'tech', label: 'Technology' },
];

export const ROUND_OPTIONS: RoundCount[] = [1, 3, 5, 10, 'endless'];

export const DEFAULT_CONFIG: GameConfig = {
  difficulty: 'medium',
  rounds: 3,
  timePerRound: 90,
  rhythmMode: false,
  bpm: 90,
  category: 'general',
  forbiddenWordCount: 5,
  fuzzyMatchThreshold: 85,
  hintFrequency: 45,
  hintsPerGame: 'unlimited',
};

/**
 * Apply a difficulty preset to the current config
 */
export function applyDifficultyPreset(
  currentConfig: GameConfig,
  difficulty: Exclude<Difficulty, 'custom'>
): GameConfig {
  const preset = DIFFICULTY_PRESETS[difficulty];
  return {
    ...currentConfig,
    difficulty,
    forbiddenWordCount: preset.forbiddenWordCount,
    timePerRound: preset.timePerRound,
    fuzzyMatchThreshold: preset.fuzzyMatchThreshold,
    hintFrequency: preset.hintFrequency,
    hintsPerGame: preset.hintsPerGame,
    bpm: preset.bpm,
  };
}

/**
 * Format time in seconds to display string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}min`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
