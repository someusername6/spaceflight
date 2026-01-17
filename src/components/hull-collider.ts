/**
 * Hull Collider Component - Convex hull collision for ships.
 *
 * Used for ship-to-ship collision detection and response.
 * Large ships (transport) also use this for projectile/missile detection.
 * Small ships use sphere collision for projectiles (with AI hitbox multiplier).
 */

import type { ComponentBase } from '../core/types';

/** A plane in the convex hull (normal + distance from origin) */
export interface HullPlane {
  nx: number;
  ny: number;
  nz: number;
  d: number;
}

/** Hull collider component - convex hull for collision detection */
export interface HullCollider extends ComponentBase {
  readonly type: 'hullCollider';
  /** Face planes of the convex hull (in local space) */
  planes: HullPlane[];
  /** Bounding radius for fast early-out check */
  boundingRadius: number;
  /**
   * Mass for impulse response (equals hull volume).
   * Larger ships have more volume, so they're harder to push around.
   * Example: transport ~9600 volume vs fighter ~15 volume = ~640x mass difference.
   */
  mass: number;
  /** If true, use hull for projectile/missile detection (large ships only) */
  useHullForWeapons: boolean;
}

/**
 * Creates a HullCollider component from geometry data.
 *
 * @param planes - Face planes of the convex hull
 * @param boundingRadius - Bounding radius for early-out
 * @param volume - Hull volume (used directly as mass for impulse response)
 * @param useHullForWeapons - Use hull for projectile detection (default: false)
 */
export function createHullCollider(
  planes: HullPlane[],
  boundingRadius: number,
  volume: number,
  useHullForWeapons = false,
): HullCollider {
  return {
    type: 'hullCollider',
    planes,
    boundingRadius,
    mass: volume, // Volume directly used as mass - larger ships are heavier
    useHullForWeapons,
  };
}
