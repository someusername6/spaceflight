/**
 * Replay Viewer DOM Updates
 *
 * DOM manipulation functions for replay viewer UI elements.
 * Uses ViewerContext for DOM cache.
 */

import { getViewerContext } from './viewer-context';
import { formatTime } from './viewer-playback';

// =============================================================================
// DOM Cache Helpers
// =============================================================================

/** Get or create element cache */
function getCache() {
  const ctx = getViewerContext();
  if (!ctx) return null;

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
  return ctx.domCache;
}

/** Clear cached element references (call on viewer cleanup) */
export function clearDOMCache(): void {
  const ctx = getViewerContext();
  if (ctx) {
    ctx.domCache = null;
  }
}

// =============================================================================
// DOM Update Functions
// =============================================================================

/** Update play/pause button without re-render */
export function updatePlayPauseButton(playing: boolean): void {
  const cache = getCache();
  if (cache?.playPauseBtn) {
    cache.playPauseBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9658;';
  }
}

/** Update speed button without re-render */
export function updateSpeedButton(speed: number): void {
  const cache = getCache();
  if (cache?.speedBtn) {
    cache.speedBtn.textContent = `${speed}x`;
  }
}

/** Update seeking indicator without re-render */
export function updateSeekingIndicator(seeking: boolean): void {
  const cache = getCache();
  if (!cache?.hud) return;

  let indicator = document.querySelector('.replay-seeking');
  if (seeking && !indicator) {
    indicator = document.createElement('div');
    indicator.className = 'replay-seeking';
    indicator.textContent = 'Seeking...';
    cache.hud.appendChild(indicator);
  } else if (!seeking && indicator) {
    indicator.remove();
  }
}

/** Update timeline UI without full re-render */
export function updateTimelineUI(
  currentTick: number,
  totalTicks: number,
): void {
  const cache = getCache();
  if (!cache) return;

  if (cache.timeline) {
    cache.timeline.value = String(currentTick);
  }
  if (cache.progress && totalTicks > 0) {
    cache.progress.style.width = `${(currentTick / totalTicks) * 100}%`;
  }
  if (cache.timeDisplay) {
    const currentTime = formatTime(currentTick / 60);
    const totalTime = formatTime(totalTicks / 60);
    cache.timeDisplay.textContent = `${currentTime} / ${totalTime}`;
  }
}
