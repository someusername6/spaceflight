/**
 * Serialization - Public API for world state serialization.
 *
 * This module provides everything needed for:
 * - World snapshots (rollback netcode)
 * - Component serialization
 * - State hashing (desync detection)
 *
 * Architecture:
 * - primitives.ts: Three.js object converters (Vector3, Quaternion, Color)
 * - components.ts: Component dispatch (serialize/deserialize any component)
 * - world.ts: Full world snapshots
 * - hashing.ts: FNV-1a state hashing
 * - component-hashers.ts: Per-component hash logic
 */

// =============================================================================
// Primitives (Three.js converters)
// =============================================================================

export {
  deserializeColor,
  deserializeQuaternion,
  deserializeQuaternionInto,
  deserializeVector2,
  deserializeVector3,
  deserializeVector3Into,
  isSerializedQuaternion,
  // Type guards
  isSerializedVector3,
  type SerializedColor,
  type SerializedQuaternion,
  type SerializedTransformPrimitive,
  type SerializedVector2,
  // Types
  type SerializedVector3,
  serializeColor,
  serializeQuaternion,
  serializeTransformPrimitive,
  serializeVector2,
  // Functions
  serializeVector3,
} from './primitives';

// =============================================================================
// Component Serialization
// =============================================================================

export {
  deserializeComponent,
  type SerializedAIControlled,
  type SerializedAimError,
  type SerializedCollision,
  type SerializedCombatStats,
  // Union type
  type SerializedComponent,
  type SerializedConvoyAutopilot,
  type SerializedConvoyShip,
  type SerializedDamageTracking,
  type SerializedDecoy,
  type SerializedExplosion,
  type SerializedFaction,
  type SerializedHealth,
  type SerializedHeat,
  type SerializedHullCollider,
  type SerializedHyperspaceJump,
  type SerializedMissile,
  type SerializedPhysics,
  type SerializedPlayerControlled,
  type SerializedPrimaryWeapons,
  type SerializedProjectile,
  type SerializedSecondaryWeapons,
  type SerializedShieldHit,
  type SerializedShields,
  type SerializedShipIdentity,
  type SerializedStructure,
  type SerializedTargeting,
  // Individual component types
  type SerializedTransform,
  // Dispatch functions
  serializeComponent,
} from './components';

// Note: Individual component serializers (serializeTransform, etc.) are not
// re-exported here. Use serializeComponent/deserializeComponent for generic
// dispatch, or import directly from the component file if needed.

// =============================================================================
// World Serialization
// =============================================================================

export {
  deserializeWorld,
  deserializeWorldFromBytes,
  estimateWorldSize,
  type SerializedActiveBeam,
  type SerializedEntity,
  type SerializedSystemState,
  // Types
  type SerializedWorld,
  // Functions
  serializeWorld,
  serializeWorldToBytes,
  // Constants
  WORLD_SERIALIZATION_VERSION,
} from './world';

// =============================================================================
// Hashing
// =============================================================================

export { hashComponent } from './component-hashers';
export {
  // Functions
  computeWorldHash,
  // Class
  HashState,
  worldHashesMatch,
} from './hashing';
