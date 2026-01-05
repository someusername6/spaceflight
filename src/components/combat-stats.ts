/**
 * Combat Stats component - tracks per-ship combat statistics.
 *
 * Each ship has its own stats that are updated during combat.
 * On death, stats are snapshotted to MatchStats for the debrief.
 */

import type { ComponentBase, Entity } from '../core/types';

/** Per-weapon statistics */
export interface WeaponStats {
  weaponName: string;
  category: 'projectile' | 'beam' | 'missile' | 'decoy';

  // Projectile weapons (energy/ballistic)
  shotsFired: number;
  shotsOnTarget: number; // Shots that dealt damage

  // Beam weapons
  timeFired: number; // Seconds beam was active
  timeOnTarget: number; // Seconds beam was dealing damage
  isPulseBeam: boolean; // True for pulse beams (track shots, not time)

  // Missiles
  ammoCarried: number;
  missilesLaunched: number;
  missilesHit: number;
  missilesSeduced: number;

  // Decoys
  decoysCarried: number;
  decoysDeployed: number;
  missilesSeducedByDecoy: number;

  // All weapons
  damageDealt: number;
}

/** Create empty weapon stats */
export function createWeaponStats(
  weaponName: string,
  category: WeaponStats['category'],
  isPulseBeam = false,
): WeaponStats {
  return {
    weaponName,
    category,
    shotsFired: 0,
    shotsOnTarget: 0,
    timeFired: 0,
    timeOnTarget: 0,
    isPulseBeam,
    ammoCarried: 0,
    missilesLaunched: 0,
    missilesHit: 0,
    missilesSeduced: 0,
    decoysCarried: 0,
    decoysDeployed: 0,
    missilesSeducedByDecoy: 0,
    damageDealt: 0,
  };
}

/** Per-ship combat statistics component */
export interface CombatStats extends ComponentBase {
  readonly type: 'combatStats';

  // Aggregate stats
  kills: number;
  assists: number;
  damageDealt: number;
  damageReceived: number;

  // Per-weapon stats (keyed by weapon name)
  weaponStats: Map<string, WeaponStats>;
}

/** Create CombatStats component */
export function createCombatStats(): CombatStats {
  return {
    type: 'combatStats',
    kills: 0,
    assists: 0,
    damageDealt: 0,
    damageReceived: 0,
    weaponStats: new Map(),
  };
}

/** Get or create weapon stats for a given weapon */
export function getOrCreateWeaponStats(
  stats: CombatStats,
  weaponName: string,
  category: WeaponStats['category'],
  isPulseBeam = false,
): WeaponStats {
  let weaponStats = stats.weaponStats.get(weaponName);
  if (!weaponStats) {
    weaponStats = createWeaponStats(weaponName, category, isPulseBeam);
    stats.weaponStats.set(weaponName, weaponStats);
  } else if (isPulseBeam && !weaponStats.isPulseBeam) {
    // Catch inconsistent isPulseBeam calls - this indicates a bug in call order
    console.warn(
      `WeaponStats for "${weaponName}" created with isPulseBeam=false but later called with isPulseBeam=true. Check call order.`,
    );
    weaponStats.isPulseBeam = true; // Fix it anyway to avoid display issues
  }
  return weaponStats;
}

/** Snapshot of a destroyed ship's stats for debrief */
export interface DestroyedShipRecord {
  entityId: Entity;
  archetype: string;
  callsign: string;
  wasPlayer: boolean;
  isWingman: boolean;
  stats: {
    kills: number;
    assists: number;
    damageDealt: number;
    damageReceived: number;
    weaponStats: Array<WeaponStats>;
  };
  hullMax: number;
  timeOfDeath: number;
}

/** Convert CombatStats to a serializable snapshot */
export function snapshotStats(
  stats: CombatStats,
): DestroyedShipRecord['stats'] {
  return {
    kills: stats.kills,
    assists: stats.assists,
    damageDealt: stats.damageDealt,
    damageReceived: stats.damageReceived,
    weaponStats: Array.from(stats.weaponStats.values()),
  };
}
