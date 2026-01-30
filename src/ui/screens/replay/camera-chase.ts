/**
 * Chase Camera Controller
 *
 * Follow-behind camera mode that tracks the ship from a fixed offset.
 */

import * as THREE from 'three';
import { getComponent } from '../../../core/ecs';
import type { Entity, World } from '../../../core/types';
import {
  getInterpolatedPosition,
  getInterpolatedRotation,
  type Renderer,
} from '../../../rendering/renderer';
import type { CameraInput, ReplayCameraState } from './replay-camera';

/** Chase camera zoom speed (multiplier per second) */
const CHASE_ZOOM_SPEED = 1.0;

/** Chase camera constraints */
const MIN_CHASE_DISTANCE = 0.5; // multiplier (half default distance)
const MAX_CHASE_DISTANCE = 10.0; // multiplier (10x default distance)

/** Chase camera base offset (scaled by chaseDistance) */
const CHASE_OFFSET = new THREE.Vector3(0, 5, 20);

// Reusable vectors to avoid allocations
const tempOffset = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

/** Get target entity position (interpolated) */
function getTargetPosition(
  entity: Entity,
  world: World,
  renderer?: Renderer,
): THREE.Vector3 | null {
  const interpPos = renderer ? getInterpolatedPosition(renderer, entity) : null;
  if (interpPos) return interpPos;

  const transform = getComponent(world, entity, 'transform');
  return transform?.position ?? null;
}

/** Get target entity rotation (interpolated) */
function getTargetRotation(
  entity: Entity,
  world: World,
  renderer?: Renderer,
): THREE.Quaternion | null {
  const interpRot = renderer ? getInterpolatedRotation(renderer, entity) : null;
  if (interpRot) return interpRot;

  const transform = getComponent(world, entity, 'transform');
  return transform?.rotation ?? null;
}

/** Update chase camera (follow behind entity with zoom) */
export function updateChaseCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  world: World,
  input: CameraInput,
  dt: number,
  renderer?: Renderer,
): void {
  if (state.targetEntity === null) return;

  const targetPos = getTargetPosition(state.targetEntity, world, renderer);
  const targetRot = getTargetRotation(state.targetEntity, world, renderer);

  if (!targetPos || !targetRot) return;

  // Update chase distance from zoom input (zoomIn/zoomOut or forward/back keys)
  const zoomIn = input.zoomIn || input.forward;
  const zoomOut = input.zoomOut || input.back;
  if (zoomIn) state.chaseDistance -= CHASE_ZOOM_SPEED * dt;
  if (zoomOut) state.chaseDistance += CHASE_ZOOM_SPEED * dt;
  state.chaseDistance = Math.max(
    MIN_CHASE_DISTANCE,
    Math.min(MAX_CHASE_DISTANCE, state.chaseDistance),
  );

  // Calculate camera position behind entity (offset scaled by chase distance)
  tempOffset.copy(CHASE_OFFSET).multiplyScalar(state.chaseDistance);
  tempOffset.applyQuaternion(targetRot);
  camera.position.copy(targetPos).add(tempOffset);

  // Match entity rotation with optional roll
  if (state.roll !== 0) {
    tempQuat.copy(targetRot);
    tempEuler.setFromQuaternion(tempQuat, 'YXZ');
    tempEuler.z += state.roll;
    camera.quaternion.setFromEuler(tempEuler);
  } else {
    camera.quaternion.copy(targetRot);
  }
}
