/**
 * Physics System - Applies velocity, drag, and rotation to transforms.
 */

import { Vector3, Quaternion, Euler } from 'three';
import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { Physics } from '../components/physics';
import type { PlayerControlled } from '../components/player';
import type { AIControlled } from '../components/ai';
import type { Heat } from '../components/heat';

// Reusable objects to avoid allocations
const tempEuler = new Euler();
const tempQuat = new Quaternion();
const forward = new Vector3();

/** Convert degrees to radians */
const DEG_TO_RAD = Math.PI / 180;

/** Move value toward target by maxDelta (used for smooth acceleration) */
function moveToward(current: number, target: number, maxDelta: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

/** Physics system - updates positions and velocities */
export function physicsSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['transform', 'physics'])) {
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const physics = getComponent<Physics>(world, entity, 'physics')!;

    // Get control input (either from player or AI)
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled');
    const ai = getComponent<AIControlled>(world, entity, 'aiControlled');

    let pitchInput = 0;
    let yawInput = 0;
    let rollInput = 0;
    let accelerating = false;
    let decelerating = false;
    let afterburner = false;

    if (player) {
      // Player input
      if (player.input.pitchUp) pitchInput = 1;
      if (player.input.pitchDown) pitchInput = -1;
      if (player.input.yawLeft) yawInput = 1;
      if (player.input.yawRight) yawInput = -1;
      if (player.input.rollLeft) rollInput = 1;
      if (player.input.rollRight) rollInput = -1;
      accelerating = player.input.accelerate;
      decelerating = player.input.decelerate;
      afterburner = player.input.afterburner;
    } else if (ai) {
      // AI will set these values through AI system (TODO)
      // For now, simple pursue behavior handled here
    }

    // Calculate target angular velocity from input
    const targetPitch = pitchInput * physics.turnRate;
    const targetYaw = yawInput * physics.turnRate;
    const targetRoll = rollInput * physics.rollRate;

    // Accelerate/decelerate angular velocity toward target
    const angAccel = physics.angularAcceleration * dt;
    physics.angularVelocity.x = moveToward(physics.angularVelocity.x, targetPitch, angAccel);
    physics.angularVelocity.y = moveToward(physics.angularVelocity.y, targetYaw, angAccel);
    physics.angularVelocity.z = moveToward(physics.angularVelocity.z, targetRoll, angAccel);

    // Apply angular velocity to rotation
    const pitchDelta = physics.angularVelocity.x * DEG_TO_RAD * dt;
    const yawDelta = physics.angularVelocity.y * DEG_TO_RAD * dt;
    const rollDelta = physics.angularVelocity.z * DEG_TO_RAD * dt;

    // Create rotation delta in local space
    tempEuler.set(pitchDelta, yawDelta, rollDelta, 'YXZ');
    tempQuat.setFromEuler(tempEuler);

    // Apply rotation to current orientation
    transform.rotation.multiply(tempQuat);
    transform.rotation.normalize();

    // Calculate afterburner max speed
    const afterburnerMaxSpeed = physics.maxSpeed * physics.afterburnerMultiplier;
    const heat = getComponent<Heat>(world, entity, 'heat');

    // Afterburner heat lockout with hysteresis (prevents oscillation)
    if (heat) {
      if (physics.afterburnerLocked) {
        // Must cool to 50% to unlock
        if (heat.current <= heat.max * 0.5) {
          physics.afterburnerLocked = false;
        }
      } else {
        // Lock at 95% heat
        if (heat.current >= heat.max * 0.95) {
          physics.afterburnerLocked = true;
        }
      }
    }

    const canAfterburn = afterburner && !physics.afterburnerLocked;

    // Update current speed based on input
    if (canAfterburn) {
      // Afterburner: accelerate toward afterburner max (works from any speed)
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * 1.5 * dt,
        afterburnerMaxSpeed
      );
      physics.isAfterburning = true;

      // Generate heat while afterburning
      if (heat) {
        heat.current = Math.min(heat.max, heat.current + physics.afterburnerHeatRate * dt);
      }
    } else if (accelerating) {
      // Normal acceleration up to max speed
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * dt,
        physics.maxSpeed
      );
      physics.isAfterburning = false;
    } else if (decelerating) {
      physics.currentSpeed = Math.max(
        physics.currentSpeed - physics.acceleration * dt,
        0
      );
      physics.isAfterburning = false;
    } else {
      // Coasting - if above max speed, decelerate back to max
      if (physics.currentSpeed > physics.maxSpeed) {
        physics.currentSpeed = Math.max(
          physics.currentSpeed - physics.acceleration * 0.5 * dt,
          physics.maxSpeed
        );
      }
      physics.isAfterburning = false;
    }

    // Calculate forward vector from rotation
    forward.set(0, 0, -1);
    forward.applyQuaternion(transform.rotation);

    // Set velocity to forward * currentSpeed
    physics.velocity.copy(forward).multiplyScalar(physics.currentSpeed);

    // Update position
    transform.position.addScaledVector(physics.velocity, dt);
  }
}

/** Get the forward direction of an entity */
export function getForward(transform: Transform): Vector3 {
  const fwd = new Vector3(0, 0, -1);
  fwd.applyQuaternion(transform.rotation);
  return fwd;
}

/** Get distance between two transforms */
export function getDistance(a: Transform, b: Transform): number {
  return a.position.distanceTo(b.position);
}
