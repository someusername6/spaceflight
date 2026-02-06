/**
 * Component Serialization - Generic serialize/deserialize dispatch.
 *
 * Each component file (src/components/*.ts) defines its own:
 * - SerializedX interface with compact field names
 * - serializeX() function
 * - deserializeX() function
 *
 * This module provides:
 * - SerializedComponent union type (all 27 component types)
 * - serializeComponent() - dispatches by component.type string
 * - deserializeComponent() - dispatches by numeric type ID (t field)
 */

import {
  type AIControlled,
  deserializeAIControlled,
  type SerializedAIControlled,
  serializeAIControlled,
} from '../components/ai';
import {
  type AimError,
  deserializeAimError,
  type SerializedAimError,
  serializeAimError,
} from '../components/aim-error';
import {
  type Collision,
  deserializeCollision,
  type SerializedCollision,
  serializeCollision,
} from '../components/collision';
import {
  type CombatStats,
  deserializeCombatStats,
  type SerializedCombatStats,
  serializeCombatStats,
} from '../components/combat-stats';
import {
  type ConvoyAutopilot,
  type ConvoyShip,
  deserializeConvoyAutopilot,
  deserializeConvoyShip,
  type SerializedConvoyAutopilot,
  type SerializedConvoyShip,
  serializeConvoyAutopilot,
  serializeConvoyShip,
} from '../components/convoy';
import {
  type DamageTracking,
  deserializeDamageTracking,
  type SerializedDamageTracking,
  serializeDamageTracking,
} from '../components/damage-tracking';
import {
  type Decoy,
  deserializeDecoy,
  type SerializedDecoy,
  serializeDecoy,
} from '../components/decoy';
import {
  deserializeExplosion,
  type Explosion,
  type SerializedExplosion,
  serializeExplosion,
} from '../components/explosion';
import {
  deserializeFaction,
  type FactionComponent,
  type SerializedFaction,
  serializeFaction,
} from '../components/faction';
import {
  deserializeHealth,
  type Health,
  type SerializedHealth,
  serializeHealth,
} from '../components/health';
import {
  deserializeHeat,
  type Heat,
  type SerializedHeat,
  serializeHeat,
} from '../components/heat';
import {
  deserializeHullCollider,
  type HullCollider,
  type SerializedHullCollider,
  serializeHullCollider,
} from '../components/hull-collider';
import {
  deserializeHyperspaceJump,
  type HyperspaceJump,
  type SerializedHyperspaceJump,
  serializeHyperspaceJump,
} from '../components/hyperspace-jump';
import {
  deserializeMissile,
  type Missile,
  type SerializedMissile,
  serializeMissile,
} from '../components/missile';
import {
  deserializePhysics,
  type Physics,
  type SerializedPhysics,
  serializePhysics,
} from '../components/physics';
import {
  deserializePlayerControlled,
  type PlayerControlled,
  type SerializedPlayerControlled,
  serializePlayerControlled,
} from '../components/player';
import {
  deserializeProjectile,
  type Projectile,
  type SerializedProjectile,
  serializeProjectile,
} from '../components/projectile';
import {
  deserializeShieldHit,
  type SerializedShieldHit,
  type ShieldHit,
  serializeShieldHit,
} from '../components/shield-hit';
import {
  deserializeShields,
  type SerializedShields,
  type Shields,
  serializeShields,
} from '../components/shields';
import {
  deserializeShipIdentity,
  type SerializedShipIdentity,
  type ShipIdentity,
  serializeShipIdentity,
} from '../components/ship-identity';
import {
  deserializeShipTag,
  type SerializedShipTag,
  type ShipTag,
  serializeShipTag,
} from '../components/ship-tag';
import {
  deserializeStructure,
  type SerializedStructure,
  type Structure,
  serializeStructure,
} from '../components/structure';
import {
  deserializeTargeting,
  type SerializedTargeting,
  serializeTargeting,
  type Targeting,
} from '../components/targeting';
import {
  deserializeTransform,
  type SerializedTransform,
  serializeTransform,
  type Transform,
} from '../components/transform';
import {
  deserializePrimaryWeapons,
  deserializeSecondaryWeapons,
  type PrimaryWeapons,
  type SecondaryWeapons,
  type SerializedPrimaryWeapons,
  type SerializedSecondaryWeapons,
  serializePrimaryWeapons,
  serializeSecondaryWeapons,
} from '../components/weapons';
import type { ComponentBase } from '../core/types';

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
  | SerializedHyperspaceJump
  | SerializedShipTag;

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
  SerializedShipTag,
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
 * Each case uses a specific type cast so TypeScript catches mismatches
 * between component interfaces and their serializer parameter types.
 */
export function serializeComponent(
  component: ComponentBase,
): SerializedComponent {
  switch (component.type) {
    case 'transform':
      return serializeTransform(component as Transform);
    case 'physics':
      return serializePhysics(component as Physics);
    case 'health':
      return serializeHealth(component as Health);
    case 'collision':
      return serializeCollision(component as Collision);
    case 'hullCollider':
      return serializeHullCollider(component as HullCollider);
    case 'faction':
      return serializeFaction(component as FactionComponent);
    case 'playerControlled':
      return serializePlayerControlled(component as PlayerControlled);
    case 'aiControlled':
      return serializeAIControlled(component as AIControlled);
    case 'targeting':
      return serializeTargeting(component as Targeting);
    case 'aimError':
      return serializeAimError(component as AimError);
    case 'primaryWeapons':
      return serializePrimaryWeapons(component as PrimaryWeapons);
    case 'secondaryWeapons':
      return serializeSecondaryWeapons(component as SecondaryWeapons);
    case 'projectile':
      return serializeProjectile(component as Projectile);
    case 'missile':
      return serializeMissile(component as Missile);
    case 'decoy':
      return serializeDecoy(component as Decoy);
    case 'explosion':
      return serializeExplosion(component as Explosion);
    case 'shipIdentity':
      return serializeShipIdentity(component as ShipIdentity);
    case 'heat':
      return serializeHeat(component as Heat);
    case 'shields':
      return serializeShields(component as Shields);
    case 'shieldHit':
      return serializeShieldHit(component as ShieldHit);
    case 'combatStats':
      return serializeCombatStats(component as CombatStats);
    case 'convoyShip':
      return serializeConvoyShip(component as ConvoyShip);
    case 'convoyAutopilot':
      return serializeConvoyAutopilot(component as ConvoyAutopilot);
    case 'damageTracking':
      return serializeDamageTracking(component as DamageTracking);
    case 'structure':
      return serializeStructure(component as Structure);
    case 'hyperspaceJump':
      return serializeHyperspaceJump(component as HyperspaceJump);
    case 'shipTag':
      return serializeShipTag(component as ShipTag);
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
    case 26:
      return deserializeShipTag(serialized as SerializedShipTag);
    default:
      throw new Error(`Unknown component type ID: ${typeId}`);
  }
}
