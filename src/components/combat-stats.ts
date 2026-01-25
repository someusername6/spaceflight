/**
 * Combat Stats component - tracks per-ship combat statistics.
 *
 * Each ship has its own stats that are updated during combat.
 * On death, stats are snapshotted to MatchStats for the debrief.
 */

import { logWarn } from '../core/logger';
import type { ComponentBase, Entity } from '../core/types';

/** Per-weapon statistics */
export interface WeaponStats {
  weaponName: string;
  category: 'projectile' | 'beam' | 'missile' | 'decoy';

  // Projectile weapons (energy/ballistic)
  shotsFired: number;
  shotsOnTarget: number; // Shots that dealt damage
  shrapnelHitsOnTarget: number; // Shrapnel pieces that hit (for flak)

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
    shrapnelHitsOnTarget: 0,
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
    logWarn(
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
  /** Campaign ship ID for linking back to campaign state (player/wingman only) */
  campaignShipId?: string;
  /** Pilot ID for removing from roster on death (player/wingman only) */
  pilotId?: string;
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

/** Weapon loadout snapshot for salvage calculation */
export interface SalvageableWeapon {
  weaponType: string;
  ammoRemaining?: number; // For ballistic primaries
}

/** Secondary weapon snapshot for salvage */
export interface SalvageableSecondary {
  weaponType: string;
  count: number; // Missiles/decoys remaining
  isDecoy: boolean;
}

/** Ship data needed for salvage calculation (all destroyed ships) */
export interface SalvageableShip {
  shipClass: string;
  primaryWeapons: SalvageableWeapon[];
  secondaryWeapons: SalvageableSecondary[];
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

// =============================================================================
// Serialization
// =============================================================================

/** Category as numeric */
const WeaponCategoryToNum: Record<WeaponStats['category'], number> = {
  projectile: 0,
  beam: 1,
  missile: 2,
  decoy: 3,
};
const NumToWeaponCategory: WeaponStats['category'][] = [
  'projectile',
  'beam',
  'missile',
  'decoy',
];

export interface SerializedWeaponStats {
  n: string; // weaponName
  c: number; // category
  sf: number; // shotsFired
  so: number; // shotsOnTarget
  sh: number; // shrapnelHitsOnTarget
  tf: number; // timeFired
  to: number; // timeOnTarget
  pb: boolean; // isPulseBeam
  ac: number; // ammoCarried
  ml: number; // missilesLaunched
  mh: number; // missilesHit
  ms: number; // missilesSeduced
  dc: number; // decoysCarried
  dd: number; // decoysDeployed
  msd: number; // missilesSeducedByDecoy
  dm: number; // damageDealt
}

export interface SerializedCombatStats {
  t: 20; // Component type ID
  k: number; // kills
  a: number; // assists
  dd: number; // damageDealt
  dr: number; // damageReceived
  ws: SerializedWeaponStats[]; // weaponStats
}

function serializeWeaponStats(w: WeaponStats): SerializedWeaponStats {
  return {
    n: w.weaponName,
    c: WeaponCategoryToNum[w.category],
    sf: w.shotsFired,
    so: w.shotsOnTarget,
    sh: w.shrapnelHitsOnTarget,
    tf: w.timeFired,
    to: w.timeOnTarget,
    pb: w.isPulseBeam,
    ac: w.ammoCarried,
    ml: w.missilesLaunched,
    mh: w.missilesHit,
    ms: w.missilesSeduced,
    dc: w.decoysCarried,
    dd: w.decoysDeployed,
    msd: w.missilesSeducedByDecoy,
    dm: w.damageDealt,
  };
}

function deserializeWeaponStats(s: SerializedWeaponStats): WeaponStats {
  return {
    weaponName: s.n,
    category: NumToWeaponCategory[s.c] ?? 'projectile',
    shotsFired: s.sf,
    shotsOnTarget: s.so,
    shrapnelHitsOnTarget: s.sh,
    timeFired: s.tf,
    timeOnTarget: s.to,
    isPulseBeam: s.pb,
    ammoCarried: s.ac,
    missilesLaunched: s.ml,
    missilesHit: s.mh,
    missilesSeduced: s.ms,
    decoysCarried: s.dc,
    decoysDeployed: s.dd,
    missilesSeducedByDecoy: s.msd,
    damageDealt: s.dm,
  };
}

export function serializeCombatStats(c: CombatStats): SerializedCombatStats {
  return {
    t: 20,
    k: c.kills,
    a: c.assists,
    dd: c.damageDealt,
    dr: c.damageReceived,
    ws: Array.from(c.weaponStats.values()).map(serializeWeaponStats),
  };
}

export function deserializeCombatStats(s: SerializedCombatStats): CombatStats {
  const weaponStats = new Map<string, WeaponStats>();
  for (const ws of s.ws) {
    weaponStats.set(ws.n, deserializeWeaponStats(ws));
  }
  return {
    type: 'combatStats',
    kills: s.k,
    assists: s.a,
    damageDealt: s.dd,
    damageReceived: s.dr,
    weaponStats,
  };
}
