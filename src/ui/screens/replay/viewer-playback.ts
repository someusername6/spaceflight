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
  resetMissionRenderers,
  updateMissionRenderers,
} from '../../../campaign/mission/mission-renderer';
import { resetLeadIndicatorSmoothing } from '../../../rendering/reticle/lead-indicators';
import { ReplayPlayback } from '../../../replay/playback';
import type { FullReplayData } from '../../../replay/types';
import { TICK_MS, VIEWER_SEEK_TICKS_PER_FRAME } from '../../../replay/types';

/** Threshold for detecting time discontinuities (in seconds) */
const DISCONTINUITY_THRESHOLD = 1.0;

/** Callback for state updates from playback loop */
export interface PlaybackCallbacks {
  getState: () => { playing: boolean; speed: number; totalTicks: number };
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
          lastFrameTime = time;
          updateRendering(1); // alpha=1 to snap to exact tick position
        }
      } catch {
        // If seek processing fails, reset seeking state
        callbacks.updateState({ seeking: false });
        callbacks.onSeekComplete(
          viewerPlayback.getCurrentTick(),
          state.totalTicks,
        );
        accumulator = 0;
        lastFrameTime = time;
        updateRendering(1);
      }
      return; // Don't render during seek
    }

    // Calculate frame delta
    if (lastFrameTime === 0) lastFrameTime = time;
    const frameDelta = time - lastFrameTime;
    lastFrameTime = time;

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
    updateRendering(alpha);
  }

  animationFrameId = requestAnimationFrame(loop);
}

/** Update the rendering with interpolation */
function updateRendering(alpha: number): void {
  if (!viewerRenderers || !viewerPlayback) return;

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

  updateMissionRenderers(
    viewerRenderers,
    world,
    container.clientWidth,
    container.clientHeight,
    alpha,
  );
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

  // Start playback loop
  startPlaybackLoop();
}

/** Clean up viewer resources */
export function cleanupViewer(): void {
  stopPlaybackLoop();

  if (viewerRenderers) {
    disposeMissionRenderers(viewerRenderers);
    viewerRenderers = null;
  }

  viewerPlayback = null;
  callbacks = null;
  lastRenderedGameTime = null;
  accumulator = 0;
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
