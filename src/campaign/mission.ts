/**
 * Mission types - contracts and mission-specific data structures.
 */

import type { SkillLevel } from './pilot';

/** Mission types supported by the game */
export type MissionType =
  | 'elimination'
  | 'escort'
  | 'station-defense'
  | 'ambush'
  | 'attack-station';

/** Enemy specification for a contract */
export interface ContractEnemy {
  archetype: string;
  skill: SkillLevel;
  count: number;
}

/** A wave of enemies in a contract */
export interface ContractWave {
  /** Enemies in this wave */
  enemies: ContractEnemy[];
  /**
   * Optional delay before spawning (seconds) - gives player breathing room.
   * Can be a single number or [min, max] range for random delay via PRNG.
   */
  delay?: number | [number, number];
}

/** Escort mission specific data */
export interface EscortMissionData {
  /**
   * Ratio of enemies that target player or player allies instead of convoy (0-1).
   * 0.0 = all enemies attack convoy (current behavior)
   * 0.5 = 50% attack player/allies, 50% attack convoy
   * Default: 0 (backward compatible)
   */
  playerThreatRatio?: number;
  /** Number of NPC convoy ships to protect */
  convoySize: number;
  /** Ship type for convoy ships ('freighter' or 'transport') */
  convoyType: 'freighter' | 'transport';
  /** Distance from start to escape zone (meters) */
  escapeZoneDistance: number;
  /** Radius of escape zone trigger (meters) */
  escapeZoneRadius: number;
  /** Time to charge jump drive once in zone (seconds) */
  jumpChargeTime: number;
  /** Seconds between enemy spawns */
  spawnInterval: number;
  /** Enemy pool for continuous spawning */
  enemyPool: ContractEnemy[];
  /** Maximum concurrent enemies (prevents performance issues) */
  maxConcurrentEnemies: number;
  /** Enemies to spawn when initial delay ends (default: 2) */
  initialSpawnCount?: number;
  /** Enemies to spawn per interval when below max (default: 1) */
  spawnBatchSize?: number;
}

/** Station defense mission specific data */
export interface StationDefenseMissionData {
  /**
   * Ratio of enemies that target player or player allies instead of station (0-1).
   * 0.0 = all enemies attack station (current behavior)
   * 0.5 = 50% attack player/allies, 50% attack station
   * Default: 0 (backward compatible)
   */
  playerThreatRatio?: number;
  /** Station type (affects stats and display name) - defaults to 'mining' */
  stationType?: 'mining' | 'refinery' | 'military';
  /** Station hull health pool (overrides type default if specified) */
  stationHealth?: number;
  /** Station shield pool (overrides type default if specified) */
  stationShields?: number;
  /** Station position (Z distance from player spawn, negative = behind player) */
  stationDistance: number;
  /** Enemy waves before reinforcements */
  waves: ContractWave[];
  /** Time until reinforcements (seconds), or null for health-based trigger only */
  reinforcementTime: number | null;
  /** Station health threshold to trigger reinforcements (0-1) */
  reinforcementHealthThreshold: number;
  /** Number of reinforcement ships */
  reinforcementCount: number;
  /** Reinforcement ship archetypes */
  reinforcementPool: ContractEnemy[];
  /** Initial allied ships present at mission start (for military stations) */
  initialAllies?: ContractEnemy[];
}

/** Escort role determines engagement behavior in ambush missions */
export type EscortRole = 'aggressive' | 'defensive';

/** Escort ship configuration for ambush missions */
export interface AmbushEscort {
  archetype: string;
  skill: SkillLevel;
  count: number;
  /**
   * Escort role determines proactive behavior:
   * - 'aggressive': Engages player within ~600m, plus all reactive triggers
   * - 'defensive': Only reacts to damage/lock triggers, stays near convoy
   */
  role: EscortRole;
}

/** Ambush mission specific data - player attacks enemy convoy */
export interface AmbushMissionData {
  /** Number of enemy convoy ships to destroy */
  convoySize: number;
  /** Ship type for convoy ships ('freighter' | 'transport') */
  convoyType: 'freighter' | 'transport';
  /**
   * Distance from origin where convoy STARTS (positive Z, behind player).
   * Convoy travels from +Z toward -Z (escape zone).
   * Default: 500
   */
  convoyStartDistance?: number;
  /**
   * Distance from origin where convoy ESCAPES (negative Z).
   * Convoy travels from convoyStartDistance toward -escapeZoneDistance.
   * Example: convoyStartDistance=500, escapeZoneDistance=3500 → convoy travels 4000m total
   */
  escapeZoneDistance: number;
  /** Radius of escape zone trigger (meters) */
  escapeZoneRadius: number;
  /**
   * Distance threshold for convoy "stopped" behavior.
   * If no escorts within this distance AND player within this distance,
   * convoy ships will halt permanently.
   * Default: 500
   */
  convoyStopDistance?: number;
  /** Enemy escort ships that protect the convoy (with explicit roles) */
  escorts: AmbushEscort[];
}

/** Reinforcement wave for attack station missions */
export interface AttackStationReinforcementWave {
  /** Allied ships to spawn as reinforcements */
  allies: ContractEnemy[];
  /** Delay in seconds before this wave spawns (cumulative from mission start) */
  delay: number;
}

/** Attack station mission specific data - player attacks enemy station */
export interface AttackStationMissionData {
  /** Station type (affects stats and display name) - defaults to 'mining' */
  stationType?: 'mining' | 'refinery' | 'military';
  /** Station position (Z distance from player spawn, negative = in front of player) */
  stationDistance: number;
  /** Initial enemy defenders present at mission start */
  initialDefenders: ContractEnemy[];
  /** Initial allied NPC ships present at mission start (optional, already engaged) */
  initialAllies?: ContractEnemy[];
  /** Friendly reinforcement waves that arrive over time */
  reinforcementWaves: AttackStationReinforcementWave[];
  /** Time in seconds before overwhelming enemy wave spawns (soft time limit) */
  overwhelmingSpawnTime: number;
  /** Single overwhelming wave of enemies that spawns after timer */
  overwhelmingWave: ContractEnemy[];
  /**
   * DPS threshold for AI targeting behavior.
   * Ships with DPS >= this value attack station, others attack defenders.
   */
  stationAttackDpsThreshold: number;
}

/** A contract (mission) available to accept */
export interface Contract {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Sector this mission belongs to (1-5) */
  sector: number;
  /** Mission type - defaults to 'elimination' for backward compatibility */
  missionType?: MissionType;
  /** Waves of enemies - required for elimination missions, optional for escort */
  waves?: ContractWave[];
  /** Escort mission data - required when missionType === 'escort' */
  escortData?: EscortMissionData;
  /** Station defense data - required when missionType === 'station-defense' */
  stationDefenseData?: StationDefenseMissionData;
  /** Ambush mission data - required when missionType === 'ambush' */
  ambushData?: AmbushMissionData;
  /** Attack station mission data - required when missionType === 'attack-station' */
  attackStationData?: AttackStationMissionData;
  reward: number; // credits
}
