/**
 * Enemy Archetype Types and Helpers
 */

import type { WeaponBankSpec } from '../../components/weapons';
import { SHIP_CLASSES, type ShipClassStats } from '../../data/ships';
import type { AIPlaystyle } from '../ship-archetypes';

/**
 * AI Playstyles:
 * - 'brawler': Standard combat, skill improves aim and composure. Default.
 * - 'escape': Hit-and-run, skill improves flee timing and survival.
 * - 'kiting': Ranged combat, skill improves range maintenance. Uses fleeDistance.
 */

/** Secondary weapon bank specification */
export interface SecondaryBankSpec {
  name: string;
  count: number;
  size: number;
}

/** Weapon loadout for an archetype */
export interface WeaponLoadout {
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
  playstyle?: AIPlaystyle;
  preferredCombatRange?: number;
  fleeDistance?: number;
}

/** Complete ship archetype (ship class stats + loadout) */
export interface EnemyShipStats extends ShipClassStats, WeaponLoadout {
  shipClassName: string;
}

/** Helper to create an archetype from a ship class and loadout */
export function createArchetype(
  shipClass: string,
  loadout: WeaponLoadout,
): EnemyShipStats {
  const classStats = SHIP_CLASSES[shipClass];
  if (!classStats) {
    throw new Error(`Unknown ship class: ${shipClass}`);
  }
  return { ...classStats, ...loadout, shipClassName: shipClass };
}
