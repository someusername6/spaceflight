/**
 * Enemy Ship Archetypes - Defines enemy-specific ship configurations.
 *
 * Separate from player archetypes in ship-archetypes.ts.
 * Uses the same createArchetype helper and ShipStats structure.
 */

import type { WeaponBankSpec } from '../components/weapons';
import { SHIP_CLASSES, type ShipClassStats } from '../data/ships';
import type { AIPlaystyle } from './ship-archetypes';

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
interface WeaponLoadout {
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
function createArchetype(
  shipClass: string,
  loadout: WeaponLoadout,
): EnemyShipStats {
  const classStats = SHIP_CLASSES[shipClass];
  if (!classStats) {
    throw new Error(`Unknown ship class: ${shipClass}`);
  }
  return { ...classStats, ...loadout, shipClassName: shipClass };
}

/**
 * Enemy ship archetypes.
 * Add new enemy types here.
 */
export const ENEMY_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Patrol craft with dual red lasers - close-range beam fighter
  firefly: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'redLaser', size: 1 },
      { name: 'redLaser', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 4, size: 1 }],
    preferredCombatRange: 300,
  }),

  // Patrol craft with dual pulse cannons - rapid-fire skirmisher
  dragonfly: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 4, size: 1 }],
  }),
};
