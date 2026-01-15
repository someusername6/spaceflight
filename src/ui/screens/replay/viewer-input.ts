/**
 * Replay Viewer Input Handlers
 *
 * Handles keyboard input for replay viewer controls.
 * Separated from replay-viewer.ts to keep files under 400 lines.
 */

import { isReplayAction } from '../../../input/replay-bindings';
import { PLAYBACK_SPEEDS } from '../../../replay/types';
import type { ScreenAPI } from '../../framework/screen';
import {
  cleanupAutoHide,
  initAutoHide,
  onPlayStateChange,
  resetControlsTimer,
} from './viewer-autohide';
import {
  updatePlayPauseButton,
  updateSeekingIndicator,
  updateSpeedButton,
  updateTimelineUI,
} from './viewer-dom';
import {
  cameraNextEntity,
  cameraPrevEntity,
  cameraResetToPlayer,
  cameraToggleMode,
  seekTo,
  setCameraInput,
  updateCameraStatus,
} from './viewer-playback';
import type { UICallbacks, ViewerState } from './viewer-types';

// Re-export auto-hide functions
export { cleanupAutoHide, initAutoHide, onPlayStateChange, resetControlsTimer };

// Re-export DOM update functions
export {
  updatePlayPauseButton,
  updateSeekingIndicator,
  updateSpeedButton,
  updateTimelineUI,
};

// Re-export types
export type { UICallbacks, ViewerState };

/** Increase playback speed */
export function increaseSpeed(
  api: ScreenAPI<ViewerState>,
  updateSpeedButton: (speed: number) => void,
): void {
  const state = api.getState();
  const idx = PLAYBACK_SPEEDS.indexOf(
    state.speed as (typeof PLAYBACK_SPEEDS)[number],
  );
  if (idx < PLAYBACK_SPEEDS.length - 1) {
    const nextSpeed = PLAYBACK_SPEEDS[idx + 1] ?? state.speed;
    api.updateState({ speed: nextSpeed });
    updateSpeedButton(nextSpeed);
  }
}

/** Decrease playback speed */
export function decreaseSpeed(
  api: ScreenAPI<ViewerState>,
  updateSpeedButton: (speed: number) => void,
): void {
  const state = api.getState();
  const idx = PLAYBACK_SPEEDS.indexOf(
    state.speed as (typeof PLAYBACK_SPEEDS)[number],
  );
  if (idx > 0) {
    const nextSpeed = PLAYBACK_SPEEDS[idx - 1] ?? state.speed;
    api.updateState({ speed: nextSpeed });
    updateSpeedButton(nextSpeed);
  }
}

/** Cycle playback speed (for button clicks, wraps around) */
export function cycleSpeed(
  api: ScreenAPI<ViewerState>,
  updateSpeedButton: (speed: number) => void,
): void {
  const state = api.getState();
  const idx = PLAYBACK_SPEEDS.indexOf(
    state.speed as (typeof PLAYBACK_SPEEDS)[number],
  );
  const nextIdx = (idx + 1) % PLAYBACK_SPEEDS.length;
  const nextSpeed = PLAYBACK_SPEEDS[nextIdx] ?? 1;
  api.updateState({ speed: nextSpeed });
  updateSpeedButton(nextSpeed);
}

/** Handle timeline seek input */
export function handleTimelineSeek(
  api: ScreenAPI<ViewerState>,
  targetTick: number,
  callbacks: Pick<UICallbacks, 'updateSeekingIndicator' | 'updateTimelineUI'>,
): void {
  const s = api.getState();
  api.updateState({ seeking: true, currentTick: targetTick });
  callbacks.updateSeekingIndicator(true);
  callbacks.updateTimelineUI(targetTick, s.totalTicks);
  const seekStarted = seekTo(targetTick);
  if (!seekStarted) {
    api.updateState({ seeking: false });
    callbacks.updateSeekingIndicator(false);
  }
}

/** Handle keydown events for replay controls */
export function handleKeyDown(
  e: KeyboardEvent,
  api: ScreenAPI<ViewerState>,
  callbacks: UICallbacks,
): void {
  const s = api.getState();

  // Don't process shortcuts if modal is open
  if (s.helpModal.visible) {
    return;
  }

  const code = e.code;
  const isTogglePlay = isReplayAction(code, 'togglePlay');

  // Space is context-aware: only toggles if no interactive element is focused
  // This matches YouTube behavior where Space scrolls page when button focused
  const isSpaceToggle =
    code === 'Space' &&
    !(document.activeElement instanceof HTMLButtonElement) &&
    !(document.activeElement instanceof HTMLInputElement) &&
    !(document.activeElement instanceof HTMLSelectElement);

  const shouldTogglePlay = isTogglePlay || isSpaceToggle;

  // Reset controls timer on any key EXCEPT pause (togglePlay)
  // This way pressing pause while controls are hidden doesn't flash them
  if (!shouldTogglePlay) {
    resetControlsTimer();
  }

  // Ticks per second (60 ticks = 1 second)
  const TICKS_PER_SECOND = 60;
  const SEEK_SECONDS = 10;

  // Playback controls
  if (shouldTogglePlay) {
    e.preventDefault();
    const newPlaying = !s.playing;
    api.updateState({ playing: newPlaying });
    callbacks.updatePlayPauseButton(newPlaying);
    onPlayStateChange(newPlaying);
  } else if (isReplayAction(code, 'exit')) {
    e.preventDefault();
    callbacks.onBack();
  } else if (isReplayAction(code, 'showHelp')) {
    e.preventDefault();
    callbacks.openHelpModal();
  }
  // Speed controls (Shift+Period and Shift+Comma)
  else if (e.shiftKey && isReplayAction(code, 'speedUp')) {
    e.preventDefault();
    increaseSpeed(api, callbacks.updateSpeedButton);
  } else if (e.shiftKey && isReplayAction(code, 'speedDown')) {
    e.preventDefault();
    decreaseSpeed(api, callbacks.updateSpeedButton);
  }
  // Frame step (only when paused, without shift)
  else if (!e.shiftKey && !s.playing && isReplayAction(code, 'frameNext')) {
    e.preventDefault();
    const nextTick = Math.min(s.currentTick + 1, s.totalTicks);
    handleTimelineSeek(api, nextTick, callbacks);
  } else if (!e.shiftKey && !s.playing && isReplayAction(code, 'framePrev')) {
    e.preventDefault();
    const prevTick = Math.max(s.currentTick - 1, 0);
    handleTimelineSeek(api, prevTick, callbacks);
  }
  // Seek backward/forward 10 seconds
  else if (isReplayAction(code, 'seekBackward')) {
    e.preventDefault();
    const targetTick = Math.max(
      s.currentTick - SEEK_SECONDS * TICKS_PER_SECOND,
      0,
    );
    handleTimelineSeek(api, targetTick, callbacks);
  } else if (isReplayAction(code, 'seekForward')) {
    e.preventDefault();
    const targetTick = Math.min(
      s.currentTick + SEEK_SECONDS * TICKS_PER_SECOND,
      s.totalTicks,
    );
    handleTimelineSeek(api, targetTick, callbacks);
  }
  // Seek to percentage (0-9 keys)
  else if (isReplayAction(code, 'seekStart')) {
    e.preventDefault();
    handleTimelineSeek(api, 0, callbacks);
  } else if (isReplayAction(code, 'seek10')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.1), callbacks);
  } else if (isReplayAction(code, 'seek20')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.2), callbacks);
  } else if (isReplayAction(code, 'seek30')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.3), callbacks);
  } else if (isReplayAction(code, 'seek40')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.4), callbacks);
  } else if (isReplayAction(code, 'seek50')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.5), callbacks);
  } else if (isReplayAction(code, 'seek60')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.6), callbacks);
  } else if (isReplayAction(code, 'seek70')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.7), callbacks);
  } else if (isReplayAction(code, 'seek80')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.8), callbacks);
  } else if (isReplayAction(code, 'seek90')) {
    e.preventDefault();
    handleTimelineSeek(api, Math.floor(s.totalTicks * 0.9), callbacks);
  }
  // HUD toggle (allowed during seek - just UI state, read by render loop)
  else if (isReplayAction(code, 'toggleHUD')) {
    e.preventDefault();
    api.updateState({ hudVisible: !s.hudVisible });
  }

  // Camera controls below are disabled during seek.
  // The entity list may be stale mid-seek, and camera movement has no effect
  // since rendering is paused. Controls resume once seek completes.
  if (s.seeking) {
    return;
  }

  // Ship selection
  if (isReplayAction(code, 'nextShip')) {
    e.preventDefault();
    cameraNextEntity();
    updateCameraStatus();
  } else if (isReplayAction(code, 'prevShip')) {
    e.preventDefault();
    cameraPrevEntity();
    updateCameraStatus();
  } else if (isReplayAction(code, 'resetCamera')) {
    e.preventDefault();
    cameraResetToPlayer();
    updateCameraStatus();
  }
  // Camera mode
  else if (isReplayAction(code, 'toggleCamera')) {
    e.preventDefault();
    cameraToggleMode();
    updateCameraStatus();
  }
  // Camera movement (continuous - set input state)
  else if (isReplayAction(code, 'cameraUp')) {
    e.preventDefault();
    setCameraInput('up', true);
  } else if (isReplayAction(code, 'cameraDown')) {
    e.preventDefault();
    setCameraInput('down', true);
  } else if (isReplayAction(code, 'cameraLeft')) {
    e.preventDefault();
    setCameraInput('left', true);
  } else if (isReplayAction(code, 'cameraRight')) {
    e.preventDefault();
    setCameraInput('right', true);
  } else if (isReplayAction(code, 'cameraForward')) {
    e.preventDefault();
    setCameraInput('forward', true);
  } else if (isReplayAction(code, 'cameraBack')) {
    e.preventDefault();
    setCameraInput('back', true);
  } else if (isReplayAction(code, 'cameraRollLeft')) {
    e.preventDefault();
    setCameraInput('rollLeft', true);
  } else if (isReplayAction(code, 'cameraRollRight')) {
    e.preventDefault();
    setCameraInput('rollRight', true);
  } else if (isReplayAction(code, 'zoomIn')) {
    e.preventDefault();
    setCameraInput('zoomIn', true);
  } else if (isReplayAction(code, 'zoomOut')) {
    e.preventDefault();
    setCameraInput('zoomOut', true);
  }
}

/** Handle keyup events to release camera movement keys */
export function handleKeyUp(
  e: KeyboardEvent,
  api: ScreenAPI<ViewerState>,
): void {
  const s = api.getState();

  // Don't process if modal is open
  if (s.helpModal.visible) {
    return;
  }

  const code = e.code;

  // Camera movement release
  if (isReplayAction(code, 'cameraUp')) {
    setCameraInput('up', false);
  } else if (isReplayAction(code, 'cameraDown')) {
    setCameraInput('down', false);
  } else if (isReplayAction(code, 'cameraLeft')) {
    setCameraInput('left', false);
  } else if (isReplayAction(code, 'cameraRight')) {
    setCameraInput('right', false);
  } else if (isReplayAction(code, 'cameraForward')) {
    setCameraInput('forward', false);
  } else if (isReplayAction(code, 'cameraBack')) {
    setCameraInput('back', false);
  } else if (isReplayAction(code, 'cameraRollLeft')) {
    setCameraInput('rollLeft', false);
  } else if (isReplayAction(code, 'cameraRollRight')) {
    setCameraInput('rollRight', false);
  } else if (isReplayAction(code, 'zoomIn')) {
    setCameraInput('zoomIn', false);
  } else if (isReplayAction(code, 'zoomOut')) {
    setCameraInput('zoomOut', false);
  }
}
