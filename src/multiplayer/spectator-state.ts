/**
 * Spectator State - Central state management for spectator mode.
 *
 * Manages spectator camera state for players who are watching the battle
 * (either because they have no assigned ship, or their ship was destroyed).
 */

import type { Entity } from '../core/types';
import {
  type CameraInput,
  CameraMode,
  createCameraInput,
  createCameraState,
  type ReplayCameraState,
} from '../ui/screens/replay/replay-camera';

// =============================================================================
// Types
// =============================================================================

/** State for a player in spectator mode */
export interface SpectatorState {
  /** Whether spectator mode is currently active */
  isActive: boolean;

  /** Replay camera state (handles entity tracking and camera modes) */
  cameraState: ReplayCameraState;

  /** Camera input state (movement controls) */
  cameraInput: CameraInput;

  /**
   * The local player's entity before death (null if never had one).
   * Used to track if player transitioned from playing to spectating.
   */
  localPlayerEntity: Entity | null;
}

// =============================================================================
// Module State
// =============================================================================

let spectatorState: SpectatorState | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the current spectator state.
 * Returns null if not in spectator mode.
 */
export function getSpectatorState(): SpectatorState | null {
  return spectatorState;
}

/**
 * Initialize spectator state for a player.
 *
 * @param localPlayerEntity - The player's entity (null if spectating from start)
 * @returns The initialized spectator state
 */
export function initSpectatorState(
  localPlayerEntity: Entity | null,
): SpectatorState {
  spectatorState = {
    isActive: true,
    cameraState: createCameraState(),
    cameraInput: createCameraInput(),
    localPlayerEntity,
  };

  // Default to chase camera mode
  spectatorState.cameraState.mode = CameraMode.Chase;

  return spectatorState;
}

/**
 * Clear spectator state (when mission ends).
 */
export function clearSpectatorState(): void {
  spectatorState = null;
}

/**
 * Check if currently in spectator mode.
 */
export function isSpectating(): boolean {
  return spectatorState?.isActive ?? false;
}
