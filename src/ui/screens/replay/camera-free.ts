/**
 * Free Camera Mode
 *
 * Detached camera with full movement control for replay viewing.
 * Extracted from replay-camera.ts to keep files under 400 lines.
 */

import * as THREE from 'three';
import type { CameraInput, ReplayCameraState } from './replay-camera';

/** Free camera movement speed (units per second) */
const FREE_MOVE_SPEED = 100;

/** Free camera rotation speed (radians per second) */
const FREE_ROTATE_SPEED = 1.5;

// Reusable objects to avoid allocations
const tempOffset = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

/** Update free camera (full movement control) */
export function updateFreeCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  input: CameraInput,
  dt: number,
): void {
  // Update rotation from input
  if (input.left) state.freeRotation.y += FREE_ROTATE_SPEED * dt;
  if (input.right) state.freeRotation.y -= FREE_ROTATE_SPEED * dt;
  if (input.up) state.freeRotation.x += FREE_ROTATE_SPEED * dt;
  if (input.down) state.freeRotation.x -= FREE_ROTATE_SPEED * dt;

  // Clamp pitch to avoid flipping
  state.freeRotation.x = Math.max(
    -Math.PI / 2 + 0.1,
    Math.min(Math.PI / 2 - 0.1, state.freeRotation.x),
  );

  // Apply rotation
  tempQuat.setFromEuler(state.freeRotation);

  // Calculate movement direction
  tempOffset.set(0, 0, 0);
  if (input.forward) tempOffset.z -= FREE_MOVE_SPEED * dt;
  if (input.back) tempOffset.z += FREE_MOVE_SPEED * dt;

  // Apply rotation to movement
  tempOffset.applyQuaternion(tempQuat);

  // Update position
  state.freePosition.add(tempOffset);

  // Apply to camera
  camera.position.copy(state.freePosition);

  // Apply roll
  if (state.roll !== 0) {
    tempEuler.copy(state.freeRotation);
    tempEuler.z = state.roll;
    camera.quaternion.setFromEuler(tempEuler);
  } else {
    camera.quaternion.copy(tempQuat);
  }
}
