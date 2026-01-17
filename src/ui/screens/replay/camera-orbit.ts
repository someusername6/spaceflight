/**
 * Replay Orbit Camera Update
 *
 * Handles orbit camera mode - rotate around target entity.
 * Uses quaternion-based rotation for gimbal-lock-free movement.
 */

import * as THREE from 'three';
import { getComponent } from '../../../core/ecs';
import type { Entity, World } from '../../../core/types';
import { getInterpolatedPosition } from '../../../rendering/renderer';
import type { CameraInput, ReplayCameraState } from './replay-camera';

/** Camera movement speeds */
const ORBIT_ROTATE_SPEED = 2.0; // radians per second
const ORBIT_ZOOM_SPEED = 50; // units per second

/** Orbit constraints */
const MIN_ORBIT_DISTANCE = 10;
const MAX_ORBIT_DISTANCE = 500;

// Temporary objects for orbit rotation calculations (reused to avoid allocations)
const orbitDeltaQuat = new THREE.Quaternion();
const orbitAxisZ = new THREE.Vector3(0, 0, 1);
const orbitUp = new THREE.Vector3();
const orbitMatrix = new THREE.Matrix4();
const tempOffset = new THREE.Vector3();

// Exported for mouse drag rotation in viewer-camera.ts
export const orbitAxisX = new THREE.Vector3(1, 0, 0);
export const orbitAxisY = new THREE.Vector3(0, 1, 0);

/** Get target entity position (interpolated) */
function getTargetPosition(entity: Entity, world: World): THREE.Vector3 | null {
  const interpPos = getInterpolatedPosition(entity);
  if (interpPos) return interpPos;

  const transform = getComponent(world, entity, 'transform');
  return transform?.position ?? null;
}

/** Update orbit camera (rotate around entity) - quaternion-based for gimbal-lock-free rotation */
export function updateOrbitCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  world: World,
  input: CameraInput,
  dt: number,
): void {
  if (state.targetEntity === null) return;

  const targetPos = getTargetPosition(state.targetEntity, world);
  if (!targetPos) return;

  // Apply rotation from input using quaternions (no gimbal lock)
  // Horizontal rotation (around world Y axis)
  if (input.left || input.right) {
    const yawAmount = (input.left ? 1 : -1) * ORBIT_ROTATE_SPEED * dt;
    orbitDeltaQuat.setFromAxisAngle(orbitAxisY, yawAmount);
    state.orbitRotation.premultiply(orbitDeltaQuat);
  }

  // Vertical rotation (around local X axis)
  if (input.up || input.down) {
    const pitchAmount = (input.up ? 1 : -1) * ORBIT_ROTATE_SPEED * dt;
    orbitDeltaQuat.setFromAxisAngle(orbitAxisX, pitchAmount);
    state.orbitRotation.multiply(orbitDeltaQuat);
  }

  // Normalize to prevent drift
  state.orbitRotation.normalize();

  // Update distance from zoom input (zoomIn/zoomOut or forward/back keys)
  const zoomIn = input.zoomIn || input.forward;
  const zoomOut = input.zoomOut || input.back;
  if (zoomIn) state.orbitDistance -= ORBIT_ZOOM_SPEED * dt;
  if (zoomOut) state.orbitDistance += ORBIT_ZOOM_SPEED * dt;
  state.orbitDistance = Math.max(
    MIN_ORBIT_DISTANCE,
    Math.min(MAX_ORBIT_DISTANCE, state.orbitDistance),
  );

  // Calculate camera position: start at (0, 0, distance), rotate by orbit quaternion
  tempOffset.set(0, 0, state.orbitDistance);
  tempOffset.applyQuaternion(state.orbitRotation);
  camera.position.copy(targetPos).add(tempOffset);

  // Calculate up vector from orbit rotation (prevents lookAt flip at poles)
  orbitUp.set(0, 1, 0).applyQuaternion(state.orbitRotation);

  // Build camera matrix manually with custom up vector
  orbitMatrix.lookAt(camera.position, targetPos, orbitUp);
  camera.quaternion.setFromRotationMatrix(orbitMatrix);

  // Apply roll around local Z axis (camera's forward)
  if (state.roll !== 0) {
    orbitDeltaQuat.setFromAxisAngle(orbitAxisZ, state.roll);
    camera.quaternion.multiply(orbitDeltaQuat);
  }
}
