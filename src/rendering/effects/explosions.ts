/**
 * Explosion Rendering - Visual effects for explosions.
 */

import * as THREE from 'three';
import type { Explosion } from '../../components/explosion';
import { getExplosionProgress } from '../../components/explosion';
import type { Transform } from '../../components/transform';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
  createExplosionVisual,
  disposeExplosionVisual,
  type ExplosionVisual,
  hideExplosionVisual,
  reinitializeExplosionVisual,
  updateExplosionVisual,
} from './explosion-visual';

const seenExplosions = new Set<Entity>();

export interface ExplosionRenderer {
  visuals: Map<Entity, ExplosionVisual>;
  sphereGeometry: THREE.SphereGeometry;
  nukeRingGeometry: THREE.TorusGeometry;
  /** Pool of inactive standard explosion visuals (for reuse) */
  standardPool: ExplosionVisual[];
  /** Pool of inactive nuke explosion visuals (for reuse) */
  nukePool: ExplosionVisual[];
  /** Scene reference for pool management */
  scene: THREE.Scene | null;
}

/** Creates the explosion renderer */
export function createExplosionRenderer(): ExplosionRenderer {
  // Shared sphere geometry (cloned per explosion)
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  // Nuke shockwave ring geometry (torus)
  const nukeRingGeometry = new THREE.TorusGeometry(1, 0.1, 8, 32);

  return {
    visuals: new Map(),
    sphereGeometry,
    nukeRingGeometry,
    standardPool: [],
    nukePool: [],
    scene: null,
  };
}

/** Acquire an explosion visual from pool or create new */
function acquireExplosionVisual(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
  entity: Entity,
  explosion: Explosion,
  position: THREE.Vector3,
): ExplosionVisual {
  // Store scene reference
  renderer.scene = scene;

  const isNuke = explosion.variant === 'nuke';
  const pool = isNuke ? renderer.nukePool : renderer.standardPool;

  // Try to get from pool
  const pooled = pool.pop();
  if (pooled) {
    reinitializeExplosionVisual(pooled, entity, explosion, position);
    return pooled;
  }

  // Create new if pool is empty
  return createExplosionVisual(
    renderer.sphereGeometry,
    renderer.nukeRingGeometry,
    scene,
    entity,
    explosion,
    position,
  );
}

/** Release an explosion visual back to pool */
function releaseExplosionVisual(
  renderer: ExplosionRenderer,
  visual: ExplosionVisual,
): void {
  hideExplosionVisual(visual);
  const pool = visual.isNuke ? renderer.nukePool : renderer.standardPool;
  pool.push(visual);
}

/** Updates explosion visuals */
export function updateExplosionRenderer(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  // Clear reusable Set (avoid per-frame allocations)
  seenExplosions.clear();

  // Update or create visuals for explosion entities
  for (const entity of queryEntities(world, ['explosion', 'transform'])) {
    seenExplosions.add(entity);

    // Query guarantees these components exist
    const explosion = getComponent<Explosion>(
      world,
      entity,
      'explosion',
    ) as Explosion;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const progress = getExplosionProgress(explosion);

    let visual = renderer.visuals.get(entity);

    if (!visual) {
      // Acquire from pool or create new
      visual = acquireExplosionVisual(
        renderer,
        scene,
        entity,
        explosion,
        transform.position,
      );
      renderer.visuals.set(entity, visual);
    }

    // Update visual based on progress
    updateExplosionVisual(visual, transform.position, explosion, progress);
  }

  // Release visuals for explosions that no longer exist (return to pool)
  for (const [entity, visual] of renderer.visuals) {
    if (!seenExplosions.has(entity)) {
      releaseExplosionVisual(renderer, visual);
      renderer.visuals.delete(entity);
    }
  }
}

/**
 * Reset explosion renderer state (for replay seeking).
 * Returns active visuals to pool without disposing shared resources.
 */
export function resetExplosionRenderer(renderer: ExplosionRenderer): void {
  // Return active visuals to pool
  for (const visual of renderer.visuals.values()) {
    releaseExplosionVisual(renderer, visual);
  }
  renderer.visuals.clear();

  // Clear tracking state
  seenExplosions.clear();
}

/** Disposes of explosion renderer resources */
export function disposeExplosionRenderer(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
): void {
  // Dispose active visuals
  for (const visual of renderer.visuals.values()) {
    disposeExplosionVisual(visual, scene);
  }
  renderer.visuals.clear();

  // Dispose pooled standard visuals
  for (const visual of renderer.standardPool) {
    disposeExplosionVisual(visual, scene);
  }
  renderer.standardPool.length = 0;

  // Dispose pooled nuke visuals
  for (const visual of renderer.nukePool) {
    disposeExplosionVisual(visual, scene);
  }
  renderer.nukePool.length = 0;

  // Dispose shared geometries
  renderer.sphereGeometry.dispose();
  renderer.nukeRingGeometry.dispose();
  renderer.scene = null;

  // Clear tracking state
  seenExplosions.clear();
}
