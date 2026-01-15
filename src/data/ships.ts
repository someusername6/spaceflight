/**
 * Ship Class Definitions - SINGLE SOURCE OF TRUTH for ship chassis stats.
 *
 * Ship classes define the base stats (hull, shields, speed, etc.).
 * Archetypes/builds in factories/ship-archetypes.ts combine a ship class
 * with a weapon loadout to create playable configurations.
 */

/** Hardpoint definition for weapon slot positioning */
export interface Hardpoint {
  /** Which row the slot appears in (0 = top row, 1 = second row, etc.) */
  row: number;
  /** Horizontal position for slot (0-1 normalized, 0.5 = center) */
  x: number;
  /** SVG X coordinate for connector line origin (0-64 viewBox) */
  svgX: number;
  /** SVG Y coordinate for connector line origin (0-64 viewBox) */
  svgY: number;
}

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
  /** Primary hardpoint positions and SVG coordinates */
  primaryHardpoints: Hardpoint[];
  /** Secondary hardpoint positions and SVG coordinates */
  secondaryHardpoints: Hardpoint[];
}

/**
 * All ship class definitions.
 * Key is the ship class name (lowercase), value is the chassis stats.
 * These are the authoritative values used in testing.
 */
export const SHIP_CLASSES: Record<string, ShipClassStats> = {
  // Patrol: Intro enemy craft - diamond with stubby wings
  patrol: {
    hull: 45,
    shields: 45,
    shieldRegen: 5,
    shieldDelay: 3,
    maxSpeed: 90,
    acceleration: 45,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 4,
    maxHeat: 90,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryBanks: [1, 1],
    secondaryBanks: [1],
    primaryHardpoints: [
      { row: 0, x: 0.2, svgX: 22, svgY: 15 },
      { row: 0, x: 0.8, svgX: 42, svgY: 15 },
    ],
    secondaryHardpoints: [{ row: 0, x: 0.5, svgX: 32, svgY: 46 }],
  },

  // Scout: Fast and fragile - narrow arrow shape
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
    primaryHardpoints: [
      { row: 0, x: 0.35, svgX: 16, svgY: 13 },
      { row: 0, x: 0.65, svgX: 48, svgY: 13 },
    ],
    secondaryHardpoints: [{ row: 0, x: 0.5, svgX: 32, svgY: 36 }],
  },

  // Fighter: Standard player craft - swept wings
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
    primaryHardpoints: [
      { row: 0, x: 0.25, svgX: 20, svgY: 22 },
      { row: 0, x: 0.75, svgX: 44, svgY: 22 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.25, svgX: 16, svgY: 38 },
      { row: 0, x: 0.75, svgX: 48, svgY: 38 },
    ],
  },

  // Interceptor: Quick dogfighter - sharp delta wings
  interceptor: {
    hull: 75,
    shields: 50,
    shieldRegen: 9,
    shieldDelay: 2.5,
    maxSpeed: 138,
    acceleration: 62,
    turnRate: 110,
    rollRate: 165,
    collisionRadius: 5,
    maxHeat: 90,
    coolingRate: 16,
    afterburnerHeatRate: 32,
    primaryBanks: [2, 2],
    secondaryBanks: [1, 2, 1],
    primaryHardpoints: [
      { row: 0, x: 0.2, svgX: 23, svgY: 13 },
      { row: 0, x: 0.8, svgX: 41, svgY: 13 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.25, svgX: 24, svgY: 32 },
      { row: 0, x: 0.5, svgX: 32, svgY: 44 },
      { row: 0, x: 0.75, svgX: 40, svgY: 32 },
    ],
  },

  // Striker: Heavy assault fighter - thick body with angular wings
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
    primaryHardpoints: [
      { row: 2, x: 0.15, svgX: 18, svgY: 26 },
      { row: 0, x: 0.5, svgX: 32, svgY: 19 },
      { row: 2, x: 0.85, svgX: 46, svgY: 26 },
      { row: 1, x: 0.35, svgX: 8, svgY: 34 },
      { row: 1, x: 0.65, svgX: 56, svgY: 34 },
    ],
    secondaryHardpoints: [{ row: 0, x: 0.5, svgX: 32, svgY: 34 }],
  },

  // Bomber: Slow, missile-focused - wide wingspan
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
    primaryHardpoints: [{ row: 1, x: 0.5, svgX: 32, svgY: 13 }],
    secondaryHardpoints: [
      { row: 0, x: 0.15, svgX: 25, svgY: 32 },
      { row: 2, x: 0.5, svgX: 32, svgY: 40 },
      { row: 0, x: 0.85, svgX: 39, svgY: 32 },
      { row: 2, x: 0.2, svgX: 9, svgY: 29 },
      { row: 1, x: 0.35, svgX: 13, svgY: 29 },
      { row: 1, x: 0.65, svgX: 51, svgY: 29 },
      { row: 2, x: 0.8, svgX: 55, svgY: 29 },
    ],
  },

  // Defender: Tanky shield boat - bulky hexagonal shape
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
    primaryHardpoints: [
      { row: 0, x: 0.3, svgX: 22, svgY: 11.5 },
      { row: 0, x: 0.7, svgX: 42, svgY: 11.5 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.2, svgX: 25, svgY: 26 },
      { row: 0, x: 0.8, svgX: 39, svgY: 26 },
      { row: 1, x: 0.35, svgX: 16, svgY: 39 },
      { row: 1, x: 0.65, svgX: 48, svgY: 39 },
      { row: 2, x: 0.5, svgX: 32, svgY: 54 },
    ],
  },

  // Raider: Glass cannon - sharp angular attack shape
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
    primaryHardpoints: [
      { row: 0, x: 0.275, svgX: 20, svgY: 22 },
      { row: 0, x: 0.725, svgX: 44, svgY: 22 },
      { row: 1, x: 0.1, svgX: 10, svgY: 36 },
      { row: 1, x: 0.9, svgX: 54, svgY: 36 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.25, svgX: 16, svgY: 36 },
      { row: 1, x: 0.5, svgX: 32, svgY: 38 },
      { row: 0, x: 0.75, svgX: 48, svgY: 36 },
    ],
  },

  // Sentinel: Long-range support - elongated with sensor arrays
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
    primaryHardpoints: [
      { row: 0, x: 0.5, svgX: 32, svgY: 6 },
      { row: 0, x: 0.25, svgX: 10, svgY: 34 },
      { row: 0, x: 0.75, svgX: 54, svgY: 34 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.3, svgX: 24, svgY: 36 },
      { row: 0, x: 0.7, svgX: 40, svgY: 36 },
      { row: 0, x: 0.5, svgX: 32, svgY: 44 },
    ],
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
