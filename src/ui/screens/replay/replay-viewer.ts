/**
 * Replay Viewer Screen - Watch recorded replays.
 *
 * Features:
 * - Play/pause/speed controls
 * - Timeline seeking
 * - Rebindable keyboard controls
 * - Help modal for viewing/changing bindings
 */

import { loadReplay } from '../../../replay/storage';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import {
  bindReplayHelpModal,
  cleanupReplayHelpModal,
  type ReplayHelpModalState,
  renderReplayHelpModal,
} from './replay-help-modal';
import { clearDOMCache } from './viewer-dom';
import { renderHUD } from './viewer-hud';
import {
  cleanupAutoHide,
  cycleSpeed,
  handleKeyDown,
  handleKeyUp,
  handleTimelineSeek,
  initAutoHide,
  onPlayStateChange,
  resetControlsTimer,
  type UICallbacks,
  updatePlayPauseButton,
  updateSeekingIndicator,
  updateSpeedButton,
  updateTimelineUI,
  type ViewerState,
} from './viewer-input';
import {
  cleanupViewer,
  endOrbitDrag,
  initializeViewer,
  type PlaybackCallbacks,
  startOrbitDrag,
  updateOrbitDrag,
} from './viewer-playback';

/** Viewer screen callbacks */
export interface ReplayViewerProps {
  onBack: () => void;
}

// Re-export ViewerState for external use
export type { ViewerState } from './viewer-types';

/** Update help modal without full screen re-render */
function updateHelpModal(state: ReplayHelpModalState): void {
  const existingModal = document.getElementById('replay-help-modal');
  const viewer = document.querySelector('.replay-viewer');

  if (state.visible) {
    // Render or update modal
    const modalHtml = renderReplayHelpModal(state);
    if (existingModal) {
      existingModal.outerHTML = modalHtml;
    } else if (viewer) {
      viewer.insertAdjacentHTML('beforeend', modalHtml);
    }
  } else {
    // Remove modal
    existingModal?.remove();
  }
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
        ${renderReplayHelpModal(state.helpModal)}
      </div>
    `;
  },

  bind(api: ScreenAPI<ViewerState>, props: ReplayViewerProps) {
    const state = api.getState();

    // Initialize auto-hide for replay controls
    initAutoHide(() => api.getState().playing);

    // Create UI callbacks for input handlers
    const uiCallbacks: UICallbacks = {
      updatePlayPauseButton,
      updateSpeedButton,
      updateSeekingIndicator,
      updateTimelineUI,
      openHelpModal: () => openHelpModal(api),
      onBack: props.onBack,
    };

    // Mouse move on viewer area resets auto-hide timer
    api.on('.replay-viewer', 'mousemove', () => {
      resetControlsTimer();
    });

    // Back buttons
    api.on('#btn-back-viewer', 'click', () => {
      props.onBack();
    });

    api.on('#btn-back-error', 'click', () => {
      props.onBack();
    });

    // Play/pause button
    api.on('#btn-play-pause', 'click', () => {
      const s = api.getState();
      const newPlaying = !s.playing;
      api.updateState({ playing: newPlaying });
      updatePlayPauseButton(newPlaying);
      onPlayStateChange(newPlaying);
    });

    // Speed cycle button
    api.on('#btn-speed', 'click', () => {
      cycleSpeed(api, updateSpeedButton);
      resetControlsTimer();
    });

    // Help button
    api.on('#btn-help', 'click', () => {
      openHelpModal(api);
    });

    // Timeline seek
    api.on('#replay-timeline', 'input', (_e, el) => {
      const target = parseInt((el as HTMLInputElement).value, 10);
      handleTimelineSeek(api, target, uiCallbacks);
      resetControlsTimer();
    });

    // Orbit camera drag-to-rotate
    api.on('.replay-canvas-container', 'mousedown', (e) => {
      const s = api.getState();
      if (s.helpModal.visible) return; // Don't start drag if modal open
      if (startOrbitDrag(e as MouseEvent)) {
        (e as MouseEvent).preventDefault();
      }
    });

    api.onGlobal('mousemove', (e) => {
      updateOrbitDrag(e as MouseEvent);
    });

    api.onGlobal('mouseup', () => {
      endOrbitDrag();
    });

    // Bind help modal if visible
    if (state.helpModal.visible) {
      bindHelpModalHandlers(api);
    }

    // Keyboard shortcuts
    api.onGlobal('keydown', (e) => {
      handleKeyDown(e as KeyboardEvent, api, uiCallbacks);
    });

    api.onGlobal('keyup', (e) => {
      handleKeyUp(e as KeyboardEvent, api);
    });
  },
};

/** Open help modal */
function openHelpModal(api: ScreenAPI<ViewerState>): void {
  api.updateState({
    helpModal: { visible: true, listeningAction: null },
  });
  updateHelpModal({ visible: true, listeningAction: null });
  bindHelpModalHandlers(api);
}

/** Close help modal */
function closeHelpModal(api: ScreenAPI<ViewerState>): void {
  cleanupReplayHelpModal();
  api.updateState({
    helpModal: { visible: false, listeningAction: null },
  });
  updateHelpModal({ visible: false, listeningAction: null });
  // Reset auto-hide timer so controls don't hide immediately after closing modal
  resetControlsTimer();
}

/** Bind help modal event handlers */
function bindHelpModalHandlers(api: ScreenAPI<ViewerState>): void {
  bindReplayHelpModal(
    () => closeHelpModal(api),
    (modalState) => {
      const state = api.getState();
      const newHelpModal = { ...state.helpModal, ...modalState };
      api.updateState({ helpModal: newHelpModal });
      // Re-render modal to show updated bindings
      updateHelpModal(newHelpModal);
      // Re-bind after re-render
      if (newHelpModal.visible) {
        requestAnimationFrame(() => bindHelpModalHandlers(api));
      }
    },
  );
}

/** Screen handle for external access */
let screenHandle: ScreenHandle<ViewerState, ReplayViewerProps> | null = null;

/** Initial state factory */
function createInitialState(): ViewerState {
  return {
    loading: true,
    error: null,
    playing: false,
    speed: 1,
    currentTick: 0,
    totalTicks: 0,
    seeking: false,
    hudVisible: true,
    helpModal: { visible: false, listeningAction: null },
  };
}

/** Render the replay viewer screen */
export function renderReplayViewer(element: HTMLElement): void {
  const initialState = createInitialState();
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

  const initialState = createInitialState();

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
        ...initialState,
        loading: false,
        totalTicks: replay.tickCount,
      });

      // Initialize viewer after render
      requestAnimationFrame(() => {
        if (!screenHandle) return;
        const container = document.getElementById('replay-canvas');
        if (container) {
          try {
            const callbacks: PlaybackCallbacks = {
              getState: () =>
                screenHandle?.getState() ?? {
                  playing: false,
                  speed: 1,
                  totalTicks: 0,
                  hudVisible: true,
                },
              updateState: (updates) => screenHandle?.updateState(updates),
              onPlayPauseChange: (playing) => {
                updatePlayPauseButton(playing);
                onPlayStateChange(playing);
              },
              onSeekComplete: (tick, total) => {
                updateSeekingIndicator(false);
                updateTimelineUI(tick, total);
              },
              onTimeUpdate: updateTimelineUI,
            };
            initializeViewer(replay, container, callbacks);
          } catch (err) {
            screenHandle?.replaceState({
              ...initialState,
              loading: false,
              error: `Failed to initialize replay: ${(err as Error).message}`,
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
  cleanupAutoHide();
  cleanupReplayHelpModal();
  cleanupViewer();
  clearDOMCache();
  screenHandle?.destroy();
  screenHandle = null;
}
