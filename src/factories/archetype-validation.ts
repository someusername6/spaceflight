/**
 * Ship Archetype Validation - Validates weapon loadouts are internally consistent.
 *
 * Archetypes (ship-archetypes.ts) are the source of truth for loadouts.
 * This validation ensures weapon/missile names reference valid definitions.
 */

import { MISSILES } from '../data/missiles';
import { PRIMARY_WEAPONS } from '../data/weapons';
import { SHIP_ARCHETYPES } from './ship-archetypes';

/**
 * Validates that a ship archetype's loadout references valid weapons/missiles.
 * Throws an error if any weapon or missile name is invalid.
 */
export function validateArchetypeLoadout(archetypeName: string): void {
  const stats = SHIP_ARCHETYPES[archetypeName];
  if (!stats) {
    return; // Unknown archetype, skip validation
  }

  // Validate primary weapon names exist
  for (let i = 0; i < stats.primaryWeapons.length; i++) {
    const weapon = stats.primaryWeapons[i];
    if (weapon && !PRIMARY_WEAPONS[weapon.name]) {
      throw new Error(
        `Archetype '${archetypeName}' primary bank ${i} references unknown weapon: ${weapon.name}`,
      );
    }
  }

  // Validate secondary weapon names exist
  if (stats.secondaryWeapons) {
    for (let i = 0; i < stats.secondaryWeapons.length; i++) {
      const missile = stats.secondaryWeapons[i];
      if (missile && !MISSILES[missile.name]) {
        throw new Error(
          `Archetype '${archetypeName}' secondary bank ${i} references unknown missile: ${missile.name}`,
        );
      }
    }
  }
}

/**
 * Validates all ship archetypes.
 * This catches invalid weapon/missile references immediately.
 */
export function validateAllArchetypes(): void {
  for (const name of Object.keys(SHIP_ARCHETYPES)) {
    validateArchetypeLoadout(name);
  }
}
