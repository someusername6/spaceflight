/**
 * AI System - State machine and behavior for AI-controlled ships.
 */

import { Vector3, Quaternion } from 'three';
import type { World, Entity } from '../core/types';
import { queryEntities, getComponent, entityExists } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { Physics } from '../components/physics';
import { AIState, type AIControlled } from '../components/ai';
import { Faction, type FactionComponent, areEnemies } from '../components/faction';
import type { Health } from '../components/health';
import { isDying } from '../components/health';
import type { Shields } from '../components/shields';
import type { Heat } from '../components/heat';
import {
  shouldEvade,
  shouldRegroup,
  updateEvade,
  updateProtect,
  updateRegroup,
} from './ai-behaviors';

// Reusable vectors
const toTarget = new Vector3();
const forward = new Vector3();
const rotationAxis = new Vector3();
const deltaQuat = new Quaternion();

const DEG_TO_RAD = Math.PI / 180;

/** Engage range - how close before AI starts shooting */
const ENGAGE_RANGE = 600;

/** Break off range - AI will pursue if target gets this far */
const BREAK_OFF_RANGE = 1200;

/** Maximum AI that can engage the player simultaneously */
const MAX_ENGAGING_PLAYER = 3;

/** Count how many AI are currently engaging a specific target */
function countEngagingTarget(world: World, target: Entity): number {
  let count = 0;
  for (const entity of queryEntities(world, ['aiControlled'])) {
    const ai = getComponent<AIControlled>(world, entity, 'aiControlled')!;
    if (ai.state === AIState.Engage && ai.target === target) {
      count++;
    }
  }
  return count;
}

/** Check if an entity is the player */
function isPlayer(world: World, entity: Entity): boolean {
  return getComponent(world, entity, 'playerControlled') !== undefined;
}

/** AI system - updates AI state and movement */
export function aiSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['aiControlled', 'transform', 'physics', 'faction'])) {
    // Skip dying entities (they freeze during death animation)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDying(health)) continue;

    const ai = getComponent<AIControlled>(world, entity, 'aiControlled')!;
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const physics = getComponent<Physics>(world, entity, 'physics')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction')!;

    // Update state timer
    ai.stateTimer += dt;

    // Get shields and heat for state transitions
    const shields = getComponent<Shields>(world, entity, 'shields');
    const heat = getComponent<Heat>(world, entity, 'heat');

    // Check for emergency transitions (can happen from any combat state)
    if (ai.state === AIState.Pursue || ai.state === AIState.Engage) {
      if (shouldRegroup(shields, heat)) {
        ai.state = AIState.Regroup;
        ai.stateTimer = 0;
      } else if (shouldEvade(shields)) {
        ai.state = AIState.Evade;
        ai.stateTimer = 0;
      }
    }

    // Run state machine
    switch (ai.state) {
      case AIState.Idle:
        updateIdle(world, entity, ai, faction.faction);
        break;
      case AIState.Pursue:
        updatePursue(world, entity, ai, transform, physics, dt);
        break;
      case AIState.Engage:
        updateEngage(world, entity, ai, transform, physics, dt);
        break;
      case AIState.Evade:
        updateEvade(world, entity, ai, transform, physics, shields, dt);
        break;
      case AIState.Protect:
        updateProtect(world, entity, ai, transform, physics, faction.faction, dt);
        break;
      case AIState.Regroup:
        updateRegroup(world, entity, ai, transform, physics, shields, heat, dt);
        break;
    }
  }
}

/** Idle state - look for enemies */
function updateIdle(world: World, entity: Entity, ai: AIControlled, faction: Faction): void {
  const target = findNearestEnemy(world, entity, faction);
  if (target !== null) {
    ai.target = target;
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
  }
}

/** Pursue state - chase target until in engage range */
function updatePursue(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number
): void {
  // Check if target is still valid
  if (ai.target === null || !entityExists(world, ai.target)) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const targetTransform = getComponent<Transform>(world, ai.target, 'transform');
  if (!targetTransform) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const distance = transform.position.distanceTo(targetTransform.position);

  // Transition to engage if close enough
  if (distance <= ENGAGE_RANGE) {
    const targetIsPlayer = isPlayer(world, ai.target);
    const canEngage = !targetIsPlayer || countEngagingTarget(world, ai.target) < MAX_ENGAGING_PLAYER;

    if (canEngage) {
      ai.state = AIState.Engage;
      ai.stateTimer = 0;
    }
  }

  pursueTarget(world, entity, ai, transform, physics, dt);
}

/** Engage state - attack target while maintaining pursuit */
function updateEngage(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number
): void {
  if (ai.target === null || !entityExists(world, ai.target)) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const targetTransform = getComponent<Transform>(world, ai.target, 'transform');
  if (!targetTransform) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const distance = transform.position.distanceTo(targetTransform.position);

  if (distance > BREAK_OFF_RANGE) {
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
  }

  pursueTarget(world, entity, ai, transform, physics, dt);
}

/** Find the nearest enemy entity */
export function findNearestEnemy(world: World, self: Entity, selfFaction: Faction): Entity | null {
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  const selfTransform = getComponent<Transform>(world, self, 'transform');
  if (!selfTransform) return null;

  for (const other of queryEntities(world, ['transform', 'faction', 'health'])) {
    if (other === self) continue;

    const otherHealth = getComponent<Health>(world, other, 'health')!;
    if (isDying(otherHealth)) continue;

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

  toTarget.copy(targetTransform.position).sub(transform.position);
  const distToTarget = toTarget.length();

  if (distToTarget > 0.001) {
    toTarget.multiplyScalar(1 / distToTarget);
    forward.set(0, 0, -1).applyQuaternion(transform.rotation);

    const dot = forward.dot(toTarget);
    const turnSpeed = physics.turnRate * DEG_TO_RAD * dt;

    if (dot < 0.999) {
      rotationAxis.crossVectors(forward, toTarget);
      const axisLengthSq = rotationAxis.lengthSq();

      if (axisLengthSq > 0.0001) {
        rotationAxis.multiplyScalar(1 / Math.sqrt(axisLengthSq));
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        const rotateAngle = Math.min(angle, turnSpeed);

        deltaQuat.setFromAxisAngle(rotationAxis, rotateAngle);
        transform.rotation.premultiply(deltaQuat);
        transform.rotation.normalize();
      } else if (dot < -0.9) {
        rotationAxis.set(0, 1, 0);
        deltaQuat.setFromAxisAngle(rotationAxis, turnSpeed);
        transform.rotation.premultiply(deltaQuat);
        transform.rotation.normalize();
      }
    }
  }

  physics.currentSpeed = Math.min(
    physics.currentSpeed + physics.acceleration * dt,
    physics.maxSpeed
  );
}

/** Set AI target directly (for external systems) */
export function setAITarget(ai: AIControlled, target: Entity | null): void {
  ai.target = target;
}
