/**
 * Replay Viewer Playback Loop
 *
 * Handles the animation frame loop, seeking, and rendering updates.
 * Uses ViewerContext for all state management.
 */

import {
  createMissionRenderers,
  disposeMissionRenderers,
  type RenderMissionFrameOptions,
  renderMissionFrame,
  resetMissionRenderers,
  updateMissionRenderers,
} from '../../../campaign/mission/mission-renderer';
import { resetLeadIndicatorSmoothing } from '../../../rendering/reticle/lead-indicators';
import { setupReplayWorld } from '../../../replay/mission-setup';
import {
  createPlayerEntityMapFromReplay,
  MultiplayerReplayPlayback,
} from '../../../replay/multiplayer-replay';
import { ReplayPlayback } from '../../../replay/playback';
import {
  setReplayAutoaimByShipId,
  setReplayAutoaimOnPlayers,
} from '../../../replay/replay-autoaim';
import {
  type FullReplayData,
  isMultiplayerReplay,
  type MultiplayerReplayData,
  TICK_MS,
  VIEWER_SEEK_TICKS_PER_FRAME,
} from '../../../replay/types';
import { createCameraState, updateCamera } from './replay-camera';
import {
  getCameraTargetPosition,
  isViewingPlayer,
  updateCameraStatus,
  updateViewerClasses,
} from './viewer-camera';
import {
  type AnyReplayPlayback,
  createViewerContext,
  getViewerContext,
  resetViewerContext,
  setViewerContext,
  type ViewerContext,
} from './viewer-context';

// =============================================================================
// Re-exports for external use
// =============================================================================

export {
  cameraNextEntity,
  cameraPrevEntity,
  cameraResetToPlayer,
  cameraToggleMode,
  endOrbitDrag,
  getCameraMode,
  getCameraModeDisplay,
  getCameraTargetDisplay,
  getCameraTargetPosition,
  isViewingPlayer,
  setCameraInput,
  startOrbitDrag,
  updateCameraStatus,
  updateOrbitDrag,
} from './viewer-camera';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Utility Functions
// =============================================================================

/** Format time as MM:SS */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// Playback Loop
// =============================================================================

/** Start the playback loop */
function startPlaybackLoop(ctx: ViewerContext): void {
  if (ctx.animationFrameId !== null) return;

  let lastFrameTime = 0;

  function loop(time: number) {
    ctx.animationFrameId = requestAnimationFrame(loop);

    if (!ctx.playback || !ctx.renderers || !ctx.callbacks) return;

    const state = ctx.callbacks.getState();

    if (lastFrameTime === 0) lastFrameTime = time;
    const frameDelta = time - lastFrameTime;
    lastFrameTime = time;

    // Handle seeking
    if (ctx.playback.isSeeking()) {
      try {
        const stillSeeking = ctx.playback.processSeek(
          VIEWER_SEEK_TICKS_PER_FRAME,
        );
        if (!stillSeeking) {
          const currentTick = ctx.playback.getCurrentTick();
          ctx.callbacks.updateState({ seeking: false, currentTick });
          ctx.callbacks.onSeekComplete(currentTick, state.totalTicks);
          ctx.accumulator = 0;
          updateRendering(ctx, 1, frameDelta);
        }
      } catch {
        ctx.callbacks.updateState({ seeking: false });
        ctx.callbacks.onSeekComplete(
          ctx.playback.getCurrentTick(),
          state.totalTicks,
        );
        ctx.accumulator = 0;
        updateRendering(ctx, 1, frameDelta);
      }
      return;
    }

    // Handle playback with interpolation
    if (state.playing) {
      ctx.accumulator += frameDelta * state.speed;

      let ticksProcessed = 0;
      let playbackEnded = false;

      while (ctx.accumulator >= TICK_MS) {
        const hasMore = ctx.playback.tick();
        ctx.accumulator -= TICK_MS;
        ticksProcessed++;

        if (!hasMore) {
          playbackEnded = true;
          ctx.accumulator = 0;
          break;
        }
      }

      if (playbackEnded) {
        const currentTick = ctx.playback.getCurrentTick();
        ctx.callbacks.updateState({ playing: false, currentTick });
        ctx.callbacks.onPlayPauseChange(false);
        ctx.callbacks.onTimeUpdate(currentTick, state.totalTicks);
      } else if (ticksProcessed > 0) {
        const currentTick = ctx.playback.getCurrentTick();
        ctx.callbacks.updateState({ currentTick });
        ctx.callbacks.onTimeUpdate(currentTick, state.totalTicks);
      }
    } else {
      ctx.accumulator = 0;
    }

    const alpha = state.playing ? Math.min(ctx.accumulator / TICK_MS, 1) : 1;
    updateRendering(ctx, alpha, frameDelta);
  }

  ctx.animationFrameId = requestAnimationFrame(loop);
}

/** Update the rendering with interpolation */
function updateRendering(
  ctx: ViewerContext,
  alpha: number,
  frameDt: number,
): void {
  if (!ctx.renderers || !ctx.playback || !ctx.cameraState) return;

  const container = document.getElementById('replay-canvas');
  if (!container) return;

  const world = ctx.playback.getWorld();
  const currentGameTime = world.systemState.gameTime;

  // Detect time discontinuity
  const isDiscontinuity =
    ctx.lastRenderedGameTime !== null &&
    Math.abs(currentGameTime - ctx.lastRenderedGameTime) >
      DISCONTINUITY_THRESHOLD;

  if (isDiscontinuity) {
    resetLeadIndicatorSmoothing();

    const hudElement = document.getElementById('hud');
    if (hudElement) {
      hudElement.classList.add('no-transitions');
      requestAnimationFrame(() => {
        hudElement.classList.remove('no-transitions');
      });
    }
  }

  ctx.lastRenderedGameTime = currentGameTime;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Get target position for dust system
  const dustCenter = getCameraTargetPosition(
    ctx.cameraState,
    world,
    ctx.renderers.renderer,
  );

  // Update scene and effects
  updateMissionRenderers(
    ctx.renderers,
    world,
    containerWidth,
    containerHeight,
    alpha,
    dustCenter
      ? { skipCameraAndRender: true, dustCenterPosition: dustCenter }
      : { skipCameraAndRender: true },
  );

  // Update camera
  const dt = frameDt / 1000;
  updateCamera(
    ctx.cameraState,
    ctx.renderers.renderer.camera,
    world,
    ctx.cameraInput,
    dt,
    ctx.renderers.renderer,
  );

  // Render frame
  const viewingPlayer = isViewingPlayer();
  const hudVisible = ctx.callbacks?.getState().hudVisible ?? true;
  const renderOptions: RenderMissionFrameOptions = {
    skipHUD: !viewingPlayer || !hudVisible,
  };

  renderMissionFrame(
    ctx.renderers,
    world,
    containerWidth,
    containerHeight,
    renderOptions,
  );

  // Update UI
  updateCameraStatus();
  updateViewerClasses();
}

/** Stop the playback loop */
function stopPlaybackLoop(ctx: ViewerContext): void {
  if (ctx.animationFrameId !== null) {
    cancelAnimationFrame(ctx.animationFrameId);
    ctx.animationFrameId = null;
  }
}

// =============================================================================
// Public API
// =============================================================================

/** Initialize viewer with replay data (single-player or multiplayer) */
export function initializeViewer(
  replay: FullReplayData | MultiplayerReplayData,
  container: HTMLElement,
  playbackCallbacks: PlaybackCallbacks,
): void {
  const ctx = createViewerContext();

  ctx.callbacks = playbackCallbacks;

  // Create appropriate playback type based on replay format
  if (isMultiplayerReplay(replay)) {
    // Multiplayer replay - need to set up player entity mapping
    const playerMap = createPlayerEntityMapFromReplay(replay.players);
    ctx.playback = new MultiplayerReplayPlayback(
      replay,
      () => {
        const setup = setupReplayWorld(
          replay.seed,
          replay.metadata.missionId,
          replay.playerLoadout,
          replay.wingmen,
          replay.metadata.missionType,
        );
        // Set autoaim on all player entities from global value as baseline
        // (per-player lookup by campaignShipId may fail if replay entities lack it)
        setReplayAutoaimOnPlayers(setup.world, replay.playerAutoaim);
        // Override with per-player values where possible
        for (const player of replay.players) {
          if (player.autoaimDegrees !== undefined && player.campaignShipId) {
            setReplayAutoaimByShipId(
              setup.world,
              player.campaignShipId,
              player.autoaimDegrees,
            );
          }
        }
        return setup.world;
      },
      (_world, playerId) => playerMap.get(playerId) ?? null,
    );
  } else {
    // Single-player replay
    ctx.playback = new ReplayPlayback(replay);
  }

  ctx.renderers = createMissionRenderers(container, replay.seed);
  ctx.cameraState = createCameraState();

  setViewerContext(ctx);
  startPlaybackLoop(ctx);
}

/** Clean up viewer resources */
export function cleanupViewer(): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  stopPlaybackLoop(ctx);

  if (ctx.renderers) {
    disposeMissionRenderers(ctx.renderers);
  }

  resetViewerContext(ctx);
  setViewerContext(null);
}

/** Seek to a specific tick. Returns true if seeking started. */
export function seekTo(targetTick: number): boolean {
  const ctx = getViewerContext();
  if (!ctx || !ctx.playback || !ctx.renderers) return false;

  resetMissionRenderers(ctx.renderers);
  ctx.playback.seekTo(targetTick);
  return ctx.playback.isSeeking();
}

/** Get the playback instance */
export function getPlayback(): AnyReplayPlayback | null {
  return getViewerContext()?.playback ?? null;
}
