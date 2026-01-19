/**
 * Shield Effects Rendering - Visual feedback when shields absorb damage.
 *
 * Renders brief blue/cyan flashes at impact locations when shields take hits.
 */

import * as THREE from 'three';
import {
  getActiveHits,
  SHIELD_HIT_DURATION,
} from '../../components/shield-hit';
import { getComponent, queryEntities } from '../../core/ecs';
import type { World } from '../../core/types';
import { TICK_SEC } from '../../game';

/** Shield hit flash color */
const SHIELD_COLOR = new THREE.Color(0.3, 0.7, 1.0); // Cyan-blue

/** Size of hit flash effect */
const HIT_FLASH_SIZE = 3;

// Reusable Set for tracking active effects
const activeEffects = new Set<string>();

/** Visual element for one shield hit */
interface ShieldHitVisual {
  mesh: THREE.Mesh;
  startTime: number;
}

/** Shield effects renderer state */
export interface ShieldEffectRenderer {
  effects: Map<string, ShieldHitVisual>; // Key: "entity-hitIndex"
  geometry: THREE.SphereGeometry;
}

/** Creates the shield effect renderer */
export function createShieldEffectRenderer(): ShieldEffectRenderer {
  // Shared geometry for all hit flashes
  const geometry = new THREE.SphereGeometry(HIT_FLASH_SIZE, 16, 12);

  return {
    effects: new Map(),
    geometry,
  };
}

/** Creates a hit flash mesh */
function createHitFlash(
  renderer: ShieldEffectRenderer,
  scene: THREE.Scene,
  position: THREE.Vector3,
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    color: SHIELD_COLOR,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(renderer.geometry.clone(), material);
  mesh.position.copy(position);
  scene.add(mesh);

  return mesh;
}

/** Updates shield effect visuals */
export function updateShieldEffectRenderer(
  renderer: ShieldEffectRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
): void {
  // Calculate interpolated gameTime for smooth animation
  const gameTime = world.systemState.gameTime - TICK_SEC * (1 - alpha);
  activeEffects.clear();

  // Find all entities with shield hit tracking
  for (const entity of queryEntities(world, ['shieldHit'])) {
    const shieldHit = getComponent(world, entity, 'shieldHit');
    if (!shieldHit) continue;

    const hits = getActiveHits(shieldHit, gameTime);

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (!hit) continue;

      const key = `${entity}-${hit.time.toFixed(3)}`;
      activeEffects.add(key);

      let visual = renderer.effects.get(key);

      if (!visual) {
        // Create new effect
        visual = {
          mesh: createHitFlash(renderer, scene, hit.position),
          startTime: hit.time,
        };
        renderer.effects.set(key, visual);
      }

      // Update effect based on age
      const age = gameTime - hit.time;
      const progress = age / SHIELD_HIT_DURATION;

      // Fade out and expand
      const scale = 1 + progress * 2;
      visual.mesh.scale.setScalar(scale * hit.intensity);

      const opacity = Math.max(0, 0.8 * (1 - progress));
      (visual.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      // Position follows hit point (already set at creation)
      visual.mesh.position.copy(hit.position);
    }
  }

  // Remove expired effects
  for (const [key, visual] of renderer.effects) {
    if (!activeEffects.has(key)) {
      scene.remove(visual.mesh);
      visual.mesh.geometry.dispose();
      (visual.mesh.material as THREE.Material).dispose();
      renderer.effects.delete(key);
    }
  }
}

/**
 * Reset shield effect renderer state (for replay seeking).
 * Removes active visuals without disposing shared geometry.
 */
export function resetShieldEffectRenderer(
  renderer: ShieldEffectRenderer,
  scene: THREE.Scene,
): void {
  for (const visual of renderer.effects.values()) {
    scene.remove(visual.mesh);
    visual.mesh.geometry.dispose();
    (visual.mesh.material as THREE.Material).dispose();
  }
  renderer.effects.clear();
  // activeEffects is cleared each frame in update, no need to clear here
}

/** Disposes of shield effect renderer resources */
export function disposeShieldEffectRenderer(
  renderer: ShieldEffectRenderer,
  scene: THREE.Scene,
): void {
  for (const visual of renderer.effects.values()) {
    scene.remove(visual.mesh);
    visual.mesh.geometry.dispose();
    (visual.mesh.material as THREE.Material).dispose();
  }
  renderer.effects.clear();
  renderer.geometry.dispose();
}
