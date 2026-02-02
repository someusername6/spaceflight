/**
 * Game Settings System - Persistent game settings like frame rate cap.
 *
 * Settings are persisted to localStorage separately from save games,
 * similar to how key bindings work.
 */

import { logError, logWarn } from '../core/logger';

/** Available frame rate cap options */
export type FrameRateCap = 30 | 60 | 120 | 0; // 0 = uncapped

/** Available player autoaim options (degrees) */
export type PlayerAutoaim = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

/** Game settings structure */
export interface GameSettings {
  frameRateCap: FrameRateCap;
  playerAutoaim: PlayerAutoaim;
}

/** Default settings */
export const DEFAULT_SETTINGS: GameSettings = {
  frameRateCap: 60, // Default to 60fps (balances quality and power usage)
  playerAutoaim: 2.5, // Default to 2.5 degrees of autoaim assistance
};

/** Display names for player autoaim options */
export const PLAYER_AUTOAIM_OPTIONS: Array<{
  value: PlayerAutoaim;
  label: string;
}> = [
  { value: 0, label: '0° (Off)' },
  { value: 0.5, label: '0.5°' },
  { value: 1, label: '1°' },
  { value: 1.5, label: '1.5°' },
  { value: 2, label: '2°' },
  { value: 2.5, label: '2.5°' },
  { value: 3, label: '3°' },
  { value: 3.5, label: '3.5°' },
  { value: 4, label: '4°' },
  { value: 4.5, label: '4.5°' },
  { value: 5, label: '5°' },
];

/** Display names for frame rate options */
export const FRAME_RATE_OPTIONS: Array<{ value: FrameRateCap; label: string }> =
  [
    { value: 30, label: '30 FPS' },
    { value: 60, label: '60 FPS' },
    { value: 120, label: '120 FPS' },
    { value: 0, label: 'Uncapped' },
  ];

/** localStorage key for settings */
const SETTINGS_STORAGE_KEY = 'spaceflight_settings';

/** Current active settings (mutable singleton) */
let currentSettings: GameSettings = { ...DEFAULT_SETTINGS };

/**
 * Initialize game settings from localStorage or defaults.
 * Call this once at app startup.
 */
export function initGameSettings(): void {
  const stored = loadSettingsFromStorage();
  if (stored) {
    currentSettings = { ...DEFAULT_SETTINGS, ...stored };
  } else {
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

/**
 * Get the current frame rate cap.
 * Returns 0 for uncapped.
 */
export function getFrameRateCap(): FrameRateCap {
  return currentSettings.frameRateCap;
}

/**
 * Set the frame rate cap and persist.
 */
export function setFrameRateCap(fps: FrameRateCap): void {
  currentSettings.frameRateCap = fps;
  saveGameSettings();
}

/**
 * Get the current player autoaim bonus in degrees.
 */
export function getPlayerAutoaim(): PlayerAutoaim {
  return currentSettings.playerAutoaim;
}

/**
 * Set the player autoaim bonus and persist.
 */
export function setPlayerAutoaim(degrees: PlayerAutoaim): void {
  currentSettings.playerAutoaim = degrees;
  saveGameSettings();
}

/**
 * Save current settings to localStorage.
 */
export function saveGameSettings(): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (error) {
    logError('Failed to save game settings:', error);
  }
}

/**
 * Validate frame rate cap value.
 */
function isValidFrameRateCap(value: unknown): value is FrameRateCap {
  return value === 30 || value === 60 || value === 120 || value === 0;
}

/**
 * Validate player autoaim value.
 */
export function isValidPlayerAutoaim(value: unknown): value is PlayerAutoaim {
  return PLAYER_AUTOAIM_OPTIONS.some((opt) => opt.value === value);
}

/**
 * Load settings from localStorage with validation.
 */
function loadSettingsFromStorage(): Partial<GameSettings> | null {
  try {
    const json = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      logWarn('Invalid game settings format in storage');
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const validSettings: Partial<GameSettings> = {};

    // Validate frameRateCap
    if ('frameRateCap' in obj && isValidFrameRateCap(obj.frameRateCap)) {
      validSettings.frameRateCap = obj.frameRateCap;
    }

    // Validate playerAutoaim
    if ('playerAutoaim' in obj && isValidPlayerAutoaim(obj.playerAutoaim)) {
      validSettings.playerAutoaim = obj.playerAutoaim;
    }

    return Object.keys(validSettings).length > 0 ? validSettings : null;
  } catch {
    logWarn('Failed to parse game settings from storage');
    return null;
  }
}

/**
 * Calculate the minimum frame interval in milliseconds.
 * Returns 0 for uncapped (render every frame).
 */
export function getFrameIntervalMs(): number {
  const cap = currentSettings.frameRateCap;
  if (cap === 0) return 0; // Uncapped
  return 1000 / cap;
}
