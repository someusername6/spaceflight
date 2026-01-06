/**
 * Ship Class Definitions - SINGLE SOURCE OF TRUTH for ship chassis stats.
 *
 * Ship classes define the base stats (hull, shields, speed, etc.).
 * Archetypes/builds in factories/ship-archetypes.ts combine a ship class
 * with a weapon loadout to create playable configurations.
 */

/** Ship class stats (the chassis) */
export interface ShipClassStats {
  hull: number;
  shields: number;
  shieldRegen: number;
  shieldDelay: number;
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  rollRate: number;
  collisionRadius: number;
  maxHeat: number;
  coolingRate: number;
  afterburnerHeatRate: number;
  /** Primary weapon bank sizes (e.g., [2, 2, 1] = 3 banks of sizes 2, 2, 1) */
  primaryBanks: number[];
  /** Secondary weapon bank sizes (e.g., [2, 1, 1] = 3 banks of sizes 2, 1, 1) */
  secondaryBanks: number[];
}

/**
 * All ship class definitions.
 * Key is the ship class name (lowercase), value is the chassis stats.
 * These are the authoritative values used in testing.
 */
export const SHIP_CLASSES: Record<string, ShipClassStats> = {
  // Patrol: Intro enemy craft
  patrol: {
    hull: 45,
    shields: 45,
    shieldRegen: 5,
    shieldDelay: 3,
    maxSpeed: 90,
    acceleration: 45,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 5,
    maxHeat: 90,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryBanks: [1, 1],
    secondaryBanks: [1],
  },

  // Scout: Fast and fragile - FRAGILE
  scout: {
    hull: 55,
    shields: 35,
    shieldRegen: 8,
    shieldDelay: 2,
    maxSpeed: 150,
    acceleration: 75,
    turnRate: 120,
    rollRate: 180,
    collisionRadius: 4,
    maxHeat: 80,
    coolingRate: 15,
    afterburnerHeatRate: 25,
    primaryBanks: [1, 1],
    secondaryBanks: [1],
  },

  // Fighter: Standard player craft - BALANCED (simplified interceptor)
  fighter: {
    hull: 90,
    shields: 65,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 125,
    acceleration: 50,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 5,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryBanks: [1, 1],
    secondaryBanks: [1, 1],
  },

  // Interceptor: Quick dogfighter - BALANCED
  interceptor: {
    hull: 90,
    shields: 65,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 125,
    acceleration: 50,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 5,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryBanks: [1, 1, 2],
    secondaryBanks: [1, 2, 1],
  },

  // Striker: Heavy assault fighter - DURABLE
  striker: {
    hull: 130,
    shields: 90,
    shieldRegen: 12,
    shieldDelay: 3,
    maxSpeed: 100,
    acceleration: 40,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 6,
    maxHeat: 150,
    coolingRate: 25,
    afterburnerHeatRate: 60,
    primaryBanks: [2, 2, 2, 1, 1],
    secondaryBanks: [1],
  },

  // Bomber: Slow, missile-focused - FRAGILE (relies on range)
  bomber: {
    hull: 110,
    shields: 80,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 90,
    acceleration: 35,
    turnRate: 75,
    rollRate: 110,
    collisionRadius: 7,
    maxHeat: 80,
    coolingRate: 12,
    afterburnerHeatRate: 55,
    primaryBanks: [2],
    secondaryBanks: [2, 2, 2, 1, 1, 1, 1],
  },

  // Defender: Tanky shield boat - DURABLE
  defender: {
    hull: 165,
    shields: 130,
    shieldRegen: 18,
    shieldDelay: 2.5,
    maxSpeed: 90,
    acceleration: 35,
    turnRate: 70,
    rollRate: 100,
    collisionRadius: 7,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 50,
    primaryBanks: [2, 2],
    secondaryBanks: [2, 2, 1, 1, 1],
  },

  // Raider: Glass cannon - FRAGILE
  raider: {
    hull: 65,
    shields: 45,
    shieldRegen: 6,
    shieldDelay: 4,
    maxSpeed: 140,
    acceleration: 60,
    turnRate: 110,
    rollRate: 160,
    collisionRadius: 5,
    maxHeat: 140,
    coolingRate: 22,
    afterburnerHeatRate: 35,
    primaryBanks: [3, 3, 1, 1],
    secondaryBanks: [1, 1, 1],
  },

  // Sentinel: Long-range support - BALANCED (beam-optimized)
  sentinel: {
    hull: 110,
    shields: 110,
    shieldRegen: 15,
    shieldDelay: 3,
    maxSpeed: 100,
    acceleration: 45,
    turnRate: 90,
    rollRate: 130,
    collisionRadius: 6,
    maxHeat: 130,
    coolingRate: 22,
    afterburnerHeatRate: 45,
    primaryBanks: [3, 2, 2],
    secondaryBanks: [2, 2, 1],
  },
};

/** Ship class names for type safety */
export type ShipClassName = keyof typeof SHIP_CLASSES;

/** Get ship class stats by name (case-insensitive) */
export function getShipClassStats(name: string): ShipClassStats | undefined {
  return SHIP_CLASSES[name.toLowerCase()];
}

/** AI collision radius multiplier (AI ships have larger hitboxes) */
export const AI_COLLISION_MULTIPLIER = 1.5;
