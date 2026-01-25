/**
 * Component Serialization - Generic serialize/deserialize dispatch.
 *
 * Each component file (src/components/*.ts) defines its own:
 * - SerializedX interface with compact field names
 * - serializeX() function
 * - deserializeX() function
 *
 * This module provides:
 * - SerializedComponent union type (all 26 component types)
 * - serializeComponent() - dispatches by component.type string
 * - deserializeComponent() - dispatches by numeric type ID (t field)
 */

import {
  deserializeAIControlled,
  type SerializedAIControlled,
  serializeAIControlled,
} from '../../components/ai';
import {
  deserializeAimError,
  type SerializedAimError,
  serializeAimError,
} from '../../components/aim-error';
import {
  deserializeCollision,
  type SerializedCollision,
  serializeCollision,
} from '../../components/collision';
import {
  deserializeCombatStats,
  type SerializedCombatStats,
  serializeCombatStats,
} from '../../components/combat-stats';
import {
  deserializeConvoyAutopilot,
  deserializeConvoyShip,
  type SerializedConvoyAutopilot,
  type SerializedConvoyShip,
  serializeConvoyAutopilot,
  serializeConvoyShip,
} from '../../components/convoy';
import {
  deserializeDamageTracking,
  type SerializedDamageTracking,
  serializeDamageTracking,
} from '../../components/damage-tracking';
import {
  deserializeDecoy,
  type SerializedDecoy,
  serializeDecoy,
} from '../../components/decoy';
import {
  deserializeExplosion,
  type SerializedExplosion,
  serializeExplosion,
} from '../../components/explosion';
import {
  deserializeFaction,
  type SerializedFaction,
  serializeFaction,
} from '../../components/faction';
import {
  deserializeHealth,
  type SerializedHealth,
  serializeHealth,
} from '../../components/health';
import {
  deserializeHeat,
  type SerializedHeat,
  serializeHeat,
} from '../../components/heat';
import {
  deserializeHullCollider,
  type SerializedHullCollider,
  serializeHullCollider,
} from '../../components/hull-collider';
import {
  deserializeHyperspaceJump,
  type SerializedHyperspaceJump,
  serializeHyperspaceJump,
} from '../../components/hyperspace-jump';
import {
  deserializeMissile,
  type SerializedMissile,
  serializeMissile,
} from '../../components/missile';
import {
  deserializePhysics,
  type SerializedPhysics,
  serializePhysics,
} from '../../components/physics';
import {
  deserializePlayerControlled,
  type SerializedPlayerControlled,
  serializePlayerControlled,
} from '../../components/player';
import {
  deserializeProjectile,
  type SerializedProjectile,
  serializeProjectile,
} from '../../components/projectile';
import {
  deserializeShieldHit,
  type SerializedShieldHit,
  serializeShieldHit,
} from '../../components/shield-hit';
import {
  deserializeShields,
  type SerializedShields,
  serializeShields,
} from '../../components/shields';
import {
  deserializeShipIdentity,
  type SerializedShipIdentity,
  serializeShipIdentity,
} from '../../components/ship-identity';
import {
  deserializeStructure,
  type SerializedStructure,
  serializeStructure,
} from '../../components/structure';
import {
  deserializeTargeting,
  type SerializedTargeting,
  serializeTargeting,
} from '../../components/targeting';
import {
  deserializeTransform,
  type SerializedTransform,
  serializeTransform,
} from '../../components/transform';
import {
  deserializePrimaryWeapons,
  deserializeSecondaryWeapons,
  type SerializedPrimaryWeapons,
  type SerializedSecondaryWeapons,
  serializePrimaryWeapons,
  serializeSecondaryWeapons,
} from '../../components/weapons';
import type { ComponentBase } from '../types';

// =============================================================================
// Serialized Component Types
// =============================================================================

/** Union type for all serialized components (uses numeric type IDs) */
export type SerializedComponent =
  | SerializedTransform
  | SerializedPhysics
  | SerializedHealth
  | SerializedCollision
  | SerializedHullCollider
  | SerializedFaction
  | SerializedPlayerControlled
  | SerializedAIControlled
  | SerializedTargeting
  | SerializedAimError
  | SerializedPrimaryWeapons
  | SerializedSecondaryWeapons
  | SerializedProjectile
  | SerializedMissile
  | SerializedDecoy
  | SerializedExplosion
  | SerializedShipIdentity
  | SerializedHeat
  | SerializedShields
  | SerializedShieldHit
  | SerializedCombatStats
  | SerializedConvoyShip
  | SerializedConvoyAutopilot
  | SerializedDamageTracking
  | SerializedStructure
  | SerializedHyperspaceJump;

// Re-export all serialized types for convenience
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

// Type guard for compact serialized components (check numeric type ID)
type ComponentWithTypeId = { t: number };

// =============================================================================
// Dispatch Functions
// =============================================================================

/**
 * Serialize any component by type.
 * Returns a compact object with numeric type ID.
 *
 * Note: The `as never` casts below are safe - the switch narrows `component.type`
 * to a specific literal, so the component IS the correct type. TypeScript just
 * doesn't propagate discriminated union narrowing through to the variable type.
 */
export function serializeComponent(
  component: ComponentBase,
): SerializedComponent {
  switch (component.type) {
    case 'transform':
      return serializeTransform(component as never);
    case 'physics':
      return serializePhysics(component as never);
    case 'health':
      return serializeHealth(component as never);
    case 'collision':
      return serializeCollision(component as never);
    case 'hullCollider':
      return serializeHullCollider(component as never);
    case 'faction':
      return serializeFaction(component as never);
    case 'playerControlled':
      return serializePlayerControlled(component as never);
    case 'aiControlled':
      return serializeAIControlled(component as never);
    case 'targeting':
      return serializeTargeting(component as never);
    case 'aimError':
      return serializeAimError(component as never);
    case 'primaryWeapons':
      return serializePrimaryWeapons(component as never);
    case 'secondaryWeapons':
      return serializeSecondaryWeapons(component as never);
    case 'projectile':
      return serializeProjectile(component as never);
    case 'missile':
      return serializeMissile(component as never);
    case 'decoy':
      return serializeDecoy(component as never);
    case 'explosion':
      return serializeExplosion(component as never);
    case 'shipIdentity':
      return serializeShipIdentity(component as never);
    case 'heat':
      return serializeHeat(component as never);
    case 'shields':
      return serializeShields(component as never);
    case 'shieldHit':
      return serializeShieldHit(component as never);
    case 'combatStats':
      return serializeCombatStats(component as never);
    case 'convoyShip':
      return serializeConvoyShip(component as never);
    case 'convoyAutopilot':
      return serializeConvoyAutopilot(component as never);
    case 'damageTracking':
      return serializeDamageTracking(component as never);
    case 'structure':
      return serializeStructure(component as never);
    case 'hyperspaceJump':
      return serializeHyperspaceJump(component as never);
    default:
      throw new Error(`Unknown component type: ${component.type}`);
  }
}

/**
 * Deserialize any component by numeric type ID.
 * Reconstructs Three.js objects and runtime types.
 */
export function deserializeComponent(
  serialized: SerializedComponent,
): ComponentBase {
  const typeId = (serialized as ComponentWithTypeId).t;
  switch (typeId) {
    case 0:
      return deserializeTransform(serialized as SerializedTransform);
    case 1:
      return deserializePhysics(serialized as SerializedPhysics);
    case 2:
      return deserializeHealth(serialized as SerializedHealth);
    case 3:
      return deserializeCollision(serialized as SerializedCollision);
    case 4:
      return deserializeHullCollider(serialized as SerializedHullCollider);
    case 5:
      return deserializeFaction(serialized as SerializedFaction);
    case 6:
      return deserializePlayerControlled(
        serialized as SerializedPlayerControlled,
      );
    case 7:
      return deserializeAIControlled(serialized as SerializedAIControlled);
    case 8:
      return deserializeTargeting(serialized as SerializedTargeting);
    case 9:
      return deserializeAimError(serialized as SerializedAimError);
    case 10:
      return deserializePrimaryWeapons(serialized as SerializedPrimaryWeapons);
    case 11:
      return deserializeSecondaryWeapons(
        serialized as SerializedSecondaryWeapons,
      );
    case 12:
      return deserializeProjectile(serialized as SerializedProjectile);
    case 13:
      return deserializeMissile(serialized as SerializedMissile);
    case 14:
      return deserializeDecoy(serialized as SerializedDecoy);
    case 15:
      return deserializeExplosion(serialized as SerializedExplosion);
    case 16:
      return deserializeShipIdentity(serialized as SerializedShipIdentity);
    case 17:
      return deserializeHeat(serialized as SerializedHeat);
    case 18:
      return deserializeShields(serialized as SerializedShields);
    case 19:
      return deserializeShieldHit(serialized as SerializedShieldHit);
    case 20:
      return deserializeCombatStats(serialized as SerializedCombatStats);
    case 21:
      return deserializeConvoyShip(serialized as SerializedConvoyShip);
    case 22:
      return deserializeConvoyAutopilot(
        serialized as SerializedConvoyAutopilot,
      );
    case 23:
      return deserializeDamageTracking(serialized as SerializedDamageTracking);
    case 24:
      return deserializeStructure(serialized as SerializedStructure);
    case 25:
      return deserializeHyperspaceJump(serialized as SerializedHyperspaceJump);
    default:
      throw new Error(`Unknown component type ID: ${typeId}`);
  }
}
