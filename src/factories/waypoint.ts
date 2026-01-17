/**
 * Waypoint Factory - Creates waypoint structure entities.
 *
 * Waypoints are static structures at escape zones in convoy escort missions.
 * They have compound collision (multiple sub-hulls) so ships can pass
 * between the beams while still colliding with the beams themselves.
 */

import { Quaternion, type Vector3 } from 'three';
import { createCollision } from '../components/collision';
import {
  createCompoundHullCollider,
  type SubHull,
} from '../components/hull-collider';
import { createStructure } from '../components/structure';
import { createTransform } from '../components/transform';
import { addComponent, createEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { SHIP_GEOMETRIES } from '../rendering/ship-geometries';

/**
 * Large mass for structures (effectively immovable).
 * Used for mass ratio calculations in collision response, though structures
 * are actually handled as immovable via the 'structure' component check.
 */
const STRUCTURE_MASS = 1e9;

/**
 * Create a waypoint entity at the specified position.
 *
 * The waypoint uses the geometry from SHIP_GEOMETRIES.waypoint and
 * creates a compound hull collider from its sub-hulls if available.
 */
export function createWaypointEntity(
  world: World,
  position: Vector3,
  rotation: Quaternion = new Quaternion(),
): Entity {
  const entity = createEntity(world);

  // Transform - structures are static at their position
  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
  );

  // Structure component marks this as a static structure
  addComponent(world, entity, createStructure('waypoint'));

  // Get geometry data for waypoint
  const geometryData = SHIP_GEOMETRIES.waypoint;

  // Create hull collider - use subHulls if available, otherwise single hull
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
      ),
    );
  } else if (geometryData.hull) {
    // Fall back to legacy single-hull format (wrap in compound collider for consistency)
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
      ),
    );
  }

  // Collision component for the collision system to pick it up
  addComponent(world, entity, createCollision(geometryData.hullBoundingRadius));

  return entity;
}
