/**
 * Lead indicator calculation - projectile intercept math.
 */

import { Vector3 } from 'three';

// Reusable vectors for intercept calculation (avoid per-frame allocation)
const relPos = new Vector3();
const relVel = new Vector3();
const interceptResult = new Vector3();

/**
 * Calculate the intercept point for a projectile to hit a moving target.
 * Returns undefined if no valid intercept exists (target moving away faster than projectile).
 */
export function calculateInterceptPoint(
  shooterPos: Vector3,
  shooterVel: Vector3,
  targetPos: Vector3,
  targetVel: Vector3,
  projectileSpeed: number
): Vector3 | undefined {
  // Relative position and velocity
  relPos.copy(targetPos).sub(shooterPos);
  relVel.copy(targetVel).sub(shooterVel);

  // Quadratic coefficients: (V·V - s²)t² + 2(P·V)t + P·P = 0
  const a = relVel.dot(relVel) - projectileSpeed * projectileSpeed;
  const b = 2 * relPos.dot(relVel);
  const c = relPos.dot(relPos);

  let t: number;

  if (Math.abs(a) < 0.0001) {
    // Linear case (target moving at projectile speed)
    if (Math.abs(b) < 0.0001) {
      return undefined; // No solution
    }
    t = -c / b;
    if (t <= 0) {
      return undefined; // Intercept in the past
    }
  } else {
    // Quadratic case
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return undefined; // No real solution - can't catch target
    }

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b + sqrtD) / (2 * a);
    const t2 = (-b - sqrtD) / (2 * a);

    // Take the smallest positive root
    if (t1 > 0 && t2 > 0) {
      t = Math.min(t1, t2);
    } else if (t1 > 0) {
      t = t1;
    } else if (t2 > 0) {
      t = t2;
    } else {
      return undefined; // Both roots negative - target behind us
    }
  }

  // Cap intercept time to reasonable value (5 seconds)
  t = Math.min(t, 5);

  // Intercept point = target position + target velocity * t
  return interceptResult.copy(targetPos).addScaledVector(targetVel, t);
}
