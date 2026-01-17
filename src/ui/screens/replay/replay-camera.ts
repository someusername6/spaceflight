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
import { orbitAxisX, orbitAxisY, updateOrbitCamera } from './camera-orbit';

// Re-export orbit axis vectors for viewer-camera.ts
export { orbitAxisX, orbitAxisY };

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

  // Chase mode state
  /** Chase camera distance multiplier (1.0 = default offset) */
  chaseDistance: number;

  // Free camera state
  freePosition: THREE.Vector3;
  freeRotation: THREE.Euler;

  // Camera roll (applies to all modes)
  roll: number;
}

/** Camera movement speeds */
const CHASE_ZOOM_SPEED = 1.0; // multiplier per second
const ROLL_SPEED = 2.0; // radians per second

/** Orbit distance constraints (used for default distance calculation) */
const MIN_ORBIT_DISTANCE = 10;
const MAX_ORBIT_DISTANCE = 200;

/** Chase camera constraints */
const MIN_CHASE_DISTANCE = 0.5; // multiplier (half default distance)
const MAX_CHASE_DISTANCE = 4.0; // multiplier (4x default distance)
const DEFAULT_CHASE_DISTANCE = 1.0;

/** Default orbit distance */
const DEFAULT_ORBIT_DISTANCE = 50;

/** Base ship radius used for distance scaling (typical fighter size) */
const BASE_SHIP_RADIUS = 5;

/** Multiplier for orbit distance based on ship size */
const ORBIT_DISTANCE_MULTIPLIER = 8; // orbit distance = radius * multiplier

/** Multiplier for chase distance based on ship size ratio */
const CHASE_DISTANCE_MULTIPLIER = 0.15; // chase multiplier scales with size ratio

/** Chase camera base offset (scaled by chaseDistance) */
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
    orbitDistance: DEFAULT_ORBIT_DISTANCE,
    chaseDistance: DEFAULT_CHASE_DISTANCE,
    freePosition: new THREE.Vector3(0, 50, 100),
    freeRotation: new THREE.Euler(0, 0, 0, 'YXZ'),
    roll: 0,
  };
}

/** Get entity's bounding radius from hull collider, or default for fighters */
function getEntityRadius(world: World, entity: Entity): number {
  const hull = getComponent(world, entity, 'hullCollider');
  return hull?.boundingRadius ?? BASE_SHIP_RADIUS;
}

/** Get default camera distances for an entity based on its mesh size */
function getDefaultDistances(
  world: World,
  entity: Entity,
): { orbit: number; chase: number } {
  const radius = getEntityRadius(world, entity);
  const sizeRatio = radius / BASE_SHIP_RADIUS;

  // Orbit distance scales with ship size
  const orbitDist = Math.min(
    MAX_ORBIT_DISTANCE,
    Math.max(MIN_ORBIT_DISTANCE, radius * ORBIT_DISTANCE_MULTIPLIER),
  );

  // Chase distance multiplier scales with size ratio (larger ships = zoom out more)
  const chaseDist = Math.min(
    MAX_CHASE_DISTANCE,
    Math.max(
      DEFAULT_CHASE_DISTANCE,
      1 + (sizeRatio - 1) * CHASE_DISTANCE_MULTIPLIER,
    ),
  );

  return { orbit: orbitDist, chase: chaseDist };
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
export function nextEntity(state: ReplayCameraState, world: World): void {
  if (state.entityList.length === 0) return;

  state.entityIndex = (state.entityIndex + 1) % state.entityList.length;
  state.targetEntity = state.entityList[state.entityIndex] ?? null;

  // If in free mode, switch to chase to follow the new target
  if (state.mode === CameraMode.Free) {
    state.mode = CameraMode.Chase;
  }

  // Reset orbit rotation when switching entities
  state.orbitRotation.identity();

  // Set default distances based on target ship size
  if (state.targetEntity !== null) {
    const defaults = getDefaultDistances(world, state.targetEntity);
    state.orbitDistance = defaults.orbit;
    state.chaseDistance = defaults.chase;
  }
}

/** Cycle to previous entity */
export function prevEntity(state: ReplayCameraState, world: World): void {
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

  // Set default distances based on target ship size
  if (state.targetEntity !== null) {
    const defaults = getDefaultDistances(world, state.targetEntity);
    state.orbitDistance = defaults.orbit;
    state.chaseDistance = defaults.chase;
  }
}

/** Reset camera to player */
export function resetToPlayer(state: ReplayCameraState, world: World): void {
  state.mode = CameraMode.Chase;
  state.entityIndex = 0;
  state.targetEntity = state.entityList[0] ?? null;
  state.orbitRotation.identity();
  state.roll = 0;

  // Set default distances based on player ship size
  if (state.targetEntity !== null) {
    const defaults = getDefaultDistances(world, state.targetEntity);
    state.orbitDistance = defaults.orbit;
    state.chaseDistance = defaults.chase;
  }
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
      updateChaseCamera(state, camera, world, input, dt);
      break;
    case CameraMode.Orbit:
      updateOrbitCamera(state, camera, world, input, dt);
      break;
    case CameraMode.Free:
      updateFreeCamera(state, camera, input, dt);
      break;
  }
}

/** Update chase camera (follow behind entity with zoom) */
function updateChaseCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  world: World,
  input: CameraInput,
  dt: number,
): void {
  if (state.targetEntity === null) return;

  const targetPos = getTargetPosition(state.targetEntity, world);
  const targetRot = getTargetRotation(state.targetEntity, world);

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
