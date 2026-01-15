/**
 * Replay List Screen - Browse and manage saved replays.
 *
 * Master-detail layout:
 * - Left panel: Compact list of replays
 * - Right panel: Selected replay details with actions
 *
 * Render functions are in replay-list-render.ts to keep files under 400 lines.
 */

import {
  deleteReplay,
  downloadReplay,
  listReplays,
  loadReplay,
  openReplayFile,
  saveReplay,
} from '../../../replay/storage';
import type { FullReplayData } from '../../../replay/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import {
  type ReplaysState,
  renderConfirmDelete,
  renderDetailPanel,
  renderReplayList,
} from './replay-list-render';

/** Replays screen callbacks */
export interface ReplaysScreenProps {
  onBack: () => void;
  onWatch?: (replayId: string) => void;
}

/** Replays screen component */
const ReplaysScreenComponent: Screen<ReplaysState, ReplaysScreenProps> = {
  render(state, _props) {
    return `
      <div class="replays-screen">
        <div class="replays-header">
          <h2 class="replays-title">Replays</h2>
          <div class="replays-header-actions">
            <button class="btn" id="btn-import-replay">Import</button>
            <button class="btn btn-back" id="btn-back">Back</button>
          </div>
        </div>
        <div class="replays-layout">
          <div class="replays-list-panel">
            ${renderReplayList(state)}
          </div>
          <div class="replays-detail-panel">
            ${renderDetailPanel(state)}
          </div>
        </div>
        ${state.confirmDeleteId ? renderConfirmDelete(state.confirmDeleteId) : ''}
      </div>
    `;
  },

  bind(api: ScreenAPI<ReplaysState>, props: ReplaysScreenProps) {
    // Back button
    api.on('#btn-back', 'click', () => {
      props.onBack();
    });

    // List item selection
    api.on('.replay-list-item', 'click', async (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId) {
        // Clear error and show selection immediately, load full replay async
        api.setState({
          selectedId: replayId,
          selectedReplay: null,
          error: null,
        });
        const replay = await loadReplay(replayId);
        // Only update if still selected (user may have clicked elsewhere)
        if (api.getState().selectedId === replayId) {
          api.setState({ selectedReplay: replay });
        }
      }
    });

    // Double-click to watch
    api.on('.replay-list-item', 'dblclick', (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId && props.onWatch) {
        props.onWatch(replayId);
      }
    });

    // Watch button (detail panel)
    api.on('.btn-watch-detail', 'click', (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId && props.onWatch) {
        props.onWatch(replayId);
      }
    });

    // Export button (detail panel) - use already loaded replay
    api.on('.btn-export-detail', 'click', async () => {
      const state = api.getState();
      if (state.selectedReplay) {
        try {
          await downloadReplay(state.selectedReplay);
        } catch (err) {
          api.setState({
            error: `Failed to export: ${(err as Error).message}`,
          });
        }
      }
    });

    // Delete button (detail panel) - show confirmation
    api.on('.btn-delete-detail', 'click', (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId) {
        api.setState({ confirmDeleteId: replayId });
      }
    });

    // Cancel delete
    api.on('#btn-cancel-delete', 'click', () => {
      api.setState({ confirmDeleteId: null });
    });

    // Confirm delete
    api.on('#btn-confirm-delete', 'click', async (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId) {
        try {
          await deleteReplay(replayId);
          const newReplays = await listReplays();
          // Clear selection if deleted replay was selected
          const state = api.getState();
          const wasSelected = state.selectedId === replayId;
          api.setState({
            replays: newReplays,
            confirmDeleteId: null,
            selectedId: wasSelected ? null : state.selectedId,
            selectedReplay: wasSelected ? null : state.selectedReplay,
          });
        } catch (err) {
          api.setState({
            error: `Failed to delete: ${(err as Error).message}`,
            confirmDeleteId: null,
          });
        }
      }
    });

    // Import button
    api.on('#btn-import-replay', 'click', async () => {
      try {
        const replay = await openReplayFile();
        if (replay) {
          await saveReplay(replay);
          const newReplays = await listReplays();
          api.setState({ replays: newReplays });
        }
      } catch (err) {
        api.setState({
          error: `Failed to import: ${(err as Error).message}`,
        });
      }
    });

    // Escape key to go back
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        const state = api.getState();
        if (state.confirmDeleteId) {
          api.setState({ confirmDeleteId: null });
        } else {
          props.onBack();
        }
      }
    });
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<ReplaysState, ReplaysScreenProps> | null = null;

/** Render and bind the replays screen */
export function renderReplaysScreen(element: HTMLElement): void {
  const initialState: ReplaysState = {
    replays: [],
    selectedId: null,
    selectedReplay: null,
    loading: true,
    error: null,
    confirmDeleteId: null,
  };
  element.innerHTML = ReplaysScreenComponent.render(initialState, {
    onBack: () => {},
  });
}

/** Bind replays screen event handlers */
export function bindReplaysScreen(
  element: HTMLElement,
  props: ReplaysScreenProps,
): void {
  // Clean up previous handle
  screenHandle?.destroy();

  const initialState: ReplaysState = {
    replays: [],
    selectedId: null,
    selectedReplay: null,
    loading: true,
    error: null,
    confirmDeleteId: null,
  };

  screenHandle = createScreen(
    ReplaysScreenComponent,
    element,
    initialState,
    props,
  );

  // Load replays async and auto-select first
  listReplays()
    .then(async (replays) => {
      // Auto-select first replay if available
      let selectedId: string | null = null;
      let selectedReplay: FullReplayData | null = null;
      const firstReplay = replays[0];
      if (firstReplay) {
        selectedId = firstReplay.id;
        selectedReplay = (await loadReplay(selectedId)) ?? null;
      }
      screenHandle?.replaceState({
        replays,
        selectedId,
        selectedReplay,
        loading: false,
        error: null,
        confirmDeleteId: null,
      });
    })
    .catch((err) => {
      screenHandle?.replaceState({
        replays: [],
        selectedId: null,
        selectedReplay: null,
        loading: false,
        error: `Failed to load replays: ${(err as Error).message}`,
        confirmDeleteId: null,
      });
    });
}

/** Cleanup replays screen */
export function cleanupReplaysScreen(): void {
  screenHandle?.destroy();
  screenHandle = null;
}
