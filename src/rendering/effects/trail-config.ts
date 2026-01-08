/**
 * Trail Visual Configuration - Weapon-specific visual settings for projectile trails.
 */

import * as THREE from 'three';
import type { WeaponName } from '../../components/projectile';

/** Weapon-specific visual configuration */
export interface WeaponVisualConfig {
  color: THREE.Color;
  enemyColor: THREE.Color;
  trailLength: number;
  boltSize: number; // Scale for bolt mesh
  boltShape: 'sphere' | 'cylinder';
}

/** Visual configs per weapon */
const WEAPON_VISUALS: Record<string, WeaponVisualConfig> = {
  // Energy weapons
  Plasma: {
    color: new THREE.Color(0.2, 1.0, 0.4), // Bright green
    enemyColor: new THREE.Color(1.0, 0.2, 0.3), // Red-pink
    trailLength: 8,
    boltSize: 0.6,
    boltShape: 'sphere',
  },
  Pulse: {
    color: new THREE.Color(0.3, 0.9, 1.0), // Cyan
    enemyColor: new THREE.Color(1.0, 0.5, 0.2), // Orange
    trailLength: 5,
    boltSize: 0.35,
    boltShape: 'sphere',
  },
  Ion: {
    color: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
    enemyColor: new THREE.Color(1.0, 0.3, 0.5), // Magenta
    trailLength: 7,
    boltSize: 0.5,
    boltShape: 'sphere',
  },
  // Ballistic weapons
  Autocannon: {
    color: new THREE.Color(1.0, 0.85, 0.3), // Yellow-gold
    enemyColor: new THREE.Color(1.0, 0.6, 0.2), // Orange
    trailLength: 4,
    boltSize: 0.25,
    boltShape: 'cylinder',
  },
  Railgun: {
    color: new THREE.Color(1.0, 1.0, 1.0), // Pure white
    enemyColor: new THREE.Color(0.9, 0.9, 1.0), // Slight blue-white
    trailLength: 14, // Long trail
    boltSize: 0.2,
    boltShape: 'cylinder',
  },
  Flak: {
    color: new THREE.Color(1.0, 0.2, 0.2), // Red
    enemyColor: new THREE.Color(1.0, 0.3, 0.1), // Red-orange
    trailLength: 6,
    boltSize: 0.4,
    boltShape: 'sphere',
  },
  Shrapnel: {
    color: new THREE.Color(1.0, 0.9, 0.3), // Yellow (like autocannon)
    enemyColor: new THREE.Color(1.0, 0.7, 0.2), // Orange-yellow
    trailLength: 3, // Short trail
    boltSize: 0.15, // Small
    boltShape: 'cylinder',
  },
};

/** Default visual config for unknown weapons */
const DEFAULT_VISUAL: WeaponVisualConfig = {
  color: new THREE.Color(0.5, 1.0, 0.5),
  enemyColor: new THREE.Color(1.0, 0.5, 0.3),
  trailLength: 6,
  boltSize: 0.4,
  boltShape: 'sphere',
};

/** Get visual config for a weapon */
export function getWeaponVisual(weaponName: WeaponName): WeaponVisualConfig {
  return WEAPON_VISUALS[weaponName] ?? DEFAULT_VISUAL;
}

/** Maximum trail length across all weapons (for pool allocation) */
export const MAX_TRAIL_LENGTH = 14; // Railgun has longest trail
