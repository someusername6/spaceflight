/**
 * Lightweight Entity-Component-System framework.
 *
 * Design principles:
 * - Entities are just numeric IDs
 * - Components are plain data (interfaces, not classes)
 * - Systems are pure functions
 * - World holds all state
 */

import type { Entity, ComponentBase, ComponentType, ComponentMap, World } from './types';

/** Creates a new empty world */
export function createWorld(): World {
  return {
    entities: new Set(),
    components: new Map(),
    nextEntityId: 1,
    toRemove: new Set(),
  };
}

/** Creates a new entity and returns its ID */
export function createEntity(world: World): Entity {
  const id = world.nextEntityId++;
  world.entities.add(id);
  world.components.set(id, new Map());
  return id;
}

/** Marks an entity for removal (processed at end of tick) */
export function removeEntity(world: World, entity: Entity): void {
  world.toRemove.add(entity);
}

/** Actually removes all entities marked for removal */
export function processRemovals(world: World): void {
  for (const entity of world.toRemove) {
    world.entities.delete(entity);
    world.components.delete(entity);
  }
  world.toRemove.clear();
}

/** Adds a component to an entity */
export function addComponent<T extends ComponentBase>(
  world: World,
  entity: Entity,
  component: T
): void {
  const entityComponents = world.components.get(entity);
  if (!entityComponents) {
    throw new Error(`Entity ${entity} does not exist`);
  }
  entityComponents.set(component.type, component);
}

/** Gets a component from an entity (returns undefined if not present) */
export function getComponent<T extends ComponentBase>(
  world: World,
  entity: Entity,
  type: ComponentType
): T | undefined {
  const entityComponents = world.components.get(entity);
  if (!entityComponents) return undefined;
  return entityComponents.get(type) as T | undefined;
}

/** Checks if an entity has a specific component */
export function hasComponent(
  world: World,
  entity: Entity,
  type: ComponentType
): boolean {
  const entityComponents = world.components.get(entity);
  if (!entityComponents) return false;
  return entityComponents.has(type);
}

/** Checks if an entity has all specified components */
export function hasComponents(
  world: World,
  entity: Entity,
  types: ComponentType[]
): boolean {
  const entityComponents = world.components.get(entity);
  if (!entityComponents) return false;
  return types.every((type) => entityComponents.has(type));
}

/** Removes a component from an entity */
export function removeComponent(
  world: World,
  entity: Entity,
  type: ComponentType
): void {
  const entityComponents = world.components.get(entity);
  if (entityComponents) {
    entityComponents.delete(type);
  }
}

/**
 * Query for entities with specific components.
 * Returns an iterator of [entity, componentMap] pairs.
 */
export function* query(
  world: World,
  requiredTypes: ComponentType[]
): Generator<[Entity, ComponentMap]> {
  for (const entity of world.entities) {
    if (hasComponents(world, entity, requiredTypes)) {
      const components = world.components.get(entity)!;
      yield [entity, components];
    }
  }
}

/**
 * Query returning just entity IDs (for simpler iteration).
 */
export function* queryEntities(
  world: World,
  requiredTypes: ComponentType[]
): Generator<Entity> {
  for (const entity of world.entities) {
    if (hasComponents(world, entity, requiredTypes)) {
      yield entity;
    }
  }
}

/**
 * Get all entities (useful for cleanup/debug).
 */
export function getAllEntities(world: World): Entity[] {
  return Array.from(world.entities);
}

/**
 * Count entities matching a query.
 */
export function countEntities(world: World, requiredTypes: ComponentType[]): number {
  let count = 0;
  for (const entity of world.entities) {
    if (hasComponents(world, entity, requiredTypes)) {
      count++;
    }
  }
  return count;
}

/**
 * Find first entity matching query (useful for singletons like player).
 */
export function findEntity(
  world: World,
  requiredTypes: ComponentType[]
): Entity | undefined {
  for (const entity of world.entities) {
    if (hasComponents(world, entity, requiredTypes)) {
      return entity;
    }
  }
  return undefined;
}
