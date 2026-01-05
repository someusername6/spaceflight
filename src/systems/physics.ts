/**
 * Physics System - Applies velocity, drag, and rotation to transforms.
 */

import { Euler, Quaternion, Vector3 } from 'three';
import type { AIControlled } from '../components/ai';
import type { Health } from '../components/health';
import { isDead } from '../components/health';
import type { Heat } from '../components/heat';
import {
  AFTERBURNER_LOCK_THRESHOLD,
  AFTERBURNER_UNLOCK_THRESHOLD,
  getHeatPercent,
} from '../components/heat';
import type { Physics } from '../components/physics';
import type { PlayerControlled } from '../components/player';
import type { Targeting } from '../components/targeting';
import type { Transform } from '../components/transform';
import { entityExists, getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

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
    // Query guarantees these components exist
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const physics = getComponent<Physics>(world, entity, 'physics') as Physics;

    // Dead or dying entities coast with current velocity (no control input)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDead(health)) {
      // Just update position, no control
      transform.position.addScaledVector(physics.velocity, dt);
      continue;
    }

    // Get control input (either from player or AI)
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );
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

      // Handle match speed toggle (edge-triggered)
      const flightAssist = world.systemState.flightAssist;
      if (
        player.input.toggleMatchSpeed &&
        !flightAssist.prevInput.toggleMatchSpeed
      ) {
        player.matchSpeed = !player.matchSpeed;
        // Reset distance tracking when toggling
        player.prevTargetDistance = 0;
      }
      flightAssist.prevInput.toggleMatchSpeed = player.input.toggleMatchSpeed;

      // Get targeting info for match speed
      const targeting = getComponent<Targeting>(world, entity, 'targeting');
      const hasValidTarget =
        targeting?.currentTarget !== undefined &&
        entityExists(world, targeting.currentTarget);

      // Disable match speed if no target
      if (player.matchSpeed && !hasValidTarget) {
        player.matchSpeed = false;
        player.prevTargetDistance = 0;
      }
    } else if (ai) {
      // AI movement handled directly in ai.ts via transform.rotation and physics.currentSpeed
      // AI does not use the input abstraction - it sets rotation/speed directly each frame
      // Skip the rest of speed control for AI - they manage their own speed and afterburner
      forward.set(0, 0, -1);
      forward.applyQuaternion(transform.rotation);
      physics.velocity.copy(forward).multiplyScalar(physics.currentSpeed);
      transform.position.addScaledVector(physics.velocity, dt);
      continue;
    }

    // Calculate target angular velocity from input
    const targetPitch = pitchInput * physics.turnRate;
    const targetYaw = yawInput * physics.turnRate;
    const targetRoll = rollInput * physics.rollRate;

    // Accelerate/decelerate angular velocity toward target
    const angAccel = physics.angularAcceleration * dt;
    physics.angularVelocity.x = moveToward(
      physics.angularVelocity.x,
      targetPitch,
      angAccel,
    );
    physics.angularVelocity.y = moveToward(
      physics.angularVelocity.y,
      targetYaw,
      angAccel,
    );
    physics.angularVelocity.z = moveToward(
      physics.angularVelocity.z,
      targetRoll,
      angAccel,
    );

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
    const afterburnerMaxSpeed =
      physics.maxSpeed * physics.afterburnerMultiplier;
    const heat = getComponent<Heat>(world, entity, 'heat');

    // Afterburner heat lockout with hysteresis (prevents oscillation)
    if (heat) {
      const heatPct = getHeatPercent(heat);
      if (physics.afterburnerLocked) {
        // Must cool to 50% to unlock
        if (heatPct <= AFTERBURNER_UNLOCK_THRESHOLD) {
          physics.afterburnerLocked = false;
        }
      } else {
        // Lock at 95% heat
        if (heatPct >= AFTERBURNER_LOCK_THRESHOLD) {
          physics.afterburnerLocked = true;
        }
      }
    }

    const canAfterburn = afterburner && !physics.afterburnerLocked;
    // Any throttle input overrides match speed (even locked afterburner)
    const manualThrottleInput = accelerating || decelerating || afterburner;

    // Update current speed based on input
    if (canAfterburn) {
      // Afterburner: accelerate toward afterburner max (works from any speed)
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * 1.5 * dt,
        afterburnerMaxSpeed,
      );
      physics.isAfterburning = true;

      // Generate heat while afterburning
      if (heat) {
        heat.current = Math.min(
          heat.max,
          heat.current + physics.afterburnerHeatRate * dt,
        );
      }
    } else if (accelerating) {
      // Normal acceleration up to max speed
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * dt,
        physics.maxSpeed,
      );
      physics.isAfterburning = false;
    } else if (decelerating) {
      physics.currentSpeed = Math.max(
        physics.currentSpeed - physics.acceleration * dt,
        0,
      );
      physics.isAfterburning = false;
    } else if (player?.matchSpeed && !manualThrottleInput) {
      // Match speed mode: adjust throttle to maintain distance to target
      physics.isAfterburning = false;
      const targeting = getComponent<Targeting>(world, entity, 'targeting');
      if (targeting?.currentTarget !== undefined) {
        // Detect target change and reset distance tracking
        if (targeting.currentTarget !== player.prevMatchSpeedTarget) {
          player.prevTargetDistance = 0;
          player.prevMatchSpeedTarget = targeting.currentTarget;
        }

        const targetTransform = getComponent<Transform>(
          world,
          targeting.currentTarget,
          'transform',
        );
        if (targetTransform) {
          const currentDistance = transform.position.distanceTo(
            targetTransform.position,
          );

          // Initialize prev distance on first frame to avoid spike
          if (player.prevTargetDistance === 0) {
            player.prevTargetDistance = currentDistance;
          }

          // Calculate closing rate (positive = getting closer)
          const closingRate =
            (player.prevTargetDistance - currentDistance) / dt;
          player.prevTargetDistance = currentDistance;

          // Simple algorithm: adjust speed to cancel closing rate
          // If closing at 50 m/s, slow down by 50 m/s
          // If drifting apart at 50 m/s, speed up by 50 m/s
          const desiredSpeed = Math.max(
            0,
            Math.min(physics.maxSpeed, physics.currentSpeed - closingRate),
          );

          // Smoothly adjust toward desired speed
          physics.currentSpeed = moveToward(
            physics.currentSpeed,
            desiredSpeed,
            physics.acceleration * dt,
          );
        }
      }
    } else {
      // Coasting - if above max speed, decelerate back to max
      if (physics.currentSpeed > physics.maxSpeed) {
        physics.currentSpeed = Math.max(
          physics.currentSpeed - physics.acceleration * 0.5 * dt,
          physics.maxSpeed,
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

/** Get the forward direction of an entity (returns reusable vector - clone if storing) */
export function getForward(transform: Transform): Vector3 {
  forward.set(0, 0, -1);
  forward.applyQuaternion(transform.rotation);
  return forward;
}

/** Get distance between two transforms */
export function getDistance(a: Transform, b: Transform): number {
  return a.position.distanceTo(b.position);
}
