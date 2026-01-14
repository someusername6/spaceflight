/**
 * Replay Viewer Screen - Watch recorded replays.
 *
 * Features:
 * - Play/pause/speed controls
 * - Timeline seeking
 * - Same rendering as live gameplay
 */

import { loadReplay } from '../../../replay/storage';
import { PLAYBACK_SPEEDS } from '../../../replay/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import {
  cleanupViewer,
  formatTime,
  initializeViewer,
  type PlaybackCallbacks,
  seekTo,
} from './viewer-playback';

/** Viewer screen callbacks */
export interface ReplayViewerProps {
  onBack: () => void;
}

/** Screen state */
interface ViewerState {
  loading: boolean;
  error: string | null;
  playing: boolean;
  speed: number;
  currentTick: number;
  totalTicks: number;
  seeking: boolean;
}

/** Update play/pause button without re-render */
function updatePlayPauseButton(playing: boolean): void {
  const btn = document.getElementById('btn-play-pause');
  if (btn) {
    btn.innerHTML = playing ? '&#10074;&#10074;' : '&#9658;';
  }
}

/** Update speed button without re-render */
function updateSpeedButton(speed: number): void {
  const btn = document.getElementById('btn-speed');
  if (btn) {
    btn.textContent = `${speed}x`;
  }
}

/** Update seeking indicator without re-render */
function updateSeekingIndicator(seeking: boolean): void {
  const hud = document.querySelector('.replay-hud');
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
function updateTimelineUI(currentTick: number, totalTicks: number): void {
  const timeline = document.getElementById(
    'replay-timeline',
  ) as HTMLInputElement | null;
  const progress = document.querySelector(
    '.replay-timeline-progress',
  ) as HTMLElement | null;
  const timeDisplay = document.querySelector(
    '.replay-time',
  ) as HTMLElement | null;

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

/** Render the replay HUD overlay */
function renderHUD(state: ViewerState): string {
  const currentTime = formatTime(state.currentTick / 60);
  const totalTime = formatTime(state.totalTicks / 60);
  const progress =
    state.totalTicks > 0 ? (state.currentTick / state.totalTicks) * 100 : 0;

  return `
    <div class="replay-hud">
      <div class="replay-controls">
        <button class="btn btn-icon" id="btn-back-viewer">
          <span class="icon-back">&larr;</span>
        </button>
        <button class="btn btn-icon btn-play-pause" id="btn-play-pause">
          ${state.playing ? '&#10074;&#10074;' : '&#9658;'}
        </button>
        <button class="btn btn-icon" id="btn-speed">
          ${state.speed}x
        </button>
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
      ${state.seeking ? '<div class="replay-seeking">Seeking...</div>' : ''}
    </div>
  `;
}

/** Replay viewer component */
const ReplayViewerComponent: Screen<ViewerState, ReplayViewerProps> = {
  render(state, _props) {
    if (state.loading) {
      return `
        <div class="replay-viewer">
          <div class="replay-viewer-loading">Loading replay...</div>
        </div>
      `;
    }

    if (state.error) {
      return `
        <div class="replay-viewer">
          <div class="replay-viewer-error">
            <p>${state.error}</p>
            <button class="btn" id="btn-back-error">Back</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="replay-viewer">
        <div class="replay-canvas-container" id="replay-canvas"></div>
        ${renderHUD(state)}
      </div>
    `;
  },

  bind(api: ScreenAPI<ViewerState>, props: ReplayViewerProps) {
    // Back buttons
    api.on('#btn-back-viewer', 'click', () => {
      props.onBack();
    });

    api.on('#btn-back-error', 'click', () => {
      props.onBack();
    });

    // Play/pause - use updateState to avoid re-render (preserves canvas)
    api.on('#btn-play-pause', 'click', () => {
      const state = api.getState();
      const newPlaying = !state.playing;
      api.updateState({ playing: newPlaying });
      updatePlayPauseButton(newPlaying);
    });

    // Speed cycle - use updateState to avoid re-render
    api.on('#btn-speed', 'click', () => {
      const state = api.getState();
      const idx = PLAYBACK_SPEEDS.indexOf(
        state.speed as (typeof PLAYBACK_SPEEDS)[number],
      );
      const nextIdx = (idx + 1) % PLAYBACK_SPEEDS.length;
      const nextSpeed = PLAYBACK_SPEEDS[nextIdx] ?? 1;
      api.updateState({ speed: nextSpeed });
      updateSpeedButton(nextSpeed);
    });

    // Timeline seek - use 'input' event for immediate response on click/drag
    api.on('#replay-timeline', 'input', (_e, el) => {
      const target = parseInt((el as HTMLInputElement).value, 10);
      const state = api.getState();
      api.updateState({ seeking: true, currentTick: target });
      updateSeekingIndicator(true);
      // Immediately show the target position on the timeline
      updateTimelineUI(target, state.totalTicks);
      const seekStarted = seekTo(target);
      // If seek didn't start (e.g., same position), reset UI immediately
      if (!seekStarted) {
        api.updateState({ seeking: false });
        updateSeekingIndicator(false);
      }
    });

    // Keyboard shortcuts - use updateState to avoid re-render
    api.onGlobal('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.code === 'Space') {
        e.preventDefault();
        const state = api.getState();
        const newPlaying = !state.playing;
        api.updateState({ playing: newPlaying });
        updatePlayPauseButton(newPlaying);
      } else if (ke.code === 'Escape') {
        e.preventDefault();
        props.onBack();
      }
    });
  },
};

/** Screen handle for external access */
let screenHandle: ScreenHandle<ViewerState, ReplayViewerProps> | null = null;

/** Render the replay viewer screen */
export function renderReplayViewer(element: HTMLElement): void {
  const initialState: ViewerState = {
    loading: true,
    error: null,
    playing: false,
    speed: 1,
    currentTick: 0,
    totalTicks: 0,
    seeking: false,
  };
  element.innerHTML = ReplayViewerComponent.render(initialState, {
    onBack: () => {},
  });
}

/** Bind replay viewer and load replay */
export function bindReplayViewer(
  element: HTMLElement,
  replayId: string,
  props: ReplayViewerProps,
): void {
  // Clean up previous viewer
  cleanupReplayViewer();

  const initialState: ViewerState = {
    loading: true,
    error: null,
    playing: false,
    speed: 1,
    currentTick: 0,
    totalTicks: 0,
    seeking: false,
  };

  screenHandle = createScreen(
    ReplayViewerComponent,
    element,
    initialState,
    props,
  );

  // Load replay async
  loadReplay(replayId)
    .then((replay) => {
      if (!replay) {
        screenHandle?.replaceState({
          ...initialState,
          loading: false,
          error: 'Replay not found',
        });
        return;
      }

      // Update state with replay info
      screenHandle?.replaceState({
        loading: false,
        error: null,
        playing: false,
        speed: 1,
        currentTick: 0,
        totalTicks: replay.tickCount,
        seeking: false,
      });

      // Initialize viewer after render
      requestAnimationFrame(() => {
        if (!screenHandle) return; // User navigated away
        const container = document.getElementById('replay-canvas');
        if (container) {
          try {
            const callbacks: PlaybackCallbacks = {
              getState: () =>
                screenHandle?.getState() ?? {
                  playing: false,
                  speed: 1,
                  totalTicks: 0,
                },
              updateState: (updates) => screenHandle?.updateState(updates),
              onPlayPauseChange: updatePlayPauseButton,
              onSeekComplete: (tick, total) => {
                updateSeekingIndicator(false);
                updateTimelineUI(tick, total);
              },
              onTimeUpdate: updateTimelineUI,
            };
            initializeViewer(replay, container, callbacks);
          } catch (err) {
            screenHandle?.replaceState({
              loading: false,
              error: `Failed to initialize replay: ${(err as Error).message}`,
              playing: false,
              speed: 1,
              currentTick: 0,
              totalTicks: 0,
              seeking: false,
            });
          }
        }
      });
    })
    .catch((err) => {
      screenHandle?.replaceState({
        ...initialState,
        loading: false,
        error: `Failed to load replay: ${(err as Error).message}`,
      });
    });
}

/** Clean up replay viewer */
export function cleanupReplayViewer(): void {
  cleanupViewer();
  screenHandle?.destroy();
  screenHandle = null;
}
