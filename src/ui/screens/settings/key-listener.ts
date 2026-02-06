/**
 * Settings Key Listener
 *
 * Capture-phase key listeners for rebinding controls and ESC handling.
 */

import {
  findKeyConflict,
  type GameAction,
  getKeyBindings,
  saveKeyBindings,
  setKeyBinding,
} from '../../../input/key-bindings';
import type { ScreenAPI } from '../../framework/screen';
import type { SettingsState } from './settings-render';

// Uses raw addEventListener because the listener must be managed independently from the screen lifecycle for external cleanup via cleanupKeyListener()
let activeKeyListener: ((e: KeyboardEvent) => void) | null = null;

/** Active ESC handler for closing settings */
let settingsEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

/** Set up capture-phase key listener for rebinding */
export function setupKeyListener(
  api: ScreenAPI<SettingsState>,
  action: GameAction,
): void {
  cleanupKeyListener();

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels rebinding
    if (e.code === 'Escape') {
      cleanupKeyListener();
      api.setState({ listeningAction: null });
      return;
    }

    // Check for conflicts
    const conflict = findKeyConflict(e.code, action);
    if (conflict) {
      // Swap the keys
      const currentKey = getKeyBindings()[action];
      setKeyBinding(conflict, currentKey);
    }

    // Set the new binding
    setKeyBinding(action, e.code);
    saveKeyBindings();

    cleanupKeyListener();
    api.setState({ listeningAction: null });
  };

  activeKeyListener = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown, true);
}

/** Start listening for a key press to rebind an action */
export function startListening(
  api: ScreenAPI<SettingsState>,
  action: GameAction,
): void {
  cleanupKeyListener();
  api.setState({ listeningAction: action });
}

/** Clean up the active key listener */
export function cleanupKeyListener(): void {
  if (activeKeyListener) {
    document.removeEventListener('keydown', activeKeyListener, true);
    activeKeyListener = null;
  }
}

/** Setup capture-phase ESC handler to close settings */
export function setupSettingsEscapeHandler(
  listeningAction: GameAction | null,
  onBack: () => void,
): void {
  cleanupSettingsEscapeHandler();

  // Don't add ESC handler if we're in key rebinding mode (that has its own handler)
  if (listeningAction) return;

  settingsEscapeHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      cleanupKeyListener();
      cleanupSettingsEscapeHandler();
      onBack();
    }
  };

  // Use capture phase to run before global escape handler
  document.addEventListener('keydown', settingsEscapeHandler, true);
}

/** Clean up the settings escape handler */
export function cleanupSettingsEscapeHandler(): void {
  if (settingsEscapeHandler) {
    document.removeEventListener('keydown', settingsEscapeHandler, true);
    settingsEscapeHandler = null;
  }
}
