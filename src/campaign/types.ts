/**
 * Campaign data types - persistent state between missions.
 */

import type { ProfileName } from '../data/ai-profiles';

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

/** A ship owned by the player's squadron (active, with pilot assigned) */
export interface OwnedShip {
  id: string;
  shipClass: string; // 'interceptor', 'striker', etc. (from SHIP_CLASSES)
  /** Fixed-length array matching ship's primaryBanks. null = empty slot. */
  primaryWeapons: (EquippedPrimary | null)[];
  /** Fixed-length array matching ship's secondaryBanks. null = empty slot. */
  secondaryWeapons: (EquippedSecondary | null)[];
  pilot: Pilot | null; // null = unassigned (ship in reserve)
  hullDamage: number; // 0 = full health, positive = damage taken
}

/** A ship hull in storage (no pilot, no weapons equipped) */
export interface StoredHull {
  id: string;
  shipClass: string; // 'interceptor', 'striker', etc.
  hullDamage: number;
}

/** A contract (mission) available to accept */
export interface Contract {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Waves of enemies - each wave spawns when the previous is cleared */
  waves: ContractWave[];
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
  hulls: Record<string, number>; // shipClass -> count
  primaries: Record<string, number>; // weaponType -> count
  secondaries: Record<string, number>; // weaponType -> count (missiles)
  ammo: Record<string, number>; // weaponType -> count (rounds)
}

/** Full campaign state */
export interface CampaignState {
  credits: number;
  commanderId: string; // ID of the commander pilot (player)
  ships: OwnedShip[];
  pilots: Pilot[]; // all pilots (assigned and unassigned)
  storedHulls: StoredHull[]; // ship hulls in storage (no pilot/weapons)
  storedWeapons: StoredWeapon[]; // weapons in storage
  storedAmmo: StoredAmmo[]; // ammo in storage (for ballistic primaries)
  storedScrap: Record<string, number>; // shipClass -> scrap count
  storeStock: StoreStock; // store inventory (finite stock)
  currentSector: number;
  completedContracts: string[];
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
  hullDamage: Map<string, number>; // shipId -> damage taken
  ammoUsed: Map<string, Map<string, number>>; // shipId -> weaponType -> count
}
