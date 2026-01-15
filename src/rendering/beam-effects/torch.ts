/**
 * Torch Beam Rendering - Plasma cutting torch with tapered cone visual.
 *
 * A short-range beam weapon that appears as a tapered cone of plasma,
 * wider at the source and narrowing to a bright cutting point.
 * Orange-white coloring with subtle flicker effect.
 */

import * as THREE from 'three';
import type { Transform } from '../../components/transform';
import { getComponent } from '../../core/ecs';
import type { ActiveBeam, World } from '../../core/types';
import { TICK_SEC } from '../../game';
import { getInterpolatedPosition } from '../renderer';

/** Torch visual parameters */
const TORCH_BASE_WIDTH = 1.5; // Width at emitter
const TORCH_TIP_WIDTH = 0.3; // Width at target
const TORCH_SEGMENTS = 8; // Cone segments
const TORCH_FLICKER_SPEED = 15; // Flicker frequency
const TORCH_FLICKER_AMOUNT = 0.15; // Flicker intensity (0-1)

/** Torch colors */
const TORCH_CORE_COLOR = new THREE.Color(1.0, 0.95, 0.85); // White-hot core
const TORCH_OUTER_COLOR = new THREE.Color(1.0, 0.5, 0.1); // Orange outer

/** Torch renderer state */
export interface TorchRenderer {
  cones: Map<string, THREE.Mesh>;
  coreMaterial: THREE.MeshBasicMaterial;
  outerMaterial: THREE.MeshBasicMaterial;
}

/** Create torch renderer */
export function createTorchRenderer(): TorchRenderer {
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: TORCH_CORE_COLOR,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const outerMaterial = new THREE.MeshBasicMaterial({
    color: TORCH_OUTER_COLOR,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return {
    cones: new Map(),
    coreMaterial,
    outerMaterial,
  };
}

// Reusable vectors
const direction = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const interpOrigin = new THREE.Vector3();
const interpHitPoint = new THREE.Vector3();

/** Update torch rendering with interpolation */
export function updateTorchRenderer(
  renderer: TorchRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
): void {
  // Calculate interpolated gameTime for smooth flicker animation
  const gameTime = world.systemState.gameTime - TICK_SEC * (1 - alpha);
  const activeBeams = world.systemState.beams.activeBeams;
  const seenTorches = new Set<string>();

  // Process all torch beams
  for (const [entity, beams] of activeBeams) {
    // Get entity's current and interpolated positions for offset calculation
    const transform = getComponent<Transform>(world, entity, 'transform');
    const interpEntityPos = getInterpolatedPosition(entity);
    const entityPos = transform?.position;

    for (const beam of beams) {
      if (!beam.isTorch) continue;
      if (!beam.hitPoint) continue;

      // Skip fading beams
      if (beam.fadeStartTime !== null) continue;
      if (!beam.active) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenTorches.add(key);

      let cone = renderer.cones.get(key);
      if (!cone) {
        cone = createTorchCone(renderer);
        scene.add(cone);
        renderer.cones.set(key, cone);
      }

      // Calculate interpolated positions
      if (interpEntityPos && entityPos) {
        // Apply offset: interpPos = beamPos + (interpEntityPos - entityPos)
        interpOrigin.copy(beam.origin).add(interpEntityPos).sub(entityPos);
        interpHitPoint.copy(beam.hitPoint).add(interpEntityPos).sub(entityPos);
        updateTorchConeInterpolated(
          cone,
          interpOrigin,
          interpHitPoint,
          gameTime,
        );
      } else {
        updateTorchCone(cone, beam, gameTime);
      }
    }
  }

  // Clean up old torches
  for (const [key, cone] of renderer.cones) {
    if (!seenTorches.has(key)) {
      scene.remove(cone);
      cone.geometry.dispose();
      (cone.material as THREE.Material).dispose();
      renderer.cones.delete(key);
    }
  }
}

/** Create a torch cone mesh */
function createTorchCone(renderer: TorchRenderer): THREE.Mesh {
  // Create tapered cylinder geometry (cone-like)
  const geometry = new THREE.CylinderGeometry(
    TORCH_TIP_WIDTH, // Top radius (at target)
    TORCH_BASE_WIDTH, // Bottom radius (at emitter)
    1, // Height (will be scaled)
    TORCH_SEGMENTS,
    1,
    true, // Open-ended
  );

  // Rotate so it points along +Z axis
  geometry.rotateX(Math.PI / 2);

  const mesh = new THREE.Mesh(geometry, renderer.outerMaterial.clone());
  return mesh;
}

/** Update torch cone position and appearance */
function updateTorchCone(
  cone: THREE.Mesh,
  beam: ActiveBeam,
  gameTime: number,
): void {
  // Calculate beam direction and length
  direction
    .copy(beam.hitPoint as THREE.Vector3)
    .sub(beam.origin as THREE.Vector3);
  const length = direction.length();
  direction.normalize();

  // Position at midpoint between origin and hitPoint
  cone.position
    .copy(beam.origin as THREE.Vector3)
    .addScaledVector(direction, length / 2);

  // Orient toward target
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  cone.quaternion.copy(quaternion);

  // Scale to beam length
  cone.scale.set(1, 1, length);

  // Apply flicker effect
  applyTorchFlicker(cone, gameTime);
}

/** Update torch cone with interpolated positions */
function updateTorchConeInterpolated(
  cone: THREE.Mesh,
  origin: THREE.Vector3,
  hitPoint: THREE.Vector3,
  gameTime: number,
): void {
  // Calculate beam direction and length
  direction.copy(hitPoint).sub(origin);
  const length = direction.length();
  direction.normalize();

  // Position at midpoint between origin and hitPoint
  cone.position.copy(origin).addScaledVector(direction, length / 2);

  // Orient toward target
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  cone.quaternion.copy(quaternion);

  // Scale to beam length
  cone.scale.set(1, 1, length);

  // Apply flicker effect
  applyTorchFlicker(cone, gameTime);
}

/** Apply flicker effect to torch cone */
function applyTorchFlicker(cone: THREE.Mesh, gameTime: number): void {
  const flicker =
    1 - TORCH_FLICKER_AMOUNT * Math.sin(gameTime * TORCH_FLICKER_SPEED);
  const material = cone.material as THREE.MeshBasicMaterial;
  material.opacity = 0.6 * flicker;

  // Slight color shift with flicker
  material.color.setRGB(
    1.0,
    0.5 + 0.1 * Math.sin(gameTime * TORCH_FLICKER_SPEED * 0.7),
    0.1 + 0.05 * Math.sin(gameTime * TORCH_FLICKER_SPEED * 1.3),
  );
}

/**
 * Reset torch renderer state (for replay seeking).
 * Removes active visuals without disposing shared materials.
 */
export function resetTorchRenderer(
  renderer: TorchRenderer,
  scene: THREE.Scene,
): void {
  for (const cone of renderer.cones.values()) {
    scene.remove(cone);
    cone.geometry.dispose();
    (cone.material as THREE.Material).dispose();
  }
  renderer.cones.clear();
}

/** Dispose of torch renderer resources */
export function disposeTorchRenderer(
  renderer: TorchRenderer,
  scene: THREE.Scene,
): void {
  resetTorchRenderer(renderer, scene);
  renderer.coreMaterial.dispose();
  renderer.outerMaterial.dispose();
}
