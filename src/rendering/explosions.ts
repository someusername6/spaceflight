/**
 * Explosion Rendering - Visual effects for explosions.
 */

import * as THREE from 'three';
import type { Explosion } from '../components/explosion';
import { getExplosionProgress } from '../components/explosion';
import type { Transform } from '../components/transform';
import { getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
  createExplosionVisual,
  disposeExplosionVisual,
  type ExplosionVisual,
  updateExplosionVisual,
} from './explosion-visual';

const seenExplosions = new Set<Entity>();

export interface ExplosionRenderer {
  visuals: Map<Entity, ExplosionVisual>;
  sphereGeometry: THREE.SphereGeometry;
  nukeRingGeometry: THREE.TorusGeometry;
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
  };
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
      // Create new visual
      visual = createExplosionVisual(
        renderer.sphereGeometry,
        renderer.nukeRingGeometry,
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

  // Remove visuals for explosions that no longer exist
  for (const [entity, visual] of renderer.visuals) {
    if (!seenExplosions.has(entity)) {
      disposeExplosionVisual(visual, scene);
      renderer.visuals.delete(entity);
    }
  }
}

/** Disposes of explosion renderer resources */
export function disposeExplosionRenderer(
  renderer: ExplosionRenderer,
  scene: THREE.Scene,
): void {
  for (const visual of renderer.visuals.values()) {
    disposeExplosionVisual(visual, scene);
  }
  renderer.visuals.clear();
  renderer.sphereGeometry.dispose();
  renderer.nukeRingGeometry.dispose();
}
