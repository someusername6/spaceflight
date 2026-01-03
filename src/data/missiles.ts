/**
 * Missile/Secondary Weapon Definitions - Central source of truth for missile stats.
 *
 * All missile stats are defined here and imported by components/missile.ts.
 * Tests should import from here (via fixtures) to stay in sync.
 */

/** Missile stats */
export interface MissileStats {
  speed: number;
  turnRate: number; // Degrees per second (0 = dumbfire)
  range: number;
  damage: number;
  fireRate: number;
  lockSpeed: number; // Lock acquisition speed (0-1 per second, 0 = no lock needed)
  bankSize: number; // How many missiles in a bank
  maxCount: number; // Maximum ammo count
  /** Area of effect radius (undefined = no AoE) */
  aoeRadius?: number;
  /** Is this a decoy rather than a weapon? */
  isDecoy?: boolean;
}

/**
 * All missile/secondary weapon definitions.
 * Key is the missile name (lowercase), value is the base stats.
 */
export const MISSILES: Record<string, MissileStats> = {
  // === DUMBFIRE (no lock required) ===
  rocket: {
    speed: 600,
    turnRate: 0,
    range: 1000,
    damage: 50,
    fireRate: 0.5,
    lockSpeed: 0,
    bankSize: 4,
    maxCount: 16,
  },
  cluster: {
    speed: 400,
    turnRate: 60,
    range: 1200,
    damage: 25,
    fireRate: 0.8,
    lockSpeed: 0,
    bankSize: 6,
    maxCount: 24,
  },

  // === HOMING (lock required) ===
  seeker: {
    speed: 400,
    turnRate: 90,
    range: 2000,
    damage: 60,
    fireRate: 1.0,
    lockSpeed: 0.5, // 2 seconds to lock
    bankSize: 2,
    maxCount: 8,
  },
  dart: {
    speed: 600,
    turnRate: 120,
    range: 800,
    damage: 30,
    fireRate: 0.5,
    lockSpeed: 1.0, // 1 second to lock
    bankSize: 4,
    maxCount: 16,
  },
  swarm: {
    speed: 500,
    turnRate: 100,
    range: 600,
    damage: 10,
    fireRate: 0.1, // Rapid fire
    lockSpeed: 0.8,
    bankSize: 8,
    maxCount: 32,
  },

  // === HEAVY (slow lock, high damage) ===
  torpedo: {
    speed: 200,
    turnRate: 30,
    range: 4000,
    damage: 150,
    fireRate: 2.0,
    lockSpeed: 0.25, // 4 seconds to lock
    bankSize: 1,
    maxCount: 4,
  },
  nuke: {
    speed: 150,
    turnRate: 20,
    range: 3000,
    damage: 300,
    fireRate: 3.0,
    lockSpeed: 0.2, // 5 seconds to lock
    bankSize: 1,
    maxCount: 2,
    aoeRadius: 100,
  },

  // === COUNTERMEASURES ===
  decoy: {
    speed: 50,
    turnRate: 0,
    range: 0,
    damage: 0,
    fireRate: 0.5,
    lockSpeed: 0,
    bankSize: 4,
    maxCount: 8,
    isDecoy: true,
  },
};

/** Missile names for type safety */
export type MissileName = keyof typeof MISSILES;

/** Get missile stats by name (case-insensitive) */
export function getMissileStats(name: string): MissileStats | undefined {
  return MISSILES[name.toLowerCase()];
}

/** Decoy-specific constants */
export const DECOY_CONSTANTS = {
  speed: 50, // m/s (slow movement)
  lifetime: 10, // seconds before despawning
  seduceChance: 0.5, // 50% chance to distract missile
  seduceRange: 200, // Range at which decoys attract missiles
};
