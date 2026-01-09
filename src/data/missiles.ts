/**
 * Missile/Secondary Weapon Definitions - SINGLE SOURCE OF TRUTH for missile stats.
 *
 * All missile stats are defined here and consumed by components/missile.ts.
 * Tests should use these values via the factories, never duplicate them.
 */

/** Missile stats */
export interface MissileStats {
  /** Display name */
  name: string;
  /** Requires lock-on before firing */
  requiresLock: boolean;
  speed: number;
  turnRate: number; // Degrees per second (0 = dumbfire)
  range: number;
  damage: number;
  fireRate: number;
  lockSpeed: number; // Lock acquisition speed (0-1 per second, 0 = no lock needed)
  /** Lock cone half-angle in degrees - target must be within this angle of ship's forward */
  lockConeAngle: number;
  /** Base capacity per bank (scales with bank size) */
  capacity: number;
  /** Area of effect radius (undefined = no AoE) */
  aoeRadius?: number;
  /** Is this a decoy rather than a weapon? */
  isDecoy?: boolean;
  /** Is this a nuke (special explosion effects)? */
  isNuke?: boolean;
}

/**
 * All missile/secondary weapon definitions.
 * Key is the missile ID (lowercase), value is the base stats.
 * These are the authoritative values used in testing.
 */
export const MISSILES: Record<string, MissileStats> = {
  // === DUMBFIRE (no lock required) ===
  rocket: {
    name: 'Rocket',
    requiresLock: false,
    speed: 600,
    turnRate: 0,
    range: 1000,
    damage: 50,
    fireRate: 0.5,
    lockSpeed: 0,
    lockConeAngle: 60,
    capacity: 12, // Cheap dumbfire, carry lots
  },
  cluster: {
    name: 'Cluster',
    requiresLock: false,
    speed: 400,
    turnRate: 60,
    range: 1200,
    damage: 25,
    fireRate: 0.8,
    lockSpeed: 0,
    lockConeAngle: 60,
    capacity: 10,
  },

  // === HOMING (lock required) ===
  // Lock times doubled for better pacing and player reaction time
  seeker: {
    name: 'Seeker',
    requiresLock: true,
    speed: 400,
    turnRate: 90,
    range: 2000,
    damage: 60,
    fireRate: 1.0,
    lockSpeed: 0.25, // 4 seconds to lock (was 2s)
    lockConeAngle: 60,
    capacity: 8, // Standard homing missile
  },
  dart: {
    name: 'Dart',
    requiresLock: true,
    speed: 600,
    turnRate: 120,
    range: 800,
    damage: 30,
    fireRate: 0.5,
    lockSpeed: 0.5, // 2 seconds to lock (was 1s)
    lockConeAngle: 60,
    capacity: 10, // Fast light missiles
  },
  swarm: {
    name: 'Swarm',
    requiresLock: true,
    speed: 500,
    turnRate: 100,
    range: 600,
    damage: 10,
    fireRate: 0.1, // Rapid fire
    lockSpeed: 0.4, // 2.5 seconds to lock (was 1.25s)
    lockConeAngle: 60,
    capacity: 20, // Many small missiles
  },

  // === HEAVY (slow lock, high damage) ===
  torpedo: {
    name: 'Torpedo',
    requiresLock: true,
    speed: 200,
    turnRate: 30,
    range: 4000,
    damage: 150,
    fireRate: 2.0,
    lockSpeed: 0.15, // ~7 seconds to lock (was 4s)
    lockConeAngle: 60,
    capacity: 4, // Heavy ordnance, few carried
  },
  nuke: {
    name: 'Nuke',
    requiresLock: true,
    speed: 150,
    turnRate: 20,
    range: 3000,
    damage: 300,
    fireRate: 3.0,
    lockSpeed: 0.1, // 10 seconds to lock (was 5s)
    lockConeAngle: 60,
    capacity: 2, // Very limited
    aoeRadius: 100, // Large AoE damage radius
    isNuke: true, // Special explosion effects
  },

  // === COUNTERMEASURES ===
  decoy: {
    name: 'Decoy',
    requiresLock: false,
    speed: 50,
    turnRate: 0,
    range: 0, // Decoys don't travel far
    damage: 0, // No damage
    fireRate: 0.5,
    lockSpeed: 0,
    lockConeAngle: 60,
    capacity: 6, // Defensive countermeasures
    isDecoy: true, // Mark as countermeasure
  },
};

/** Missile names for type safety */
export type MissileName = keyof typeof MISSILES;

/** Get missile stats by name (case-insensitive) */
export function getMissileStats(name: string): MissileStats | undefined {
  return MISSILES[name.toLowerCase()];
}

/** Get missile display name from internal key (e.g., "seeker" -> "Seeker") */
export function getMissileDisplayName(key: string): string {
  const stats = MISSILES[key.toLowerCase()];
  return stats?.name ?? key;
}

/** Decoy-specific constants */
export const DECOY_CONSTANTS = {
  speed: 50, // m/s (slow movement)
  lifetime: 10, // seconds before despawning
  seduceChance: 0.5, // 50% chance to distract missile
  seduceRange: 200, // Range at which decoys attract missiles
};
