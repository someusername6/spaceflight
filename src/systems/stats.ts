/**
 * Combat Stats System - Helper functions for tracking combat statistics.
 *
 * These helpers are called by damage, weapon, missile, and decoy systems
 * to record statistics for the debrief screen.
 */

import {
  type CombatStats,
  type DestroyedShipRecord,
  getOrCreateWeaponStats,
  type SalvageableShip,
  snapshotStats,
} from '../components/combat-stats';
import { Faction, type FactionComponent } from '../components/faction';
import type { Health } from '../components/health';
import type { ShipIdentity } from '../components/ship-identity';
import type { PrimaryWeapons, SecondaryWeapons } from '../components/weapons';
import { getComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { SHIP_ARCHETYPES } from '../factories/ship-archetypes';

// Re-export weapon recording functions
export {
  recordBeamFired,
  recordBeamHit,
  recordDecoyDeployed,
  recordMissileHit,
  recordMissileLaunched,
  recordMissileSeduced,
  recordShotFired,
  recordShotHit,
} from './stats-weapons';

/** Initialize match stats at mission start */
export function initMatchStats(world: World): void {
  world.systemState.matchStats = {
    damageSources: new Map(),
    lastDamageSource: new Map(),
    destroyedShips: [],
    salvageableShips: [],
    missionStartTime: world.systemState.gameTime,
    missionEndTime: 0,
  };
}

/** Finalize match stats at mission end */
export function finalizeMatchStats(world: World): void {
  if (world.systemState.matchStats) {
    world.systemState.matchStats.missionEndTime = world.systemState.gameTime;
  }
}

/** Get match stats (creates if needed) */
function getMatchStats(world: World) {
  if (!world.systemState.matchStats) {
    initMatchStats(world);
  }
  // After initMatchStats, matchStats is guaranteed to exist
  const stats = world.systemState.matchStats;
  if (!stats) {
    throw new Error('matchStats should exist after initialization');
  }
  return stats;
}

/**
 * Record damage dealt from source to target.
 * Updates both source's damage dealt and target's damage received.
 * Also tracks damage sources for kill/assist calculation.
 */
export function recordDamage(
  world: World,
  source: Entity,
  target: Entity,
  weaponName: string,
  weaponCategory: WeaponStats['category'],
  amount: number,
  isPulseBeam = false,
): void {
  if (amount <= 0) return;

  const matchStats = getMatchStats(world);

  // Update source's damage dealt
  const sourceStats = getComponent<CombatStats>(world, source, 'combatStats');
  if (sourceStats) {
    sourceStats.damageDealt += amount;
    const weaponStats = getOrCreateWeaponStats(
      sourceStats,
      weaponName,
      weaponCategory,
      isPulseBeam,
    );
    weaponStats.damageDealt += amount;
  }

  // Update target's damage received
  const targetStats = getComponent<CombatStats>(world, target, 'combatStats');
  if (targetStats) {
    targetStats.damageReceived += amount;
  }

  // Track damage source for kill/assist (only for ships)
  if (hasComponent(world, target, 'shipIdentity')) {
    // Add source to target's damage sources
    let sources = matchStats.damageSources.get(target);
    if (!sources) {
      sources = new Set();
      matchStats.damageSources.set(target, sources);
    }
    sources.add(source);

    // Update last damage source
    matchStats.lastDamageSource.set(target, source);
  }
}

/** Initialize weapon ammo counts on ship (call after creating ship) */
export function initWeaponAmmoCounts(world: World, entity: Entity): void {
  const stats = getComponent<CombatStats>(world, entity, 'combatStats');
  if (!stats) return;

  // Track primary weapon ammo (finite ammo weapons)
  const primaryWeapons = getComponent<PrimaryWeapons>(
    world,
    entity,
    'primaryWeapons',
  );
  if (primaryWeapons) {
    for (const weapon of primaryWeapons.weapons) {
      if (weapon && weapon.ammo !== undefined) {
        const weaponStats = getOrCreateWeaponStats(
          stats,
          weapon.name,
          'projectile',
        );
        weaponStats.ammoCarried = weapon.ammo;
      }
    }
  }

  // Track secondary weapon ammo (missiles and decoys)
  const secondaryWeapons = getComponent<SecondaryWeapons>(
    world,
    entity,
    'secondaryWeapons',
  );
  if (secondaryWeapons) {
    for (const weapon of secondaryWeapons.weapons) {
      if (!weapon) continue;
      if (weapon.isDecoy) {
        const weaponStats = getOrCreateWeaponStats(stats, 'Decoy', 'decoy');
        weaponStats.decoysCarried += weapon.count;
      } else {
        const weaponStats = getOrCreateWeaponStats(
          stats,
          weapon.name,
          'missile',
        );
        weaponStats.ammoCarried += weapon.count;
      }
    }
  }
}

/**
 * Handle ship death - resolve kills/assists, snapshot stats.
 * Called from cleanup system when a ship dies.
 */
export function handleShipDeath(world: World, entity: Entity): void {
  const matchStats = getMatchStats(world);
  const gameTime = world.systemState.gameTime;

  // Get ship info
  const identity = getComponent<ShipIdentity>(world, entity, 'shipIdentity');
  const health = getComponent<Health>(world, entity, 'health');
  const faction = getComponent<FactionComponent>(world, entity, 'faction');
  const combatStats = getComponent<CombatStats>(world, entity, 'combatStats');
  const primaryWeapons = getComponent<PrimaryWeapons>(
    world,
    entity,
    'primaryWeapons',
  );
  const secondaryWeapons = getComponent<SecondaryWeapons>(
    world,
    entity,
    'secondaryWeapons',
  );

  if (!identity || !health) return;

  // Determine killer and assists
  const killer = matchStats.lastDamageSource.get(entity);
  const damageSources = matchStats.damageSources.get(entity);

  // Award kill to killer (including posthumous kills if killer already died)
  if (killer !== undefined) {
    const killerStats = getComponent<CombatStats>(world, killer, 'combatStats');
    if (killerStats) {
      killerStats.kills++;
    } else {
      // Killer may have died - check destroyed ships for posthumous kill
      const killerRecord = matchStats.destroyedShips.find(
        (r) => r.entityId === killer,
      );
      if (killerRecord) {
        killerRecord.stats.kills++;
      }
    }
  }

  // Award assists to everyone else who damaged this ship
  if (damageSources) {
    for (const source of damageSources) {
      if (source !== killer) {
        const sourceStats = getComponent<CombatStats>(
          world,
          source,
          'combatStats',
        );
        if (sourceStats) {
          sourceStats.assists++;
        } else {
          // Assister may have died - check destroyed ships for posthumous assist
          const sourceRecord = matchStats.destroyedShips.find(
            (r) => r.entityId === source,
          );
          if (sourceRecord) {
            sourceRecord.stats.assists++;
          }
        }
      }
    }
  }

  // Snapshot stats for debrief (only for player faction ships)
  if (combatStats && faction && faction.faction === Faction.Player) {
    const record: DestroyedShipRecord = {
      entityId: entity,
      archetype: identity.archetype,
      callsign: identity.callsign,
      wasPlayer: hasComponent(world, entity, 'playerControlled'),
      isWingman:
        !hasComponent(world, entity, 'playerControlled') &&
        faction.faction === Faction.Player,
      stats: snapshotStats(combatStats),
      hullMax: health.maxHull,
      timeOfDeath: gameTime - matchStats.missionStartTime,
    };
    matchStats.destroyedShips.push(record);
  }

  // Record ALL ships for salvage (enemies and allies)
  // Use shipClassName from archetype (not archetype name) for correct price lookup
  const archetypeStats = SHIP_ARCHETYPES[identity.archetype];
  const shipClass = archetypeStats?.shipClassName ?? identity.archetype;
  const salvageRecord: SalvageableShip = {
    shipClass,
    primaryWeapons: [],
    secondaryWeapons: [],
  };

  // Capture primary weapons and remaining ammo
  if (primaryWeapons) {
    for (const weapon of primaryWeapons.weapons) {
      if (weapon) {
        salvageRecord.primaryWeapons.push({
          weaponType: weapon.name,
          // Only include ammoRemaining if weapon has finite ammo
          ...(weapon.ammo !== undefined && { ammoRemaining: weapon.ammo }),
        });
      }
    }
  }

  // Capture secondary weapons and remaining count
  if (secondaryWeapons) {
    for (const weapon of secondaryWeapons.weapons) {
      if (weapon) {
        salvageRecord.secondaryWeapons.push({
          weaponType: weapon.name,
          count: weapon.count,
          isDecoy: weapon.isDecoy ?? false,
        });
      }
    }
  }

  matchStats.salvageableShips.push(salvageRecord);

  // Clean up tracking data
  matchStats.damageSources.delete(entity);
  matchStats.lastDamageSource.delete(entity);
}

/** Get mission duration in seconds */
export function getMissionDuration(world: World): number {
  const matchStats = world.systemState.matchStats;
  if (!matchStats) return 0;
  return matchStats.missionEndTime - matchStats.missionStartTime;
}
