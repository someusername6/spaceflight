/**
 * Replay System Types
 *
 * Interfaces and constants for the replay recording and playback system.
 */

/** Replay format version for migration support */
export const REPLAY_VERSION = 3;

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
export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

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
  /** Pilot skill level for AI behavior (defaults to 'regular' if not set) */
  pilotSkill?: string;
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
  /** Player ship archetype */
  shipType: string;
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
  /** Format version for migrations */
  version: typeof REPLAY_VERSION;
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
  /**
   * Player ship loadout at mission start.
   * Added in v3 - optional for backwards compatibility with v2 replays.
   */
  playerLoadout?: ReplayShipLoadout;
  /**
   * Wingmen deployed with player.
   * Added in v3 - optional for backwards compatibility with v2 replays.
   */
  wingmen?: ReplayWingman[];
}

/**
 * Stored replay wrapper in IndexedDB.
 * Adds save timestamp for FIFO ordering.
 */
export interface StoredReplay {
  /** Same as metadata.id */
  id: string;
  /** Full replay data */
  data: FullReplayData;
  /** Unix timestamp when saved to DB */
  savedAt: number;
}

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
}

/**
 * Convert full metadata to list summary.
 */
export function toReplaySummary(meta: ReplayMetadata): ReplaySummary {
  return {
    id: meta.id,
    missionName: meta.missionName,
    sector: meta.sector,
    outcome: meta.outcome,
    durationSeconds: meta.durationTicks / 60,
    recordedAt: meta.recordedAt,
  };
}
