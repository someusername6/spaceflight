/**
 * Replay Camera Controller
 *
 * Handles camera modes for replay viewing:
 * - Chase: Follow behind selected entity (like gameplay)
 * - Orbit: Rotate around selected entity
 * - Free: Detached camera with full movement control
 */

import * as THREE from 'three';
import { getComponent } from '../../../core/ecs';
import type { Entity, World } from '../../../core/types';
import {
  getInterpolatedPosition,
  type Renderer,
} from '../../../rendering/renderer';
import { updateChaseCamera } from './camera-chase';
import {
  findAllEntities,
  findFriendlyEntities,
  setEntityList,
  updateEntityList,
} from './camera-entities';
import { updateFreeCamera } from './camera-free';
import { orbitAxisX, orbitAxisY, updateOrbitCamera } from './camera-orbit';

// Re-export entity functions for external use
export {
  findAllEntities,
  findFriendlyEntities,
  setEntityList,
  updateEntityList,
};

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

  // Free camera state (quaternion-based for gimbal-lock-free rotation)
  freePosition: THREE.Vector3;
  freeRotation: THREE.Quaternion;

  // Camera roll (applies to all modes)
  roll: number;
}

/** Camera movement speeds */
const ROLL_SPEED = 2.0; // radians per second

/** Orbit distance constraints (used for default distance calculation) */
const MIN_ORBIT_DISTANCE = 10;
const MAX_ORBIT_DISTANCE = 500;

/** Chase camera constraints (for default distance calculation) */
const MAX_CHASE_DISTANCE = 10.0; // multiplier (10x default distance)
const DEFAULT_CHASE_DISTANCE = 1.0;

/** Default orbit distance */
const DEFAULT_ORBIT_DISTANCE = 50;

/** Base ship radius used for distance scaling (typical fighter size) */
const BASE_SHIP_RADIUS = 5;

/** Multiplier for orbit distance based on ship size */
const ORBIT_DISTANCE_MULTIPLIER = 8; // orbit distance = radius * multiplier

/** Multiplier for chase distance based on ship size ratio */
const CHASE_DISTANCE_MULTIPLIER = 0.15; // chase multiplier scales with size ratio

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
    freeRotation: new THREE.Quaternion(),
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

/** Create empty camera input state */
export function createCameraInput(): CameraInput {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    forward: false,
    back: false,
    rollLeft: false,
    rollRight: false,
    zoomIn: false,
    zoomOut: false,
  };
}

/** Get display name for current camera target */
export function getTargetDisplayName(
  state: ReplayCameraState,
  world: World,
): string {
  if (state.targetEntity === null) return 'None';

  const identity = getComponent(world, state.targetEntity, 'shipIdentity');
  if (identity?.callsign) {
    return identity.callsign;
  }

  return `Ship ${state.entityIndex + 1}`;
}

/** Get display name for current camera mode */
export function getModeDisplayName(mode: CameraMode): string {
  switch (mode) {
    case CameraMode.Chase:
      return 'Chase';
    case CameraMode.Orbit:
      return 'Orbit';
    case CameraMode.Free:
      return 'Free';
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
    const targetPos = getTargetPosition(state.targetEntity, world, undefined);
    if (targetPos) {
      // Position free camera at current orbit/chase position
      state.freePosition.copy(targetPos);
      state.freePosition.z += 50;
      state.freePosition.y += 20;
    }
  }
}

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

// Reusable vectors to avoid allocations
const tempEuler = new THREE.Euler();

/**
 * Update camera based on input and mode.
 *
 * @param autoUpdateEntities - If true (default), automatically discovers all entities.
 *   Set to false when using setEntityList() for custom filtering (e.g., spectator mode).
 */
export function updateCamera(
  state: ReplayCameraState,
  camera: THREE.Camera,
  world: World,
  input: CameraInput,
  dt: number,
  renderer?: Renderer,
  autoUpdateEntities = true,
): void {
  // Update entity list (skip if caller manages entities externally)
  if (autoUpdateEntities) {
    updateEntityList(state, world);
  }

  // If target was lost while in chase/orbit mode, switch to free camera
  if (state.targetEntity === null && state.mode !== CameraMode.Free) {
    state.mode = CameraMode.Free;
    // Capture current camera position and orientation
    state.freePosition.copy(camera.position);
    // Extract roll from camera, store pitch/yaw in quaternion without roll
    tempEuler.setFromQuaternion(camera.quaternion, 'YXZ');
    state.roll = tempEuler.z;
    tempEuler.z = 0;
    state.freeRotation.setFromEuler(tempEuler);
  }

  // Handle roll (applies to all modes)
  if (input.rollLeft) state.roll -= ROLL_SPEED * dt;
  if (input.rollRight) state.roll += ROLL_SPEED * dt;

  switch (state.mode) {
    case CameraMode.Chase:
      updateChaseCamera(state, camera, world, input, dt, renderer);
      break;
    case CameraMode.Orbit:
      updateOrbitCamera(state, camera, world, input, dt, renderer);
      break;
    case CameraMode.Free:
      updateFreeCamera(state, camera, input, dt);
      break;
  }
}
