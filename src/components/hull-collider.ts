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

/** Sub-hull for compound collision (connected components of a structure) */
export interface SubHull {
  planes: HullPlane[];
  boundingRadius: number;
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
  /**
   * Sub-hulls for compound collision (structures with disconnected parts).
   * If present, collision tests iterate each sub-hull separately.
   */
  subHulls?: SubHull[];
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

/**
 * Creates a compound HullCollider with sub-hulls for structures.
 * Used for meshes with disconnected parts (like waypoint beams).
 *
 * @param subHulls - Array of sub-hulls (each with planes and boundingRadius)
 * @param totalBoundingRadius - Bounding radius of entire structure
 * @param totalVolume - Total volume (used as mass, typically very large for structures)
 * @param useHullForWeapons - Use hull for projectile detection (default: false)
 */
export function createCompoundHullCollider(
  subHulls: SubHull[],
  totalBoundingRadius: number,
  totalVolume: number,
  useHullForWeapons = false,
): HullCollider {
  // The main planes array is empty for compound hulls - we only use subHulls
  return {
    type: 'hullCollider',
    planes: [],
    boundingRadius: totalBoundingRadius,
    mass: totalVolume,
    useHullForWeapons,
    subHulls,
  };
}

// =============================================================================
// Serialization
// =============================================================================

/** Serialized hull plane (array for compactness) */
export type SerializedHullPlane = [number, number, number, number]; // [nx, ny, nz, d]

/** Serialized sub-hull */
export interface SerializedSubHull {
  p: SerializedHullPlane[]; // planes
  r: number; // boundingRadius
}

export interface SerializedHullCollider {
  t: 4; // Component type ID
  p: SerializedHullPlane[]; // planes
  r: number; // boundingRadius
  m: number; // mass
  u: boolean; // useHullForWeapons
  s?: SerializedSubHull[]; // subHulls
}

function serializePlane(p: HullPlane): SerializedHullPlane {
  return [p.nx, p.ny, p.nz, p.d];
}

function deserializePlane(s: SerializedHullPlane): HullPlane {
  return { nx: s[0], ny: s[1], nz: s[2], d: s[3] };
}

export function serializeHullCollider(c: HullCollider): SerializedHullCollider {
  const result: SerializedHullCollider = {
    t: 4,
    p: c.planes.map(serializePlane),
    r: c.boundingRadius,
    m: c.mass,
    u: c.useHullForWeapons,
  };
  if (c.subHulls !== undefined) {
    result.s = c.subHulls.map((sh) => ({
      p: sh.planes.map(serializePlane),
      r: sh.boundingRadius,
    }));
  }
  return result;
}

export function deserializeHullCollider(
  s: SerializedHullCollider,
): HullCollider {
  const result: HullCollider = {
    type: 'hullCollider',
    planes: s.p.map(deserializePlane),
    boundingRadius: s.r,
    mass: s.m,
    useHullForWeapons: s.u,
  };
  if (s.s !== undefined) {
    result.subHulls = s.s.map((sh) => ({
      planes: sh.p.map(deserializePlane),
      boundingRadius: sh.r,
    }));
  }
  return result;
}
