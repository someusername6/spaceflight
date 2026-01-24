/**
 * Muzzle Flash Rendering - Visual feedback when weapons fire.
 *
 * Shows brief flashes at weapon muzzle positions when projectiles spawn
 * and continuous glow at beam origin points.
 */

import * as THREE from 'three';
import type { WeaponName } from '../../components/projectile';
import { entityExists, getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { TICK_SEC } from '../../game';
import {
  getInterpolatedPosition,
  getInterpolatedRotation,
  type Renderer,
} from '../renderer';
import {
  type BeamGlowVisual,
  disposeBeamGlows,
  hideBeamGlows,
  updateBeamGlows,
} from './beam-glow';

/** Flash duration in seconds */
const FLASH_DURATION = 0.08;

/** Muzzle flash visual properties */
const MUZZLE_FLASH_OPACITY = 1.0;
const MUZZLE_FLASH_SCALE = 1.0;
const MUZZLE_FLASH_EXPANSION = 2;

/** Flash colors by weapon type (weapon-coded, not faction-coded) */
const WEAPON_FLASH_COLORS: Record<string, THREE.Color> = {
  // Energy weapons - match bolt color
  Plasma: new THREE.Color(0.0, 1.0, 0.0), // Pure green (#0f0)
  Pulse: new THREE.Color(0.3, 0.9, 1.0), // Cyan
  Ion: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
  // Ballistic weapons - explosion-colored (orange/yellow)
  Autocannon: new THREE.Color(1.0, 0.6, 0.2), // Orange
  'Slug Cannon': new THREE.Color(0.9, 0.95, 1.0), // Blue-white (like railgun but cooler)
  Gyrojet: new THREE.Color(1.0, 0.4, 0.1), // Orange-red (rocket ignition)
  Railgun: new THREE.Color(1.0, 1.0, 1.0), // White
  Flak: new THREE.Color(1.0, 0.5, 0.2), // Orange
  Shrapnel: new THREE.Color(1.0, 0.6, 0.2), // Orange
};

/** Default flash color for unknown weapons */
const DEFAULT_FLASH_COLOR = new THREE.Color(1.0, 0.5, 0.2); // Orange

// Reusable vectors for processing pending flashes and interpolation
const flashPosition = new THREE.Vector3();
const rightAxis = new THREE.Vector3();
const forwardAxis = new THREE.Vector3();

/** Flash visual state */
interface FlashVisual {
  mesh: THREE.Mesh;
  startTime: number;
  /** Entity that fired (for position tracking) */
  entity: Entity;
  /** Local offset from entity center */
  localOffset: { x: number; y: number; z: number };
}

/** Muzzle flash renderer state */
export interface MuzzleFlashRenderer {
  flashes: FlashVisual[];
  flashPool: FlashVisual[]; // Pooled flashes for reuse (avoids allocation)
  beamGlows: Map<string, BeamGlowVisual>; // Key: "${entity}-${weaponIndex}"
  flashGeometry: THREE.SphereGeometry;
  glowGeometry: THREE.SphereGeometry;
}

/** Creates the muzzle flash renderer */
export function createMuzzleFlashRenderer(): MuzzleFlashRenderer {
  return {
    flashes: [],
    flashPool: [],
    beamGlows: new Map(),
    flashGeometry: new THREE.SphereGeometry(1.5, 12, 8),
    glowGeometry: new THREE.SphereGeometry(0.8, 8, 6),
  };
}

/** Creates a flash mesh */
function createFlashMesh(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  position: THREE.Vector3,
  weaponName: WeaponName,
): THREE.Mesh {
  const color = WEAPON_FLASH_COLORS[weaponName] ?? DEFAULT_FLASH_COLOR;
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: MUZZLE_FLASH_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(renderer.flashGeometry.clone(), material);
  mesh.position.copy(position);
  scene.add(mesh);

  return mesh;
}

/** Hide a flash visual (for pooling - doesn't dispose) */
function hideFlashVisual(flash: FlashVisual): void {
  flash.mesh.visible = false;
}

/** Reinitialize a pooled flash visual for reuse */
function reinitializeFlashVisual(
  flash: FlashVisual,
  position: THREE.Vector3,
  weaponName: WeaponName,
  gameTime: number,
  entity: Entity,
  localOffset: { x: number; y: number; z: number },
): void {
  const color = WEAPON_FLASH_COLORS[weaponName] ?? DEFAULT_FLASH_COLOR;

  flash.mesh.position.copy(position);
  flash.mesh.scale.setScalar(MUZZLE_FLASH_SCALE);
  flash.mesh.visible = true;

  const material = flash.mesh.material as THREE.MeshBasicMaterial;
  material.color.copy(color);
  material.opacity = MUZZLE_FLASH_OPACITY;

  flash.startTime = gameTime;
  flash.entity = entity;
  flash.localOffset = localOffset;
}

/**
 * Compute world position from entity's interpolated transform and local offset.
 * @param out - Vector3 to store the result
 * @param world - ECS world
 * @param entity - Entity to get position from
 * @param offset - Local offset in entity's coordinate system
 * @param renderer - Renderer for interpolation data
 * @returns true if position was computed, false if entity not found
 */
function computeFlashWorldPosition(
  out: THREE.Vector3,
  world: World,
  entity: Entity,
  offset: { x: number; y: number; z: number },
  renderer?: Renderer,
): boolean {
  // Check entity still exists
  if (!entityExists(world, entity)) {
    return false;
  }

  // Get interpolated position and rotation
  const interpPos = renderer ? getInterpolatedPosition(renderer, entity) : null;
  const interpRot = renderer ? getInterpolatedRotation(renderer, entity) : null;

  if (!interpPos || !interpRot) {
    // Fallback to current transform if interpolation not available
    const transform = getComponent(world, entity, 'transform');
    if (!transform) return false;

    // Transform local offset to world space
    rightAxis.set(1, 0, 0).applyQuaternion(transform.rotation);
    forwardAxis.set(0, 0, -1).applyQuaternion(transform.rotation);

    out
      .copy(transform.position)
      .addScaledVector(rightAxis, offset.x)
      .addScaledVector(forwardAxis, offset.z);

    return true;
  }

  // Transform local offset using interpolated rotation
  rightAxis.set(1, 0, 0).applyQuaternion(interpRot);
  forwardAxis.set(0, 0, -1).applyQuaternion(interpRot);

  out
    .copy(interpPos)
    .addScaledVector(rightAxis, offset.x)
    .addScaledVector(forwardAxis, offset.z);

  return true;
}

/** Updates muzzle flash visuals */
export function updateMuzzleFlashRenderer(
  muzzleFlashRenderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
  renderer?: Renderer,
): void {
  // Calculate interpolated gameTime for smooth animation
  // Interpolate between previous time (gameTime - TICK_SEC) and current using alpha
  const gameTime = world.systemState.gameTime - TICK_SEC * (1 - alpha);
  const pendingFlashes = world.systemState.muzzleFlashes.pending;

  // Create flashes from pending queue (reuse from pool when available)
  // Skip stale items - they're from before a seek and would appear at wrong positions
  const maxAge = TICK_SEC * 2;
  for (const pending of pendingFlashes) {
    if (gameTime - pending.gameTime > maxAge) continue;

    // Compute initial world position from entity's interpolated transform
    if (
      !computeFlashWorldPosition(
        flashPosition,
        world,
        pending.entity,
        pending.localOffset,
        renderer,
      )
    ) {
      continue; // Entity not found, skip this flash
    }

    // Try to reuse from pool first (avoids allocation)
    const pooled = muzzleFlashRenderer.flashPool.pop();
    if (pooled) {
      reinitializeFlashVisual(
        pooled,
        flashPosition,
        pending.weaponName as WeaponName,
        gameTime,
        pending.entity,
        pending.localOffset,
      );
      muzzleFlashRenderer.flashes.push(pooled);
    } else {
      // No pooled flash available, create new one
      const flash: FlashVisual = {
        mesh: createFlashMesh(
          muzzleFlashRenderer,
          scene,
          flashPosition,
          pending.weaponName as WeaponName,
        ),
        startTime: gameTime,
        entity: pending.entity,
        localOffset: pending.localOffset,
      };
      muzzleFlashRenderer.flashes.push(flash);
    }
  }
  pendingFlashes.length = 0;

  // Update existing flashes
  for (let i = muzzleFlashRenderer.flashes.length - 1; i >= 0; i--) {
    const flash = muzzleFlashRenderer.flashes[i];
    if (!flash) continue;

    const age = gameTime - flash.startTime;
    const progress = age / FLASH_DURATION;

    if (progress >= 1) {
      // Flash expired - return to pool for reuse
      hideFlashVisual(flash);
      muzzleFlashRenderer.flashes.splice(i, 1);
      muzzleFlashRenderer.flashPool.push(flash);
    } else {
      // Update flash position from entity's interpolated transform (follows the ship)
      if (
        computeFlashWorldPosition(
          flashPosition,
          world,
          flash.entity,
          flash.localOffset,
          renderer,
        )
      ) {
        flash.mesh.position.copy(flashPosition);
      }

      // Update flash - expand and fade
      const scale = MUZZLE_FLASH_SCALE + progress * MUZZLE_FLASH_EXPANSION;
      flash.mesh.scale.setScalar(scale);
      (flash.mesh.material as THREE.MeshBasicMaterial).opacity =
        MUZZLE_FLASH_OPACITY * (1 - progress);
    }
  }

  // Update beam glows (delegated to beam-glow module)
  updateBeamGlows(
    muzzleFlashRenderer.beamGlows,
    muzzleFlashRenderer.glowGeometry,
    scene,
    world,
    gameTime,
    renderer,
  );
}

/**
 * Reset muzzle flash renderer state (for replay seeking).
 * Returns active flashes to pool for reuse.
 */
export function resetMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  _scene: THREE.Scene,
): void {
  // Return active flashes to pool (don't dispose - reuse them)
  for (const flash of renderer.flashes) {
    hideFlashVisual(flash);
    renderer.flashPool.push(flash);
  }
  renderer.flashes.length = 0;

  // Hide beam glows (keep for reuse)
  hideBeamGlows(renderer.beamGlows);
}

/** Disposes of muzzle flash renderer resources */
export function disposeMuzzleFlashRenderer(
  renderer: MuzzleFlashRenderer,
  scene: THREE.Scene,
): void {
  // Dispose active flashes
  for (const flash of renderer.flashes) {
    scene.remove(flash.mesh);
    flash.mesh.geometry.dispose();
    (flash.mesh.material as THREE.Material).dispose();
  }
  renderer.flashes.length = 0;

  // Dispose pooled flashes
  for (const flash of renderer.flashPool) {
    scene.remove(flash.mesh);
    flash.mesh.geometry.dispose();
    (flash.mesh.material as THREE.Material).dispose();
  }
  renderer.flashPool.length = 0;

  // Dispose beam glows
  disposeBeamGlows(renderer.beamGlows, scene);

  renderer.flashGeometry.dispose();
  renderer.glowGeometry.dispose();
}
