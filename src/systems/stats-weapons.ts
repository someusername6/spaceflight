/**
 * Combat Stats - Weapon Recording Functions.
 *
 * These helpers record weapon-specific statistics for the debrief screen.
 */

import {
  type CombatStats,
  getOrCreateWeaponStats,
  type WeaponStats,
} from '../components/combat-stats';
import { getComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Record a projectile shot fired (or pulse beam pulse) */
export function recordShotFired(
  world: World,
  source: Entity,
  weaponName: string,
  category: WeaponStats['category'] = 'projectile',
  isPulseBeam = false,
): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(
      stats,
      weaponName,
      category,
      isPulseBeam,
    );
    weaponStats.shotsFired++;
  }
}

/** Record a projectile shot that hit a target (or pulse beam pulse) */
export function recordShotHit(
  world: World,
  source: Entity,
  weaponName: string,
  category: WeaponStats['category'] = 'projectile',
  isPulseBeam = false,
): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(
      stats,
      weaponName,
      category,
      isPulseBeam,
    );
    weaponStats.shotsOnTarget++;
  }
}

/** Record beam firing time (called each frame while beam is active) */
export function recordBeamFired(
  world: World,
  source: Entity,
  weaponName: string,
  dt: number,
): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(stats, weaponName, 'beam');
    weaponStats.timeFired += dt;
  }
}

/** Record beam time on target (called each frame while beam is hitting) */
export function recordBeamHit(
  world: World,
  source: Entity,
  weaponName: string,
  dt: number,
): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(stats, weaponName, 'beam');
    weaponStats.timeOnTarget += dt;
  }
}

/** Record missile launched */
export function recordMissileLaunched(
  world: World,
  source: Entity,
  missileName: string,
): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(stats, missileName, 'missile');
    weaponStats.missilesLaunched++;
  }
}

/** Record missile hit target */
export function recordMissileHit(
  world: World,
  source: Entity,
  missileName: string,
): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(stats, missileName, 'missile');
    weaponStats.missilesHit++;
  }
}

/** Record missile seduced by a decoy */
export function recordMissileSeduced(
  world: World,
  missileOwner: Entity,
  missileName: string,
  decoyOwner: Entity,
): void {
  // Record on missile owner's stats
  const missileStats = getComponent<CombatStats>(
    world,
    missileOwner,
    'combatStats',
  );
  if (missileStats) {
    const weaponStats = getOrCreateWeaponStats(
      missileStats,
      missileName,
      'missile',
    );
    weaponStats.missilesSeduced++;
  }

  // Record on decoy owner's stats
  const decoyStats = getComponent<CombatStats>(
    world,
    decoyOwner,
    'combatStats',
  );
  if (decoyStats) {
    const weaponStats = getOrCreateWeaponStats(decoyStats, 'Decoy', 'decoy');
    weaponStats.missilesSeducedByDecoy++;
  }
}

/** Record decoy deployed */
export function recordDecoyDeployed(world: World, source: Entity): void {
  const stats = getComponent<CombatStats>(world, source, 'combatStats');
  if (stats) {
    const weaponStats = getOrCreateWeaponStats(stats, 'Decoy', 'decoy');
    weaponStats.decoysDeployed++;
  }
}
