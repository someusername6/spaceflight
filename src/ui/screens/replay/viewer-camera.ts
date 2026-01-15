/**
 * Replay Viewer Camera and Spectator Helpers
 *
 * Camera controls and spectator overlay helpers for replay viewer.
 * Extracted from viewer-playback.ts to keep files under 400 lines.
 */

import type * as THREE from 'three';
import type { Transform } from '../../../components/transform';
import { getComponent, hasComponent } from '../../../core/ecs';
import type { World } from '../../../core/types';
import { getInterpolatedPosition } from '../../../rendering/renderer';
import type { ReplayPlayback } from '../../../replay/playback';
import {
  type CameraInput,
  CameraMode,
  nextEntity,
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
// UI Updates
// ============================================================================

/** Cached DOM element references for camera status display */
let cachedModeDisplay: HTMLElement | null = null;
let cachedTargetDisplay: HTMLElement | null = null;

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

/** Clear cached DOM elements (call on viewer cleanup) */
export function clearCameraStatusCache(): void {
  cachedModeDisplay = null;
  cachedTargetDisplay = null;
}
