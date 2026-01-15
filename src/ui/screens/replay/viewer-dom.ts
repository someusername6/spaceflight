/**
 * Replay Viewer DOM Updates
 *
 * DOM manipulation functions for replay viewer UI elements.
 * Separated from viewer-input.ts to keep files under 400 lines.
 */

import { formatTime } from './viewer-playback';

// ============================================================================
// Cached DOM Element References
// ============================================================================

/** Cached element references (populated on first use, cleared on cleanup) */
interface DOMCache {
  playPauseBtn: HTMLElement | null;
  speedBtn: HTMLElement | null;
  timeline: HTMLInputElement | null;
  progress: HTMLElement | null;
  timeDisplay: HTMLElement | null;
  hud: HTMLElement | null;
}

let cache: DOMCache | null = null;

/** Get or create element cache */
function getCache(): DOMCache {
  if (!cache) {
    cache = {
      playPauseBtn: document.getElementById('btn-play-pause'),
      speedBtn: document.getElementById('btn-speed'),
      timeline: document.getElementById(
        'replay-timeline',
      ) as HTMLInputElement | null,
      progress: document.querySelector('.replay-timeline-progress'),
      timeDisplay: document.querySelector('.replay-time'),
      hud: document.querySelector('.replay-hud'),
    };
  }
  return cache;
}

/** Clear cached element references (call on viewer cleanup) */
export function clearDOMCache(): void {
  cache = null;
}

// ============================================================================
// DOM Update Functions
// ============================================================================

/** Update play/pause button without re-render */
export function updatePlayPauseButton(playing: boolean): void {
  const { playPauseBtn } = getCache();
  if (playPauseBtn) {
    playPauseBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9658;';
  }
}

/** Update speed button without re-render */
export function updateSpeedButton(speed: number): void {
  const { speedBtn } = getCache();
  if (speedBtn) {
    speedBtn.textContent = `${speed}x`;
  }
}

/** Update seeking indicator without re-render */
export function updateSeekingIndicator(seeking: boolean): void {
  const { hud } = getCache();
  if (!hud) return;

  let indicator = document.querySelector('.replay-seeking');
  if (seeking && !indicator) {
    indicator = document.createElement('div');
    indicator.className = 'replay-seeking';
    indicator.textContent = 'Seeking...';
    hud.appendChild(indicator);
  } else if (!seeking && indicator) {
    indicator.remove();
  }
}

/** Update timeline UI without full re-render */
export function updateTimelineUI(
  currentTick: number,
  totalTicks: number,
): void {
  const { timeline, progress, timeDisplay } = getCache();

  if (timeline) {
    timeline.value = String(currentTick);
  }
  if (progress && totalTicks > 0) {
    progress.style.width = `${(currentTick / totalTicks) * 100}%`;
  }
  if (timeDisplay) {
    const currentTime = formatTime(currentTick / 60);
    const totalTime = formatTime(totalTicks / 60);
    timeDisplay.textContent = `${currentTime} / ${totalTime}`;
  }
}
