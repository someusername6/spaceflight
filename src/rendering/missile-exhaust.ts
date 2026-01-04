/**
 * Missile Exhaust Rendering - Flame/glow effect behind missiles.
 *
 * Each missile gets a glowing cone pointing backward that flickers
 * slightly to simulate thrust flames.
 */

import * as THREE from 'three';
import type { Missile } from '../components/missile';
import type { Transform } from '../components/transform';
import { getComponent, queryEntities } from '../core/ecs';
import { random } from '../core/prng';
import type { Entity, World } from '../core/types';

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

  const cone = new THREE.Mesh(renderer.coneGeometry.clone(), material);
  scene.add(cone);

  // Point light for local illumination
  const glow = new THREE.PointLight(EXHAUST_OUTER_COLOR, 0.5, 10);
  scene.add(glow);

  return {
    cone,
    glow,
    flickerPhase: random(world.prng) * Math.PI * 2, // Deterministic random start phase
  };
}

/** Updates exhaust visuals */
export function updateExhaustRenderer(
  renderer: ExhaustRenderer,
  scene: THREE.Scene,
  world: World,
  gameTime: number,
): void {
  seenMissiles.clear();

  // Update or create exhausts for missiles
  for (const entity of queryEntities(world, ['missile', 'transform'])) {
    seenMissiles.add(entity);

    const missile = getComponent<Missile>(world, entity, 'missile') as Missile;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    let exhaust = renderer.exhausts.get(entity);

    if (!exhaust) {
      exhaust = createExhaust(renderer, scene, world);
      renderer.exhausts.set(entity, exhaust);
    }

    // Position exhaust behind missile
    exhaustOffset.copy(missile.direction).multiplyScalar(-1.5); // Behind missile
    exhaust.cone.position.copy(transform.position).add(exhaustOffset);
    exhaust.cone.quaternion.copy(transform.rotation);

    // Position glow light
    exhaust.glow.position.copy(exhaust.cone.position);

    // Flicker effect - varies intensity based on time
    const flicker =
      0.7 +
      0.3 *
        Math.sin(gameTime * 30 + exhaust.flickerPhase) *
        Math.sin(gameTime * 47 + exhaust.flickerPhase * 1.3);

    (exhaust.cone.material as THREE.MeshBasicMaterial).opacity =
      0.6 + 0.4 * flicker;
    exhaust.glow.intensity = 0.3 + 0.4 * flicker;

    // Slight scale variation for more dynamic feel
    const scaleFlicker = 0.9 + 0.2 * flicker;
    exhaust.cone.scale.set(scaleFlicker, scaleFlicker, scaleFlicker);
  }

  // Remove exhausts for missiles that no longer exist
  for (const [entity, exhaust] of renderer.exhausts) {
    if (!seenMissiles.has(entity)) {
      scene.remove(exhaust.cone);
      scene.remove(exhaust.glow);
      exhaust.cone.geometry.dispose();
      (exhaust.cone.material as THREE.Material).dispose();
      renderer.exhausts.delete(entity);
    }
  }
}

/** Disposes of exhaust renderer resources */
export function disposeExhaustRenderer(
  renderer: ExhaustRenderer,
  scene: THREE.Scene,
): void {
  for (const exhaust of renderer.exhausts.values()) {
    scene.remove(exhaust.cone);
    scene.remove(exhaust.glow);
    exhaust.cone.geometry.dispose();
    (exhaust.cone.material as THREE.Material).dispose();
  }
  renderer.exhausts.clear();
  renderer.coneGeometry.dispose();
}
