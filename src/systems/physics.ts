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

// Reusable objects to avoid allocations
const tempEuler = new Euler();
const tempQuat = new Quaternion();
const forward = new Vector3();

/** Convert degrees to radians */
const DEG_TO_RAD = Math.PI / 180;

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
    } else if (ai) {
      // AI will set these values through AI system (TODO)
      // For now, simple pursue behavior handled here
    }

    // Apply rotation (pitch, yaw, roll)
    const pitchDelta = pitchInput * physics.turnRate * DEG_TO_RAD * dt;
    const yawDelta = yawInput * physics.turnRate * DEG_TO_RAD * dt;
    const rollDelta = rollInput * physics.rollRate * DEG_TO_RAD * dt;

    // Create rotation delta in local space
    tempEuler.set(pitchDelta, yawDelta, rollDelta, 'YXZ');
    tempQuat.setFromEuler(tempEuler);

    // Apply rotation to current orientation
    transform.rotation.multiply(tempQuat);
    transform.rotation.normalize();

    // Update current speed based on input
    if (accelerating) {
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * dt,
        physics.maxSpeed
      );
    } else if (decelerating) {
      physics.currentSpeed = Math.max(
        physics.currentSpeed - physics.acceleration * dt,
        0
      );
    }
    // No drag when coasting - ship maintains current speed
    // Drag only applies to cap speed at maxSpeed (handled in accelerating branch)

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
