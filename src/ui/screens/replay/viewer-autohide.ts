/**
 * Replay Viewer Auto-Hide Controls
 *
 * Handles auto-hiding of replay UI controls after inactivity.
 * Uses ViewerContext for all state access.
 */

import { getViewerContext } from './viewer-context';

// =============================================================================
// Constants
// =============================================================================

/** Time in ms before controls auto-hide while playing */
const CONTROLS_HIDE_DELAY = 3000;

// =============================================================================
// Auto-Hide Controls
// =============================================================================

/** Initialize auto-hide with state getter */
export function initAutoHide(getPlaying: () => boolean): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  ctx.autoHide.getPlayingState = getPlaying;
  ctx.autoHide.controlsHidden = false;
  resetControlsTimer();
}

/** Clean up auto-hide timer */
export function cleanupAutoHide(): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  if (ctx.autoHide.hideTimer !== null) {
    window.clearTimeout(ctx.autoHide.hideTimer);
    ctx.autoHide.hideTimer = null;
  }
  ctx.autoHide.getPlayingState = null;
  ctx.autoHide.controlsHidden = false;
  // Ensure controls are visible on cleanup
  setControlsHidden(false);
}

/** Set controls hidden state and update DOM */
function setControlsHidden(hidden: boolean): void {
  const ctx = getViewerContext();
  if (ctx) {
    ctx.autoHide.controlsHidden = hidden;
  }

  const replayHud = document.querySelector('.replay-hud');
  const replayViewer = document.querySelector('.replay-viewer');

  if (hidden) {
    replayHud?.classList.add('controls-hidden');
    replayViewer?.classList.add('controls-hidden');
  } else {
    replayHud?.classList.remove('controls-hidden');
    replayViewer?.classList.remove('controls-hidden');
  }
}

/** Reset the auto-hide timer (call on any user activity) */
export function resetControlsTimer(): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  // Clear existing timer
  if (ctx.autoHide.hideTimer !== null) {
    window.clearTimeout(ctx.autoHide.hideTimer);
    ctx.autoHide.hideTimer = null;
  }

  // Show controls if hidden
  if (ctx.autoHide.controlsHidden) {
    setControlsHidden(false);
  }

  // Only start hide timer if playing
  if (ctx.autoHide.getPlayingState?.()) {
    ctx.autoHide.hideTimer = window.setTimeout(() => {
      const currentCtx = getViewerContext();
      // Double-check still playing before hiding
      if (currentCtx?.autoHide.getPlayingState?.()) {
        setControlsHidden(true);
      }
    }, CONTROLS_HIDE_DELAY);
  }
}

/** Called when play state changes */
export function onPlayStateChange(playing: boolean): void {
  const ctx = getViewerContext();
  if (!ctx) return;

  if (playing) {
    // Start hide timer when playing
    resetControlsTimer();
  } else {
    // Show controls and clear timer when paused
    if (ctx.autoHide.hideTimer !== null) {
      window.clearTimeout(ctx.autoHide.hideTimer);
      ctx.autoHide.hideTimer = null;
    }
    setControlsHidden(false);
  }
}
