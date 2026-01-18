/**
 * Station Stats - defines stats for station structures.
 *
 * Stations are large, stationary structures with high health pools.
 * They have regenerating shields but no weapons or mobility.
 *
 * Reference scales:
 * - Fighter: hull=90, shields=65
 * - Defender (tankiest ship): hull=165, shields=130
 * - Convoy transport: hull=600, shields=300
 * - Station: hull=3000-6000, shields=1500-3000 (5-10x convoy)
 */

/** Station type identifier */
export type StationType = 'mining' | 'refinery' | 'military';

/** Stats for a station type */
export interface StationStats {
  /** Hull health points */
  hull: number;
  /** Maximum shield points */
  shields: number;
  /** Shield regeneration rate (points per second) */
  shieldRegen: number;
  /** Delay before shields start regenerating (seconds) */
  shieldDelay: number;
  /** Display name for HUD */
  displayName: string;
}

/**
 * Mining station - standard civilian installation.
 * Medium durability, balanced stats.
 */
const MINING_STATION_STATS: StationStats = {
  hull: 5000,
  shields: 2000,
  shieldRegen: 50,
  shieldDelay: 5,
  displayName: 'Mining Station',
};

/**
 * Refinery station - industrial processing facility.
 * Lower shields but higher hull (thick plating).
 */
const REFINERY_STATION_STATS: StationStats = {
  hull: 6000,
  shields: 1500,
  shieldRegen: 40,
  shieldDelay: 6,
  displayName: 'Refinery',
};

/**
 * Military station - hardened defense installation.
 * High shields with fast regeneration.
 */
const MILITARY_STATION_STATS: StationStats = {
  hull: 4000,
  shields: 3000,
  shieldRegen: 80,
  shieldDelay: 4,
  displayName: 'Defense Platform',
};

/** Map of station types to stats */
export const STATION_STATS: Record<StationType, StationStats> = {
  mining: MINING_STATION_STATS,
  refinery: REFINERY_STATION_STATS,
  military: MILITARY_STATION_STATS,
};

/** Get stats for a station type (defaults to mining) */
export function getStationStats(stationType?: StationType): StationStats {
  return STATION_STATS[stationType ?? 'mining'] ?? MINING_STATION_STATS;
}
