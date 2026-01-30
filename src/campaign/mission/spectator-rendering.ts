/**
 * Spectator Rendering - Camera and HUD updates for spectator mode.
 *
 * Extracted from mission-renderer.ts to stay under 400 line limit.
 */

import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import type { SpectatorState } from '../../multiplayer/spectator-state';
import { updateDustSystem } from '../../rendering/effects/dust';
import {
  createSpectatorHUD,
  disposeSpectatorHUD,
  updateSpectatorHUD,
} from '../../rendering/hud/spectator-hud';
import {
  findFriendlyEntities,
  nextEntity,
  setEntityList,
  updateCamera,
} from '../../ui/screens/replay/replay-camera';
import type { MissionRenderers } from './mission-renderer';

// =============================================================================
// Spectator Rendering
// =============================================================================

/**
 * Initialize spectator HUD for a mission renderer.
 * Call this when entering spectator mode.
 */
export function initSpectatorRendering(
  renderers: MissionRenderers,
  container: HTMLElement,
): void {
  if (!renderers.spectatorHud) {
    renderers.spectatorHud = createSpectatorHUD(container);
  }
  // Hide normal HUD in spectator mode
  renderers.hud.container.style.display = 'none';
}

/**
 * Update spectator rendering for a frame.
 * Handles spectator camera, entity tracking, and HUD.
 *
 * @param renderers - Mission renderers (must have spectatorHud initialized)
 * @param spectatorState - Current spectator state
 * @param world - Game world
 * @param dt - Delta time in seconds
 */
export function updateSpectatorRendering(
  renderers: MissionRenderers,
  spectatorState: SpectatorState,
  world: World,
  dt: number,
): void {
  const { cameraState, cameraInput } = spectatorState;
  const { renderer, dustSystem } = renderers;

  // Update entity list with living friendly ships
  const friendlyEntities = findFriendlyEntities(world);
  setEntityList(cameraState, friendlyEntities);

  // Auto-switch if followed entity died
  if (isEntityDead(world, cameraState.targetEntity)) {
    nextEntity(cameraState, world);
  }

  // Update spectator camera
  updateCamera(
    cameraState,
    renderer.camera,
    world,
    cameraInput,
    dt,
    renderer,
    false, // Don't auto-update entities (we do it above)
  );

  // Update dust system around camera position
  updateDustSystem(dustSystem, renderer.camera.position);

  // Update spectator HUD
  if (renderers.spectatorHud) {
    updateSpectatorHUD(renderers.spectatorHud, spectatorState, world);
  }
}

/**
 * Dispose spectator HUD if present and restore normal HUD visibility.
 */
export function disposeSpectatorRendering(renderers: MissionRenderers): void {
  if (renderers.spectatorHud) {
    disposeSpectatorHUD(renderers.spectatorHud);
    delete renderers.spectatorHud;
  }
  // Restore normal HUD visibility (was hidden in initSpectatorRendering)
  renderers.hud.container.style.display = '';
}

/**
 * Check if a player entity has died (for mid-mission spectator transition).
 */
export function isEntityDead(world: World, entity: Entity | null): boolean {
  if (entity === null) return true;
  const health = getComponent(world, entity, 'health');
  return !health || health.hull <= 0;
}
