/**
 * Replay Key Bindings - Configurable key mappings for replay viewer.
 *
 * Separate from gameplay bindings since replay controls are contextual
 * and don't overlap with mission controls.
 */

import { logError, logWarn } from '../core/logger';

/** All bindable actions in the replay viewer */
export type ReplayAction =
  // Playback
  | 'togglePlay'
  | 'exit'
  // Seeking
  | 'seekBackward'
  | 'seekForward'
  | 'framePrev'
  | 'frameNext'
  | 'speedUp'
  | 'speedDown'
  | 'seekStart'
  | 'seek10'
  | 'seek20'
  | 'seek30'
  | 'seek40'
  | 'seek50'
  | 'seek60'
  | 'seek70'
  | 'seek80'
  | 'seek90'
  // Ship selection
  | 'nextShip'
  | 'prevShip'
  | 'resetCamera'
  // Camera mode
  | 'toggleCamera'
  // Camera movement (orbit mode: rotate around target, free mode: move camera)
  | 'cameraUp'
  | 'cameraDown'
  | 'cameraLeft'
  | 'cameraRight'
  | 'cameraForward'
  | 'cameraBack'
  | 'cameraRollLeft'
  | 'cameraRollRight'
  | 'zoomIn'
  | 'zoomOut'
  // Display
  | 'toggleHUD'
  | 'showHelp';

/** Key binding map type */
export type ReplayBindings = Record<ReplayAction, string>;

/** Default replay key bindings */
export const DEFAULT_REPLAY_BINDINGS: ReplayBindings = {
  // Playback
  togglePlay: 'KeyK', // K always toggles (YouTube-style J-K-L cluster)
  exit: 'Escape',
  // Seeking (YouTube-style controls)
  seekBackward: 'KeyJ', // 10 seconds back
  seekForward: 'KeyL', // 10 seconds forward
  framePrev: 'Comma', // Previous tick (while paused)
  frameNext: 'Period', // Next tick (while paused)
  speedUp: 'Period', // > (Shift+.) - speed up (shift checked in handler)
  speedDown: 'Comma', // < (Shift+,) - slow down (shift checked in handler)
  seekStart: 'Digit0', // Seek to start
  seek10: 'Digit1', // Seek to 10%
  seek20: 'Digit2', // Seek to 20%
  seek30: 'Digit3', // Seek to 30%
  seek40: 'Digit4', // Seek to 40%
  seek50: 'Digit5', // Seek to 50%
  seek60: 'Digit6', // Seek to 60%
  seek70: 'Digit7', // Seek to 70%
  seek80: 'Digit8', // Seek to 80%
  seek90: 'Digit9', // Seek to 90%
  // Ship selection
  nextShip: 'Tab',
  prevShip: 'Backquote', // ` key
  resetCamera: 'Home',
  // Camera mode
  toggleCamera: 'KeyC',
  // Camera movement (matches gameplay defaults where applicable)
  cameraUp: 'KeyW',
  cameraDown: 'KeyS',
  cameraLeft: 'KeyA',
  cameraRight: 'KeyD',
  cameraForward: 'ShiftLeft', // Like accelerate
  cameraBack: 'ControlLeft', // Like decelerate
  cameraRollLeft: 'KeyQ', // Like rollLeft
  cameraRollRight: 'KeyE', // Like rollRight
  zoomIn: 'Equal', // +/= key
  zoomOut: 'Minus', // - key
  // Display
  toggleHUD: 'KeyH',
  showHelp: 'F1',
};

/** Display names for actions (for settings UI) */
export const REPLAY_ACTION_DISPLAY_NAMES: Record<ReplayAction, string> = {
  // Playback
  togglePlay: 'Play / Pause',
  exit: 'Exit Replay',
  // Seeking
  seekBackward: 'Seek Back 10s',
  seekForward: 'Seek Forward 10s',
  framePrev: 'Previous Frame',
  frameNext: 'Next Frame',
  speedUp: 'Speed Up',
  speedDown: 'Slow Down',
  seekStart: 'Seek to Start',
  seek10: 'Seek to 10%',
  seek20: 'Seek to 20%',
  seek30: 'Seek to 30%',
  seek40: 'Seek to 40%',
  seek50: 'Seek to 50%',
  seek60: 'Seek to 60%',
  seek70: 'Seek to 70%',
  seek80: 'Seek to 80%',
  seek90: 'Seek to 90%',
  // Ship selection
  nextShip: 'Next Ship',
  prevShip: 'Previous Ship',
  resetCamera: 'Reset to Player',
  // Camera mode
  toggleCamera: 'Toggle Camera Mode',
  // Camera movement
  cameraUp: 'Camera Up / Orbit Up',
  cameraDown: 'Camera Down / Orbit Down',
  cameraLeft: 'Camera Left / Orbit Left',
  cameraRight: 'Camera Right / Orbit Right',
  cameraForward: 'Camera Forward',
  cameraBack: 'Camera Back',
  cameraRollLeft: 'Roll Left',
  cameraRollRight: 'Roll Right',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  // Display
  toggleHUD: 'Toggle HUD',
  showHelp: 'Show Controls',
};

/** Action categories for organized display */
export const REPLAY_ACTION_CATEGORIES = {
  Playback: ['togglePlay', 'speedUp', 'speedDown', 'exit'],
  Seeking: [
    'seekBackward',
    'seekForward',
    'framePrev',
    'frameNext',
    'seekStart',
    'seek10',
    'seek20',
    'seek30',
    'seek40',
    'seek50',
    'seek60',
    'seek70',
    'seek80',
    'seek90',
  ],
  'Ship Selection': ['nextShip', 'prevShip', 'resetCamera'],
  'Camera Mode': ['toggleCamera'],
  'Camera Movement': [
    'cameraUp',
    'cameraDown',
    'cameraLeft',
    'cameraRight',
    'cameraForward',
    'cameraBack',
    'cameraRollLeft',
    'cameraRollRight',
    'zoomIn',
    'zoomOut',
  ],
  Display: ['toggleHUD', 'showHelp'],
} as const satisfies Record<string, readonly ReplayAction[]>;

/** localStorage key for replay bindings */
const REPLAY_BINDINGS_STORAGE_KEY = 'spaceflight_replay_keybindings';

/** Current active bindings (mutable singleton) */
let currentBindings: ReplayBindings = { ...DEFAULT_REPLAY_BINDINGS };

/**
 * Initialize replay bindings from localStorage or defaults.
 * Call this once at app startup.
 */
export function initReplayBindings(): void {
  const stored = loadBindingsFromStorage();
  if (stored) {
    // Merge with defaults to handle new actions added in updates
    currentBindings = { ...DEFAULT_REPLAY_BINDINGS, ...stored };
  } else {
    currentBindings = { ...DEFAULT_REPLAY_BINDINGS };
  }
}

/**
 * Get the current replay key bindings.
 * Returns a copy to prevent external mutation.
 */
export function getReplayBindings(): ReplayBindings {
  return { ...currentBindings };
}

/**
 * Get the key code for a specific replay action.
 */
export function getKeyForReplayAction(action: ReplayAction): string {
  return currentBindings[action];
}

/**
 * Check if a key code matches a replay action.
 */
export function isReplayAction(keyCode: string, action: ReplayAction): boolean {
  return currentBindings[action] === keyCode;
}

/**
 * Set a new key for a replay action.
 */
export function setReplayBinding(action: ReplayAction, keyCode: string): void {
  currentBindings[action] = keyCode;
}

/**
 * Save current replay bindings to localStorage.
 */
export function saveReplayBindings(): void {
  try {
    localStorage.setItem(
      REPLAY_BINDINGS_STORAGE_KEY,
      JSON.stringify(currentBindings),
    );
  } catch (error) {
    logError('Failed to save replay key bindings:', error);
  }
}

/**
 * Reset all replay bindings to defaults.
 */
export function resetReplayToDefaults(): void {
  currentBindings = { ...DEFAULT_REPLAY_BINDINGS };
  saveReplayBindings();
}

/**
 * Reset a single replay action to its default binding and persist.
 */
export function resetReplayActionToDefault(action: ReplayAction): void {
  currentBindings[action] = DEFAULT_REPLAY_BINDINGS[action];
  saveReplayBindings();
}

/**
 * Check if a key is already bound to another replay action.
 * @returns The conflicting action name, or null if no conflict
 */
export function findReplayKeyConflict(
  keyCode: string,
  excludeAction?: ReplayAction,
): ReplayAction | null {
  for (const [action, code] of Object.entries(currentBindings)) {
    if (code === keyCode && action !== excludeAction) {
      return action as ReplayAction;
    }
  }
  return null;
}

/**
 * Validate that a value is a valid key binding (non-empty string).
 */
function isValidKeyCode(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Load bindings from localStorage with validation.
 */
function loadBindingsFromStorage(): Partial<ReplayBindings> | null {
  try {
    const json = localStorage.getItem(REPLAY_BINDINGS_STORAGE_KEY);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      logWarn('Invalid replay key bindings format in storage');
      return null;
    }

    // Filter to only valid key bindings
    const obj = parsed as Record<string, unknown>;
    const validBindings: Partial<ReplayBindings> = {};

    for (const [action, keyCode] of Object.entries(obj)) {
      if (action in DEFAULT_REPLAY_BINDINGS && isValidKeyCode(keyCode)) {
        validBindings[action as ReplayAction] = keyCode;
      }
    }

    return Object.keys(validBindings).length > 0 ? validBindings : null;
  } catch {
    logWarn('Failed to parse replay key bindings from storage');
    return null;
  }
}
