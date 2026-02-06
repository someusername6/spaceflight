/**
 * Shared autoaim correction logic for beam and projectile weapons.
 */

import { Vector3 } from 'three';

const _toTarget = new Vector3();

/**
 * Apply autoaim correction to a ray direction if the target is within the FOV cone.
 * Snaps the ray direction toward the target if the angle is within fovDegrees.
 *
 * @param rayDirection - Direction vector to modify (mutated in place)
 * @param targetPos - Position of the target
 * @param rayOrigin - Origin of the ray
 * @param fovDegrees - Autoaim cone half-angle in degrees
 * @returns true if correction was applied
 */
export function applyAutoaimCorrection(
  rayDirection: Vector3,
  targetPos: Vector3,
  rayOrigin: Vector3,
  fovDegrees: number,
): boolean {
  _toTarget.copy(targetPos).sub(rayOrigin).normalize();
  const angle = Math.acos(
    Math.max(-1, Math.min(1, rayDirection.dot(_toTarget))),
  );
  const fovRadians = (fovDegrees * Math.PI) / 180;
  if (angle <= fovRadians) {
    rayDirection.copy(_toTarget);
    return true;
  }
  return false;
}
