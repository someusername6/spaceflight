/**
 * Mission Renderer - Creates and manages all rendering systems for a mission.
 *
 * Extracted from controller.ts to stay under 400 line limit.
 */

import type { Transform } from '../components/transform';
import { findEntity, getComponent } from '../core/ecs';
import type { World } from '../core/types';
import {
  createLightningRenderer,
  updateLightningRenderer,
} from '../rendering/beam-effects/lightning';
import {
  createNuclearLanceRenderer,
  updateNuclearLanceRenderer,
} from '../rendering/beam-effects/nuclear-lance';
import { createDustSystem, updateDustSystem } from '../rendering/effects/dust';
import {
  createExplosionRenderer,
  updateExplosionRenderer,
} from '../rendering/effects/explosions';
import {
  createMuzzleFlashRenderer,
  updateMuzzleFlashRenderer,
} from '../rendering/effects/muzzle-flash';
import {
  createProjectileHitRenderer,
  updateProjectileHitRenderer,
} from '../rendering/effects/projectile-hits';
import {
  createShieldEffectRenderer,
  updateShieldEffectRenderer,
} from '../rendering/effects/shield-effects';
import {
  createTrailRenderer,
  updateTrailRenderer,
} from '../rendering/effects/trails';
import { createHUD, updateHUD } from '../rendering/hud/hud';
import {
  createExhaustRenderer,
  updateExhaustRenderer,
} from '../rendering/missile-exhaust';
import {
  createRenderer,
  followEntity,
  getScene,
  render,
  syncScene,
} from '../rendering/renderer';

/** All rendering systems for a mission */
export interface MissionRenderers {
  renderer: ReturnType<typeof createRenderer>;
  dustSystem: ReturnType<typeof createDustSystem>;
  explosionRenderer: ReturnType<typeof createExplosionRenderer>;
  trailRenderer: ReturnType<typeof createTrailRenderer>;
  exhaustRenderer: ReturnType<typeof createExhaustRenderer>;
  shieldEffectRenderer: ReturnType<typeof createShieldEffectRenderer>;
  muzzleFlashRenderer: ReturnType<typeof createMuzzleFlashRenderer>;
  lightningRenderer: ReturnType<typeof createLightningRenderer>;
  nuclearLanceRenderer: ReturnType<typeof createNuclearLanceRenderer>;
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
    trailRenderer: createTrailRenderer(),
    exhaustRenderer: createExhaustRenderer(),
    shieldEffectRenderer: createShieldEffectRenderer(),
    muzzleFlashRenderer: createMuzzleFlashRenderer(),
    lightningRenderer: createLightningRenderer(scene),
    nuclearLanceRenderer: createNuclearLanceRenderer(scene),
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
): void {
  const { renderer } = renderers;
  const scene = getScene(renderer);

  syncScene(renderer, world);
  updateExplosionRenderer(renderers.explosionRenderer, scene, world);
  updateTrailRenderer(renderers.trailRenderer, scene, world);
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
  updateProjectileHitRenderer(renderers.projectileHitRenderer, scene, world);

  const player = findEntity(world, ['playerControlled', 'transform']);
  if (player !== undefined) {
    followEntity(renderer, world, player);
    const transform = getComponent<Transform>(world, player, 'transform');
    if (transform) {
      updateDustSystem(renderers.dustSystem, transform.position);
    }
  }

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
