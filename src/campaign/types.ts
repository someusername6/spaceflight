/**
 * Campaign data types - persistent state between missions.
 */

import type { ProfileName } from '../data/ai-profiles';
import type { PlayerAutoaim } from '../settings/game-settings';
import type { SlotArray } from './slot-array';

/** Campaign creation settings (locked after creation) */
export interface CampaignSettings {
  /** Custom name for the commander pilot */
  commanderName: string;
  /**
   * Ironman mode - true = permadeath (campaign ends on death, autoaim locked).
   * false = mission failure returns to pre-mission state.
   */
  ironmanMode: boolean;
  /** Autoaim assist in degrees (locked if ironman mode enabled) */
  autoaimDegrees: PlayerAutoaim;
}

/** Default campaign settings */
export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  commanderName: 'Commander',
  ironmanMode: false,
  autoaimDegrees: 2.5,
};

/** Skill level for pilots */
export type SkillLevel = ProfileName;

/** A pilot that can be assigned to a ship */
export interface Pilot {
  id: string;
  name: string;
  skill: SkillLevel;
  // Career statistics
  kills: number;
  assists: number;
  missionsFlown: number;
  missionsWon: number;
  damageDealt: number;
  damageReceived: number;
}

/** A weapon equipped in a primary bank */
export interface EquippedPrimary {
  weaponType: string; // e.g., 'plasma', 'autocannon'
  bankSize: number; // 1, 2, or 3
  currentAmmo?: number; // undefined = infinite, number = remaining
}

/** A weapon equipped in a secondary bank */
export interface EquippedSecondary {
  weaponType: string; // e.g., 'seeker', 'torpedo'
  bankSize: number;
  count: number; // remaining missiles/decoys
  maxCount: number; // for resupply reference
}

/**
 * A ship owned by the player's squadron (active, with pilot assigned).
 *
 * Note: SlotArray fields serialize via toJSON() and are reconstituted
 * automatically by the save system's reconstituteSave() function.
 */
export interface OwnedShip {
  id: string;
  shipClass: string; // 'interceptor', 'striker', etc. (from SHIP_CLASSES)
  /** Opaque slot array - use slot-array helpers for access */
  primaryWeapons: SlotArray<EquippedPrimary>;
  /** Opaque slot array - use slot-array helpers for access */
  secondaryWeapons: SlotArray<EquippedSecondary>;
  pilot: Pilot | null; // null = unassigned (ship in reserve)
}

/** A ship in storage (no pilot, no weapons equipped) */
export interface StoredShip {
  id: string;
  shipClass: string; // 'interceptor', 'striker', etc.
}

/** Mission types supported by the game */
export type MissionType = 'elimination' | 'escort' | 'station-defense';

/** Escort mission specific data */
export interface EscortMissionData {
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
  reward: number; // credits
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

/** Enemy specification for a contract */
export interface ContractEnemy {
  archetype: string;
  skill: SkillLevel;
  count: number;
}

/** Store inventory - stock of items available for purchase */
export interface StoreStock {
  ships: Record<string, number>; // shipClass -> count
  primaries: Record<string, number>; // weaponType -> count
  secondaries: Record<string, number>; // weaponType -> count (missiles)
  ammo: Record<string, number>; // weaponType -> count (rounds)
}

/** Sector names for display */
export const SECTOR_NAMES: Record<number, string> = {
  1: 'Frontier',
  2: 'Contested Zone',
  3: 'Warzone',
  4: 'Core Systems',
  5: 'Endless',
};

/** Maximum sector (5 = endless mode) */
export const MAX_SECTOR = 5;

/** Maximum ships deployable per sector */
export const SECTOR_DEPLOYMENT_LIMITS: Record<number, number> = {
  1: 4,
  2: 4,
  3: 4,
  4: 5,
  5: 6,
};

/** Get deployment limit for a sector (defaults to 4 for unknown sectors) */
export function getDeploymentLimit(sector: number): number {
  return SECTOR_DEPLOYMENT_LIMITS[sector] ?? 4;
}

/** Full campaign state */
export interface CampaignState {
  /** Campaign settings chosen at creation (immutable after creation) */
  settings: CampaignSettings;
  /** Master seed for deterministic randomness (set at campaign creation) */
  seed: number;
  /** Next ID for entity generation (persisted for determinism) */
  nextId: number;
  credits: number;
  commanderId: string; // ID of the commander pilot (player)
  ships: OwnedShip[];
  pilots: Pilot[]; // all pilots (assigned and unassigned)
  storedShips: StoredShip[]; // ships in storage (no pilot/weapons)
  storedWeapons: StoredWeapon[]; // weapons in storage
  storedAmmo: StoredAmmo[]; // ammo in storage (for ballistic primaries)
  storedScrap: Record<string, number>; // shipClass -> scrap count
  storeStock: StoreStock; // store inventory (finite stock)
  availableRecruits: HireablePilot[]; // pilots available for hire
  currentSector: number;
  /** Missions completed in current sector (resets on sector advance) */
  sectorMissionsCompleted: number;
  completedContracts: string[];
  /** Contract IDs that have been attempted (win or lose) - for "fresh" indicator */
  attemptedContracts: string[];
  /** Number of contract refreshes used in current sector (resets on sector advance) */
  contractRefreshCount: number;
  missionCount: number;
}

/** A weapon in storage (not equipped) */
export interface StoredWeapon {
  weaponType: string;
  category: 'primary' | 'secondary';
  count: number; // for secondaries, missiles count; for primaries, always 1
}

/** Ammo in storage (for ballistic primaries) */
export interface StoredAmmo {
  weaponType: string; // 'autocannon', 'railgun', 'flak', 'nuclearLance'
  count: number;
}

/** Mission outcome for results screen */
export interface MissionOutcome {
  victory: boolean;
  creditsEarned: number;
  shipsLost: string[]; // IDs of ships that were destroyed
  ammoUsed: Map<string, Map<string, number>>; // shipId -> weaponType -> count
}

/** Hireable pilot available in the recruit pool */
export interface HireablePilot {
  id: string;
  name: string;
  skill: SkillLevel;
  price: number;
}
