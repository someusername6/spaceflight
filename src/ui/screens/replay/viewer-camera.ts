/**
 * Replay Viewer Camera and Spectator Helpers
 *
 * Camera controls and spectator overlay helpers for replay viewer.
 * Extracted from viewer-playback.ts to keep files under 400 lines.
 */

import * as THREE from 'three';
import type { Transform } from '../../../components/transform';
import { getComponent, hasComponent } from '../../../core/ecs';
import type { World } from '../../../core/types';
import { getInterpolatedPosition } from '../../../rendering/renderer';
import type { ReplayPlayback } from '../../../replay/playback';
import {
  type CameraInput,
  CameraMode,
  nextEntity,
  orbitAxisX,
  orbitAxisY,
  prevEntity,
  type ReplayCameraState,
  resetToPlayer,
  toggleCameraMode,
} from './replay-camera';

// ============================================================================
// Shared State Management
// ============================================================================

/** Refs to module state (set by viewer-playback.ts) */
let cameraStateRef: ReplayCameraState | null = null;
let playbackRef: ReplayPlayback | null = null;
let cameraInputRef: CameraInput | null = null;

/** Set state refs (called by viewer-playback on init/cleanup) */
export function setViewerRefs(
  state: ReplayCameraState | null,
  playback: ReplayPlayback | null,
  input: CameraInput | null,
): void {
  cameraStateRef = state;
  playbackRef = playback;
  cameraInputRef = input;
}

// ============================================================================
// Camera Controls
// ============================================================================

/** Set camera input state */
export function setCameraInput(key: keyof CameraInput, pressed: boolean): void {
  if (cameraInputRef) cameraInputRef[key] = pressed;
}

/** Cycle to next entity */
export function cameraNextEntity(): void {
  if (cameraStateRef) nextEntity(cameraStateRef);
}

/** Cycle to previous entity */
export function cameraPrevEntity(): void {
  if (cameraStateRef) prevEntity(cameraStateRef);
}

/** Reset camera to player */
export function cameraResetToPlayer(): void {
  if (cameraStateRef) resetToPlayer(cameraStateRef);
}

/** Toggle camera mode */
export function cameraToggleMode(): void {
  if (cameraStateRef && playbackRef) {
    toggleCameraMode(cameraStateRef, playbackRef.getWorld());
  }
}

/** Get current camera mode */
export function getCameraMode(): CameraMode | null {
  return cameraStateRef?.mode ?? null;
}

/** Get display name for a camera mode */
function getModeName(mode: CameraMode): string {
  switch (mode) {
    case CameraMode.Chase:
      return 'Chase';
    case CameraMode.Orbit:
      return 'Orbit';
    case CameraMode.Free:
      return 'Free';
  }
}

/** Get display name for current target */
function getTargetName(state: ReplayCameraState, world: World): string {
  if (state.targetEntity === null) return 'None';

  // Check if it's the player
  if (hasComponent(world, state.targetEntity, 'playerControlled')) {
    return 'Player';
  }

  // Get ship identity for name
  const identity = getComponent(world, state.targetEntity, 'shipIdentity');
  if (identity && typeof identity === 'object' && 'callsign' in identity) {
    return String(identity.callsign);
  }

  return `Ship ${state.entityIndex + 1}`;
}

/** Get current camera mode display name */
export function getCameraModeDisplay(): string {
  return cameraStateRef ? getModeName(cameraStateRef.mode) : '';
}

/** Get current target display name */
export function getCameraTargetDisplay(): string {
  if (!cameraStateRef || !playbackRef) return '';
  return getTargetName(cameraStateRef, playbackRef.getWorld());
}

// ============================================================================
// Spectator Mode Helpers
// ============================================================================

/** Check if currently viewing the player ship */
export function isViewingPlayer(): boolean {
  if (!cameraStateRef || !playbackRef) return true;
  const entity = cameraStateRef.targetEntity;
  if (entity === null) return true;
  return hasComponent(playbackRef.getWorld(), entity, 'playerControlled');
}

/** Get current camera target position (for dust system centering) */
export function getCameraTargetPosition(
  state: ReplayCameraState,
  world: World,
): THREE.Vector3 | null {
  if (state.targetEntity === null) return null;

  // Try interpolated position first
  const interpPos = getInterpolatedPosition(state.targetEntity);
  if (interpPos) return interpPos;

  // Fall back to transform position
  const transform = getComponent<Transform>(
    world,
    state.targetEntity,
    'transform',
  );
  return transform?.position ?? null;
}

// ============================================================================
// Orbit Camera Mouse Drag
// ============================================================================

/** Drag state for orbit camera mouse control */
interface OrbitDragState {
  active: boolean;
  lastX: number;
  lastY: number;
}

const dragState: OrbitDragState = { active: false, lastX: 0, lastY: 0 };

/** Mouse sensitivity (radians per pixel) */
const MOUSE_SENSITIVITY = 0.005;

/** Quaternion for mouse drag rotation (reused to avoid allocations) */
const mouseDeltaQuat = new THREE.Quaternion();

/**
 * Start orbit camera drag rotation.
 * Returns true if drag started, false if ignored (wrong button/mode).
 */
export function startOrbitDrag(e: MouseEvent): boolean {
  if (e.button !== 0) return false; // Left button only
  if (!cameraStateRef || cameraStateRef.mode !== CameraMode.Orbit) return false;

  dragState.active = true;
  dragState.lastX = e.clientX;
  dragState.lastY = e.clientY;
  return true;
}

/** Update orbit camera rotation from mouse drag */
export function updateOrbitDrag(e: MouseEvent): void {
  if (!dragState.active || !cameraStateRef) return;
  if (cameraStateRef.mode !== CameraMode.Orbit) {
    // Mode changed mid-drag, cancel
    dragState.active = false;
    return;
  }

  const deltaX = e.clientX - dragState.lastX;
  const deltaY = e.clientY - dragState.lastY;
  dragState.lastX = e.clientX;
  dragState.lastY = e.clientY;

  // Horizontal drag = yaw around world Y (premultiply)
  if (deltaX !== 0) {
    mouseDeltaQuat.setFromAxisAngle(orbitAxisY, -deltaX * MOUSE_SENSITIVITY);
    cameraStateRef.orbitRotation.premultiply(mouseDeltaQuat);
  }

  // Vertical drag = pitch around local X (postmultiply)
  if (deltaY !== 0) {
    mouseDeltaQuat.setFromAxisAngle(orbitAxisX, -deltaY * MOUSE_SENSITIVITY);
    cameraStateRef.orbitRotation.multiply(mouseDeltaQuat);
  }

  cameraStateRef.orbitRotation.normalize();
}

/** End orbit camera drag */
export function endOrbitDrag(): void {
  dragState.active = false;
}

/** Check if currently dragging orbit camera */
export function isOrbitDragging(): boolean {
  return dragState.active;
}

// ============================================================================
// UI Updates
// ============================================================================

/** Cached DOM element references */
let cachedModeDisplay: HTMLElement | null = null;
let cachedTargetDisplay: HTMLElement | null = null;
let cachedViewer: HTMLElement | null = null;

/** Last applied class state (to avoid redundant classList updates) */
let lastAppliedMode: CameraMode | null = null;
let lastAppliedDragging = false;

/** Update camera status display in UI */
export function updateCameraStatus(): void {
  // Lazy cache initialization
  if (!cachedModeDisplay) {
    cachedModeDisplay = document.getElementById('camera-mode-display');
    cachedTargetDisplay = document.getElementById('camera-target-display');
  }

  if (cachedModeDisplay) {
    cachedModeDisplay.textContent = getCameraModeDisplay();
  }
  if (cachedTargetDisplay) {
    cachedTargetDisplay.textContent = getCameraTargetDisplay();
  }
}

/** Clear cached DOM elements and reset drag state (call on viewer cleanup) */
export function clearCameraStatusCache(): void {
  cachedModeDisplay = null;
  cachedTargetDisplay = null;
  cachedViewer = null;
  dragState.active = false;
  lastAppliedMode = null;
  lastAppliedDragging = false;
}

/** Update viewer element classes based on camera mode and drag state */
export function updateViewerClasses(): void {
  const mode = cameraStateRef?.mode ?? null;
  const dragging = dragState.active;

  // Skip if nothing changed
  if (mode === lastAppliedMode && dragging === lastAppliedDragging) return;

  if (!cachedViewer) {
    cachedViewer = document.querySelector('.replay-viewer');
  }
  if (!cachedViewer) return;

  cachedViewer.classList.toggle('camera-chase', mode === CameraMode.Chase);
  cachedViewer.classList.toggle('camera-orbit', mode === CameraMode.Orbit);
  cachedViewer.classList.toggle('camera-free', mode === CameraMode.Free);
  cachedViewer.classList.toggle('dragging', dragging);

  lastAppliedMode = mode;
  lastAppliedDragging = dragging;
}
