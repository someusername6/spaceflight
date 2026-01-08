/**
 * Store catalog functions - lists of available items for purchase.
 */

import { MISSILES } from '../data/missiles';
import {
  getAmmoPrice,
  getPrimaryPrice,
  getScrapPrice,
  getSecondaryPrice,
  getShipPrice,
} from '../data/prices';
import { SHIP_CLASSES } from '../data/ships';
import { PRIMARY_WEAPONS } from '../data/weapons';
import type { StoreStock } from './types';

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

/** Default stock for all items (high value for testing) */
const DEFAULT_STOCK = 10000;

/** Create initial store stock with default quantities */
export function createInitialStoreStock(): StoreStock {
  return {
    ships: Object.fromEntries(
      getAvailableShips().map((h) => [h.shipClass, DEFAULT_STOCK]),
    ),
    primaries: Object.fromEntries(
      getAvailablePrimaries().map((w) => [w.weaponType, DEFAULT_STOCK]),
    ),
    secondaries: Object.fromEntries(
      getAvailableSecondaries().map((w) => [w.weaponType, DEFAULT_STOCK]),
    ),
    ammo: Object.fromEntries(
      getAvailableAmmo().map((a) => [a.weaponType, DEFAULT_STOCK]),
    ),
  };
}
