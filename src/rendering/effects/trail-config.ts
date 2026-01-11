/**
 * Bolt Visual Configuration - Weapon-specific visual settings for projectile bolts.
 */

import * as THREE from 'three';
import type { WeaponName } from '../../components/projectile';

/** Weapon-specific visual configuration */
export interface WeaponVisualConfig {
  color: THREE.Color;
  radius: number; // Projectile radius in world units
  length?: number; // Projectile length (cylinder/capsule only)
  boltShape: 'sphere' | 'cylinder' | 'capsule';
}

/** Base geometry dimensions (for scale calculation) */
interface BaseGeometry {
  radius: number;
  length?: number;
}

const BASE_GEOMETRY: Record<WeaponVisualConfig['boltShape'], BaseGeometry> = {
  sphere: { radius: 0.5 },
  cylinder: { radius: 0.15, length: 1.2 },
  capsule: { radius: 0.12, length: 5.0 },
};

/** Visual configs per weapon (colors are weapon-coded, not faction-coded) */
const WEAPON_VISUALS: Record<string, WeaponVisualConfig> = {
  // Energy weapons (capsule shape)
  Plasma: {
    color: new THREE.Color(0.0, 1.0, 0.0), // Pure green (#0f0)
    radius: 0.5,
    length: 25,
    boltShape: 'capsule',
  },
  Pulse: {
    color: new THREE.Color(0.3, 0.9, 1.0), // Cyan
    radius: 0.5,
    length: 20,
    boltShape: 'capsule',
  },
  Ion: {
    color: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
    radius: 1,
    length: 20,
    boltShape: 'capsule',
  },
  // Ballistic weapons (cylinder shape)
  Autocannon: {
    color: new THREE.Color(1.0, 0.85, 0.3), // Yellow-gold
    radius: 0.25,
    length: 15,
    boltShape: 'cylinder',
  },
  'Slug Cannon': {
    color: new THREE.Color(0.8, 0.9, 1.0), // Silver-blue-white
    radius: 0.35,
    length: 40,
    boltShape: 'cylinder',
  },
  Railgun: {
    color: new THREE.Color(1.0, 1.0, 1.0), // Pure white
    radius: 0.5,
    length: 100,
    boltShape: 'cylinder',
  },
  Flak: {
    color: new THREE.Color(1.0, 0.2, 0.2), // Red
    radius: 0.4,
    boltShape: 'sphere',
  },
  Shrapnel: {
    color: new THREE.Color(1.0, 0.9, 0.3), // Yellow
    radius: 0.25,
    length: 15,
    boltShape: 'cylinder',
  },
  Gyrojet: {
    color: new THREE.Color(1.0, 0.5, 0.1), // Orange-yellow (rocket exhaust)
    radius: 0.4,
    length: 30,
    boltShape: 'capsule', // Rocket-like capsule shape
  },
};

/** Default visual config for unknown weapons */
const DEFAULT_VISUAL: WeaponVisualConfig = {
  color: new THREE.Color(1.0, 0.5, 0.2), // Orange
  radius: 0.072,
  length: 3.0,
  boltShape: 'capsule',
};

/** Set scale vector to achieve desired dimensions for a given shape */
export function setBoltScale(
  visual: WeaponVisualConfig,
  target: THREE.Vector3,
  lengthOverride?: number,
): void {
  const base = BASE_GEOMETRY[visual.boltShape];
  const radiusScale = visual.radius / base.radius;

  if (visual.boltShape === 'sphere' || !base.length) {
    target.set(radiusScale, radiusScale, radiusScale);
  } else {
    // Cylinder and capsule: Y is the length axis
    const length = lengthOverride ?? visual.length ?? base.length;
    const lengthScale = length / base.length;
    target.set(radiusScale, lengthScale, radiusScale);
  }
}

/** Get visual config for a weapon */
export function getWeaponVisual(weaponName: WeaponName): WeaponVisualConfig {
  return WEAPON_VISUALS[weaponName] ?? DEFAULT_VISUAL;
}
