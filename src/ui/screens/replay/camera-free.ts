/**
 * Free Camera Mode
 *
 * Detached camera with full movement control for replay viewing.
 * Uses quaternion-based rotation for gimbal-lock-free movement.
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
const deltaQuat = new THREE.Quaternion();

// Rotation axes
const axisX = new THREE.Vector3(1, 0, 0);
const axisY = new THREE.Vector3(0, 1, 0);
const axisZ = new THREE.Vector3(0, 0, 1);

/** Update free camera (full movement control) - quaternion-based for gimbal-lock-free rotation */
export function updateFreeCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  input: CameraInput,
  dt: number,
): void {
  // Apply rotation from input using quaternions (no gimbal lock)
  // Horizontal rotation (around world Y axis)
  if (input.left || input.right) {
    const yawAmount = (input.left ? 1 : -1) * FREE_ROTATE_SPEED * dt;
    deltaQuat.setFromAxisAngle(axisY, yawAmount);
    state.freeRotation.premultiply(deltaQuat);
  }

  // Vertical rotation (around local X axis)
  if (input.up || input.down) {
    const pitchAmount = (input.up ? -1 : 1) * FREE_ROTATE_SPEED * dt;
    deltaQuat.setFromAxisAngle(axisX, pitchAmount);
    state.freeRotation.multiply(deltaQuat);
  }

  // Normalize to prevent drift
  state.freeRotation.normalize();

  // Calculate movement direction (forward/back in camera's local space)
  tempOffset.set(0, 0, 0);
  if (input.forward) tempOffset.z -= FREE_MOVE_SPEED * dt;
  if (input.back) tempOffset.z += FREE_MOVE_SPEED * dt;

  // Apply rotation to movement direction
  tempOffset.applyQuaternion(state.freeRotation);

  // Update position
  state.freePosition.add(tempOffset);

  // Apply to camera
  camera.position.copy(state.freePosition);

  // Apply rotation with optional roll
  if (state.roll !== 0) {
    tempQuat.copy(state.freeRotation);
    deltaQuat.setFromAxisAngle(axisZ, state.roll);
    tempQuat.multiply(deltaQuat);
    camera.quaternion.copy(tempQuat);
  } else {
    camera.quaternion.copy(state.freeRotation);
  }
}
