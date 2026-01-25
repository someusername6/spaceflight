/**
 * Component Serializers - Dispatches to component-level serialization.
 *
 * Each component file contains its own serialize/deserialize functions.
 * This module re-exports them and provides generic dispatch functions.
 *
 * Serialization uses compact format:
 * - Numeric type IDs (t: 0 for transform, t: 1 for physics, etc.)
 * - Short field names (p for position, r for rotation, etc.)
 */

import {
  deserializeAIControlled,
  type SerializedAIControlled,
  serializeAIControlled,
} from '../components/ai';
import {
  deserializeAimError,
  type SerializedAimError,
  serializeAimError,
} from '../components/aim-error';
import {
  deserializeCollision,
  type SerializedCollision,
  serializeCollision,
} from '../components/collision';
import {
  deserializeCombatStats,
  type SerializedCombatStats,
  serializeCombatStats,
} from '../components/combat-stats';
import {
  deserializeConvoyAutopilot,
  deserializeConvoyShip,
  type SerializedConvoyAutopilot,
  type SerializedConvoyShip,
  serializeConvoyAutopilot,
  serializeConvoyShip,
} from '../components/convoy';
import {
  deserializeDamageTracking,
  type SerializedDamageTracking,
  serializeDamageTracking,
} from '../components/damage-tracking';
import {
  deserializeDecoy,
  type SerializedDecoy,
  serializeDecoy,
} from '../components/decoy';
import {
  deserializeExplosion,
  type SerializedExplosion,
  serializeExplosion,
} from '../components/explosion';
import {
  deserializeFaction,
  type SerializedFaction,
  serializeFaction,
} from '../components/faction';
import {
  deserializeHealth,
  type SerializedHealth,
  serializeHealth,
} from '../components/health';
import {
  deserializeHeat,
  type SerializedHeat,
  serializeHeat,
} from '../components/heat';
import {
  deserializeHullCollider,
  type SerializedHullCollider,
  serializeHullCollider,
} from '../components/hull-collider';
import {
  deserializeHyperspaceJump,
  type SerializedHyperspaceJump,
  serializeHyperspaceJump,
} from '../components/hyperspace-jump';
import {
  deserializeMissile,
  type SerializedMissile,
  serializeMissile,
} from '../components/missile';
import {
  deserializePhysics,
  type SerializedPhysics,
  serializePhysics,
} from '../components/physics';
import {
  deserializePlayerControlled,
  type SerializedPlayerControlled,
  serializePlayerControlled,
} from '../components/player';
import {
  deserializeProjectile,
  type SerializedProjectile,
  serializeProjectile,
} from '../components/projectile';
import {
  deserializeShieldHit,
  type SerializedShieldHit,
  serializeShieldHit,
} from '../components/shield-hit';
import {
  deserializeShields,
  type SerializedShields,
  serializeShields,
} from '../components/shields';
import {
  deserializeShipIdentity,
  type SerializedShipIdentity,
  serializeShipIdentity,
} from '../components/ship-identity';
import {
  deserializeStructure,
  type SerializedStructure,
  serializeStructure,
} from '../components/structure';
import {
  deserializeTargeting,
  type SerializedTargeting,
  serializeTargeting,
} from '../components/targeting';
// Import serialization from each component file
import {
  deserializeTransform,
  type SerializedTransform,
  serializeTransform,
} from '../components/transform';
import {
  deserializePrimaryWeapons,
  deserializeSecondaryWeapons,
  type SerializedPrimaryWeapons,
  type SerializedSecondaryWeapons,
  serializePrimaryWeapons,
  serializeSecondaryWeapons,
} from '../components/weapons';

// Re-export dispatch functions from component-dispatch
export {
  deserializeComponent,
  type SerializedComponent,
  serializeComponent,
} from './component-dispatch';
// Re-export Vector3/Quaternion/Color serialization helpers from core
export {
  deserializeColor,
  deserializeQuaternion,
  deserializeVector2,
  deserializeVector3,
  type SerializedColor,
  type SerializedQuaternion,
  type SerializedVector2,
  type SerializedVector3,
  serializeColor,
  serializeQuaternion,
  serializeVector2,
  serializeVector3,
} from './serialization';

// Re-export all serialized types
export type {
  SerializedTransform,
  SerializedPhysics,
  SerializedHealth,
  SerializedCollision,
  SerializedHullCollider,
  SerializedFaction,
  SerializedPlayerControlled,
  SerializedAIControlled,
  SerializedTargeting,
  SerializedAimError,
  SerializedPrimaryWeapons,
  SerializedSecondaryWeapons,
  SerializedProjectile,
  SerializedMissile,
  SerializedDecoy,
  SerializedExplosion,
  SerializedShipIdentity,
  SerializedHeat,
  SerializedShields,
  SerializedShieldHit,
  SerializedCombatStats,
  SerializedConvoyShip,
  SerializedConvoyAutopilot,
  SerializedDamageTracking,
  SerializedStructure,
  SerializedHyperspaceJump,
};

// Re-export individual serializers
export {
  serializeTransform,
  deserializeTransform,
  serializePhysics,
  deserializePhysics,
  serializeHealth,
  deserializeHealth,
  serializeCollision,
  deserializeCollision,
  serializeHullCollider,
  deserializeHullCollider,
  serializeFaction,
  deserializeFaction,
  serializePlayerControlled,
  deserializePlayerControlled,
  serializeAIControlled,
  deserializeAIControlled,
  serializeTargeting,
  deserializeTargeting,
  serializeAimError,
  deserializeAimError,
  serializePrimaryWeapons,
  deserializePrimaryWeapons,
  serializeSecondaryWeapons,
  deserializeSecondaryWeapons,
  serializeProjectile,
  deserializeProjectile,
  serializeMissile,
  deserializeMissile,
  serializeDecoy,
  deserializeDecoy,
  serializeExplosion,
  deserializeExplosion,
  serializeShipIdentity,
  deserializeShipIdentity,
  serializeHeat,
  deserializeHeat,
  serializeShields,
  deserializeShields,
  serializeShieldHit,
  deserializeShieldHit,
  serializeCombatStats,
  deserializeCombatStats,
  serializeConvoyShip,
  deserializeConvoyShip,
  serializeConvoyAutopilot,
  deserializeConvoyAutopilot,
  serializeDamageTracking,
  deserializeDamageTracking,
  serializeStructure,
  deserializeStructure,
  serializeHyperspaceJump,
  deserializeHyperspaceJump,
};
