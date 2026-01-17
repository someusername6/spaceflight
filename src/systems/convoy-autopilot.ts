/**
 * Convoy Autopilot System - Simple movement toward destination for escort ships.
 *
 * Convoy ships have no combat AI - they just fly toward the escape zone.
 * This system sets control inputs that physics processes.
 */

import { Quaternion, Vector3 } from 'three';
import type { ConvoyAutopilot } from '../components/convoy';
import { isDead } from '../components/health';
import type { Transform } from '../components/transform';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

// Reusable vectors to avoid allocations
const toDestination = new Vector3();
const localDir = new Vector3();
const inverseRot = new Quaternion();

/** Angle threshold for proportional input (radians) */
const PROPORTIONAL_THRESHOLD = 10 * (Math.PI / 180);

/** Convert angle to input value (-1 to 1) */
function angleToInput(angle: number): number {
  if (Math.abs(angle) < PROPORTIONAL_THRESHOLD) {
    return angle / PROPORTIONAL_THRESHOLD;
  }
  return angle > 0 ? 1 : -1;
}

/**
 * Set autopilot rotation inputs to steer toward destination.
 */
function setAutopilotRotation(
  autopilot: ConvoyAutopilot,
  transform: Transform,
): void {
  // Calculate direction to destination
  toDestination.copy(autopilot.destination).sub(transform.position).normalize();

  // Transform to local space
  inverseRot.copy(transform.rotation).invert();
  localDir.copy(toDestination).applyQuaternion(inverseRot);

  // Calculate yaw and pitch angles (same as AI movement)
  const yawAngle = Math.atan2(-localDir.x, -localDir.z);
  const pitchAngle = Math.asin(Math.max(-1, Math.min(1, localDir.y)));

  autopilot.input.yaw = angleToInput(yawAngle);
  autopilot.input.pitch = angleToInput(pitchAngle);
}

/**
 * Convoy autopilot system - steers convoy ships toward their destination.
 *
 * Runs BEFORE aiSystem so convoy inputs are ready for physics.
 */
export function convoyAutopilotSystem(world: World, _dt: number): void {
  for (const entity of queryEntities(world, [
    'convoyAutopilot',
    'transform',
    'physics',
  ])) {
    const autopilot = getComponent(world, entity, 'convoyAutopilot')!;
    const transform = getComponent(world, entity, 'transform')!;
    const physics = getComponent(world, entity, 'physics')!;

    // Skip inactive autopilot
    if (!autopilot.active) {
      autopilot.input.pitch = 0;
      autopilot.input.yaw = 0;
      autopilot.input.accelerate = false;
      autopilot.input.decelerate = false;
      continue;
    }

    // Skip dead ships (let them coast)
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) {
      autopilot.input.pitch = 0;
      autopilot.input.yaw = 0;
      autopilot.input.accelerate = false;
      autopilot.input.decelerate = false;
      continue;
    }

    // Calculate distance to destination (escape zone center)
    const distance = transform.position.distanceTo(autopilot.destination);

    // If within escape zone, actively brake to stop
    if (distance < autopilot.escapeZoneRadius) {
      autopilot.input.pitch = 0;
      autopilot.input.yaw = 0;
      autopilot.input.accelerate = false;
      // Decelerate until stopped
      autopilot.input.decelerate = physics.currentSpeed > 5;
      continue;
    }

    // Steer toward destination
    setAutopilotRotation(autopilot, transform);

    // Full speed ahead
    autopilot.input.accelerate = true;
    autopilot.input.decelerate = false;
  }
}
