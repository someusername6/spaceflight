/**
 * Decoy Spawning - Creates decoy countermeasure entities.
 */

import * as THREE from 'three';
import { createDecoy } from '../../components/decoy';
import type { FactionComponent } from '../../components/faction';
import { createFaction } from '../../components/faction';
import { createHealth } from '../../components/health';
import type { Transform } from '../../components/transform';
import { createTransform } from '../../components/transform';
import { addComponent, createEntity } from '../../core/ecs';
import { randomUnitVector } from '../../core/prng';
import type { Entity, World } from '../../core/types';
import { createCollision } from '../collision';
import { recordDecoyDeployed } from '../stats';

/** Decoy collision radius */
const DECOY_RADIUS = 1.5;

/** Spawn offset below the ship */
const DECOY_SPAWN_OFFSET = 3;

// Reusable vectors (avoid per-call allocations)
const spawnPos = new THREE.Vector3();
const downAxis = new THREE.Vector3();
const decoyDirection = new THREE.Vector3();

/** Spawn a decoy entity (launches from bottom of ship with downward bias) */
export function spawnDecoy(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  ownerFaction: FactionComponent | undefined,
): void {
  // Get ship's local "down" direction (negative Y in local space)
  downAxis.set(0, -1, 0).applyQuaternion(ownerTransform.rotation);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(downAxis, DECOY_SPAWN_OFFSET);

  // Random direction biased downward (away from ship)
  const randomDir = randomUnitVector(world.prng);
  decoyDirection.set(randomDir.x, randomDir.y, randomDir.z);
  // Bias toward downward (ship's local down direction)
  decoyDirection.addScaledVector(downAxis, 1.5).normalize();

  const decoy = createEntity(world);

  // Create transform at spawn position
  const decoyTransform = createTransform(spawnPos.x, spawnPos.y, spawnPos.z);
  addComponent(world, decoy, decoyTransform);

  // Create decoy component
  addComponent(world, decoy, createDecoy(owner, decoyDirection));

  // Add collision (decoys can destroy missiles on contact)
  addComponent(world, decoy, createCollision(DECOY_RADIUS));

  // Add health (decoys have 1 HP like missiles)
  addComponent(world, decoy, createHealth(1));

  // Decoys inherit owner's faction
  if (ownerFaction) {
    addComponent(world, decoy, createFaction(ownerFaction.faction));
  }

  // Track per-ship stats
  recordDecoyDeployed(world, owner);

  // Track aggregate stats if enabled (for balance analysis)
  if (world.systemState.combatStats) {
    world.systemState.combatStats.decoysLaunched++;
  }
}
