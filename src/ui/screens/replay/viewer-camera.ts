/**
 * Replay Viewer Camera and Spectator Helpers
 *
 * Camera controls and spectator overlay helpers for replay viewer.
 * Uses ViewerContext for all state access.
 */

import * as THREE from 'three';
import { getComponent, hasComponent } from '../../../core/ecs';
import type { World } from '../../../core/types';
import {
  getInterpolatedPosition,
  type Renderer,
} from '../../../rendering/renderer';
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
import { getViewerContext } from './viewer-context';

// =============================================================================
// Camera Controls
// =============================================================================

/** Set camera input state */
export function setCameraInput(key: keyof CameraInput, pressed: boolean): void {
  const ctx = getViewerContext();
  if (ctx) ctx.cameraInput[key] = pressed;
}

/** Cycle to next entity */
export function cameraNextEntity(): void {
  const ctx = getViewerContext();
  if (ctx?.cameraState && ctx.playback) {
    nextEntity(ctx.cameraState, ctx.playback.getWorld());
  }
}

/** Cycle to previous entity */
export function cameraPrevEntity(): void {
  const ctx = getViewerContext();
  if (ctx?.cameraState && ctx.playback) {
    prevEntity(ctx.cameraState, ctx.playback.getWorld());
  }
}

/** Reset camera to player */
export function cameraResetToPlayer(): void {
  const ctx = getViewerContext();
  if (ctx?.cameraState && ctx.playback) {
    resetToPlayer(ctx.cameraState, ctx.playback.getWorld());
  }
}

/** Toggle camera mode */
export function cameraToggleMode(): void {
  const ctx = getViewerContext();
  if (ctx?.cameraState && ctx.playback) {
    toggleCameraMode(ctx.cameraState, ctx.playback.getWorld());
  }
}

/** Get current camera mode */
export function getCameraMode(): CameraMode | null {
  const ctx = getViewerContext();
  return ctx?.cameraState?.mode ?? null;
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

  if (hasComponent(world, state.targetEntity, 'playerControlled')) {
    return 'Player';
  }

  const identity = getComponent(world, state.targetEntity, 'shipIdentity');
  if (identity && typeof identity === 'object' && 'callsign' in identity) {
    return String(identity.callsign);
  }

  return `Ship ${state.entityIndex + 1}`;
}

/** Get current camera mode display name */
export function getCameraModeDisplay(): string {
  const ctx = getViewerContext();
  return ctx?.cameraState ? getModeName(ctx.cameraState.mode) : '';
}

/** Get current target display name */
export function getCameraTargetDisplay(): string {
  const ctx = getViewerContext();
  if (!ctx?.cameraState || !ctx.playback) return '';
  return getTargetName(ctx.cameraState, ctx.playback.getWorld());
}

// =============================================================================
// Spectator Mode Helpers
// =============================================================================

/** Check if currently viewing the player ship */
export function isViewingPlayer(): boolean {
  const ctx = getViewerContext();
  if (!ctx?.cameraState || !ctx.playback) return true;
  const entity = ctx.cameraState.targetEntity;
  if (entity === null) return true;
  return hasComponent(ctx.playback.getWorld(), entity, 'playerControlled');
}

/** Get current camera target position (for dust system centering) */
export function getCameraTargetPosition(
  state: ReplayCameraState,
  world: World,
  renderer?: Renderer,
): THREE.Vector3 | null {
  if (state.targetEntity === null) return null;

  const interpPos = renderer
    ? getInterpolatedPosition(renderer, state.targetEntity)
    : null;
  if (interpPos) return interpPos;

  const transform = getComponent(world, state.targetEntity, 'transform');
  return transform?.position ?? null;
}

// =============================================================================
// Orbit Camera Mouse Drag
// =============================================================================

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
  const ctx = getViewerContext();
  if (!ctx?.cameraState || ctx.cameraState.mode !== CameraMode.Orbit)
    return false;

  ctx.orbitDrag.active = true;
  ctx.orbitDrag.lastX = e.clientX;
  ctx.orbitDrag.lastY = e.clientY;
  return true;
}

/** Update orbit camera rotation from mouse drag */
export function updateOrbitDrag(e: MouseEvent): void {
  const ctx = getViewerContext();
  if (!ctx || !ctx.orbitDrag.active || !ctx.cameraState) return;
  if (ctx.cameraState.mode !== CameraMode.Orbit) {
    // Mode changed mid-drag, cancel
    ctx.orbitDrag.active = false;
    return;
  }

  const deltaX = e.clientX - ctx.orbitDrag.lastX;
  const deltaY = e.clientY - ctx.orbitDrag.lastY;
  ctx.orbitDrag.lastX = e.clientX;
  ctx.orbitDrag.lastY = e.clientY;

  // Horizontal drag = yaw around world Y (premultiply)
  if (deltaX !== 0) {
    mouseDeltaQuat.setFromAxisAngle(orbitAxisY, -deltaX * MOUSE_SENSITIVITY);
    ctx.cameraState.orbitRotation.premultiply(mouseDeltaQuat);
  }

  // Vertical drag = pitch around local X (postmultiply)
  if (deltaY !== 0) {
    mouseDeltaQuat.setFromAxisAngle(orbitAxisX, -deltaY * MOUSE_SENSITIVITY);
    ctx.cameraState.orbitRotation.multiply(mouseDeltaQuat);
  }

  ctx.cameraState.orbitRotation.normalize();
}

/** End orbit camera drag */
export function endOrbitDrag(): void {
  const ctx = getViewerContext();
  if (ctx) ctx.orbitDrag.active = false;
}

/** Check if currently dragging orbit camera */
export function isOrbitDragging(): boolean {
  const ctx = getViewerContext();
  return ctx?.orbitDrag.active ?? false;
}

// =============================================================================
// UI Updates
// =============================================================================

/** Update camera status display in UI */
export function updateCameraStatus(): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  // Lazy cache initialization
  if (!ctx.domCache) {
    ctx.domCache = {
      playPauseBtn: document.getElementById('btn-play-pause'),
      speedBtn: document.getElementById('btn-speed'),
      timeline: document.getElementById(
        'replay-timeline',
      ) as HTMLInputElement | null,
      progress: document.querySelector('.replay-timeline-progress'),
      timeDisplay: document.querySelector('.replay-time'),
      hud: document.querySelector('.replay-hud'),
      modeDisplay: document.getElementById('camera-mode-display'),
      targetDisplay: document.getElementById('camera-target-display'),
      viewer: document.querySelector('.replay-viewer'),
    };
  }

  if (ctx.domCache.modeDisplay) {
    ctx.domCache.modeDisplay.textContent = getCameraModeDisplay();
  }
  if (ctx.domCache.targetDisplay) {
    ctx.domCache.targetDisplay.textContent = getCameraTargetDisplay();
  }
}

/** Update viewer element classes based on camera mode and drag state */
export function updateViewerClasses(): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  const mode = ctx.cameraState?.mode ?? null;
  const dragging = ctx.orbitDrag.active;

  // Skip if nothing changed
  if (
    mode === ctx.cameraUI.lastAppliedMode &&
    dragging === ctx.cameraUI.lastAppliedDragging
  ) {
    return;
  }

  if (!ctx.domCache?.viewer) {
    if (!ctx.domCache) {
      ctx.domCache = {
        playPauseBtn: null,
        speedBtn: null,
        timeline: null,
        progress: null,
        timeDisplay: null,
        hud: null,
        modeDisplay: null,
        targetDisplay: null,
        viewer: document.querySelector('.replay-viewer'),
      };
    }
  }
  if (!ctx.domCache.viewer) return;

  ctx.domCache.viewer.classList.toggle(
    'camera-chase',
    mode === CameraMode.Chase,
  );
  ctx.domCache.viewer.classList.toggle(
    'camera-orbit',
    mode === CameraMode.Orbit,
  );
  ctx.domCache.viewer.classList.toggle('camera-free', mode === CameraMode.Free);
  ctx.domCache.viewer.classList.toggle('dragging', dragging);

  ctx.cameraUI.lastAppliedMode = mode;
  ctx.cameraUI.lastAppliedDragging = dragging;
}

// =============================================================================
// Legacy API (for backwards compatibility during transition)
// =============================================================================

/**
 * @deprecated Use ViewerContext directly. This is a no-op now.
 */
export function setViewerRefs(
  _state: ReplayCameraState | null,
  _playback: unknown,
  _input: CameraInput | null,
): void {
  // No-op - context is now used directly
}

/**
 * @deprecated Use ViewerContext directly. This is a no-op now.
 */
export function clearCameraStatusCache(): void {
  // No-op - context handles cleanup
}
