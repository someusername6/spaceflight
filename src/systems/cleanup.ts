/**
 * Cleanup System - Removes dead entities and processes removal queue.
 */

import * as THREE from 'three';
import type { World } from '../core/types';
import {
  queryEntities,
  getComponent,
  removeEntity,
  processRemovals,
  createEntity,
  addComponent,
  hasComponent,
} from '../core/ecs';
import type { Health } from '../components/health';
import { isDead } from '../components/health';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import { createExplosion } from '../components/explosion';
import type { Collision } from './collision';
import type { FactionComponent } from '../components/faction';
import { Faction } from '../components/faction';

/** How long ships stay visible after death (for explosion to engulf them) */
const SHIP_DEATH_DELAY = 0.15;

/** Faction colors for explosions */
const EXPLOSION_COLORS: Record<Faction, THREE.Color> = {
  [Faction.Player]: new THREE.Color(0x00ff66),  // Green
  [Faction.Enemy]: new THREE.Color(0xff6600),   // Orange
  [Faction.Neutral]: new THREE.Color(0xffff00), // Yellow
};

/** Cleanup system - marks dead entities for removal and processes queue */
export function cleanupSystem(world: World, dt: number): void {
  // Handle dead entities
  for (const entity of queryEntities(world, ['health'])) {
    const health = getComponent<Health>(world, entity, 'health')!;

    if (!isDead(health)) continue;

    // Check if this is a ship (has collision but not projectile/missile)
    const isShip = hasComponent(world, entity, 'collision') &&
                   !hasComponent(world, entity, 'projectile') &&
                   !hasComponent(world, entity, 'missile');

    if (isShip) {
      // Ships have a death delay so explosion can engulf them
      if (health.deathDelay === undefined) {
        // First frame of death: spawn explosion and start delay
        spawnExplosion(world, entity);
        health.deathDelay = SHIP_DEATH_DELAY;
      } else {
        // Decrement delay
        health.deathDelay -= dt;
        if (health.deathDelay <= 0) {
          removeEntity(world, entity);
        }
      }
    } else {
      // Non-ships (projectiles, missiles) are removed immediately
      removeEntity(world, entity);
    }
  }

  // Process the removal queue
  processRemovals(world);
}

/** Spawns an explosion at the entity's position */
function spawnExplosion(world: World, entity: number): void {
  const transform = getComponent<Transform>(world, entity, 'transform');
  if (!transform) return;

  const collision = getComponent<Collision>(world, entity, 'collision');
  const faction = getComponent<FactionComponent>(world, entity, 'faction');

  // Explosion size based on ship collision radius
  const size = collision?.radius ?? 5;
  const color = EXPLOSION_COLORS[faction?.faction ?? Faction.Neutral];

  // Create explosion entity
  const explosion = createEntity(world);
  addComponent(world, explosion, createTransform(
    transform.position.x,
    transform.position.y,
    transform.position.z
  ));
  addComponent(world, explosion, createExplosion(size, color.clone()));
}
