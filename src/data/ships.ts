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
  // Base reference for proportional scaling (mesh size: 2.83)
  patrol: {
    hull: 45,
    shields: 45,
    shieldRegen: 5,
    shieldDelay: 3,
    maxSpeed: 90,
    acceleration: 45,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 5, // baseline
    maxHeat: 90,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryBanks: [1, 1],
    secondaryBanks: [1],
    primaryHardpoints: [
      { row: 0, x: 0.2, svgX: 12, svgY: 24 },
      { row: 0, x: 0.8, svgX: 52, svgY: 24 },
    ],
    secondaryHardpoints: [{ row: 0, x: 0.5, svgX: 32, svgY: 46 }],
  },

  // Scout: Fast and fragile - narrow arrow shape (mesh size: 3.78, scale: 1.34x)
  scout: {
    hull: 55,
    shields: 35,
    shieldRegen: 8,
    shieldDelay: 2,
    maxSpeed: 150,
    acceleration: 75,
    turnRate: 120,
    rollRate: 180,
    collisionRadius: 7,
    maxHeat: 80,
    coolingRate: 15,
    afterburnerHeatRate: 25,
    primaryBanks: [1, 1],
    secondaryBanks: [1],
    primaryHardpoints: [
      { row: 0, x: 0.35, svgX: 20, svgY: 28 },
      { row: 0, x: 0.65, svgX: 44, svgY: 28 },
    ],
    secondaryHardpoints: [{ row: 0, x: 0.5, svgX: 32, svgY: 48 }],
  },

  // Fighter: Standard player craft - swept wings (mesh size: 6.56, scale: 2.32x)
  fighter: {
    hull: 90,
    shields: 65,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 125,
    acceleration: 50,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 11,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryBanks: [1, 1],
    secondaryBanks: [1, 1],
    primaryHardpoints: [
      { row: 0, x: 0.25, svgX: 8, svgY: 36 },
      { row: 0, x: 0.75, svgX: 56, svgY: 36 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.35, svgX: 16, svgY: 38 },
      { row: 0, x: 0.65, svgX: 48, svgY: 38 },
    ],
  },

  // Interceptor: Quick dogfighter - sharp delta wings (mesh size: 3.92, scale: 1.38x)
  interceptor: {
    hull: 75,
    shields: 50,
    shieldRegen: 9,
    shieldDelay: 2.5,
    maxSpeed: 138,
    acceleration: 62,
    turnRate: 110,
    rollRate: 165,
    collisionRadius: 7,
    maxHeat: 90,
    coolingRate: 16,
    afterburnerHeatRate: 32,
    primaryBanks: [2, 2],
    secondaryBanks: [1, 2, 1],
    primaryHardpoints: [
      { row: 0, x: 0.2, svgX: 6, svgY: 44 },
      { row: 0, x: 0.8, svgX: 58, svgY: 44 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.25, svgX: 18, svgY: 44 },
      { row: 0, x: 0.5, svgX: 32, svgY: 50 },
      { row: 0, x: 0.75, svgX: 46, svgY: 44 },
    ],
  },

  // Striker: Heavy assault fighter - thick body with angular wings (mesh size: 8.43, scale: 2.98x)
  striker: {
    hull: 130,
    shields: 90,
    shieldRegen: 12,
    shieldDelay: 3,
    maxSpeed: 100,
    acceleration: 40,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 15,
    maxHeat: 150,
    coolingRate: 25,
    afterburnerHeatRate: 60,
    primaryBanks: [2, 2, 2, 1, 1],
    secondaryBanks: [1],
    primaryHardpoints: [
      { row: 2, x: 0.15, svgX: 8, svgY: 32 },
      { row: 0, x: 0.5, svgX: 32, svgY: 16 },
      { row: 2, x: 0.85, svgX: 56, svgY: 32 },
      { row: 1, x: 0.35, svgX: 22, svgY: 24 },
      { row: 1, x: 0.65, svgX: 42, svgY: 24 },
    ],
    secondaryHardpoints: [{ row: 0, x: 0.5, svgX: 32, svgY: 48 }],
  },

  // Bomber: Slow, missile-focused - wide wingspan (mesh size: 6.00, scale: 2.12x)
  bomber: {
    hull: 110,
    shields: 80,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 90,
    acceleration: 35,
    turnRate: 75,
    rollRate: 110,
    collisionRadius: 11,
    maxHeat: 80,
    coolingRate: 12,
    afterburnerHeatRate: 55,
    primaryBanks: [2],
    secondaryBanks: [2, 2, 2, 1, 1, 1, 1],
    primaryHardpoints: [{ row: 1, x: 0.5, svgX: 32, svgY: 20 }],
    secondaryHardpoints: [
      { row: 0, x: 0.15, svgX: 10, svgY: 26 },
      { row: 2, x: 0.5, svgX: 32, svgY: 32 },
      { row: 0, x: 0.85, svgX: 56, svgY: 26 },
      { row: 2, x: 0.2, svgX: 10, svgY: 38 },
      { row: 1, x: 0.35, svgX: 20, svgY: 44 },
      { row: 1, x: 0.65, svgX: 44, svgY: 44 },
      { row: 2, x: 0.8, svgX: 56, svgY: 38 },
    ],
  },

  // Defender: Tanky shield boat - bulky hexagonal shape (mesh size: 5.57, scale: 1.97x)
  defender: {
    hull: 165,
    shields: 130,
    shieldRegen: 18,
    shieldDelay: 2.5,
    maxSpeed: 90,
    acceleration: 35,
    turnRate: 70,
    rollRate: 100,
    collisionRadius: 10,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 50,
    primaryBanks: [2, 2],
    secondaryBanks: [2, 2, 1, 1, 1],
    primaryHardpoints: [
      { row: 0, x: 0.3, svgX: 16, svgY: 14 },
      { row: 0, x: 0.7, svgX: 48, svgY: 14 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.2, svgX: 10, svgY: 32 },
      { row: 2, x: 0.5, svgX: 32, svgY: 48 },
      { row: 0, x: 0.8, svgX: 54, svgY: 32 },
      { row: 1, x: 0.35, svgX: 16, svgY: 50 },
      { row: 1, x: 0.65, svgX: 48, svgY: 50 },
    ],
  },

  // Raider: Glass cannon - sharp angular attack shape (mesh size: 6.32, scale: 2.23x)
  raider: {
    hull: 65,
    shields: 45,
    shieldRegen: 6,
    shieldDelay: 4,
    maxSpeed: 140,
    acceleration: 60,
    turnRate: 110,
    rollRate: 160,
    collisionRadius: 11,
    maxHeat: 140,
    coolingRate: 22,
    afterburnerHeatRate: 35,
    primaryBanks: [3, 3, 1, 1],
    secondaryBanks: [1, 1, 1],
    primaryHardpoints: [
      { row: 0, x: 0.275, svgX: 24, svgY: 12 },
      { row: 0, x: 0.725, svgX: 40, svgY: 12 },
      { row: 1, x: 0.1, svgX: 10, svgY: 16 },
      { row: 1, x: 0.9, svgX: 54, svgY: 16 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.25, svgX: 16, svgY: 28 },
      { row: 1, x: 0.5, svgX: 32, svgY: 44 },
      { row: 0, x: 0.75, svgX: 48, svgY: 28 },
    ],
  },

  // Sentinel: Long-range support - elongated with sensor arrays (mesh size: 4.80, scale: 1.70x)
  sentinel: {
    hull: 110,
    shields: 110,
    shieldRegen: 15,
    shieldDelay: 3,
    maxSpeed: 100,
    acceleration: 45,
    turnRate: 90,
    rollRate: 130,
    collisionRadius: 8,
    maxHeat: 130,
    coolingRate: 22,
    afterburnerHeatRate: 45,
    primaryBanks: [3, 2, 2],
    secondaryBanks: [2, 2, 1],
    primaryHardpoints: [
      { row: 0, x: 0.25, svgX: 16, svgY: 32 },
      { row: 0, x: 0.5, svgX: 32, svgY: 12 },
      { row: 0, x: 0.75, svgX: 48, svgY: 32 },
    ],
    secondaryHardpoints: [
      { row: 0, x: 0.3, svgX: 16, svgY: 36 },
      { row: 0, x: 0.5, svgX: 32, svgY: 52 },
      { row: 0, x: 0.7, svgX: 48, svgY: 36 },
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
