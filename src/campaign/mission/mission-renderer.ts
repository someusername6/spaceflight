/**
 * Mission Renderer - Creates and manages all rendering systems for a mission.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import type * as THREE from 'three';
import { getComponent } from '../../core/ecs';
import { findLocalPlayer } from '../../core/player-utils';
import type { World } from '../../core/types';
import {
  createLightningRenderer,
  resetLightningRenderer,
  updateLightningRenderer,
} from '../../rendering/beam-effects/lightning';
import {
  createNuclearLanceRenderer,
  resetNuclearLanceRenderer,
  updateNuclearLanceRenderer,
} from '../../rendering/beam-effects/nuclear-lance';
import {
  createTorchRenderer,
  resetTorchRenderer,
  updateTorchRenderer,
} from '../../rendering/beam-effects/torch';
import {
  createDustSystem,
  updateDustSystem,
} from '../../rendering/effects/dust';
import {
  createExplosionRenderer,
  resetExplosionRenderer,
  updateExplosionRenderer,
} from '../../rendering/effects/explosions';
import {
  createJumpEffectRenderer,
  disposeJumpEffectRenderer,
  resetJumpEffectRenderer,
  updateJumpEffectRenderer,
} from '../../rendering/effects/jump-effect';
import {
  createMuzzleFlashRenderer,
  resetMuzzleFlashRenderer,
  updateMuzzleFlashRenderer,
} from '../../rendering/effects/muzzle-flash';
import {
  createProjectileHitRenderer,
  resetProjectileHitRenderer,
  updateProjectileHitRenderer,
} from '../../rendering/effects/projectile-hits';
import {
  createShieldEffectRenderer,
  resetShieldEffectRenderer,
  updateShieldEffectRenderer,
} from '../../rendering/effects/shield-effects';
import {
  createBoltRenderer,
  disposeBoltRenderer,
  resetBoltRenderer,
  updateBoltRenderer,
} from '../../rendering/effects/trails';
import { createHUD, updateHUD } from '../../rendering/hud/hud';
import type { SpectatorHUD } from '../../rendering/hud/spectator-hud';
import { updateTargetCamera } from '../../rendering/hud/target-camera';
import {
  createExhaustRenderer,
  resetExhaustRenderer,
  updateExhaustRenderer,
} from '../../rendering/missile-exhaust';
import {
  createRenderer,
  disposeRenderer,
  followEntity,
  getScene,
  render,
  syncScene,
} from '../../rendering/renderer';

// Import spectator functions (disposeSpectatorRendering used locally)
import {
  disposeSpectatorRendering,
  initSpectatorRendering,
  isEntityDead,
  updateSpectatorRendering,
} from './spectator-rendering';

// Re-export spectator functions for external use
export {
  disposeSpectatorRendering,
  initSpectatorRendering,
  isEntityDead,
  updateSpectatorRendering,
};

/** All rendering systems for a mission */
export interface MissionRenderers {
  renderer: ReturnType<typeof createRenderer>;
  dustSystem: ReturnType<typeof createDustSystem>;
  explosionRenderer: ReturnType<typeof createExplosionRenderer>;
  jumpEffectRenderer: ReturnType<typeof createJumpEffectRenderer>;
  boltRenderer: ReturnType<typeof createBoltRenderer>;
  exhaustRenderer: ReturnType<typeof createExhaustRenderer>;
  shieldEffectRenderer: ReturnType<typeof createShieldEffectRenderer>;
  muzzleFlashRenderer: ReturnType<typeof createMuzzleFlashRenderer>;
  lightningRenderer: ReturnType<typeof createLightningRenderer>;
  nuclearLanceRenderer: ReturnType<typeof createNuclearLanceRenderer>;
  torchRenderer: ReturnType<typeof createTorchRenderer>;
  projectileHitRenderer: ReturnType<typeof createProjectileHitRenderer>;
  hud: ReturnType<typeof createHUD>;
  /** Spectator HUD (created on demand when spectator mode starts) */
  spectatorHud?: SpectatorHUD;
}

/** Create all rendering systems for a mission */
export function createMissionRenderers(
  container: HTMLElement,
  seed: number,
): MissionRenderers {
  const renderer = createRenderer(container, seed);
  const scene = getScene(renderer);

  return {
    renderer,
    dustSystem: createDustSystem(scene),
    explosionRenderer: createExplosionRenderer(),
    jumpEffectRenderer: createJumpEffectRenderer(),
    boltRenderer: createBoltRenderer(),
    exhaustRenderer: createExhaustRenderer(),
    shieldEffectRenderer: createShieldEffectRenderer(),
    muzzleFlashRenderer: createMuzzleFlashRenderer(),
    lightningRenderer: createLightningRenderer(scene),
    nuclearLanceRenderer: createNuclearLanceRenderer(scene),
    torchRenderer: createTorchRenderer(),
    projectileHitRenderer: createProjectileHitRenderer(),
    hud: createHUD(container),
  };
}

/** Options for updateMissionRenderers */
export interface UpdateMissionRenderersOptions {
  /** Skip default camera follow and render (for replay viewer with custom camera) */
  skipCameraAndRender?: boolean;
  /** Custom position for dust system center (defaults to player position) */
  dustCenterPosition?: THREE.Vector3;
}

/** Update all rendering systems for a frame */
export function updateMissionRenderers(
  renderers: MissionRenderers,
  world: World,
  containerWidth: number,
  containerHeight: number,
  dt: number,
  alpha = 1,
  options?: UpdateMissionRenderersOptions,
): void {
  const { renderer } = renderers;
  const scene = getScene(renderer);

  syncScene(renderer, world, alpha);
  updateExplosionRenderer(
    renderers.explosionRenderer,
    scene,
    world,
    alpha,
    renderer,
  );
  updateJumpEffectRenderer(
    renderers.jumpEffectRenderer,
    scene,
    world,
    renderer.entityMeshes,
    alpha,
    renderer,
  );
  updateBoltRenderer(renderers.boltRenderer, scene, world, alpha);
  updateExhaustRenderer(
    renderers.exhaustRenderer,
    scene,
    world,
    world.systemState.gameTime,
    alpha,
    renderer,
  );
  updateShieldEffectRenderer(
    renderers.shieldEffectRenderer,
    scene,
    world,
    alpha,
  );
  updateMuzzleFlashRenderer(
    renderers.muzzleFlashRenderer,
    scene,
    world,
    alpha,
    renderer,
  );
  updateLightningRenderer(
    renderers.lightningRenderer,
    scene,
    world,
    alpha,
    renderer,
  );
  updateNuclearLanceRenderer(
    renderers.nuclearLanceRenderer,
    scene,
    world,
    alpha,
  );
  updateTorchRenderer(renderers.torchRenderer, scene, world, alpha, renderer);
  updateProjectileHitRenderer(
    renderers.projectileHitRenderer,
    scene,
    world,
    alpha,
  );

  const player = findLocalPlayer(world);

  // Update dust system based on custom position or player position
  if (options?.dustCenterPosition) {
    updateDustSystem(renderers.dustSystem, options.dustCenterPosition);
  } else if (player !== null) {
    const transform = getComponent(world, player, 'transform');
    if (transform) {
      updateDustSystem(renderers.dustSystem, transform.position);
    }
  }

  // Skip camera follow and render if caller wants to handle these
  if (options?.skipCameraAndRender) {
    return;
  }

  // Default behavior: follow player and render
  if (player !== null) {
    followEntity(renderer, world, player);
  }

  // Render target camera (before main render to avoid render target issues)
  updateTargetCamera(
    renderers.hud.targetCamera,
    renderer.webglRenderer,
    scene,
    world,
    player ?? undefined,
    renderer,
  );

  render(renderer);
  updateHUD(
    renderers.hud,
    world,
    renderer.camera,
    renderer,
    containerWidth,
    containerHeight,
    dt,
  );
}

/** Options for renderMissionFrame */
export interface RenderMissionFrameOptions {
  /** Skip HUD rendering (for spectator mode viewing non-player ships) */
  skipHUD?: boolean;
}

/**
 * Complete rendering after custom camera update.
 * Call this after updateMissionRenderers with skipCameraAndRender=true
 * and after setting your own camera position.
 */
export function renderMissionFrame(
  renderers: MissionRenderers,
  world: World,
  containerWidth: number,
  containerHeight: number,
  dt: number,
  options?: RenderMissionFrameOptions,
): void {
  const { renderer } = renderers;
  const scene = getScene(renderer);
  const player = findLocalPlayer(world);

  // Render target camera (before main render to avoid render target issues)
  updateTargetCamera(
    renderers.hud.targetCamera,
    renderer.webglRenderer,
    scene,
    world,
    player ?? undefined,
    renderer,
  );

  render(renderer);

  // Skip HUD in spectator mode (viewing non-player ships)
  if (options?.skipHUD) {
    // Hide the HUD when viewing non-player ships
    renderers.hud.container.style.display = 'none';
  } else {
    // Show and update the HUD when viewing player
    renderers.hud.container.style.display = '';
    updateHUD(
      renderers.hud,
      world,
      renderer.camera,
      renderer,
      containerWidth,
      containerHeight,
      dt,
    );
  }
}

/**
 * Reset all renderer state for replay seeking.
 * Clears active visuals and tracking state without full disposal.
 * Call this before reinitializing the world during seeking.
 */
export function resetMissionRenderers(renderers: MissionRenderers): void {
  const scene = getScene(renderers.renderer);

  // Reset all effect renderers
  resetMuzzleFlashRenderer(renderers.muzzleFlashRenderer, scene);
  resetBoltRenderer(renderers.boltRenderer);
  resetExplosionRenderer(renderers.explosionRenderer);
  resetJumpEffectRenderer(renderers.jumpEffectRenderer);
  resetExhaustRenderer(renderers.exhaustRenderer, scene);
  resetShieldEffectRenderer(renderers.shieldEffectRenderer, scene);
  resetProjectileHitRenderer(renderers.projectileHitRenderer, scene);
  resetLightningRenderer(renderers.lightningRenderer, scene);
  resetNuclearLanceRenderer(renderers.nuclearLanceRenderer, scene);
  resetTorchRenderer(renderers.torchRenderer, scene);
}

/** Dispose all rendering resources */
export function disposeMissionRenderers(renderers: MissionRenderers): void {
  const scene = getScene(renderers.renderer);

  // Dispose bolt renderer (shared geometries and pooled bolts)
  disposeBoltRenderer(renderers.boltRenderer, scene);

  // Dispose jump effect renderer (cached geometries)
  disposeJumpEffectRenderer(renderers.jumpEffectRenderer, scene);

  // Dispose main renderer (handles WebGL context, beam lines, etc.)
  disposeRenderer(renderers.renderer);

  // Remove HUD elements from DOM
  if (renderers.hud.container.parentNode) {
    renderers.hud.container.parentNode.removeChild(renderers.hud.container);
  }

  // Dispose spectator HUD and restore normal HUD visibility
  disposeSpectatorRendering(renderers);
}
