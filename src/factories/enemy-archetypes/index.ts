/**
 * Enemy Ship Archetypes - Defines enemy-specific ship configurations.
 *
 * Separate from player archetypes in ship-archetypes.ts.
 * Uses the same createArchetype helper and ShipStats structure.
 */

export type { EnemyShipStats, SecondaryBankSpec, WeaponLoadout } from './types';
export { createArchetype } from './types';

import { CORE_ARCHETYPES } from './core';
import { ELITE_ARCHETYPES } from './elite';
import { SECTOR_ARCHETYPES } from './sector';

/** All enemy archetypes combined */
export const ENEMY_ARCHETYPES = {
  ...CORE_ARCHETYPES,
  ...SECTOR_ARCHETYPES,
  ...ELITE_ARCHETYPES,
};
