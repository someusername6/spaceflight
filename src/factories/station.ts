/**
 * Station Factory - Creates station structure entities.
 *
 * Stations are large static structures that can be damaged and destroyed.
 * They have compound collision (multiple sub-hulls) so ships can fly through
 * the ring while still colliding with the structural elements.
 */

import { Quaternion, type Vector3 } from 'three';
import { createCollision } from '../components/collision';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import {
  createCompoundHullCollider,
  type SubHull,
} from '../components/hull-collider';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import { createShipIdentity } from '../components/ship-identity';
import { createStructure } from '../components/structure';
import { createTransform } from '../components/transform';
import { addComponent, createEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import {
  getStationStats,
  type StationStats,
  type StationType,
} from '../data/stations';
import { SHIP_GEOMETRIES } from '../rendering/ship-geometries';

/**
 * Large mass for structures (effectively immovable).
 * Used for mass ratio calculations in collision response, though structures
 * are actually handled as immovable via the 'structure' component check.
 */
const STRUCTURE_MASS = 1e9;

/** Options for creating a station entity */
export interface StationOptions {
  /** Station type (affects default stats and display name) */
  stationType?: StationType;
  /** Override hull health (uses type default if not specified) */
  health?: number;
  /** Override shield max (uses type default if not specified) */
  shields?: number;
  /** Override shield regen rate (uses type default if not specified) */
  shieldRegen?: number;
  /** Override shield regen delay (uses type default if not specified) */
  shieldDelay?: number;
  /** Override display name (uses type default if not specified) */
  displayName?: string;
  /** Station faction (defaults to Player) */
  faction?: Faction;
}

/**
 * Create a station entity at the specified position.
 *
 * The station uses the geometry from SHIP_GEOMETRIES.station and
 * creates a compound hull collider from its sub-hulls if available.
 * Unlike pure structures, stations have health and shields and can be destroyed.
 *
 * @param world - Game world
 * @param position - Station position
 * @param options - Station configuration options
 * @param rotation - Optional rotation (defaults to identity)
 */
export function createStationEntity(
  world: World,
  position: Vector3,
  options: StationOptions = {},
  rotation: Quaternion = new Quaternion(),
): Entity {
  // Get base stats from station type
  const baseStats: StationStats = getStationStats(options.stationType);

  // Apply overrides
  const health = options.health ?? baseStats.hull;
  const shields = options.shields ?? baseStats.shields;
  const shieldRegen = options.shieldRegen ?? baseStats.shieldRegen;
  const shieldDelay = options.shieldDelay ?? baseStats.shieldDelay;
  const displayName = options.displayName ?? baseStats.displayName;

  const entity = createEntity(world);

  // Transform - structures are static at their position
  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
  );

  // Structure component marks this as a static structure
  // Pass stationType for mesh selection
  const stationType = options.stationType ?? 'mining';
  addComponent(world, entity, createStructure('station', stationType));

  // Get geometry data for this station type
  const geometryData = SHIP_GEOMETRIES[stationType];

  // Create hull collider - use subHulls if available, otherwise single hull
  // Stations use hull collision for weapons (projectiles) to allow flying through rings
  if (geometryData.subHulls && geometryData.subHulls.length > 0) {
    // Compound collision from multiple sub-hulls
    const subHulls: SubHull[] = geometryData.subHulls.map((sh) => ({
      planes: sh.planes,
      boundingRadius: sh.boundingRadius,
    }));

    addComponent(
      world,
      entity,
      createCompoundHullCollider(
        subHulls,
        geometryData.hullBoundingRadius,
        STRUCTURE_MASS,
        true, // useHullForWeapons - projectiles use actual hull, not bounding sphere
      ),
    );
  } else if (geometryData.hull) {
    // Fall back to legacy single-hull format (wrap in compound collider)
    addComponent(
      world,
      entity,
      createCompoundHullCollider(
        [
          {
            planes: geometryData.hull,
            boundingRadius: geometryData.hullBoundingRadius,
          },
        ],
        geometryData.hullBoundingRadius,
        STRUCTURE_MASS,
        true, // useHullForWeapons
      ),
    );
  }

  // Collision component for the collision system to pick it up
  addComponent(world, entity, createCollision(geometryData.hullBoundingRadius));

  // Health - large health pool, can be destroyed
  addComponent(world, entity, createHealth(health));

  // Shields - regenerating protection
  addComponent(world, entity, createShields(shields, shieldRegen, shieldDelay));

  // Shield hit tracking for visual feedback
  addComponent(world, entity, createShieldHit());

  // Ship identity for rendering and HUD display
  addComponent(world, entity, createShipIdentity('station', displayName));

  // Faction - defaults to Player, can be overridden for enemy stations
  const stationFaction = options.faction ?? Faction.Player;
  addComponent(world, entity, createFaction(stationFaction));

  return entity;
}
