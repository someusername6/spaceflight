/**
 * Store catalog functions - lists of available items for purchase.
 */

import { MISSILES } from '../../data/missiles';
import {
  getAmmoPrice,
  getPrimaryPrice,
  getScrapPrice,
  getSecondaryPrice,
  getShipPrice,
} from '../../data/prices';
import { SHIP_CLASSES } from '../../data/ships';
import { PRIMARY_WEAPONS } from '../../data/weapons';
import type { StoreStock } from '../types';
import {
  PRIMARY_UNLOCK_SECTOR,
  SECONDARY_UNLOCK_SECTOR,
  SHIP_UNLOCK_SECTOR,
} from './store-unlocks';

/** Get list of available ships for purchase (derived from SHIP_CLASSES) */
export function getAvailableShips(): Array<{
  shipClass: string;
  buyPrice: number;
}> {
  return Object.keys(SHIP_CLASSES)
    .map((shipClass) => ({
      shipClass,
      buyPrice: getShipPrice(shipClass, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get list of available primary weapons for purchase (derived from PRIMARY_WEAPONS) */
export function getAvailablePrimaries(): Array<{
  weaponType: string;
  buyPrice: number;
}> {
  return Object.keys(PRIMARY_WEAPONS)
    .map((weaponType) => ({
      weaponType,
      buyPrice: getPrimaryPrice(weaponType, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get list of available secondary weapons for purchase (derived from MISSILES) */
export function getAvailableSecondaries(): Array<{
  weaponType: string;
  buyPrice: number;
}> {
  return Object.keys(MISSILES)
    .map((weaponType) => ({
      weaponType,
      buyPrice: getSecondaryPrice(weaponType, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get list of available ammo types for purchase (derived from PRIMARY_WEAPONS with ammo) */
export function getAvailableAmmo(): Array<{
  weaponType: string;
  buyPrice: number;
}> {
  return Object.entries(PRIMARY_WEAPONS)
    .filter(([_, stats]) => stats.ammo !== undefined)
    .map(([weaponType]) => ({
      weaponType,
      buyPrice: getAmmoPrice(weaponType, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get all scrap types (all ship classes that have a price) */
export function getScrapTypes(): Array<{
  shipClass: string;
  sellPrice: number;
}> {
  return Object.keys(SHIP_CLASSES)
    .map((shipClass) => ({
      shipClass,
      sellPrice: getScrapPrice(shipClass),
    }))
    .filter((item) => item.sellPrice > 0);
}

// ============ BASE STOCK CONSTANTS (on sector entry) ============
// Validated via scripts/simulations/stock-balance.mjs

/** Ships per type on sector entry */
const SHIP_BASE = 5;
/** Extra ships per sector the item has been available */
const SHIP_SECTOR_BONUS = 2;

/** Primaries per type on sector entry */
const PRIMARY_BASE = 6;
/** Extra primaries per sector the item has been available */
const PRIMARY_SECTOR_BONUS = 1;

/** Multiplied by missile capacity for base stock */
const MISSILE_BASE_LOADS = 20;

/** Multiplied by weapon baseAmmo for base stock */
const AMMO_BASE_REFILLS = 12;

/** Bonus multiplier per sector item has been available (+25% per sector) */
const AVAILABILITY_BONUS = 0.25;

// ============ TRICKLE CONSTANTS (per mission) ============

/** Base probability for S1 items to restock (+1) per mission */
export const TRICKLE_PROB_BASE = 0.4;
/** Probability decay per unlock sector (-5% per tier) */
export const TRICKLE_PROB_DECAY = 0.05;

/** Multiplied by missile capacity for per-mission trickle */
export const MISSILE_TRICKLE_LOADS = 2;

/** Multiplied by weapon baseAmmo for per-mission trickle */
export const AMMO_TRICKLE_REFILLS = 1.5;

// ============ BASE STOCK HELPERS ============
// Single source of truth for base stock calculations

/** Calculate base missile stock for a given capacity and sectors available */
export function getMissileBaseStock(
  capacity: number,
  sectorsAvailable: number,
): number {
  const bonus = 1 + sectorsAvailable * AVAILABILITY_BONUS;
  return Math.floor(MISSILE_BASE_LOADS * capacity * bonus);
}

/** Calculate base ammo stock for a given base ammo and sectors available */
export function getAmmoBaseStock(
  baseAmmo: number,
  sectorsAvailable: number,
): number {
  const bonus = 1 + sectorsAvailable * AVAILABILITY_BONUS;
  return Math.floor(AMMO_BASE_REFILLS * baseAmmo * bonus);
}

// ============ STOCK CAP CONSTANTS (consumables only) ============
// Prevents infinite accumulation while allowing generous supply

/** Assumed missions per sector for cap calculation */
const MISSIONS_PER_SECTOR = 8;

/**
 * Get maximum stock for a missile type.
 * Cap = base + (missions_per_sector × trickle_per_mission)
 * This represents "one sector's worth" of supply accumulation.
 */
export function getMissileStockCap(
  capacity: number,
  sectorsAvailable: number,
): number {
  const base = getMissileBaseStock(capacity, sectorsAvailable);
  const tricklePerMission = Math.floor(MISSILE_TRICKLE_LOADS * capacity);
  return base + MISSIONS_PER_SECTOR * tricklePerMission;
}

/**
 * Get maximum stock for an ammo type.
 * Cap = base + (missions_per_sector × trickle_per_mission)
 */
export function getAmmoStockCap(
  baseAmmo: number,
  sectorsAvailable: number,
): number {
  const base = getAmmoBaseStock(baseAmmo, sectorsAvailable);
  const tricklePerMission = Math.round(AMMO_TRICKLE_REFILLS * baseAmmo);
  return base + MISSIONS_PER_SECTOR * tricklePerMission;
}

/**
 * Get trickle probability for an item based on its unlock sector.
 * S1: 40%, S2: 35%, S3: 30%, S4: 25%, S5: 20%
 */
export function getTrickleProbability(unlockSector: number): number {
  return Math.max(
    0.05,
    TRICKLE_PROB_BASE - (unlockSector - 1) * TRICKLE_PROB_DECAY,
  );
}

/**
 * Generate store stock for a specific sector.
 * Only items unlocked at or before this sector are stocked.
 * Ships/primaries use flat base + sector bonus.
 * Missiles/ammo are capacity-scaled for balanced consumption.
 */
export function generateSectorStock(sector: number): StoreStock {
  // Ships: base + sector bonus for established items
  const ships: Record<string, number> = {};
  for (const { shipClass } of getAvailableShips()) {
    const unlockSector = SHIP_UNLOCK_SECTOR[shipClass] ?? 1;
    if (unlockSector <= sector) {
      const sectorsAvailable = sector - unlockSector;
      ships[shipClass] = SHIP_BASE + sectorsAvailable * SHIP_SECTOR_BONUS;
    }
  }

  // Primary weapons: base + sector bonus for established items
  const primaries: Record<string, number> = {};
  for (const { weaponType } of getAvailablePrimaries()) {
    const unlockSector = PRIMARY_UNLOCK_SECTOR[weaponType] ?? 1;
    if (unlockSector <= sector) {
      const sectorsAvailable = sector - unlockSector;
      primaries[weaponType] =
        PRIMARY_BASE + sectorsAvailable * PRIMARY_SECTOR_BONUS;
    }
  }

  // Secondary weapons (missiles): capacity-scaled
  const secondaries: Record<string, number> = {};
  for (const { weaponType } of getAvailableSecondaries()) {
    const unlockSector = SECONDARY_UNLOCK_SECTOR[weaponType] ?? 1;
    if (unlockSector <= sector) {
      const sectorsAvailable = sector - unlockSector;
      const capacity = MISSILES[weaponType]?.capacity ?? 10;
      secondaries[weaponType] = getMissileBaseStock(capacity, sectorsAvailable);
    }
  }

  // Ammo: consumption-scaled based on weapon's base ammo
  const ammo: Record<string, number> = {};
  for (const { weaponType } of getAvailableAmmo()) {
    const unlockSector = PRIMARY_UNLOCK_SECTOR[weaponType] ?? 1;
    if (unlockSector <= sector) {
      const sectorsAvailable = sector - unlockSector;
      const baseAmmo = PRIMARY_WEAPONS[weaponType]?.ammo ?? 100;
      ammo[weaponType] = getAmmoBaseStock(baseAmmo, sectorsAvailable);
    }
  }

  return { ships, primaries, secondaries, ammo };
}

/** Create initial store stock (sector 1) */
export function createInitialStoreStock(): StoreStock {
  return generateSectorStock(1);
}
