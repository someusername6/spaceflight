/**
 * AI DPS Calculation Utilities - Calculate ship damage output.
 *
 * Used to determine which ships should attack the station (high DPS)
 * vs which should attack defenders (low DPS) in attack-station missions.
 */

import type { PrimaryWeapon } from '../../components/weapons';
import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/**
 * Calculate DPS for a single primary weapon.
 *
 * - Projectile weapons: damage / fireRate * bankSize
 * - Beam weapons: damage * bankSize (damage is per second)
 */
function calculateWeaponDps(weapon: PrimaryWeapon): number {
  if (weapon.category === 'beam') {
    // Beam weapons deal damage per second, scaled by bank size
    // Use 0.5 multiplier since beams require sustained fire on target
    return weapon.damage * weapon.bankSize * 0.5;
  }

  // Projectile weapons: damage per shot / fire interval
  if (weapon.fireRate <= 0) return 0;
  return (weapon.damage / weapon.fireRate) * weapon.bankSize;
}

/**
 * Calculate total DPS for a ship's primary weapons.
 *
 * @param world - Game world
 * @param entity - Ship entity
 * @returns Total DPS across all primary weapons, or 0 if no weapons
 */
export function calculateShipDps(world: World, entity: Entity): number {
  const primaryWeapons = getComponent(world, entity, 'primaryWeapons');
  if (!primaryWeapons) return 0;

  let totalDps = 0;
  for (const weapon of primaryWeapons.weapons) {
    totalDps += calculateWeaponDps(weapon);
  }

  return totalDps;
}

/**
 * Check if a ship is considered "high DPS" based on threshold.
 *
 * @param world - Game world
 * @param entity - Ship entity
 * @param threshold - DPS threshold for "high DPS" classification
 * @returns true if ship DPS >= threshold
 */
export function isHighDpsShip(
  world: World,
  entity: Entity,
  threshold: number,
): boolean {
  return calculateShipDps(world, entity) >= threshold;
}
