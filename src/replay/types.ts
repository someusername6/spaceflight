/**
 * Replay System Types
 *
 * Interfaces and constants for the replay recording and playback system.
 */

import type { MissionType } from '../campaign/types';
import type { PlayerAutoaim } from '../settings/game-settings';

/** Current replay format version - bump when changing FullReplayData structure */
export const REPLAY_VERSION = 3;

/** Minimum supported replay version for loading */
export const MIN_REPLAY_VERSION = 1;

/** Simulation tick rate in Hz */
export const TICK_RATE = 60;

/** Seconds per simulation tick */
export const TICK_SEC = 1 / TICK_RATE;

/** Milliseconds per simulation tick */
export const TICK_MS = 1000 / TICK_RATE;

/** Maximum replays stored in IndexedDB (FIFO eviction) */
export const MAX_STORED_REPLAYS = 20;

/**
 * Ticks between keyframe captures during playback.
 * Currently unused - reserved for future fast-seeking optimization.
 *
 * MVP seeking restarts from tick 0 and fast-forwards. A future optimization
 * would capture world state snapshots every KEYFRAME_INTERVAL ticks, allowing
 * seeks to restore the nearest keyframe and only fast-forward the remainder.
 * At 300 ticks (5 seconds at 60Hz), seeking to any point requires at most
 * ~300 simulation ticks rather than potentially thousands.
 */
export const KEYFRAME_INTERVAL = 300;

/** Available playback speed options */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4] as const;

/** Maximum ticks to process per frame during seeking (default) */
export const DEFAULT_SEEK_TICKS_PER_FRAME = 1000;

/** Ticks to process per frame during viewer seek (lower for smoother UI) */
export const VIEWER_SEEK_TICKS_PER_FRAME = 500;

/**
 * Mission outcome type.
 * - 'victory': Player completed all mission objectives
 * - 'defeat': Player's commander ship was destroyed
 * - 'timeout': Reserved for future timed missions (e.g., escape missions,
 *   survival modes). Not currently used but included in the schema for
 *   forward compatibility.
 */
export type ReplayOutcome = 'victory' | 'defeat' | 'timeout';

/** Playback state machine states */
export type PlaybackState = 'loading' | 'playing' | 'paused' | 'ended';

/**
 * Primary weapon specification for replay reconstruction.
 * Stores weapon ID, bank size, and optional ammo for limited-ammo weapons.
 */
export interface ReplayPrimaryWeapon {
  weaponId: string;
  /** Number of guns in this bank (affects fire rate, heat per shot) */
  bankSize: number;
  /** Only set for limited ammo weapons (energy weapons have infinite) */
  ammo?: number;
  maxAmmo?: number;
}

/**
 * Secondary weapon specification for replay reconstruction.
 */
export interface ReplaySecondaryWeapon {
  weaponId: string;
  /** Number of launchers in this bank */
  bankSize: number;
  ammo: number;
  maxAmmo: number;
}

/**
 * Ship loadout for replay reconstruction.
 * Contains all data needed to recreate a ship exactly as it was.
 */
export interface ReplayShipLoadout {
  shipClass: string;
  primaryWeapons: ReplayPrimaryWeapon[];
  secondaryWeapons: ReplaySecondaryWeapon[];
}

/**
 * Wingman data for replay reconstruction.
 * Includes position offset from player for formation.
 */
export interface ReplayWingman {
  loadout: ReplayShipLoadout;
  /** Position offset from origin (player starts at 0,0,0) */
  position: { x: number; y: number; z: number };
  /** Pilot name/callsign for HUD display */
  pilotName?: string;
  /** Pilot skill level for AI behavior (defaults to 'regular' if not set) */
  pilotSkill?: string;
}

/**
 * Per-weapon statistics for replay debrief display.
 * Mirrors WeaponStats from combat-stats.ts but as a plain interface for storage.
 */
export interface ReplayWeaponStats {
  weaponName: string;
  category: 'projectile' | 'beam' | 'missile' | 'decoy';
  shotsFired: number;
  shotsOnTarget: number;
  timeFired: number;
  timeOnTarget: number;
  isPulseBeam: boolean;
  ammoCarried: number;
  missilesLaunched: number;
  missilesHit: number;
  missilesSeduced: number;
  decoysCarried: number;
  decoysDeployed: number;
  missilesSeducedByDecoy: number;
  damageDealt: number;
}

/**
 * Per-pilot debrief data for replay display.
 * Mirrors PilotDebriefData from debrief.ts.
 */
export interface ReplayPilotDebrief {
  callsign: string;
  archetype: string;
  isPlayer: boolean;
  isKIA: boolean;
  kills: number;
  assists: number;
  damageDealt: number;
  damageReceived: number;
  hullRemaining: number;
  hullMax: number;
  /** Seconds into mission when destroyed (null if survived) */
  timeOfDeath: number | null;
  weaponStats: ReplayWeaponStats[];
}

/**
 * Debrief data stored in replay for post-mission display.
 */
export interface ReplayDebriefData {
  /** Mission duration in seconds */
  missionDuration: number;
  /** All pilots (player and wingmen) with their combat stats */
  pilots: ReplayPilotDebrief[];
}

/** Stored weapon from salvage */
export interface ReplaySalvageWeapon {
  weaponType: string;
  category: 'primary' | 'secondary';
  count: number;
}

/** Stored ammo from salvage */
export interface ReplaySalvageAmmo {
  weaponType: string;
  count: number;
}

/**
 * Salvage data stored in replay for post-mission display.
 */
export interface ReplaySalvageData {
  /** Scrap per ship class */
  scrap: Record<string, number>;
  /** Weapons recovered */
  weapons: ReplaySalvageWeapon[];
  /** Ammo recovered */
  ammo: ReplaySalvageAmmo[];
  /** Estimated total value */
  totalValue: number;
}

/**
 * Replay metadata stored with each recording.
 * Contains enough info to display in list and reconstruct mission.
 */
export interface ReplayMetadata {
  /** Unique identifier (assigned on save) */
  id: string;
  /** Mission definition ID for reconstruction */
  missionId: string;
  /** Display name of the mission */
  missionName: string;
  /** Sector number (1-5) */
  sector: number;
  /** Mission type (defaults to 'elimination' for v1-2 replays) */
  missionType?: MissionType;
  /** Player ship archetype */
  shipType: string;
  /** Wingmen ship classes (for squad display) */
  wingmenShips?: string[];
  /** How the mission ended */
  outcome: ReplayOutcome;
  /** Total duration in ticks */
  durationTicks: number;
  /** Unix timestamp when recorded */
  recordedAt: number;
  /** Game version for compatibility checking */
  gameVersion: string;
  /** Combat statistics */
  stats: {
    kills: number;
    damageDealt: number;
    damageTaken: number;
  };
}

/**
 * Full replay data including inputs and metadata.
 * This is what gets saved to storage and exported to files.
 */
export interface FullReplayData {
  /** Format version (1 = original, 2 = added debrief/salvage) */
  version: number;
  /** World seed for deterministic reconstruction */
  seed: number;
  /** Input bitmasks (possibly RLE-compressed) */
  inputs: number[];
  /** Whether inputs array is RLE-compressed */
  inputsCompressed: boolean;
  /** Total tick count (for progress display) */
  tickCount: number;
  /** Mission and recording metadata */
  metadata: ReplayMetadata;
  /** Player ship loadout at mission start */
  playerLoadout: ReplayShipLoadout;
  /** Wingmen deployed with player (empty array if none) */
  wingmen: ReplayWingman[];
  /** Player autoaim setting at recording time (affects projectile aim) */
  playerAutoaim: PlayerAutoaim;
  /** Debrief data (v2+, optional for backwards compat with v1 replays) */
  debriefData?: ReplayDebriefData;
  /** Salvage data (v2+, optional - null on defeat, undefined for v1 replays) */
  salvageData?: ReplaySalvageData | null;
}

/** Base fields shared by all stored replay formats */
interface StoredReplayBase {
  /** Same as metadata.id */
  id: string;
  /** Unix timestamp when saved to DB */
  savedAt: number;
}

/** Compressed storage format (current) */
interface StoredReplayCompressed extends StoredReplayBase {
  /** Metadata stored separately for efficient listing */
  metadata: ReplayMetadata;
  /** Compressed replay data as gzip bytes */
  compressedData: Uint8Array;
  /** Not present in compressed format */
  data?: undefined;
}

/** Legacy uncompressed storage format (for backwards compatibility) */
interface StoredReplayLegacy extends StoredReplayBase {
  /** Legacy format may or may not have separate metadata */
  metadata?: ReplayMetadata;
  /** Not present in legacy format */
  compressedData?: undefined;
  /** Full uncompressed replay data */
  data: FullReplayData;
}

/**
 * Stored replay wrapper in IndexedDB.
 * Adds save timestamp for FIFO ordering.
 *
 * Supports two storage formats:
 * - Compressed: compressedData (gzip) + metadata stored separately
 * - Legacy: data contains full uncompressed replay
 */
export type StoredReplay = StoredReplayCompressed | StoredReplayLegacy;

/**
 * Summary info for replay list display.
 * Avoids loading full input data just to show the list.
 */
export interface ReplaySummary {
  id: string;
  missionName: string;
  sector: number;
  outcome: ReplayOutcome;
  durationSeconds: number;
  recordedAt: number;
  /** Player ship class for silhouette display */
  shipType: string;
  /** Wingmen ship classes for silhouette display */
  wingmenShips?: string[];
}

/**
 * Convert full metadata to list summary.
 */
export function toReplaySummary(meta: ReplayMetadata): ReplaySummary {
  const summary: ReplaySummary = {
    id: meta.id,
    missionName: meta.missionName,
    sector: meta.sector,
    outcome: meta.outcome,
    durationSeconds: meta.durationTicks / 60,
    recordedAt: meta.recordedAt,
    shipType: meta.shipType,
  };
  if (meta.wingmenShips) {
    summary.wingmenShips = meta.wingmenShips;
  }
  return summary;
}
