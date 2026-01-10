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
  /** Ammo display name for store (e.g., "Autocannon Rounds") */
  ammoName?: string;
  /** Short name for store list display (defaults to name if not set) */
  listName?: string;
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
  /** Beam width multiplier (default 1.0) */
  beamWidth?: number;
  /** Shield damage multiplier (default 1.0). */
  shieldDamageMultiplier?: number;
  /** Hull damage multiplier (default 1.0). */
  hullDamageMultiplier?: number;
  /**
   * Ion effect: suppresses target shield regeneration for 8 seconds after hit.
   * Stacks with normal damage-based regen suppression by doubling the delay.
   */
  ionize?: boolean;
  /**
   * Heat injection rate (heat per second added to target ship).
   * Can push target heat above 100%, causing prolonged overheat.
   */
  heatInjection?: number;
  /**
   * Instant beam: fires once on press, applies all damage instantly to
   * all targets in beam path, consumes ammo, then fades out visually.
   * Uses fireRate as cooldown between shots.
   */
  isInstantBeam?: boolean;
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
    heatPerShot: 5,
    projectileSpeed: 600,
    fireRate: 0.125, // 125ms (8 shots/sec)
    range: 800,
    damage: 16,
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
    projectileSpeed: 600,
    fireRate: 0.18, // 180ms
    range: 700,
    damage: 10,
    ionize: true, // Suppresses shield regen for 8s after hit, doubling normal delay
  },

  // === BALLISTIC WEAPONS (finite ammo) ===
  autocannon: {
    name: 'Autocannon',
    category: 'ballistic',
    heatPerShot: 1,
    projectileSpeed: 500,
    fireRate: 0.065, // 65ms
    range: 400,
    damage: 9, // Was 8, +12.5% for close-range advantage (not +25%, was too strong)
    ammo: 200,
    ammoName: 'Autocannon Rounds',
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
    ammoName: 'Railgun Slugs',
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
    ammoName: 'Flak Shells',
    flakRadius: 100, // Was 80, larger AoE for area denial
    shrapnelCount: 8,
  },

  // === BEAM WEAPONS (continuous, damage per second) ===
  redLaser: {
    name: 'Red Laser',
    category: 'beam',
    heatPerShot: 15,
    projectileSpeed: 0,
    fireRate: 0,
    range: 400,
    damage: 120,
  },
  greenLaser: {
    name: 'Green Laser',
    category: 'beam',
    heatPerShot: 12,
    projectileSpeed: 0,
    fireRate: 0,
    range: 800,
    damage: 80,
  },
  blueLaser: {
    name: 'Blue Laser',
    category: 'beam',
    heatPerShot: 10,
    projectileSpeed: 0,
    fireRate: 0,
    range: 1200,
    damage: 50,
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
    autoaimFov: 5, // Arcing lightning corrects within 5° cone
  },
  torch: {
    name: 'Torch',
    listName: 'Torch',
    category: 'beam',
    heatPerShot: 25, // High heat limits sustained use on attacker
    projectileSpeed: 0,
    fireRate: 0, // Continuous beam
    range: 200, // Very short range - plasma cutter
    damage: 30, // Moderate damage, but injects heat into target
    heatInjection: 35, // Heat/sec injected into target, can cause overheat
    noFalloff: true, // Constant damage at short range
  },
  nuclearLance: {
    name: 'Nuclear Lance',
    listName: 'Nuke Lance',
    category: 'beam',
    heatPerShot: 30, // Significant heat cost per shot
    projectileSpeed: 0,
    fireRate: 0.5, // Cooldown between shots
    range: 3000,
    damage: 500, // Single massive hit to all targets in path
    ammo: 1, // Limited ammo
    ammoName: 'Nuclear Lance Charges',
    noFalloff: true,
    isInstantBeam: true, // Fires once, damages all in path, fades out
    autoaimFov: 2, // Smart targeting corrects within 2° cone
  },
};

/** Weapon names for type safety */
export type WeaponName = keyof typeof PRIMARY_WEAPONS;

/** Get weapon stats by name */
export function getWeaponStats(name: string): WeaponStats | undefined {
  return PRIMARY_WEAPONS[name];
}

/** Get weapon display name from internal key (e.g., "nuclearLance" -> "Nuclear Lance") */
export function getWeaponDisplayName(key: string): string {
  const stats = PRIMARY_WEAPONS[key];
  return stats?.name ?? key;
}

/** Get ammo display name from weapon key (e.g., "nuclearLance" -> "Nuclear Lance Charges") */
export function getAmmoDisplayName(key: string): string {
  const stats = PRIMARY_WEAPONS[key];
  if (!stats) return key;
  // Use ammoName if defined (e.g., "Autocannon Rounds"), otherwise weapon name
  return stats.ammoName ?? stats.name;
}

/** Reverse lookup: get weapon key from display name (e.g., "Pulse" -> "pulse") */
export function getWeaponKeyFromName(displayName: string): string {
  for (const [key, stats] of Object.entries(PRIMARY_WEAPONS)) {
    if (stats.name === displayName) {
      return key;
    }
  }
  // Fallback: return as-is (might already be a key)
  return displayName;
}
