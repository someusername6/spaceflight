/**
 * Replay List Screen - Browse and manage saved replays.
 *
 * Features:
 * - List saved replays with metadata (mission, outcome, duration)
 * - Watch a replay
 * - Delete replays
 * - Import/export replay files
 */

import {
  deleteReplay,
  downloadReplay,
  listReplays,
  loadReplay,
  openReplayFile,
  saveReplay,
} from '../../../replay/storage';
import type { ReplaySummary } from '../../../replay/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';

/** Replays screen callbacks */
export interface ReplaysScreenProps {
  onBack: () => void;
  onWatch?: (replayId: string) => void;
}

/** Screen state */
interface ReplaysState {
  replays: ReplaySummary[];
  loading: boolean;
  error: string | null;
  confirmDeleteId: string | null;
}

/** Format seconds as MM:SS */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format date for display */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Escape HTML special characters to prevent XSS */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Render an individual replay card */
function renderReplayCard(replay: ReplaySummary): string {
  const outcomeClass =
    replay.outcome === 'victory' ? 'replay-victory' : 'replay-defeat';
  const outcomeText = replay.outcome === 'victory' ? 'Victory' : 'Defeat';

  return `
    <div class="replay-card" data-replay-id="${escapeHtml(replay.id)}">
      <div class="replay-card-header">
        <span class="replay-mission-name">${escapeHtml(replay.missionName)}</span>
        <span class="replay-outcome ${outcomeClass}">${outcomeText}</span>
      </div>
      <div class="replay-card-details">
        <span class="replay-sector">Sector ${replay.sector}</span>
        <span class="replay-duration">${formatDuration(replay.durationSeconds)}</span>
        <span class="replay-date">${formatDate(replay.recordedAt)}</span>
      </div>
      <div class="replay-card-actions">
        <button class="btn btn-small btn-primary btn-watch" data-replay-id="${escapeHtml(replay.id)}">
          Watch
        </button>
        <button class="btn btn-small btn-export" data-replay-id="${escapeHtml(replay.id)}">
          Export
        </button>
        <button class="btn btn-small btn-danger btn-delete-replay" data-replay-id="${escapeHtml(replay.id)}">
          Delete
        </button>
      </div>
    </div>
  `;
}

/** Render replay list */
function renderReplayList(state: ReplaysState): string {
  if (state.loading) {
    return '<div class="replay-loading">Loading replays...</div>';
  }

  if (state.error) {
    return `<div class="replay-error">${escapeHtml(state.error)}</div>`;
  }

  if (state.replays.length === 0) {
    return `
      <div class="replay-empty">
        <p>No replays saved yet.</p>
        <p class="replay-hint">Complete missions to save replays automatically.</p>
      </div>
    `;
  }

  return state.replays.map((r) => renderReplayCard(r)).join('');
}

/** Render confirm delete dialog */
function renderConfirmDelete(replayId: string): string {
  return `
    <div class="replay-confirm-overlay">
      <div class="replay-confirm-dialog">
        <h3>Delete Replay?</h3>
        <p>This action cannot be undone.</p>
        <div class="replay-confirm-actions">
          <button class="btn" id="btn-cancel-delete">Cancel</button>
          <button class="btn btn-danger" id="btn-confirm-delete" data-replay-id="${escapeHtml(replayId)}">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

/** Replays screen component */
const ReplaysScreenComponent: Screen<ReplaysState, ReplaysScreenProps> = {
  render(state, _props) {
    return `
      <div class="replays-screen">
        <div class="replays-header">
          <button class="btn btn-back" id="btn-back">
            Back
          </button>
          <h2 class="replays-title">Replays</h2>
          <button class="btn" id="btn-import-replay">
            Import
          </button>
        </div>
        <div class="replays-list">
          ${renderReplayList(state)}
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

    // Watch buttons
    api.on('.btn-watch', 'click', (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId && props.onWatch) {
        props.onWatch(replayId);
      }
    });

    // Export buttons
    api.on('.btn-export', 'click', async (_e, el) => {
      const replayId = el.dataset.replayId;
      if (replayId) {
        try {
          const replay = await loadReplay(replayId);
          if (replay) {
            downloadReplay(replay);
          }
        } catch (err) {
          api.setState({
            error: `Failed to export replay: ${(err as Error).message}`,
          });
        }
      }
    });

    // Delete buttons - show confirmation
    api.on('.btn-delete-replay', 'click', (_e, el) => {
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
          api.setState({ replays: newReplays, confirmDeleteId: null });
        } catch (err) {
          api.setState({
            error: `Failed to delete replay: ${(err as Error).message}`,
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
          error: `Failed to import replay: ${(err as Error).message}`,
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

  // Load replays async
  listReplays()
    .then((replays) => {
      screenHandle?.replaceState({
        replays,
        loading: false,
        error: null,
        confirmDeleteId: null,
      });
    })
    .catch((err) => {
      screenHandle?.replaceState({
        replays: [],
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
