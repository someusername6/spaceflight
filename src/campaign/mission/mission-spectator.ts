/**
 * Mission Spectator - Spectator mode initialization for missions.
 *
 * Handles detection and setup of spectator mode at mission start
 * and during mid-mission death transitions.
 */

import { logDebug } from '../../core/logger';
import type { Entity, World } from '../../core/types';
import { setupSpectatorInput } from '../../multiplayer/spectator-input';
import {
  clearSpectatorState,
  getSpectatorState,
  initSpectatorState,
  type SpectatorState,
} from '../../multiplayer/spectator-state';
import { getLobbyContext } from '../handlers/lobby-context';
import type { MissionRenderers } from './mission-renderer';
import { initSpectatorRendering, isEntityDead } from './mission-renderer';

// =============================================================================
// Types
// =============================================================================

/** Result of spectator mode check at mission start */
export interface SpectatorCheckResult {
  isSpectator: boolean;
}

// =============================================================================
// Spectator Detection
// =============================================================================

/**
 * Check if local player should start mission in spectator mode.
 * Spectator mode only applies to guests without ships.
 * Host always controls the commander (their shipId in lobby is intentionally null).
 */
export function checkSpectatorMode(): SpectatorCheckResult {
  const lobbyCtx = getLobbyContext();

  if (!lobbyCtx) {
    return { isSpectator: false };
  }

  // Host is NEVER a spectator (controls commander, whose shipId isn't in lobby state)
  if (lobbyCtx.isHost) {
    return { isSpectator: false };
  }

  // Guests are spectators if they have no shipId assigned
  const localPlayer = lobbyCtx.lobbyState.players.find(
    (p) => p.playerId === lobbyCtx.localPlayerId,
  );
  const isSpectator = localPlayer?.shipId === null;

  return { isSpectator };
}

/**
 * Initialize spectator mode at mission start.
 * Call this after spawning mission entities if checkSpectatorMode returned isSpectator=true.
 */
export function initializeMissionSpectator(
  world: World,
  renderers: MissionRenderers,
  container: HTMLElement,
): void {
  // Clear any previous spectator state
  clearSpectatorState();

  const spectator = initSpectatorState(null);
  setupSpectatorInput(spectator, world);
  initSpectatorRendering(renderers, container);
  logDebug(`[MISSION] Entering spectator mode (no ship assigned)`);
}

/**
 * Clear spectator state when starting a new mission.
 * Call this before checking spectator mode.
 */
export function clearMissionSpectator(): void {
  clearSpectatorState();
}

// =============================================================================
// Mid-Mission Spectator Transition
// =============================================================================

/**
 * Check and handle mid-mission death transition to spectator mode.
 * Call this each frame to detect when a player's ship is destroyed.
 *
 * @param cachedLocalPlayer - The local player entity (cached at mission start)
 * @param world - Game world
 * @param renderers - Mission renderers
 * @param container - Mission container element
 * @returns Current spectator state (may be newly created or existing)
 */
export function checkMidMissionDeath(
  cachedLocalPlayer: Entity | null,
  world: World,
  renderers: MissionRenderers,
  container: HTMLElement,
): SpectatorState | null {
  let spectator = getSpectatorState();

  // Already in spectator mode or no local player to check
  if (spectator?.isActive || cachedLocalPlayer === null) {
    return spectator;
  }

  // Check if local player died
  if (isEntityDead(world, cachedLocalPlayer)) {
    spectator = initSpectatorState(cachedLocalPlayer);
    setupSpectatorInput(spectator, world);
    initSpectatorRendering(renderers, container);
    logDebug(`[MISSION] Player died, entering spectator mode`);
  }

  return spectator;
}

/**
 * Get current spectator state for rendering.
 */
export { getSpectatorState };
