/**
 * Key Bindings System - Configurable and persistent key mappings.
 *
 * Actions are defined with default key codes. Users can rebind keys
 * via the settings screen, and bindings are persisted to localStorage.
 */

/** All bindable actions in the game */
export type GameAction =
  | 'pitchUp'
  | 'pitchDown'
  | 'yawLeft'
  | 'yawRight'
  | 'rollLeft'
  | 'rollRight'
  | 'accelerate'
  | 'decelerate'
  | 'afterburner'
  | 'firePrimary'
  | 'fireSecondary'
  | 'launchDecoy'
  | 'cyclePrimary'
  | 'cycleSecondary'
  | 'cycleTargetNext'
  | 'cycleTargetPrev'
  | 'targetNearest'
  | 'toggleMatchSpeed'
  | 'pause';

/** Key binding map type */
export type KeyBindings = Record<GameAction, string>;

/** Default key bindings */
export const DEFAULT_BINDINGS: KeyBindings = {
  pitchUp: 'KeyW',
  pitchDown: 'KeyS',
  yawLeft: 'KeyA',
  yawRight: 'KeyD',
  rollLeft: 'KeyQ',
  rollRight: 'KeyE',
  accelerate: 'ShiftLeft',
  decelerate: 'ControlLeft',
  afterburner: 'KeyZ',
  firePrimary: 'Space',
  fireSecondary: 'KeyF',
  launchDecoy: 'KeyC',
  cyclePrimary: 'KeyV',
  cycleSecondary: 'KeyX',
  cycleTargetNext: 'BracketRight',
  cycleTargetPrev: 'BracketLeft',
  targetNearest: 'KeyT',
  toggleMatchSpeed: 'KeyM',
  pause: 'Escape',
};

/** Display names for actions (for settings UI) */
export const ACTION_DISPLAY_NAMES: Record<GameAction, string> = {
  pitchUp: 'Pitch Up',
  pitchDown: 'Pitch Down',
  yawLeft: 'Yaw Left',
  yawRight: 'Yaw Right',
  rollLeft: 'Roll Left',
  rollRight: 'Roll Right',
  accelerate: 'Accelerate',
  decelerate: 'Decelerate',
  afterburner: 'Afterburner',
  firePrimary: 'Fire Primary',
  fireSecondary: 'Fire Secondary',
  launchDecoy: 'Launch Decoy',
  cyclePrimary: 'Cycle Primary',
  cycleSecondary: 'Cycle Secondary',
  cycleTargetNext: 'Next Target',
  cycleTargetPrev: 'Previous Target',
  targetNearest: 'Target Nearest',
  toggleMatchSpeed: 'Match Speed',
  pause: 'Pause',
};

/** Action categories for organized display in settings */
export const ACTION_CATEGORIES: Record<string, GameAction[]> = {
  Movement: [
    'pitchUp',
    'pitchDown',
    'yawLeft',
    'yawRight',
    'rollLeft',
    'rollRight',
  ],
  Throttle: ['accelerate', 'decelerate', 'afterburner', 'toggleMatchSpeed'],
  Combat: ['firePrimary', 'fireSecondary', 'launchDecoy'],
  Weapons: ['cyclePrimary', 'cycleSecondary'],
  Targeting: ['cycleTargetNext', 'cycleTargetPrev', 'targetNearest'],
  System: ['pause'],
};

/** localStorage key for bindings */
const BINDINGS_STORAGE_KEY = 'spaceflight_keybindings';

/** Current active bindings (mutable singleton) */
let currentBindings: KeyBindings = { ...DEFAULT_BINDINGS };

/**
 * Initialize key bindings from localStorage or defaults.
 * Call this once at app startup.
 */
export function initKeyBindings(): void {
  const stored = loadBindingsFromStorage();
  if (stored) {
    // Merge with defaults to handle new actions added in updates
    currentBindings = { ...DEFAULT_BINDINGS, ...stored };
  } else {
    currentBindings = { ...DEFAULT_BINDINGS };
  }
}

/**
 * Get the current key bindings.
 * Returns a copy to prevent external mutation.
 */
export function getKeyBindings(): KeyBindings {
  return { ...currentBindings };
}

/**
 * Get the key code for a specific action.
 */
export function getKeyForAction(action: GameAction): string {
  return currentBindings[action];
}

/**
 * Set a new key for an action.
 * @param action - The action to rebind
 * @param keyCode - The new key code (e.g., 'KeyW', 'Space')
 */
export function setKeyBinding(action: GameAction, keyCode: string): void {
  currentBindings[action] = keyCode;
}

/**
 * Save current bindings to localStorage.
 */
export function saveKeyBindings(): void {
  try {
    localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(currentBindings));
  } catch (error) {
    console.error('Failed to save key bindings:', error);
  }
}

/**
 * Reset all bindings to defaults.
 */
export function resetToDefaults(): void {
  currentBindings = { ...DEFAULT_BINDINGS };
  saveKeyBindings();
}

/**
 * Reset a single action to its default binding and persist.
 */
export function resetActionToDefault(action: GameAction): void {
  currentBindings[action] = DEFAULT_BINDINGS[action];
  saveKeyBindings();
}

/**
 * Check if a key is already bound to another action.
 * @returns The conflicting action name, or null if no conflict
 */
export function findKeyConflict(
  keyCode: string,
  excludeAction?: GameAction,
): GameAction | null {
  for (const [action, code] of Object.entries(currentBindings)) {
    if (code === keyCode && action !== excludeAction) {
      return action as GameAction;
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
function loadBindingsFromStorage(): Partial<KeyBindings> | null {
  try {
    const json = localStorage.getItem(BINDINGS_STORAGE_KEY);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid key bindings format in storage');
      return null;
    }

    // Filter to only valid key bindings
    const obj = parsed as Record<string, unknown>;
    const validBindings: Partial<KeyBindings> = {};

    for (const [action, keyCode] of Object.entries(obj)) {
      if (action in DEFAULT_BINDINGS && isValidKeyCode(keyCode)) {
        validBindings[action as GameAction] = keyCode;
      }
    }

    return Object.keys(validBindings).length > 0 ? validBindings : null;
  } catch {
    console.warn('Failed to parse key bindings from storage');
    return null;
  }
}

/**
 * Convert a key code to a human-readable label.
 * @param keyCode - The key code (e.g., 'KeyW', 'ShiftLeft')
 * @returns Human-readable label (e.g., 'W', 'Left Shift')
 */
export function getKeyDisplayName(keyCode: string): string {
  // Handle letter keys
  if (keyCode.startsWith('Key')) {
    return keyCode.slice(3);
  }

  // Handle digit keys
  if (keyCode.startsWith('Digit')) {
    return keyCode.slice(5);
  }

  // Handle numpad
  if (keyCode.startsWith('Numpad')) {
    return `Num ${keyCode.slice(6)}`;
  }

  // Special keys
  const specialKeys: Record<string, string> = {
    Space: 'Space',
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    MetaLeft: 'Left Meta',
    MetaRight: 'Right Meta',
    Enter: 'Enter',
    Escape: 'Esc',
    Backspace: 'Backspace',
    Tab: 'Tab',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Backquote: '`',
    Backslash: '\\',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Minus: '-',
    Equal: '=',
    CapsLock: 'Caps',
    Insert: 'Insert',
    Delete: 'Delete',
    Home: 'Home',
    End: 'End',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
  };

  // Function keys
  if (keyCode.startsWith('F') && /^F\d+$/.test(keyCode)) {
    return keyCode;
  }

  return specialKeys[keyCode] ?? keyCode;
}
