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
}

/**
 * All ship class definitions.
 * Key is the ship class name (lowercase), value is the chassis stats.
 * These are the authoritative values used in testing.
 */
export const SHIP_CLASSES: Record<string, ShipClassStats> = {
  // Scout: Fast and fragile - FRAGILE
  scout: {
    hull: 50,
    shields: 30,
    shieldRegen: 8,
    shieldDelay: 2,
    maxSpeed: 300,
    acceleration: 150,
    turnRate: 120,
    rollRate: 180,
    collisionRadius: 4,
    maxHeat: 80,
    coolingRate: 15,
    afterburnerHeatRate: 25,
  },

  // Interceptor: Quick dogfighter - BALANCED
  interceptor: {
    hull: 80,
    shields: 60,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 250,
    acceleration: 100,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 5,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 40,
  },

  // Striker: Heavy assault fighter - DURABLE
  striker: {
    hull: 120,
    shields: 80,
    shieldRegen: 12,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 80,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 6,
    maxHeat: 150,
    coolingRate: 25,
    afterburnerHeatRate: 60,
  },

  // Bomber: Slow, missile-focused - FRAGILE (relies on range)
  bomber: {
    hull: 100,
    shields: 70,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 75,
    rollRate: 110,
    collisionRadius: 7,
    maxHeat: 80,
    coolingRate: 12,
    afterburnerHeatRate: 55,
  },

  // Defender: Tanky shield boat - DURABLE
  defender: {
    hull: 150,
    shields: 120,
    shieldRegen: 18,
    shieldDelay: 2.5,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 70,
    rollRate: 100,
    collisionRadius: 7,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 50,
  },

  // Raider: Glass cannon - FRAGILE
  raider: {
    hull: 60,
    shields: 40,
    shieldRegen: 6,
    shieldDelay: 4,
    maxSpeed: 280,
    acceleration: 120,
    turnRate: 110,
    rollRate: 160,
    collisionRadius: 5,
    maxHeat: 140,
    coolingRate: 22,
    afterburnerHeatRate: 35,
  },

  // Sentinel: Long-range support - BALANCED (beam-optimized)
  sentinel: {
    hull: 100,
    shields: 100,
    shieldRegen: 15,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 90,
    turnRate: 90,
    rollRate: 130,
    collisionRadius: 6,
    maxHeat: 130,
    coolingRate: 22,
    afterburnerHeatRate: 45,
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
