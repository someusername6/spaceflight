/**
 * Replay Viewer HUD Rendering
 *
 * Renders the replay controls overlay (timeline, buttons, camera status).
 * Extracted from replay-viewer.ts to keep files under 400 lines.
 */

import type { ViewerState } from './viewer-types';

/** Format time as MM:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Render the replay HUD overlay */
export function renderHUD(state: ViewerState): string {
  const currentTime = formatTime(state.currentTick / 60);
  const totalTime = formatTime(state.totalTicks / 60);
  const progress =
    state.totalTicks > 0 ? (state.currentTick / state.totalTicks) * 100 : 0;
  const displayStyle = state.hudVisible ? '' : 'display: none;';

  return `
    <div class="replay-hud" style="${displayStyle}">
      <div class="replay-controls">
        <div class="replay-controls-timeline">
          <div class="replay-timeline-container">
            <input
              type="range"
              class="replay-timeline"
              id="replay-timeline"
              min="0"
              max="${state.totalTicks}"
              value="${state.currentTick}"
              ${state.seeking ? 'disabled' : ''}
            />
            <div class="replay-timeline-progress" style="width: ${progress}%"></div>
          </div>
          <span class="replay-time">${currentTime} / ${totalTime}</span>
        </div>
        <div class="replay-controls-buttons">
          <button class="btn btn-icon" id="btn-back-viewer">
            <span class="icon-back">&larr;</span>
          </button>
          <button class="btn btn-icon btn-play-pause" id="btn-play-pause">
            ${state.playing ? '&#10074;&#10074;' : '&#9658;'}
          </button>
          <button class="btn btn-speed" id="btn-speed">
            ${state.speed}x
          </button>
          <div class="replay-controls-spacer"></div>
          <div class="replay-camera-status">
            <span id="camera-mode-display">Chase</span>
            <span class="camera-status-separator">|</span>
            <span id="camera-target-display">Player</span>
          </div>
          <button class="btn btn-icon btn-help" id="btn-help" title="Controls (F1)">
            ?
          </button>
        </div>
      </div>
      ${state.seeking ? '<div class="replay-seeking">Seeking...</div>' : ''}
    </div>
  `;
}
