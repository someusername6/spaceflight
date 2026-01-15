/**
 * Replay Viewer Auto-Hide Controls
 *
 * Handles auto-hiding of replay UI controls after inactivity.
 * Separated from viewer-input.ts to keep files under 400 lines.
 */

// ============================================================================
// Auto-Hide Controls
// ============================================================================

/** Time in ms before controls auto-hide while playing */
const CONTROLS_HIDE_DELAY = 3000;

/** Timer ID for auto-hide */
let hideTimer: number | null = null;

/** Whether controls are currently hidden */
let controlsHidden = false;

/** Reference to get playing state (set by initAutoHide) */
let getPlayingState: (() => boolean) | null = null;

/** Initialize auto-hide with state getter */
export function initAutoHide(getPlaying: () => boolean): void {
  getPlayingState = getPlaying;
  controlsHidden = false;
  resetControlsTimer();
}

/** Clean up auto-hide timer */
export function cleanupAutoHide(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  getPlayingState = null;
  controlsHidden = false;
  // Ensure controls are visible on cleanup
  setControlsHidden(false);
}

/** Set controls hidden state and update DOM */
function setControlsHidden(hidden: boolean): void {
  controlsHidden = hidden;
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
  // Clear existing timer
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  // Show controls if hidden
  if (controlsHidden) {
    setControlsHidden(false);
  }

  // Only start hide timer if playing
  if (getPlayingState?.()) {
    hideTimer = window.setTimeout(() => {
      // Double-check still playing before hiding
      if (getPlayingState?.()) {
        setControlsHidden(true);
      }
    }, CONTROLS_HIDE_DELAY);
  }
}

/** Called when play state changes */
export function onPlayStateChange(playing: boolean): void {
  if (playing) {
    // Start hide timer when playing
    resetControlsTimer();
  } else {
    // Show controls and clear timer when paused
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    setControlsHidden(false);
  }
}
