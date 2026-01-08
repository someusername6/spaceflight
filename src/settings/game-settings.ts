/**
 * Game Settings System - Persistent game settings like frame rate cap.
 *
 * Settings are persisted to localStorage separately from save games,
 * similar to how key bindings work.
 */

/** Available frame rate cap options */
export type FrameRateCap = 30 | 60 | 120 | 0; // 0 = uncapped

/** Game settings structure */
export interface GameSettings {
  frameRateCap: FrameRateCap;
}

/** Default settings */
export const DEFAULT_SETTINGS: GameSettings = {
  frameRateCap: 60, // Default to 60fps (balances quality and power usage)
};

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
 * Get the current game settings.
 * Returns a copy to prevent external mutation.
 */
export function getGameSettings(): GameSettings {
  return { ...currentSettings };
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
 * Save current settings to localStorage.
 */
export function saveGameSettings(): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (error) {
    console.error('Failed to save game settings:', error);
  }
}

/**
 * Reset all settings to defaults.
 */
export function resetSettingsToDefaults(): void {
  currentSettings = { ...DEFAULT_SETTINGS };
  saveGameSettings();
}

/**
 * Validate frame rate cap value.
 */
function isValidFrameRateCap(value: unknown): value is FrameRateCap {
  return value === 30 || value === 60 || value === 120 || value === 0;
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
      console.warn('Invalid game settings format in storage');
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const validSettings: Partial<GameSettings> = {};

    // Validate frameRateCap
    if ('frameRateCap' in obj && isValidFrameRateCap(obj.frameRateCap)) {
      validSettings.frameRateCap = obj.frameRateCap;
    }

    return Object.keys(validSettings).length > 0 ? validSettings : null;
  } catch {
    console.warn('Failed to parse game settings from storage');
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
