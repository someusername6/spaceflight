/**
 * Stock Balance Simulation - Core Simulation Logic
 *
 * This file contains the stock generation and trickle functions.
 * Extracted to keep the main simulation file under 400 lines.
 */

import {
  AMMO_WEAPONS,
  CONSTANTS,
  MISSILES,
  PRIMARIES,
  SHIPS,
} from './stock-balance-data.mjs';

// ============ SEEDED PRNG ============

export function createPRNG(seed) {
  let state = seed;
  return function random() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ============ STOCK GENERATION ============

export function getTrickleProbability(unlockSector) {
  return Math.max(
    0.05,
    CONSTANTS.TRICKLE_PROB_BASE -
      (unlockSector - 1) * CONSTANTS.TRICKLE_PROB_DECAY,
  );
}

export function generateSectorStock(sector) {
  const stock = {
    ships: {},
    primaries: {},
    missiles: {},
    ammo: {},
  };

  // Ships
  for (const [name, data] of Object.entries(SHIPS)) {
    if (data.unlockSector <= sector) {
      const sectorsAvailable = sector - data.unlockSector;
      stock.ships[name] =
        CONSTANTS.SHIP_BASE + sectorsAvailable * CONSTANTS.SHIP_SECTOR_BONUS;
    }
  }

  // Primaries
  for (const [name, data] of Object.entries(PRIMARIES)) {
    if (data.unlockSector <= sector) {
      const sectorsAvailable = sector - data.unlockSector;
      stock.primaries[name] =
        CONSTANTS.PRIMARY_BASE +
        sectorsAvailable * CONSTANTS.PRIMARY_SECTOR_BONUS;
    }
  }

  // Missiles
  for (const [name, data] of Object.entries(MISSILES)) {
    if (data.unlockSector <= sector) {
      const sectorsAvailable = sector - data.unlockSector;
      const bonus = 1 + sectorsAvailable * CONSTANTS.AVAILABILITY_BONUS;
      stock.missiles[name] = Math.floor(
        CONSTANTS.MISSILE_BASE_LOADS * data.capacity * bonus,
      );
    }
  }

  // Ammo
  for (const [name, data] of Object.entries(AMMO_WEAPONS)) {
    if (data.unlockSector <= sector) {
      const sectorsAvailable = sector - data.unlockSector;
      const bonus = 1 + sectorsAvailable * CONSTANTS.AVAILABILITY_BONUS;
      stock.ammo[name] = Math.floor(
        CONSTANTS.AMMO_BASE_REFILLS * data.baseAmmo * bonus,
      );
    }
  }

  return stock;
}

export function applyTrickle(stock, sector, rng) {
  // Ships: probabilistic
  for (const [name, data] of Object.entries(SHIPS)) {
    if (data.unlockSector <= sector) {
      const prob = getTrickleProbability(data.unlockSector);
      if (rng() < prob) {
        stock.ships[name] = (stock.ships[name] ?? 0) + 1;
      }
    }
  }

  // Primaries: probabilistic
  for (const [name, data] of Object.entries(PRIMARIES)) {
    if (data.unlockSector <= sector) {
      const prob = getTrickleProbability(data.unlockSector);
      if (rng() < prob) {
        stock.primaries[name] = (stock.primaries[name] ?? 0) + 1;
      }
    }
  }

  // Missiles: guaranteed, capacity-scaled
  for (const [name, data] of Object.entries(MISSILES)) {
    if (data.unlockSector <= sector) {
      const trickle = Math.floor(
        CONSTANTS.MISSILE_TRICKLE_LOADS * data.capacity,
      );
      stock.missiles[name] = (stock.missiles[name] ?? 0) + trickle;
    }
  }

  // Ammo: guaranteed, consumption-scaled
  for (const [name, data] of Object.entries(AMMO_WEAPONS)) {
    if (data.unlockSector <= sector) {
      const trickle = Math.round(
        CONSTANTS.AMMO_TRICKLE_REFILLS * data.baseAmmo,
      );
      stock.ammo[name] = (stock.ammo[name] ?? 0) + trickle;
    }
  }

  return stock;
}
