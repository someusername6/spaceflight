/**
 * AI System - State machine and behavior for AI-controlled ships.
 *
 * Slice 1: Simple pursue behavior only.
 */

import { Vector3, Quaternion } from 'three';
import type { World, Entity } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { Physics } from '../components/physics';
import { type AIControlled } from '../components/ai';
import { Faction, type FactionComponent, areEnemies } from '../components/faction';

// Reusable vectors
const toTarget = new Vector3();
const forward = new Vector3();
const desiredDir = new Vector3();

const DEG_TO_RAD = Math.PI / 180;

/** AI system - updates AI state and movement */
export function aiSystem(world: World, dt: number): void {
  // AI disabled for testing - enemies stay idle
  // TODO: Re-enable AI when ready for combat testing
  void world;
  void dt;
}

/** Find the nearest enemy entity */
export function findNearestEnemy(
  world: World,
  self: Entity,
  selfFaction: Faction
): Entity | null {
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  const selfTransform = getComponent<Transform>(world, self, 'transform');
  if (!selfTransform) return null;

  for (const other of queryEntities(world, ['transform', 'faction', 'health'])) {
    if (other === self) continue;

    const otherFaction = getComponent<FactionComponent>(world, other, 'faction');
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction)) continue;

    const otherTransform = getComponent<Transform>(world, other, 'transform')!;
    const dist = selfTransform.position.distanceTo(otherTransform.position);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

/** Pursue behavior - turn toward target and accelerate */
export function pursueTarget(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number
): void {
  const targetTransform = getComponent<Transform>(world, ai.target!, 'transform');
  if (!targetTransform) {
    ai.target = null;
    return;
  }

  // Calculate direction to target
  toTarget.copy(targetTransform.position).sub(transform.position).normalize();

  // Get current forward
  forward.set(0, 0, -1).applyQuaternion(transform.rotation);

  // Calculate rotation needed
  const dot = forward.dot(toTarget);
  const turnSpeed = physics.turnRate * DEG_TO_RAD * dt;

  if (dot < 0.999) {
    // Need to turn - create rotation toward target
    desiredDir.copy(toTarget);

    // Use slerp-like approach: rotate toward target
    const axis = new Vector3().crossVectors(forward, desiredDir).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const rotateAngle = Math.min(angle, turnSpeed);

    if (axis.lengthSq() > 0.001) {
      const deltaQuat = new Quaternion().setFromAxisAngle(axis, rotateAngle);
      transform.rotation.premultiply(deltaQuat);
      transform.rotation.normalize();
    }
  }

  // Always accelerate when pursuing
  physics.currentSpeed = Math.min(
    physics.currentSpeed + physics.acceleration * dt,
    physics.maxSpeed
  );
}

/** Set AI target directly (for external systems) */
export function setAITarget(ai: AIControlled, target: Entity | null): void {
  ai.target = target;
}
