/**
 * Replay Viewer Playback Loop
 *
 * Handles the animation frame loop, seeking, and rendering updates.
 * Separated from replay-viewer.ts to keep files under 400 lines.
 */

import {
  createMissionRenderers,
  disposeMissionRenderers,
  type MissionRenderers,
  type RenderMissionFrameOptions,
  renderMissionFrame,
  resetMissionRenderers,
  updateMissionRenderers,
} from '../../../campaign/mission/mission-renderer';
import { resetLeadIndicatorSmoothing } from '../../../rendering/reticle/lead-indicators';
import { ReplayPlayback } from '../../../replay/playback';
import type { FullReplayData } from '../../../replay/types';
import { TICK_MS, VIEWER_SEEK_TICKS_PER_FRAME } from '../../../replay/types';
import {
  type CameraInput,
  createCameraState,
  type ReplayCameraState,
  updateCamera,
} from './replay-camera';
import {
  cameraNextEntity,
  cameraPrevEntity,
  cameraResetToPlayer,
  cameraToggleMode,
  clearCameraStatusCache,
  endOrbitDrag,
  getCameraMode,
  getCameraModeDisplay,
  getCameraTargetDisplay,
  getCameraTargetPosition,
  isViewingPlayer,
  setCameraInput,
  setViewerRefs,
  startOrbitDrag,
  updateCameraStatus,
  updateOrbitDrag,
  updateViewerClasses,
} from './viewer-camera';

// Re-export camera controls for external use
export {
  cameraNextEntity,
  cameraPrevEntity,
  cameraResetToPlayer,
  cameraToggleMode,
  endOrbitDrag,
  getCameraMode,
  getCameraModeDisplay,
  getCameraTargetDisplay,
  setCameraInput,
  startOrbitDrag,
  updateCameraStatus,
  updateOrbitDrag,
};

/** Threshold for detecting time discontinuities (in seconds) */
const DISCONTINUITY_THRESHOLD = 1.0;

/** Callback for state updates from playback loop */
export interface PlaybackCallbacks {
  getState: () => {
    playing: boolean;
    speed: number;
    totalTicks: number;
    hudVisible: boolean;
  };
  updateState: (updates: {
    playing?: boolean;
    currentTick?: number;
    seeking?: boolean;
  }) => void;
  onPlayPauseChange: (playing: boolean) => void;
  onSeekComplete: (currentTick: number, totalTicks: number) => void;
  onTimeUpdate: (currentTick: number, totalTicks: number) => void;
}

/** Active playback and rendering state */
let viewerPlayback: ReplayPlayback | null = null;
let viewerRenderers: MissionRenderers | null = null;
let animationFrameId: number | null = null;
let callbacks: PlaybackCallbacks | null = null;

/** Track last rendered game time for discontinuity detection */
let lastRenderedGameTime: number | null = null;

/** Accumulated time for interpolation (milliseconds) */
let accumulator = 0;

/** Camera state */
let cameraState: ReplayCameraState | null = null;

/** Current camera input state (updated by replay-viewer.ts) */
const cameraInput: CameraInput = {
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

/** Format time as MM:SS */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Start the playback loop */
function startPlaybackLoop(): void {
  if (animationFrameId !== null) return;

  let lastFrameTime = 0;

  function loop(time: number) {
    animationFrameId = requestAnimationFrame(loop);

    if (!viewerPlayback || !viewerRenderers || !callbacks) return;

    const state = callbacks.getState();

    // Calculate frame delta first (needed for camera even during seek)
    if (lastFrameTime === 0) lastFrameTime = time;
    const frameDelta = time - lastFrameTime;
    lastFrameTime = time;

    // Handle seeking - don't render during seek to avoid fast-forward visual
    if (viewerPlayback.isSeeking()) {
      try {
        const stillSeeking = viewerPlayback.processSeek(
          VIEWER_SEEK_TICKS_PER_FRAME,
        );
        if (!stillSeeking) {
          const currentTick = viewerPlayback.getCurrentTick();
          callbacks.updateState({ seeking: false, currentTick });
          callbacks.onSeekComplete(currentTick, state.totalTicks);
          // Reset accumulator and render target frame immediately
          accumulator = 0;
          updateRendering(1, frameDelta); // alpha=1 to snap to exact tick position
        }
      } catch {
        // If seek processing fails, reset seeking state
        callbacks.updateState({ seeking: false });
        callbacks.onSeekComplete(
          viewerPlayback.getCurrentTick(),
          state.totalTicks,
        );
        accumulator = 0;
        updateRendering(1, frameDelta);
      }
      return; // Don't render during seek
    }

    // Handle playback with proper interpolation
    if (state.playing) {
      // Add scaled time to accumulator
      accumulator += frameDelta * state.speed;

      // Process fixed timestep ticks
      let ticksProcessed = 0;
      let playbackEnded = false;

      while (accumulator >= TICK_MS) {
        const hasMore = viewerPlayback.tick();
        accumulator -= TICK_MS;
        ticksProcessed++;

        if (!hasMore) {
          playbackEnded = true;
          accumulator = 0; // Clamp to end
          break;
        }
      }

      if (playbackEnded) {
        const currentTick = viewerPlayback.getCurrentTick();
        callbacks.updateState({ playing: false, currentTick });
        callbacks.onPlayPauseChange(false);
        callbacks.onTimeUpdate(currentTick, state.totalTicks);
      } else if (ticksProcessed > 0) {
        const currentTick = viewerPlayback.getCurrentTick();
        callbacks.updateState({ currentTick });
        callbacks.onTimeUpdate(currentTick, state.totalTicks);
      }
    } else {
      // Paused - keep accumulator at 0 to show exact tick position
      accumulator = 0;
    }

    // Calculate interpolation alpha (0-1, how far between prev and current tick)
    const alpha = state.playing ? Math.min(accumulator / TICK_MS, 1) : 1;
    updateRendering(alpha, frameDelta);
  }

  animationFrameId = requestAnimationFrame(loop);
}

/** Update the rendering with interpolation */
function updateRendering(alpha: number, frameDt: number): void {
  if (!viewerRenderers || !viewerPlayback || !cameraState) return;

  const container = document.getElementById('replay-canvas');
  if (!container) return;

  const world = viewerPlayback.getWorld();
  const currentGameTime = world.systemState.gameTime;

  // Detect time discontinuity (seeking, large jumps)
  const isDiscontinuity =
    lastRenderedGameTime !== null &&
    Math.abs(currentGameTime - lastRenderedGameTime) > DISCONTINUITY_THRESHOLD;

  if (isDiscontinuity) {
    // Reset lead indicator smoothing so indicators snap to new positions
    resetLeadIndicatorSmoothing();

    // Temporarily disable CSS transitions on HUD
    const hudElement = document.getElementById('hud');
    if (hudElement) {
      hudElement.classList.add('no-transitions');
      // Remove class after one frame to allow subsequent transitions
      requestAnimationFrame(() => {
        hudElement.classList.remove('no-transitions');
      });
    }
  }

  lastRenderedGameTime = currentGameTime;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Get target position for dust system (follows viewed entity, not player)
  const dustCenter = getCameraTargetPosition(cameraState, world);

  // Update scene and effects, but skip camera follow and render
  // so we can use our custom replay camera
  updateMissionRenderers(
    viewerRenderers,
    world,
    containerWidth,
    containerHeight,
    alpha,
    dustCenter
      ? { skipCameraAndRender: true, dustCenterPosition: dustCenter }
      : { skipCameraAndRender: true },
  );

  // Update camera based on replay camera mode
  const dt = frameDt / 1000; // Convert ms to seconds
  updateCamera(
    cameraState,
    viewerRenderers.renderer.camera,
    world,
    cameraInput,
    dt,
  );

  // Skip HUD if: not viewing player, OR user pressed H to hide
  const viewingPlayer = isViewingPlayer();
  const hudVisible = callbacks?.getState().hudVisible ?? true;
  const renderOptions: RenderMissionFrameOptions = {
    skipHUD: !viewingPlayer || !hudVisible,
  };

  // Now render the frame with our custom camera position
  renderMissionFrame(
    viewerRenderers,
    world,
    containerWidth,
    containerHeight,
    renderOptions,
  );

  // Update camera status display (mode and target may change due to lost targets)
  updateCameraStatus();

  // Update viewer classes for cursor feedback
  updateViewerClasses();
}

/** Stop the playback loop */
function stopPlaybackLoop(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/** Initialize viewer with replay data */
export function initializeViewer(
  replay: FullReplayData,
  container: HTMLElement,
  playbackCallbacks: PlaybackCallbacks,
): void {
  callbacks = playbackCallbacks;

  // Create playback controller
  viewerPlayback = new ReplayPlayback(replay);

  // Create renderers
  viewerRenderers = createMissionRenderers(container, replay.seed);

  // Create camera state
  cameraState = createCameraState();

  // Set refs for viewer-camera module
  setViewerRefs(cameraState, viewerPlayback, cameraInput);

  // Start playback loop
  startPlaybackLoop();
}

/** Clean up viewer resources */
export function cleanupViewer(): void {
  stopPlaybackLoop();

  // Clear viewer-camera refs and cache
  setViewerRefs(null, null, null);
  clearCameraStatusCache();

  if (viewerRenderers) {
    disposeMissionRenderers(viewerRenderers);
    viewerRenderers = null;
  }

  viewerPlayback = null;
  callbacks = null;
  lastRenderedGameTime = null;
  accumulator = 0;
  cameraState = null;

  // Reset camera input
  cameraInput.up = false;
  cameraInput.down = false;
  cameraInput.left = false;
  cameraInput.right = false;
  cameraInput.forward = false;
  cameraInput.back = false;
  cameraInput.rollLeft = false;
  cameraInput.rollRight = false;
  cameraInput.zoomIn = false;
  cameraInput.zoomOut = false;
}

/**
 * Seek to a specific tick.
 * Returns true if seeking started, false if it was skipped (e.g., same position).
 */
export function seekTo(targetTick: number): boolean {
  if (viewerPlayback && viewerRenderers) {
    // Reset all renderers before seeking to clear stale visual effects
    // This must happen before seekTo() which reinitializes the world
    resetMissionRenderers(viewerRenderers);
    viewerPlayback.seekTo(targetTick);
    // Check if seeking actually started
    return viewerPlayback.isSeeking();
  }
  return false;
}

/** Get the playback instance (for direct access if needed) */
export function getPlayback(): ReplayPlayback | null {
  return viewerPlayback;
}
