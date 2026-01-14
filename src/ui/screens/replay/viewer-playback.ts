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
  updateMissionRenderers,
} from '../../../campaign/mission/mission-renderer';
import { ReplayPlayback } from '../../../replay/playback';
import type { FullReplayData } from '../../../replay/types';
import { TICK_MS, VIEWER_SEEK_TICKS_PER_FRAME } from '../../../replay/types';

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

/** Format time as MM:SS */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Start the playback loop */
function startPlaybackLoop(): void {
  if (animationFrameId !== null) return;

  let lastTime = 0;

  function loop(time: number) {
    animationFrameId = requestAnimationFrame(loop);

    if (!viewerPlayback || !viewerRenderers || !callbacks) return;

    const state = callbacks.getState();

    // Handle seeking
    if (viewerPlayback.isSeeking()) {
      const stillSeeking = viewerPlayback.processSeek(
        VIEWER_SEEK_TICKS_PER_FRAME,
      );
      if (!stillSeeking) {
        const currentTick = viewerPlayback.getCurrentTick();
        callbacks.updateState({ seeking: false, currentTick });
        callbacks.onSeekComplete(currentTick, state.totalTicks);
      }
      // Still update rendering during seek
      updateRendering();
      return;
    }

    // Handle playback
    if (state.playing) {
      if (lastTime === 0) lastTime = time;
      const delta = time - lastTime;

      // Apply speed
      const ticksToProcess = Math.floor((delta * state.speed) / TICK_MS);

      let playbackEnded = false;
      for (let i = 0; i < ticksToProcess; i++) {
        const hasMore = viewerPlayback.tick();
        if (!hasMore) {
          playbackEnded = true;
          break;
        }
      }

      if (playbackEnded) {
        const currentTick = viewerPlayback.getCurrentTick();
        callbacks.updateState({ playing: false, currentTick });
        callbacks.onPlayPauseChange(false);
        callbacks.onTimeUpdate(currentTick, state.totalTicks);
      } else if (ticksToProcess > 0) {
        lastTime = time;
        const currentTick = viewerPlayback.getCurrentTick();
        callbacks.updateState({ currentTick });
        callbacks.onTimeUpdate(currentTick, state.totalTicks);
      }
    } else {
      lastTime = 0;
    }

    updateRendering();
  }

  animationFrameId = requestAnimationFrame(loop);
}

/** Update the rendering */
function updateRendering(): void {
  if (!viewerRenderers || !viewerPlayback) return;

  const container = document.getElementById('replay-canvas');
  if (!container) return;

  updateMissionRenderers(
    viewerRenderers,
    viewerPlayback.getWorld(),
    container.clientWidth,
    container.clientHeight,
    1,
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
}

/** Seek to a specific tick */
export function seekTo(targetTick: number): void {
  if (viewerPlayback) {
    viewerPlayback.seekTo(targetTick);
  }
}

/** Get the playback instance (for direct access if needed) */
export function getPlayback(): ReplayPlayback | null {
  return viewerPlayback;
}
