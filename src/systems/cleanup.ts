/**
 * Cleanup System - Removes dead entities and processes removal queue.
 */

import * as THREE from 'three';
import { createExplosion } from '../components/explosion';
import type { FactionComponent } from '../components/faction';
import { Faction } from '../components/faction';
import type { Health } from '../components/health';
import { isDead } from '../components/health';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import {
  addComponent,
  createEntity,
  getComponent,
  isShip,
  processRemovals,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { World } from '../core/types';
import type { Collision } from './collision';

/**
 * How long ships stay visible after death (for explosion to engulf them).
 * At 0.15s into a 0.8s explosion with ease-out animation:
 * - progress = 0.15/0.8 = 0.19
 * - easedProgress = 1 - (1-0.19)^2 = 0.34
 * - sphereScale = size * (0.5 + 0.34*3) = 1.5x ship size
 * This ensures the explosion sphere fully covers the ship before removal.
 */
const SHIP_DEATH_DELAY = 0.15;

/** Faction colors for explosions */
const EXPLOSION_COLORS: Record<Faction, THREE.Color> = {
  [Faction.Player]: new THREE.Color(0x00ff66), // Green
  [Faction.Enemy]: new THREE.Color(0xff6600), // Orange
  [Faction.Neutral]: new THREE.Color(0xffff00), // Yellow
};

/** Cleanup system - marks dead entities for removal and processes queue */
export function cleanupSystem(world: World, dt: number): void {
  // Handle dead entities
  for (const entity of queryEntities(world, ['health'])) {
    // Query guarantees this component exists
    const health = getComponent<Health>(world, entity, 'health') as Health;

    if (!isDead(health)) continue;

    if (isShip(world, entity)) {
      // Ships have a death delay so explosion can engulf them
      if (health.deathDelay === undefined) {
        // First frame of death: spawn explosion and start delay
        console.log(
          `[DEATH ${performance.now().toFixed(0)}ms] Ship ${entity} died, spawning explosion, deathDelay=${SHIP_DEATH_DELAY}`,
        );
        spawnExplosion(world, entity);
        health.deathDelay = SHIP_DEATH_DELAY;
      } else {
        // Decrement delay
        health.deathDelay -= dt;
        if (health.deathDelay <= 0) {
          console.log(
            `[DEATH ${performance.now().toFixed(0)}ms] Ship ${entity} removed after death delay`,
          );
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

  // Create explosion entity (follows source entity while it exists)
  const explosionEntity = createEntity(world);
  addComponent(
    world,
    explosionEntity,
    createTransform(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    ),
  );
  addComponent(
    world,
    explosionEntity,
    createExplosion(size, color.clone(), entity),
  );
}
