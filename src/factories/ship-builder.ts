/**
 * Ship Builder - Shared ship entity construction utilities.
 *
 * This module provides the common foundation for all ship spawning:
 * - factories/ship.ts (archetype-based ships)
 * - campaign/ship-spawning.ts (campaign ships with custom loadouts)
 * - replay/replay-ship-spawning.ts (replay reconstruction)
 *
 * Each spawner uses these helpers and provides its own:
 * - Stats source (archetype vs SHIP_CLASSES)
 * - Control setup (player vs AI)
 * - Weapon creation (archetype def vs campaign vs replay)
 */

import { Quaternion, type Vector3 } from 'three';
import { createCollision } from '../components/collision';
import { createCombatStats } from '../components/combat-stats';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createHeat } from '../components/heat';
import { createHullCollider } from '../components/hull-collider';
import {
  createPhysics,
  INITIAL_SPAWN_SPEED,
  setInitialVelocity,
} from '../components/physics';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import { createTransform } from '../components/transform';
import { addComponent, createEntity, getComponent } from '../core/ecs';
import type { Entity, Faction, World } from '../core/types';
import { SHIP_GEOMETRIES, type ShipClass } from '../rendering/ship-geometries';
import { initWeaponAmmoCounts } from '../systems/stats';

/**
 * Stats required for ship physics and survival.
 * Both ShipClassStats (data/ships.ts) and ShipStats (ship-archetypes.ts) satisfy this.
 */
export interface ShipPhysicsStats {
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  rollRate: number;
  afterburnerHeatRate: number;
  hull: number;
  shields: number;
  shieldRegen: number;
  shieldDelay: number;
  maxHeat: number;
  coolingRate: number;
  collisionRadius: number;
}

/** Configuration for spawning a ship entity */
export interface ShipSpawnConfig {
  world: World;
  stats: ShipPhysicsStats;
  position?: Vector3 | undefined;
  rotation?: Quaternion | undefined;
  initialSpeed?: number | undefined;
  faction: Faction;
  /** Multiplier for collision radius (AI ships use 1.5, players use 1.0) */
  collisionRadiusMultiplier?: number | undefined;
  /** Ship class name for hull collider lookup */
  shipClassName: string;
}

/**
 * Create a ship entity with all core components (everything except control and weapons).
 *
 * Adds: Transform, Physics, Health, Shields, ShieldHit, Faction, Heat
 *
 * The caller must then add:
 * - Control component (PlayerControlled or AIControlled + AimError)
 * - ShipIdentity
 * - Targeting (if applicable)
 * - Weapons (PrimaryWeapons, SecondaryWeapons)
 *
 * After adding those, call finalizeShip() to add collision and combat stats.
 */
export function createShipEntity(config: ShipSpawnConfig): Entity {
  const { world, stats, position, rotation, initialSpeed, faction } = config;

  const entity = createEntity(world);
  const shipRotation = rotation ?? new Quaternion();
  const spawnSpeed = initialSpeed ?? INITIAL_SPAWN_SPEED;

  // Transform
  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      shipRotation,
    ),
  );

  // Physics
  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
      afterburnerHeatRate: stats.afterburnerHeatRate,
      initialSpeed: spawnSpeed,
    }),
  );

  // Set initial velocity in forward direction
  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, spawnSpeed);
  }

  // Survival components
  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());

  // Faction
  addComponent(world, entity, createFaction(faction));

  // Heat management
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  return entity;
}

/**
 * Finalize a ship entity by adding collision, hull collider, and combat tracking.
 *
 * Call this AFTER adding control, identity, and weapon components.
 */
export function finalizeShip(config: ShipSpawnConfig, entity: Entity): void {
  const {
    world,
    stats,
    shipClassName,
    collisionRadiusMultiplier = 1.0,
  } = config;

  // Collision
  const collisionRadius = stats.collisionRadius * collisionRadiusMultiplier;
  addComponent(world, entity, createCollision(collisionRadius));

  // Hull collider (if geometry data exists)
  addHullColliderFromClass(world, entity, shipClassName, false);

  // Combat stats tracking
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);
}

/**
 * Add hull collider to a ship entity if geometry data exists.
 * Uses ship class name to look up hull planes and volume.
 *
 * @param world - ECS world
 * @param entity - Entity to add collider to
 * @param shipClassName - Ship class name (must match a key in SHIP_GEOMETRIES)
 * @param useHullForWeapons - If true, use hull for projectile/missile detection (large ships only)
 */
export function addHullColliderFromClass(
  world: World,
  entity: Entity,
  shipClassName: string,
  useHullForWeapons = false,
): void {
  // Check if ship class has hull data
  if (!(shipClassName in SHIP_GEOMETRIES)) {
    return; // No geometry data, skip hull collider
  }

  const geometry = SHIP_GEOMETRIES[shipClassName as ShipClass];
  if (!geometry.hull) {
    return; // No hull data for this geometry
  }

  addComponent(
    world,
    entity,
    createHullCollider(
      geometry.hull,
      geometry.hullBoundingRadius,
      geometry.hullVolume,
      useHullForWeapons,
    ),
  );
}
