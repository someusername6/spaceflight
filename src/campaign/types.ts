/**
 * Campaign data types - barrel exports for domain-specific type files.
 *
 * Re-exports all types for backward compatibility.
 */

// Campaign settings
export {
  type CampaignSettings,
  DEFAULT_CAMPAIGN_SETTINGS,
} from './campaign-settings';

// Campaign state
export type { CampaignState } from './campaign-state';

// Inventory types
export type { StoredAmmo, StoredWeapon, StoreStock } from './inventory';

// Mission types
export type {
  AmbushEscort,
  AmbushMissionData,
  AttackStationMissionData,
  AttackStationReinforcementWave,
  Contract,
  ContractEnemy,
  ContractWave,
  EscortMissionData,
  EscortRole,
  MissionType,
  StationDefenseMissionData,
} from './mission';

// Pilot types
export type { HireablePilot, Pilot, SkillLevel } from './pilot';

// Sector constants
export {
  getDeploymentLimit,
  MAX_SECTOR,
  SECTOR_DEPLOYMENT_LIMITS,
  SECTOR_NAMES,
} from './sector';

// Ship types
export type {
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  StoredShip,
} from './ship';
