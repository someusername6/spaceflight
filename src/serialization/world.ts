/**
 * World Serialization - Full ECS world snapshot for rollback netcode.
 *
 * Serializes the complete simulation state:
 * - All entities and their components
 * - Entity ID allocator (nextEntityId)
 * - Pending entity removals (toRemove)
 * - PRNG state for deterministic replay
 * - SystemState (game time, weapons, targeting, beams, mission)
 *
 * Transient fields (renderPrng, visual queues) are NOT serialized.
 */

import type { ComponentType } from '../core/component-registry';
import type { PRNGState } from '../core/prng';
import type { ComponentBase, Entity, World } from '../core/types';
import {
  deserializeComponent,
  type SerializedComponent,
  serializeComponent,
} from './components';
import {
  deserializeSystemState,
  type SerializedActiveBeam,
  type SerializedSystemState,
  serializeSystemState,
} from './system-state';

// Re-export types for backwards compatibility
export type { SerializedActiveBeam, SerializedSystemState };

// =============================================================================
// Serialized Types
// =============================================================================

/** Serialized entity with all components */
export interface SerializedEntity {
  id: Entity;
  components: SerializedComponent[];
}

/** Complete serialized world state */
export interface SerializedWorld {
  /** Version for future compatibility */
  version: number;
  /** All entities with their components */
  entities: SerializedEntity[];
  /** Next entity ID to allocate */
  nextEntityId: Entity;
  /** Entities pending removal */
  toRemove: Entity[];
  /** Simulation PRNG state */
  prng: PRNGState;
  /** Simulation-critical system state */
  systemState: SerializedSystemState;
}

/** Current serialization version */
export const WORLD_SERIALIZATION_VERSION = 1;

// =============================================================================
// World Serialization
// =============================================================================

/**
 * Serialize the entire world state to a plain object.
 * The result can be JSON.stringify'd or converted to binary.
 */
export function serializeWorld(world: World): SerializedWorld {
  const entities: SerializedEntity[] = [];

  // Serialize all entities and their components
  for (const entityId of world.entities) {
    const componentMap = world.components.get(entityId);
    if (!componentMap) continue;

    const serializedComponents: SerializedComponent[] = [];
    for (const component of componentMap.values()) {
      serializedComponents.push(serializeComponent(component));
    }

    entities.push({
      id: entityId,
      components: serializedComponents,
    });
  }

  return {
    version: WORLD_SERIALIZATION_VERSION,
    entities,
    nextEntityId: world.nextEntityId,
    toRemove: Array.from(world.toRemove),
    prng: { seed: world.prng.seed },
    systemState: serializeSystemState(world.systemState),
  };
}

/**
 * Deserialize world state into an existing World object.
 * Clears current state and replaces with serialized data.
 *
 * @param data - The serialized world data
 * @param world - The world object to populate
 */
export function deserializeWorld(data: SerializedWorld, world: World): void {
  if (data.version !== WORLD_SERIALIZATION_VERSION) {
    throw new Error(
      `World serialization version mismatch: expected ${WORLD_SERIALIZATION_VERSION}, got ${data.version}`,
    );
  }

  // Clear existing state
  world.entities.clear();
  world.components.clear();
  world.toRemove.clear();

  // Restore entities and components
  for (const serializedEntity of data.entities) {
    world.entities.add(serializedEntity.id);

    const componentMap = new Map<ComponentType, ComponentBase>();
    for (const serializedComponent of serializedEntity.components) {
      const component = deserializeComponent(serializedComponent);
      componentMap.set(component.type as ComponentType, component);
    }
    world.components.set(serializedEntity.id, componentMap);
  }

  // Restore entity ID allocator
  world.nextEntityId = data.nextEntityId;

  // Restore pending removals
  for (const entityId of data.toRemove) {
    world.toRemove.add(entityId);
  }

  // Restore PRNG state
  world.prng.seed = data.prng.seed;

  // Restore system state
  deserializeSystemState(data.systemState, world.systemState);
}

/**
 * Convert serialized world to Uint8Array for network transmission.
 * Uses JSON encoding with TextEncoder for simplicity.
 * For production, consider MessagePack or custom binary format.
 */
export function serializeWorldToBytes(world: World): Uint8Array {
  const serialized = serializeWorld(world);
  const json = JSON.stringify(serialized);
  return new TextEncoder().encode(json);
}

/**
 * Deserialize world from Uint8Array.
 */
export function deserializeWorldFromBytes(
  data: Uint8Array,
  world: World,
): void {
  const json = new TextDecoder().decode(data);
  const serialized = JSON.parse(json) as SerializedWorld;
  deserializeWorld(serialized, world);
}

/**
 * Estimate the byte size of a serialized world.
 * Useful for monitoring snapshot sizes.
 */
export function estimateWorldSize(world: World): number {
  const serialized = serializeWorld(world);
  return JSON.stringify(serialized).length;
}
