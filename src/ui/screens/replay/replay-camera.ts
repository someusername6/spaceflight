/**
 * Replay Camera Controller
 *
 * Handles camera modes for replay viewing:
 * - Chase: Follow behind selected entity (like gameplay)
 * - Orbit: Rotate around selected entity
 * - Free: Detached camera with full movement control
 */

import * as THREE from 'three';
import { getComponent, queryEntities } from '../../../core/ecs';
import type { Entity, World } from '../../../core/types';
import {
  getInterpolatedPosition,
  getInterpolatedRotation,
} from '../../../rendering/renderer';
import { updateFreeCamera } from './camera-free';

/** Camera mode */
export enum CameraMode {
  Chase = 0,
  Orbit = 1,
  Free = 2,
}

/** Camera state */
export interface ReplayCameraState {
  mode: CameraMode;
  /** Currently followed entity (for chase/orbit modes) */
  targetEntity: Entity | null;
  /** List of followable entities (ships) */
  entityList: Entity[];
  /** Current index in entity list */
  entityIndex: number;

  // Orbit mode state (quaternion-based for gimbal-lock-free rotation)
  /** Orbit orientation quaternion */
  orbitRotation: THREE.Quaternion;
  /** Distance from target */
  orbitDistance: number;

  // Free camera state
  freePosition: THREE.Vector3;
  freeRotation: THREE.Euler;

  // Camera roll (applies to all modes)
  roll: number;
}

/** Camera movement speeds */
const ORBIT_ROTATE_SPEED = 2.0; // radians per second
const ORBIT_ZOOM_SPEED = 50; // units per second
const ROLL_SPEED = 2.0; // radians per second

/** Orbit constraints */
const MIN_ORBIT_DISTANCE = 10;
const MAX_ORBIT_DISTANCE = 200;

/** Chase camera offset */
const CHASE_OFFSET = new THREE.Vector3(0, 5, 20);

/** Input state for camera controls */
export interface CameraInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  forward: boolean;
  back: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
}

/** Create initial camera state */
export function createCameraState(): ReplayCameraState {
  return {
    mode: CameraMode.Chase,
    targetEntity: null,
    entityList: [],
    entityIndex: 0,
    orbitRotation: new THREE.Quaternion(), // Identity = looking from +Z toward origin
    orbitDistance: 50,
    freePosition: new THREE.Vector3(0, 50, 100),
    freeRotation: new THREE.Euler(0, 0, 0, 'YXZ'),
    roll: 0,
  };
}

/** Update entity list from world (call when entities change) */
export function updateEntityList(state: ReplayCameraState, world: World): void {
  const entities: Entity[] = [];

  // Find player first
  for (const entity of queryEntities(world, [
    'playerControlled',
    'transform',
  ])) {
    entities.push(entity);
  }

  // Then add other ships (wingmen and enemies)
  for (const entity of queryEntities(world, ['transform', 'shipIdentity'])) {
    if (!entities.includes(entity)) {
      entities.push(entity);
    }
  }

  state.entityList = entities;

  // Update target entity if needed
  if (state.targetEntity === null && entities.length > 0) {
    state.entityIndex = 0;
    state.targetEntity = entities[0] ?? null;
  } else if (state.targetEntity !== null) {
    // Check if target still exists
    const idx = entities.indexOf(state.targetEntity);
    if (idx === -1) {
      // Target no longer exists, clear it
      // (updateCamera will switch to free mode)
      state.targetEntity = null;
    } else {
      state.entityIndex = idx;
    }
  }
}

/** Cycle to next entity */
export function nextEntity(state: ReplayCameraState): void {
  if (state.entityList.length === 0) return;

  state.entityIndex = (state.entityIndex + 1) % state.entityList.length;
  state.targetEntity = state.entityList[state.entityIndex] ?? null;

  // If in free mode, switch to chase to follow the new target
  if (state.mode === CameraMode.Free) {
    state.mode = CameraMode.Chase;
  }

  // Reset orbit rotation when switching entities
  state.orbitRotation.identity();
}

/** Cycle to previous entity */
export function prevEntity(state: ReplayCameraState): void {
  if (state.entityList.length === 0) return;

  state.entityIndex =
    (state.entityIndex - 1 + state.entityList.length) % state.entityList.length;
  state.targetEntity = state.entityList[state.entityIndex] ?? null;

  // If in free mode, switch to chase to follow the new target
  if (state.mode === CameraMode.Free) {
    state.mode = CameraMode.Chase;
  }

  // Reset orbit rotation when switching entities
  state.orbitRotation.identity();
}

/** Reset camera to player */
export function resetToPlayer(state: ReplayCameraState): void {
  state.mode = CameraMode.Chase;
  state.entityIndex = 0;
  state.targetEntity = state.entityList[0] ?? null;
  state.orbitRotation.identity();
  state.roll = 0;
}

/** Toggle camera mode (chase -> orbit -> free -> chase) */
export function toggleCameraMode(state: ReplayCameraState, world: World): void {
  // Cycle through modes
  switch (state.mode) {
    case CameraMode.Chase:
      state.mode = CameraMode.Orbit;
      break;
    case CameraMode.Orbit:
      state.mode = CameraMode.Free;
      break;
    case CameraMode.Free:
      state.mode = CameraMode.Chase;
      break;
  }

  // When entering free mode, initialize position from current camera
  if (state.mode === CameraMode.Free && state.targetEntity !== null) {
    const targetPos = getTargetPosition(state.targetEntity, world);
    if (targetPos) {
      // Position free camera at current orbit/chase position
      state.freePosition.copy(targetPos);
      state.freePosition.z += 50;
      state.freePosition.y += 20;
    }
  }
}

/** Get target entity position (interpolated) */
function getTargetPosition(entity: Entity, world: World): THREE.Vector3 | null {
  const interpPos = getInterpolatedPosition(entity);
  if (interpPos) return interpPos;

  const transform = getComponent(world, entity, 'transform');
  return transform?.position ?? null;
}

/** Get target entity rotation (interpolated) */
function getTargetRotation(
  entity: Entity,
  world: World,
): THREE.Quaternion | null {
  const interpRot = getInterpolatedRotation(entity);
  if (interpRot) return interpRot;

  const transform = getComponent(world, entity, 'transform');
  return transform?.rotation ?? null;
}

// Reusable vectors to avoid allocations
const tempOffset = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

/** Update camera based on input and mode */
export function updateCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  world: World,
  input: CameraInput,
  dt: number,
): void {
  // Update entity list
  updateEntityList(state, world);

  // If target was lost while in chase/orbit mode, switch to free camera
  if (state.targetEntity === null && state.mode !== CameraMode.Free) {
    state.mode = CameraMode.Free;
    // Capture current camera position
    state.freePosition.copy(camera.position);
    // Decompose camera orientation into free camera format (pitch, yaw + separate roll)
    tempEuler.setFromQuaternion(camera.quaternion, 'YXZ');
    state.freeRotation.x = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, tempEuler.x),
    );
    state.freeRotation.y = tempEuler.y;
    state.freeRotation.z = 0;
    state.roll = tempEuler.z;
  }

  // Handle roll (applies to all modes)
  if (input.rollLeft) state.roll -= ROLL_SPEED * dt;
  if (input.rollRight) state.roll += ROLL_SPEED * dt;

  switch (state.mode) {
    case CameraMode.Chase:
      updateChaseCamera(state, camera, world);
      break;
    case CameraMode.Orbit:
      updateOrbitCamera(state, camera, world, input, dt);
      break;
    case CameraMode.Free:
      updateFreeCamera(state, camera, input, dt);
      break;
  }
}

/** Update chase camera (follow behind entity) */
function updateChaseCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  world: World,
): void {
  if (state.targetEntity === null) return;

  const targetPos = getTargetPosition(state.targetEntity, world);
  const targetRot = getTargetRotation(state.targetEntity, world);

  if (!targetPos || !targetRot) return;

  // Calculate camera position behind entity
  tempOffset.copy(CHASE_OFFSET);
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

// Temporary objects for orbit rotation calculations (reused to avoid allocations)
const orbitDeltaQuat = new THREE.Quaternion();
const orbitAxisZ = new THREE.Vector3(0, 0, 1);
const orbitUp = new THREE.Vector3();
const orbitMatrix = new THREE.Matrix4();

// Exported for mouse drag rotation in viewer-camera.ts
export const orbitAxisX = new THREE.Vector3(1, 0, 0);
export const orbitAxisY = new THREE.Vector3(0, 1, 0);

/** Update orbit camera (rotate around entity) - quaternion-based for gimbal-lock-free rotation */
function updateOrbitCamera(
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

  // Update distance from zoom input
  if (input.zoomIn) state.orbitDistance -= ORBIT_ZOOM_SPEED * dt;
  if (input.zoomOut) state.orbitDistance += ORBIT_ZOOM_SPEED * dt;
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
