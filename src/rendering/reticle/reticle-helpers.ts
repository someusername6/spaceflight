/**
 * Reticle Helpers - Target pooling and screen bounds computation.
 */

import * as THREE from 'three';
import type { Transform } from '../../components/transform';
import type { Entity } from '../../core/types';

// Reusable objects for bounds computation
const tempVec3 = new THREE.Vector3();
const tempBox3 = new THREE.Box3();
const boxCorners: THREE.Vector3[] = [];
for (let i = 0; i < 8; i++) boxCorners.push(new THREE.Vector3());

// Shared zero vector for fallbacks
export const zeroVec3 = new THREE.Vector3();

/** Target info for rendering */
export interface TargetInfo {
  entity: Entity;
  transform: Transform;
  velocity: THREE.Vector3;
  mesh: THREE.Object3D | undefined;
  distance: number;
  isSelected: boolean;
  isEnemy: boolean;
  isNeutral: boolean;
  isLockTarget: boolean;
  lockProgress: number;
  isMissile: boolean;
}

// Pool of reusable TargetInfo objects (avoids per-frame object allocation)
const targetPool: TargetInfo[] = [];
let targetPoolIndex = 0;

/** Get a TargetInfo from pool, expanding if needed */
export function getTargetInfo(): TargetInfo {
  if (targetPoolIndex >= targetPool.length) {
    // Expand pool with a new object
    targetPool.push({
      entity: 0 as Entity,
      transform: null as unknown as Transform,
      velocity: zeroVec3,
      mesh: undefined,
      distance: 0,
      isSelected: false,
      isEnemy: false,
      isNeutral: false,
      isLockTarget: false,
      lockProgress: 0,
      isMissile: false,
    });
  }
  return targetPool[targetPoolIndex++] as TargetInfo;
}

/** Reset pool index for new frame */
export function resetTargetPool(): void {
  targetPoolIndex = 0;
}

/** Module-level sort comparator (avoid per-frame callback allocation) */
export function compareTargetsForRendering(
  a: TargetInfo,
  b: TargetInfo,
): number {
  // Selected target renders last (on top)
  if (a.isSelected !== b.isSelected) return a.isSelected ? 1 : -1;
  // Far targets first, close targets on top
  return b.distance - a.distance;
}

/** Screen bounds result */
export interface ScreenBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Compute screen bounds from mesh bounding box */
export function computeScreenBounds(
  mesh: THREE.Object3D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
): ScreenBounds | null {
  // Compute world-space bounding box (fresh each frame since meshes move)
  tempBox3.setFromObject(mesh);
  if (tempBox3.isEmpty()) return null;

  const { min, max } = tempBox3;
  boxCorners[0]?.set(min.x, min.y, min.z);
  boxCorners[1]?.set(min.x, min.y, max.z);
  boxCorners[2]?.set(min.x, max.y, min.z);
  boxCorners[3]?.set(min.x, max.y, max.z);
  boxCorners[4]?.set(max.x, min.y, min.z);
  boxCorners[5]?.set(max.x, min.y, max.z);
  boxCorners[6]?.set(max.x, max.y, min.z);
  boxCorners[7]?.set(max.x, max.y, max.z);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const c of boxCorners) {
    tempVec3.copy(c);
    tempVec3.project(camera);

    // x/y projection is valid at any distance (only z is affected by far plane)
    const sx = (tempVec3.x + 1) * 0.5 * screenWidth;
    const sy = (1 - tempVec3.y) * 0.5 * screenHeight;

    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }

  return { minX, maxX, minY, maxY };
}
