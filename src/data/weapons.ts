/**
 * Primary Weapon Definitions - Central source of truth for all weapon stats.
 *
 * All weapon stats are defined here and imported by components/weapons.ts.
 * Tests should import from here (via fixtures) to stay in sync.
 */

/** Primary weapon stats (before bank size scaling) */
export interface WeaponStats {
  heatPerShot: number;
  projectileSpeed: number;
  fireRate: number;
  range: number;
  damage: number;
  category: 'energy' | 'ballistic' | 'beam';
  ammo?: number;
  /** Flak explosion radius */
  flakRadius?: number;
  /** Number of shrapnel pieces */
  shrapnelCount?: number;
  /** Pulse beam interval (for Lightning) */
  pulseInterval?: number;
  /** No damage falloff (constant damage at any range) */
  noFalloff?: boolean;
}

/**
 * All primary weapon definitions.
 * Key is the weapon name (lowercase), value is the base stats.
 */
export const PRIMARY_WEAPONS: Record<string, WeaponStats> = {
  // === ENERGY WEAPONS (infinite ammo) ===
  plasma: {
    heatPerShot: 8,
    projectileSpeed: 400,
    fireRate: 0.2,
    range: 800,
    damage: 25,
    category: 'energy',
  },
  pulse: {
    heatPerShot: 5,
    projectileSpeed: 600,
    fireRate: 0.1,
    range: 500,
    damage: 12,
    category: 'energy',
  },
  ion: {
    heatPerShot: 6,
    projectileSpeed: 400,
    fireRate: 0.18,
    range: 700,
    damage: 15,
    category: 'energy',
  },

  // === BALLISTIC WEAPONS (finite ammo) ===
  autocannon: {
    heatPerShot: 2,
    projectileSpeed: 500,
    fireRate: 0.065,
    range: 400,
    damage: 8,
    category: 'ballistic',
    ammo: 200,
  },
  railgun: {
    heatPerShot: 3,
    projectileSpeed: 2000,
    fireRate: 0.8,
    range: 2000,
    damage: 80,
    category: 'ballistic',
    ammo: 20,
  },
  flak: {
    heatPerShot: 4,
    projectileSpeed: 350,
    fireRate: 0.4,
    range: 600,
    damage: 15,
    category: 'ballistic',
    ammo: 50,
    flakRadius: 80,
    shrapnelCount: 8,
  },

  // === BEAM WEAPONS (continuous, damage per second) ===
  'red laser': {
    heatPerShot: 15, // Per second
    projectileSpeed: 0,
    fireRate: 0,
    range: 400,
    damage: 60, // Per second
    category: 'beam',
  },
  'green laser': {
    heatPerShot: 12,
    projectileSpeed: 0,
    fireRate: 0,
    range: 800,
    damage: 40,
    category: 'beam',
  },
  'blue laser': {
    heatPerShot: 10,
    projectileSpeed: 0,
    fireRate: 0,
    range: 1200,
    damage: 25,
    category: 'beam',
  },

  // === SPECIAL WEAPONS ===
  lightning: {
    heatPerShot: 2, // Per pulse
    projectileSpeed: 0,
    fireRate: 0,
    range: 300,
    damage: 5, // Per pulse (50/sec at 10 pulses/sec)
    category: 'beam',
    pulseInterval: 0.1,
    noFalloff: true,
  },
  'nuclear lance': {
    heatPerShot: 0,
    projectileSpeed: 0,
    fireRate: 0.5,
    range: 3000,
    damage: 500,
    category: 'beam',
    ammo: 1,
    noFalloff: true,
  },
};

/** Weapon names for type safety */
export type WeaponName = keyof typeof PRIMARY_WEAPONS;

/** Get weapon stats by name (case-insensitive) */
export function getWeaponStats(name: string): WeaponStats | undefined {
  return PRIMARY_WEAPONS[name.toLowerCase()];
}
