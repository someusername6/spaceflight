/**
 * AI Behaviors - State update functions for AI ships.
 *
 * Extracted from ai.ts to stay under 300 line limit.
 */

import { Vector3, Quaternion } from 'three';
import type { World, Entity } from '../core/types';
import { getComponent, entityExists } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { Physics } from '../components/physics';
import { AIState, type AIControlled } from '../components/ai';
import { Faction } from '../components/faction';
import type { Shields } from '../components/shields';
import type { Heat } from '../components/heat';
import { findNearestEnemy } from './ai';

// Reusable vectors
const toTarget = new Vector3();
const forward = new Vector3();
const rotationAxis = new Vector3();
const deltaQuat = new Quaternion();

const DEG_TO_RAD = Math.PI / 180;

/** Thresholds for state transitions */
const LOW_SHIELDS_PERCENT = 0.2;      // 20% - trigger evade
const VERY_LOW_SHIELDS_PERCENT = 0.1; // 10% - trigger regroup
const RECOVER_SHIELDS_PERCENT = 0.5;  // 50% - exit regroup
const RECOVER_HEAT_PERCENT = 0.5;     // 50% - exit regroup
const EVADE_COOLDOWN = 5.0;           // 5s before can exit evade
const REGROUP_MIN_TIME = 3.0;         // Minimum time in regroup

/** Check if AI should evade (low shields) */
export function shouldEvade(shields: Shields | undefined): boolean {
  if (!shields) return false;
  return shields.current / shields.max < LOW_SHIELDS_PERCENT;
}

/** Check if AI should regroup (very low shields or overheated) */
export function shouldRegroup(shields: Shields | undefined, heat: Heat | undefined): boolean {
  const veryLowShields = shields && shields.current / shields.max < VERY_LOW_SHIELDS_PERCENT;
  const overheated = heat && heat.current / heat.max > 0.9;
  return veryLowShields || overheated || false;
}

/** Check if AI has recovered enough to re-engage */
function hasRecovered(shields: Shields | undefined, heat: Heat | undefined): boolean {
  const shieldsOk = !shields || shields.current / shields.max >= RECOVER_SHIELDS_PERCENT;
  const heatOk = !heat || heat.current / heat.max <= RECOVER_HEAT_PERCENT;
  return shieldsOk && heatOk;
}

/** Helper: Turn toward a direction */
function turnToward(transform: Transform, physics: Physics, direction: Vector3, dt: number): void {
  forward.set(0, 0, -1).applyQuaternion(transform.rotation);
  const dot = forward.dot(direction);
  const turnSpeed = physics.turnRate * DEG_TO_RAD * dt;

  if (dot < 0.999) {
    rotationAxis.crossVectors(forward, direction);
    const axisLengthSq = rotationAxis.lengthSq();
    if (axisLengthSq > 0.0001) {
      rotationAxis.multiplyScalar(1 / Math.sqrt(axisLengthSq));
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      deltaQuat.setFromAxisAngle(rotationAxis, Math.min(angle, turnSpeed));
      transform.rotation.premultiply(deltaQuat);
      transform.rotation.normalize();
    }
  }
}

/** Evade state - break away from combat */
export function updateEvade(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  shields: Shields | undefined,
  dt: number
): void {
  // Exit condition: shields recovered and cooldown expired
  if (ai.stateTimer >= EVADE_COOLDOWN && shields && shields.current / shields.max >= LOW_SHIELDS_PERCENT) {
    ai.state = ai.target ? AIState.Pursue : AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Evade behavior: turn away from target and fly erratically
  if (ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent<Transform>(world, ai.target, 'transform');
    if (targetTransform) {
      // Turn AWAY from target
      toTarget.copy(transform.position).sub(targetTransform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();
        turnToward(transform, physics, toTarget, dt);
      }
    }
  }

  // Add erratic movement (barrel roll effect via slight yaw oscillation)
  const wobble = Math.sin(ai.stateTimer * 8) * 0.3;
  const wobbleQuat = deltaQuat.setFromAxisAngle(forward.set(0, 0, -1), wobble * dt);
  transform.rotation.multiply(wobbleQuat);
  transform.rotation.normalize();

  // Accelerate to max speed
  physics.currentSpeed = Math.min(physics.currentSpeed + physics.acceleration * dt, physics.maxSpeed);
}

/** Protect state - guard an ally */
export function updateProtect(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  faction: Faction,
  dt: number
): void {
  // Check if we have someone to protect
  if (!ai.protectTarget || !entityExists(world, ai.protectTarget)) {
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const protecteeTransform = getComponent<Transform>(world, ai.protectTarget, 'transform');
  if (!protecteeTransform) {
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Find nearest threat to protectee
  const threat = findNearestEnemy(world, ai.protectTarget, faction);
  if (threat) {
    const threatTransform = getComponent<Transform>(world, threat, 'transform');
    if (threatTransform) {
      // Position between protectee and threat
      toTarget.copy(protecteeTransform.position).add(threatTransform.position).multiplyScalar(0.5);
      // Offset slightly toward threat
      toTarget.lerp(threatTransform.position, 0.3);

      const dirToIntercept = toTarget.clone().sub(transform.position);
      if (dirToIntercept.lengthSq() > 100) { // More than 10m away from intercept point
        dirToIntercept.normalize();
        turnToward(transform, physics, dirToIntercept, dt);
        physics.currentSpeed = Math.min(physics.currentSpeed + physics.acceleration * dt, physics.maxSpeed);
      } else {
        // At intercept point - engage the threat
        ai.target = threat;
        ai.state = AIState.Engage;
        ai.stateTimer = 0;
      }
    }
  } else {
    // No threats - orbit protectee
    physics.currentSpeed = physics.maxSpeed * 0.5;
  }
}

/** Regroup state - disengage and recover */
export function updateRegroup(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  shields: Shields | undefined,
  heat: Heat | undefined,
  dt: number
): void {
  // Exit condition: recovered and minimum time passed
  if (ai.stateTimer >= REGROUP_MIN_TIME && hasRecovered(shields, heat)) {
    ai.state = ai.target ? AIState.Pursue : AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Regroup behavior: fly away from target in a large loop
  if (ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent<Transform>(world, ai.target, 'transform');
    if (targetTransform) {
      // Turn away from target with slight curve (looping maneuver)
      toTarget.copy(transform.position).sub(targetTransform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();
        // Add upward curve for looping effect
        toTarget.y += 0.3;
        toTarget.normalize();
        turnToward(transform, physics, toTarget, dt);
      }
    }
  }

  // Cruise at moderate speed to conserve heat
  const targetSpeed = physics.maxSpeed * 0.7;
  if (physics.currentSpeed < targetSpeed) {
    physics.currentSpeed = Math.min(physics.currentSpeed + physics.acceleration * dt, targetSpeed);
  }
}
