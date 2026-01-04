/**
 * Primary Weapon Definitions - SINGLE SOURCE OF TRUTH for all weapon stats.
 *
 * All weapon stats are defined here and consumed by components/weapons.ts.
 * Tests should use these values via the factories, never duplicate them.
 */

/** Weapon type categories */
export type WeaponCategory = 'energy' | 'ballistic' | 'beam';

/** Primary weapon stats (before bank size scaling) */
export interface WeaponStats {
  /** Display name */
  name: string;
  category: WeaponCategory;
  heatPerShot: number;
  projectileSpeed: number;
  fireRate: number;
  range: number;
  damage: number;
  /** Base ammo (undefined = infinite) */
  ammo?: number;
  /** Flak explosion radius */
  flakRadius?: number;
  /** Number of shrapnel pieces */
  shrapnelCount?: number;
  /** Pulse beam fires discrete bolts instead of continuous */
  isPulseBeam?: boolean;
  /** Pulse beam interval (for Lightning) */
  pulseInterval?: number;
  /** No damage falloff (constant damage at any range) */
  noFalloff?: boolean;
  /**
   * Autoaim field of view in degrees. If set, projectiles will correct
   * toward the target intercept point when aim is within this cone.
   * Applies equally to AI (after aim error) and players.
   */
  autoaimFov?: number;
}

/**
 * All primary weapon definitions.
 * Key is the weapon ID (camelCase), value is the base stats.
 * These are the authoritative values used in testing.
 */
export const PRIMARY_WEAPONS: Record<string, WeaponStats> = {
  // === ENERGY WEAPONS (infinite ammo) ===
  plasma: {
    name: 'Plasma',
    category: 'energy',
    heatPerShot: 8,
    projectileSpeed: 400,
    fireRate: 0.2, // 200ms
    range: 800,
    damage: 25,
  },
  pulse: {
    name: 'Pulse',
    category: 'energy',
    heatPerShot: 5,
    projectileSpeed: 600,
    fireRate: 0.1, // 100ms
    range: 500,
    damage: 12,
  },
  ion: {
    name: 'Ion',
    category: 'energy',
    heatPerShot: 6,
    projectileSpeed: 400,
    fireRate: 0.18, // 180ms
    range: 700,
    damage: 15,
  },

  // === BALLISTIC WEAPONS (finite ammo) ===
  autocannon: {
    name: 'Autocannon',
    category: 'ballistic',
    heatPerShot: 2,
    projectileSpeed: 500,
    fireRate: 0.065, // 65ms
    range: 400,
    damage: 9, // Was 8, +12.5% for close-range advantage (not +25%, was too strong)
    ammo: 200,
  },
  railgun: {
    name: 'Railgun',
    category: 'ballistic',
    heatPerShot: 3,
    projectileSpeed: 2000,
    fireRate: 1.0,
    range: 2000,
    damage: 80,
    ammo: 20,
    autoaimFov: 2, // Smart round corrects within 2° cone
  },
  flak: {
    name: 'Flak',
    category: 'ballistic',
    heatPerShot: 4,
    projectileSpeed: 350,
    fireRate: 0.25, // Was 0.4s, faster for rapid area denial (120 DPS)
    range: 600,
    damage: 30, // Was 15, +100% for viable primary weapon
    ammo: 50,
    flakRadius: 100, // Was 80, larger AoE for area denial
    shrapnelCount: 8,
  },

  // === BEAM WEAPONS (continuous, damage per second) ===
  // +100% damage buff to make beam specialization viable (see BALANCE_TESTING.md)
  redLaser: {
    name: 'Red Laser',
    category: 'beam',
    heatPerShot: 15, // Per second
    projectileSpeed: 0, // Instant
    fireRate: 0, // Continuous
    range: 400,
    damage: 120, // Per second (was 60, +100% buff)
  },
  greenLaser: {
    name: 'Green Laser',
    category: 'beam',
    heatPerShot: 12,
    projectileSpeed: 0,
    fireRate: 0,
    range: 800,
    damage: 80, // Was 40, +100% buff
  },
  blueLaser: {
    name: 'Blue Laser',
    category: 'beam',
    heatPerShot: 10,
    projectileSpeed: 0,
    fireRate: 0,
    range: 1200,
    damage: 50, // Was 25, +100% buff
  },

  // === SPECIAL BEAM WEAPONS ===
  lightning: {
    name: 'Lightning',
    category: 'beam',
    heatPerShot: 2, // 20/sec at 10 pulses/sec
    projectileSpeed: 0,
    fireRate: 0, // Continuous (pulse handled separately)
    range: 300,
    damage: 5, // 50/sec at 10 pulses/sec
    isPulseBeam: true,
    pulseInterval: 0.1, // 100ms between bolts
    noFalloff: true,
  },
  nuclearLance: {
    name: 'Nuclear Lance',
    category: 'beam',
    heatPerShot: 0, // No heat
    projectileSpeed: 0,
    fireRate: 0.5, // Single shot with cooldown
    range: 3000,
    damage: 500, // Single massive hit
    ammo: 1, // Limited ammo
    noFalloff: true,
  },
};

/** Weapon names for type safety */
export type WeaponName = keyof typeof PRIMARY_WEAPONS;

/** Get weapon stats by name (case-insensitive) */
export function getWeaponStats(name: string): WeaponStats | undefined {
  return PRIMARY_WEAPONS[name.toLowerCase()];
}
