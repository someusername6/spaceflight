/**
 * Bolt Visual Configuration - Weapon-specific visual settings for projectile bolts.
 */

import * as THREE from 'three';
import type { WeaponName } from '../../components/projectile';

/** Weapon-specific visual configuration */
export interface WeaponVisualConfig {
  color: THREE.Color;
  enemyColor: THREE.Color;
  boltSize: number; // Scale for bolt mesh
  boltShape: 'sphere' | 'cylinder' | 'capsule';
}

/** Visual configs per weapon */
const WEAPON_VISUALS: Record<string, WeaponVisualConfig> = {
  // Energy weapons
  Plasma: {
    color: new THREE.Color(0.2, 1.0, 0.4), // Bright green
    enemyColor: new THREE.Color(1.0, 0.2, 0.3), // Red-pink
    boltSize: 2.25,
    boltShape: 'capsule',
  },
  Pulse: {
    color: new THREE.Color(0.3, 0.9, 1.0), // Cyan
    enemyColor: new THREE.Color(1.0, 0.5, 0.2), // Orange
    boltSize: 1.875,
    boltShape: 'capsule',
  },
  Ion: {
    color: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
    enemyColor: new THREE.Color(1.0, 0.3, 0.5), // Magenta
    boltSize: 2.25,
    boltShape: 'capsule',
  },
  // Ballistic weapons
  Autocannon: {
    color: new THREE.Color(1.0, 0.85, 0.3), // Yellow-gold
    enemyColor: new THREE.Color(1.0, 0.6, 0.2), // Orange
    boltSize: 0.25,
    boltShape: 'cylinder',
  },
  Railgun: {
    color: new THREE.Color(1.0, 1.0, 1.0), // Pure white
    enemyColor: new THREE.Color(0.9, 0.9, 1.0), // Slight blue-white
    boltSize: 0.2,
    boltShape: 'cylinder',
  },
  Flak: {
    color: new THREE.Color(1.0, 0.2, 0.2), // Red
    enemyColor: new THREE.Color(1.0, 0.3, 0.1), // Red-orange
    boltSize: 0.4,
    boltShape: 'sphere',
  },
  Shrapnel: {
    color: new THREE.Color(1.0, 0.9, 0.3), // Yellow (like autocannon)
    enemyColor: new THREE.Color(1.0, 0.7, 0.2), // Orange-yellow
    boltSize: 0.15, // Small
    boltShape: 'cylinder',
  },
};

/** Default visual config for unknown weapons */
const DEFAULT_VISUAL: WeaponVisualConfig = {
  color: new THREE.Color(0.5, 1.0, 0.5),
  enemyColor: new THREE.Color(1.0, 0.5, 0.3),
  boltSize: 0.3,
  boltShape: 'capsule',
};

/** Get visual config for a weapon */
export function getWeaponVisual(weaponName: WeaponName): WeaponVisualConfig {
  return WEAPON_VISUALS[weaponName] ?? DEFAULT_VISUAL;
}
