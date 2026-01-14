/**
 * Mission Renderer - Creates and manages all rendering systems for a mission.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import type { Transform } from '../../components/transform';
import { findEntity, getComponent } from '../../core/ecs';
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

/** All rendering systems for a mission */
export interface MissionRenderers {
  renderer: ReturnType<typeof createRenderer>;
  dustSystem: ReturnType<typeof createDustSystem>;
  explosionRenderer: ReturnType<typeof createExplosionRenderer>;
  boltRenderer: ReturnType<typeof createBoltRenderer>;
  exhaustRenderer: ReturnType<typeof createExhaustRenderer>;
  shieldEffectRenderer: ReturnType<typeof createShieldEffectRenderer>;
  muzzleFlashRenderer: ReturnType<typeof createMuzzleFlashRenderer>;
  lightningRenderer: ReturnType<typeof createLightningRenderer>;
  nuclearLanceRenderer: ReturnType<typeof createNuclearLanceRenderer>;
  torchRenderer: ReturnType<typeof createTorchRenderer>;
  projectileHitRenderer: ReturnType<typeof createProjectileHitRenderer>;
  hud: ReturnType<typeof createHUD>;
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

/** Update all rendering systems for a frame */
export function updateMissionRenderers(
  renderers: MissionRenderers,
  world: World,
  containerWidth: number,
  containerHeight: number,
  alpha = 1,
): void {
  const { renderer } = renderers;
  const scene = getScene(renderer);

  syncScene(renderer, world, alpha);
  updateExplosionRenderer(renderers.explosionRenderer, scene, world);
  updateBoltRenderer(renderers.boltRenderer, scene, world);
  updateExhaustRenderer(
    renderers.exhaustRenderer,
    scene,
    world,
    world.systemState.gameTime,
  );
  updateShieldEffectRenderer(renderers.shieldEffectRenderer, scene, world);
  updateMuzzleFlashRenderer(renderers.muzzleFlashRenderer, scene, world);
  updateLightningRenderer(renderers.lightningRenderer, scene, world);
  updateNuclearLanceRenderer(renderers.nuclearLanceRenderer, scene, world);
  updateTorchRenderer(renderers.torchRenderer, scene, world);
  updateProjectileHitRenderer(renderers.projectileHitRenderer, scene, world);

  const player = findEntity(world, ['playerControlled', 'transform']);
  if (player !== undefined) {
    followEntity(renderer, world, player);
    const transform = getComponent<Transform>(world, player, 'transform');
    if (transform) {
      updateDustSystem(renderers.dustSystem, transform.position);
    }
  }

  // Render target camera (before main render to avoid render target issues)
  updateTargetCamera(
    renderers.hud.targetCamera,
    renderer.webglRenderer,
    scene,
    world,
    player,
  );

  render(renderer);
  updateHUD(
    renderers.hud,
    world,
    renderer.camera,
    renderer.entityMeshes,
    containerWidth,
    containerHeight,
  );
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

  // Dispose main renderer (handles WebGL context, beam lines, etc.)
  disposeRenderer(renderers.renderer);

  // Remove HUD elements from DOM
  if (renderers.hud.container.parentNode) {
    renderers.hud.container.parentNode.removeChild(renderers.hud.container);
  }
}
