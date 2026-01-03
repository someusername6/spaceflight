/**
 * Data Layer Index - Re-exports all game data for convenient imports.
 *
 * Usage:
 *   import { PRIMARY_WEAPONS, AI_PROFILES, HEAT_THRESHOLDS } from '../data';
 */

// AI profiles
export {
  AI_GLOBAL_SETTINGS,
  AI_PROFILES,
  type AIProfile,
  createCustomProfile,
  getAIProfile,
  type ProfileName,
} from './ai-profiles';
// Combat constants
export {
  BEAM_CONSTANTS,
  COLLISION_CONSTANTS,
  EXPLOSION_CONSTANTS,
  HEAT_THRESHOLDS,
  LOCK_CONSTANTS,
  PROJECTILE_RADII,
  RANGE_THRESHOLDS,
  SHRAPNEL_CONSTANTS,
  SPAWN_OFFSETS,
} from './combat';
// Missile definitions
export {
  DECOY_CONSTANTS,
  getMissileStats,
  MISSILES,
  type MissileName,
  type MissileStats,
} from './missiles';
// Ship definitions
export {
  AI_COLLISION_MULTIPLIER,
  getShipStats,
  SHIP_ARCHETYPES,
  type ShipClass,
  type ShipStats,
} from './ships';
// Test fixtures
export {
  DEFAULT_TEST_PROFILE,
  getTestProfile,
  TEST_AI_PROFILES,
} from './test-fixtures';
// Weapon definitions
export {
  getWeaponStats,
  PRIMARY_WEAPONS,
  type WeaponName,
  type WeaponStats,
} from './weapons';
