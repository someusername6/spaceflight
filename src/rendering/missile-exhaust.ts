/**
 * Missile Exhaust Rendering - Flame/glow effect behind missiles.
 *
 * Each missile gets a glowing cone pointing backward that flickers
 * slightly to simulate thrust flames.
 */

import * as THREE from 'three';
import { getComponent, queryEntities } from '../core/ecs';
import { random } from '../core/prng';
import type { Entity, World } from '../core/types';
import { TICK_SEC } from '../game';
import {
  getInterpolatedPosition,
  getInterpolatedRotation,
  type Renderer,
} from './renderer';

/** Exhaust colors - orange/yellow flame */
const EXHAUST_CORE_COLOR = new THREE.Color(1.0, 0.6, 0.1); // Orange-yellow
const EXHAUST_OUTER_COLOR = new THREE.Color(1.0, 0.3, 0.0); // Deep orange

/** Exhaust size relative to missile */
const EXHAUST_LENGTH = 2.5;
const EXHAUST_RADIUS = 0.4;

// Reusable Set for tracking seen missiles
const seenMissiles = new Set<Entity>();

// Reusable vector for exhaust positioning
const exhaustOffset = new THREE.Vector3();

/** Exhaust visual for one missile */
interface MissileExhaust {
  cone: THREE.Mesh;
  glow: THREE.PointLight;
  flickerPhase: number; // For randomized flicker
}

/** Exhaust renderer state */
export interface ExhaustRenderer {
  exhausts: Map<Entity, MissileExhaust>;
  coneGeometry: THREE.ConeGeometry;
}

/** Creates the exhaust renderer */
export function createExhaustRenderer(): ExhaustRenderer {
  // Shared cone geometry (reused for all missiles)
  const coneGeometry = new THREE.ConeGeometry(
    EXHAUST_RADIUS,
    EXHAUST_LENGTH,
    8,
  );
  // Rotate so cone points in +Z (opposite of missile's -Z forward)
  coneGeometry.rotateX(-Math.PI / 2);
  // Move origin to base of cone (where it attaches to missile)
  coneGeometry.translate(0, 0, EXHAUST_LENGTH / 2);

  return {
    exhausts: new Map(),
    coneGeometry,
  };
}

/** Creates an exhaust visual for a missile */
function createExhaust(
  renderer: ExhaustRenderer,
  scene: THREE.Scene,
  world: World,
): MissileExhaust {
  // Exhaust cone (additive blending for glow)
  const material = new THREE.MeshBasicMaterial({
    color: EXHAUST_CORE_COLOR,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const cone = new THREE.Mesh(renderer.coneGeometry, material);
  scene.add(cone);

  // Point light for local illumination
  const glow = new THREE.PointLight(EXHAUST_OUTER_COLOR, 0.5, 10);
  scene.add(glow);

  return {
    cone,
    glow,
    flickerPhase: random(world.renderPrng) * Math.PI * 2, // Random start phase (uses renderPrng to not affect simulation)
  };
}

/** Updates exhaust visuals with interpolation */
export function updateExhaustRenderer(
  exhaustRenderer: ExhaustRenderer,
  scene: THREE.Scene,
  world: World,
  gameTime: number,
  alpha = 1,
  renderer?: Renderer,
): void {
  // Calculate interpolated gameTime for smooth flicker animation
  const interpolatedGameTime = gameTime - TICK_SEC * (1 - alpha);
  seenMissiles.clear();

  // Update or create exhausts for missiles
  for (const entity of queryEntities(world, ['missile', 'transform'])) {
    seenMissiles.add(entity);

    const missile = getComponent(world, entity, 'missile');
    const transform = getComponent(world, entity, 'transform');
    if (!missile || !transform) continue;

    let exhaust = exhaustRenderer.exhausts.get(entity);

    if (!exhaust) {
      exhaust = createExhaust(exhaustRenderer, scene, world);
      exhaustRenderer.exhausts.set(entity, exhaust);
    }

    // Use interpolated position/rotation from syncScene (falls back to current if not available)
    const interpPos = renderer
      ? getInterpolatedPosition(renderer, entity)
      : null;
    const interpRot = renderer
      ? getInterpolatedRotation(renderer, entity)
      : null;
    const usePos = interpPos ?? transform.position;
    const useRot = interpRot ?? transform.rotation;

    // Position exhaust behind missile
    exhaustOffset.copy(missile.direction).multiplyScalar(-1.5); // Behind missile
    exhaust.cone.position.copy(usePos).add(exhaustOffset);
    exhaust.cone.quaternion.copy(useRot);

    // Position glow light
    exhaust.glow.position.copy(exhaust.cone.position);

    // Flicker effect - varies intensity based on time
    const flicker =
      0.7 +
      0.3 *
        Math.sin(interpolatedGameTime * 30 + exhaust.flickerPhase) *
        Math.sin(interpolatedGameTime * 47 + exhaust.flickerPhase * 1.3);

    (exhaust.cone.material as THREE.MeshBasicMaterial).opacity =
      0.6 + 0.4 * flicker;
    exhaust.glow.intensity = 0.3 + 0.4 * flicker;

    // Slight scale variation for more dynamic feel
    const scaleFlicker = 0.9 + 0.2 * flicker;
    exhaust.cone.scale.set(scaleFlicker, scaleFlicker, scaleFlicker);
  }

  // Remove exhausts for missiles that no longer exist
  for (const [entity, exhaust] of exhaustRenderer.exhausts) {
    if (!seenMissiles.has(entity)) {
      scene.remove(exhaust.cone);
      scene.remove(exhaust.glow);
      (exhaust.cone.material as THREE.Material).dispose();
      exhaustRenderer.exhausts.delete(entity);
    }
  }
}

/**
 * Reset exhaust renderer state (for replay seeking).
 * Removes active visuals without disposing shared geometry.
 */
export function resetExhaustRenderer(
  renderer: ExhaustRenderer,
  scene: THREE.Scene,
): void {
  for (const exhaust of renderer.exhausts.values()) {
    scene.remove(exhaust.cone);
    scene.remove(exhaust.glow);
    (exhaust.cone.material as THREE.Material).dispose();
  }
  renderer.exhausts.clear();

  // Clear tracking state
  seenMissiles.clear();
}
