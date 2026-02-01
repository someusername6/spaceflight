/**
 * Viewer Context - Central context object for replay viewer state.
 *
 * Consolidates scattered module-level state from:
 * - viewer-playback.ts
 * - viewer-camera.ts
 * - viewer-autohide.ts
 * - viewer-dom.ts
 *
 * Instead of ref-passing between modules, all state lives here.
 */

import type { MissionRenderers } from '../../../campaign/mission/mission-renderer';
import type { MultiplayerReplayPlayback } from '../../../replay/multiplayer-replay';
import type { ReplayPlayback } from '../../../replay/playback';
import type { CameraInput, ReplayCameraState } from './replay-camera';
import type { PlaybackCallbacks } from './viewer-playback';

/** Union type for single-player and multiplayer playback */
export type AnyReplayPlayback = ReplayPlayback | MultiplayerReplayPlayback;

// =============================================================================
// Context Type
// =============================================================================

/** Cached DOM element references for viewer UI */
export interface ViewerDOMCache {
  playPauseBtn: HTMLElement | null;
  speedBtn: HTMLElement | null;
  timeline: HTMLInputElement | null;
  progress: HTMLElement | null;
  timeDisplay: HTMLElement | null;
  hud: HTMLElement | null;
  modeDisplay: HTMLElement | null;
  targetDisplay: HTMLElement | null;
  viewer: HTMLElement | null;
}

/** Auto-hide state for replay controls */
export interface AutoHideState {
  hideTimer: number | null;
  controlsHidden: boolean;
  getPlayingState: (() => boolean) | null;
}

/** Camera UI state for class updates */
export interface CameraUIState {
  lastAppliedMode: number | null;
  lastAppliedDragging: boolean;
}

/** Orbit drag state for mouse control */
export interface OrbitDragState {
  active: boolean;
  lastX: number;
  lastY: number;
}

/**
 * Viewer context containing all state and dependencies.
 * Created once at viewer initialization, passed to all viewer functions.
 */
export interface ViewerContext {
  // === Playback state (from viewer-playback.ts) ===
  /** Replay playback controller (single-player or multiplayer) */
  playback: AnyReplayPlayback | null;
  /** Three.js renderers for mission display */
  renderers: MissionRenderers | null;
  /** Animation frame ID for playback loop */
  animationFrameId: number | null;
  /** Callbacks for state updates */
  callbacks: PlaybackCallbacks | null;
  /** Last rendered game time for discontinuity detection */
  lastRenderedGameTime: number | null;
  /** Accumulated time for interpolation (ms) */
  accumulator: number;

  // === Camera state (from viewer-camera.ts / replay-camera.ts) ===
  /** Camera state (mode, target, rotation, etc.) */
  cameraState: ReplayCameraState | null;
  /** Camera input state (continuous key presses) */
  cameraInput: CameraInput;
  /** Orbit drag state */
  orbitDrag: OrbitDragState;
  /** Camera UI state */
  cameraUI: CameraUIState;

  // === Auto-hide state (from viewer-autohide.ts) ===
  autoHide: AutoHideState;

  // === DOM cache (from viewer-dom.ts) ===
  domCache: ViewerDOMCache | null;
}

// =============================================================================
// Context Storage (single module-level variable)
// =============================================================================

/** Active viewer context - the only module-level state we need */
let activeContext: ViewerContext | null = null;

/**
 * Get the active viewer context.
 * Returns null if viewer is not initialized.
 */
export function getViewerContext(): ViewerContext | null {
  return activeContext;
}

/**
 * Set the active viewer context.
 * Called during viewer initialization.
 */
export function setViewerContext(ctx: ViewerContext | null): void {
  activeContext = ctx;
}

/**
 * Check if viewer is currently active.
 */
export function isViewerActive(): boolean {
  return activeContext !== null;
}

// =============================================================================
// Context Factory
// =============================================================================

/**
 * Create a new viewer context with default state.
 */
export function createViewerContext(): ViewerContext {
  return {
    // Playback state
    playback: null,
    renderers: null,
    animationFrameId: null,
    callbacks: null,
    lastRenderedGameTime: null,
    accumulator: 0,

    // Camera state
    cameraState: null,
    cameraInput: {
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
    },
    orbitDrag: { active: false, lastX: 0, lastY: 0 },
    cameraUI: { lastAppliedMode: null, lastAppliedDragging: false },

    // Auto-hide state
    autoHide: {
      hideTimer: null,
      controlsHidden: false,
      getPlayingState: null,
    },

    // DOM cache
    domCache: null,
  };
}

// =============================================================================
// Context Cleanup
// =============================================================================

/**
 * Reset viewer context to initial state.
 * Call when cleaning up viewer.
 */
export function resetViewerContext(ctx: ViewerContext): void {
  // Reset playback state
  ctx.playback = null;
  ctx.renderers = null;
  ctx.animationFrameId = null;
  ctx.callbacks = null;
  ctx.lastRenderedGameTime = null;
  ctx.accumulator = 0;

  // Reset camera state
  ctx.cameraState = null;
  ctx.cameraInput.up = false;
  ctx.cameraInput.down = false;
  ctx.cameraInput.left = false;
  ctx.cameraInput.right = false;
  ctx.cameraInput.forward = false;
  ctx.cameraInput.back = false;
  ctx.cameraInput.rollLeft = false;
  ctx.cameraInput.rollRight = false;
  ctx.cameraInput.zoomIn = false;
  ctx.cameraInput.zoomOut = false;
  ctx.orbitDrag.active = false;
  ctx.orbitDrag.lastX = 0;
  ctx.orbitDrag.lastY = 0;
  ctx.cameraUI.lastAppliedMode = null;
  ctx.cameraUI.lastAppliedDragging = false;

  // Reset auto-hide state
  ctx.autoHide.hideTimer = null;
  ctx.autoHide.controlsHidden = false;
  ctx.autoHide.getPlayingState = null;

  // Clear DOM cache
  ctx.domCache = null;
}
