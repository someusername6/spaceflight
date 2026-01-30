/**
 * Spectator Input - Keyboard handlers for spectator mode.
 *
 * Handles Tab/Shift+Tab for cycling ships, C for camera mode,
 * and WASD/QE for camera movement.
 */

import type { World } from '../core/types';
import {
  nextEntity,
  prevEntity,
  toggleCameraMode,
} from '../ui/screens/replay/replay-camera';
import type { SpectatorState } from './spectator-state';

// =============================================================================
// Input Handler
// =============================================================================

/** Active key handler (stored for cleanup) */
let activeHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Create keydown handler for spectator controls.
 */
function createKeydownHandler(
  state: SpectatorState,
  world: World,
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    // Ignore if typing in input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const { cameraState, cameraInput } = state;

    switch (e.key) {
      // Entity cycling
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          prevEntity(cameraState, world);
        } else {
          nextEntity(cameraState, world);
        }
        break;

      // Camera mode toggle
      case 'c':
      case 'C':
        toggleCameraMode(cameraState, world);
        break;

      // Movement controls (continuous input via cameraInput)
      case 'w':
      case 'W':
        cameraInput.up = true;
        break;
      case 's':
      case 'S':
        cameraInput.down = true;
        break;
      case 'a':
      case 'A':
        cameraInput.left = true;
        break;
      case 'd':
      case 'D':
        cameraInput.right = true;
        break;
      case 'q':
      case 'Q':
        cameraInput.rollLeft = true;
        break;
      case 'e':
      case 'E':
        cameraInput.rollRight = true;
        break;

      // Zoom controls
      case 'r':
      case 'R':
        cameraInput.zoomIn = true;
        break;
      case 'f':
      case 'F':
        cameraInput.zoomOut = true;
        break;
    }
  };
}

/**
 * Create keyup handler for spectator controls.
 */
function createKeyupHandler(state: SpectatorState): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const { cameraInput } = state;

    switch (e.key) {
      case 'w':
      case 'W':
        cameraInput.up = false;
        break;
      case 's':
      case 'S':
        cameraInput.down = false;
        break;
      case 'a':
      case 'A':
        cameraInput.left = false;
        break;
      case 'd':
      case 'D':
        cameraInput.right = false;
        break;
      case 'q':
      case 'Q':
        cameraInput.rollLeft = false;
        break;
      case 'e':
      case 'E':
        cameraInput.rollRight = false;
        break;
      case 'r':
      case 'R':
        cameraInput.zoomIn = false;
        break;
      case 'f':
      case 'F':
        cameraInput.zoomOut = false;
        break;
    }
  };
}

// =============================================================================
// Public API
// =============================================================================

/** Active keyup handler (stored for cleanup) */
let activeKeyupHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Setup spectator input handlers.
 *
 * @param state - Spectator state to control
 * @param world - Game world for entity operations
 */
export function setupSpectatorInput(state: SpectatorState, world: World): void {
  // Clean up any existing handlers
  cleanupSpectatorInput();

  // Create and attach handlers
  activeHandler = createKeydownHandler(state, world);
  activeKeyupHandler = createKeyupHandler(state);

  window.addEventListener('keydown', activeHandler);
  window.addEventListener('keyup', activeKeyupHandler);
}

/**
 * Cleanup spectator input handlers.
 */
export function cleanupSpectatorInput(): void {
  if (activeHandler) {
    window.removeEventListener('keydown', activeHandler);
    activeHandler = null;
  }
  if (activeKeyupHandler) {
    window.removeEventListener('keyup', activeKeyupHandler);
    activeKeyupHandler = null;
  }
}
