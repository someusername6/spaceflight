/**
 * Ship Archetype Validation - Validates weapon loadouts are internally consistent.
 *
 * Archetypes (ship-archetypes.ts) are the source of truth for loadouts.
 * This validation ensures:
 * 1. Weapon/missile names reference valid definitions
 * 2. Weapons fit within the ship class's bank constraints
 */

import { MISSILES } from '../data/missiles';
import { SHIP_CLASSES } from '../data/ships';
import { PRIMARY_WEAPONS } from '../data/weapons';
import { SHIP_ARCHETYPES } from './ship-archetypes';

/**
 * Validates that a ship archetype's loadout references valid weapons/missiles
 * and fits within the ship class's bank constraints.
 * Throws an error if validation fails.
 */
export function validateArchetypeLoadout(archetypeName: string): void {
  const stats = SHIP_ARCHETYPES[archetypeName];
  if (!stats) {
    return; // Unknown archetype, skip validation
  }

  // Get ship class for bank validation (stored in archetype by createArchetype)
  const shipClassName = stats.shipClassName;
  const shipClass = SHIP_CLASSES[shipClassName];
  if (!shipClass) {
    throw new Error(
      `Archetype '${archetypeName}' references unknown ship class: ${shipClassName}`,
    );
  }

  // Validate primary weapons
  for (let i = 0; i < stats.primaryWeapons.length; i++) {
    const weapon = stats.primaryWeapons[i];

    // Check weapon exists
    if (weapon && !PRIMARY_WEAPONS[weapon.name]) {
      throw new Error(
        `Archetype '${archetypeName}' primary bank ${i} references unknown weapon: ${weapon.name}`,
      );
    }

    // Check bank exists on ship class
    if (i >= shipClass.primaryBanks.length) {
      throw new Error(
        `Archetype '${archetypeName}' has ${stats.primaryWeapons.length} primary weapons ` +
          `but ship class '${shipClassName}' only has ${shipClass.primaryBanks.length} primary banks`,
      );
    }

    // Check weapon size fits in bank
    const bankSize = shipClass.primaryBanks[i] as number; // Safe: checked length above
    if (weapon && weapon.size > bankSize) {
      throw new Error(
        `Archetype '${archetypeName}' primary bank ${i} has size ${weapon.size} weapon ` +
          `but ship class '${shipClassName}' bank ${i} only supports size ${bankSize}`,
      );
    }
  }

  // Validate secondary weapons
  if (stats.secondaryWeapons) {
    for (let i = 0; i < stats.secondaryWeapons.length; i++) {
      const missile = stats.secondaryWeapons[i];

      // Check missile exists
      if (missile && !MISSILES[missile.name]) {
        throw new Error(
          `Archetype '${archetypeName}' secondary bank ${i} references unknown missile: ${missile.name}`,
        );
      }

      // Check bank exists on ship class
      if (i >= shipClass.secondaryBanks.length) {
        throw new Error(
          `Archetype '${archetypeName}' has ${stats.secondaryWeapons.length} secondary weapons ` +
            `but ship class '${shipClassName}' only has ${shipClass.secondaryBanks.length} secondary banks`,
        );
      }

      // Check missile size fits in bank
      const bankSize = shipClass.secondaryBanks[i] as number; // Safe: checked length above
      if (missile && missile.size > bankSize) {
        throw new Error(
          `Archetype '${archetypeName}' secondary bank ${i} has size ${missile.size} missile ` +
            `but ship class '${shipClassName}' bank ${i} only supports size ${bankSize}`,
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
