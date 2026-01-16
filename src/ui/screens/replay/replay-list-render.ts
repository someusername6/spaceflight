/**
 * Replay List Render Functions
 *
 * HTML rendering helpers for the replay list screen.
 * Separated from replay-list.ts to keep files under 400 lines.
 */

import type { FullReplayData, ReplaySummary } from '../../../replay/types';
import { escapeHtml } from '../../utils';
import { getShipSvgInline } from '../../utils/inline-svg';
import {
  renderDebriefTab,
  renderDeployTab,
  renderSalvageTab,
} from './replay-detail-tabs';

/** Available tabs in the detail panel */
export type DetailTab = 'deploy' | 'debrief' | 'salvage';

/** Screen state (imported type for renderDetailPanel) */
export interface ReplaysState {
  replays: ReplaySummary[];
  selectedId: string | null;
  selectedReplay: FullReplayData | null;
  selectedTab: DetailTab;
  loading: boolean;
  error: string | null;
  confirmDeleteId: string | null;
}

// ============================================================================
// Utility Functions
// ============================================================================

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

/** Format date for detail panel (more verbose) */
function formatDateLong(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get outcome class and text */
function getOutcomeDisplay(outcome: string): { class: string; text: string } {
  switch (outcome) {
    case 'victory':
      return { class: 'replay-victory', text: 'Victory' };
    case 'timeout':
      return { class: 'replay-timeout', text: 'Timeout' };
    default:
      return { class: 'replay-defeat', text: 'Defeat' };
  }
}

// ============================================================================
// List Panel Rendering
// ============================================================================

/** Render ship silhouettes for list item */
function renderShipSilhouettes(
  playerShip: string,
  wingmenShips?: string[],
): string {
  const allShips = [playerShip, ...(wingmenShips ?? [])];
  const silhouettes = allShips
    .map((shipClass) => {
      const svg = getShipSvgInline(shipClass);
      return `<span class="replay-ship-icon">${svg}</span>`;
    })
    .join('');
  return `<div class="replay-list-ships">${silhouettes}</div>`;
}

/** Render a compact list item for the left panel */
function renderReplayListItem(
  replay: ReplaySummary,
  isSelected: boolean,
): string {
  const outcome = getOutcomeDisplay(replay.outcome);
  const selectedClass = isSelected ? 'selected' : '';
  const shipSilhouettes = renderShipSilhouettes(
    replay.shipType,
    replay.wingmenShips,
  );

  return `
    <div class="replay-list-item ${selectedClass}" data-replay-id="${escapeHtml(replay.id)}">
      <div class="replay-list-item-header">
        <span class="replay-list-item-name">${escapeHtml(replay.missionName)}</span>
        <span class="replay-list-item-outcome ${outcome.class}">${outcome.text}</span>
      </div>
      ${shipSilhouettes}
      <div class="replay-list-item-meta">
        <span>S${replay.sector}</span>
        <span>${formatDuration(replay.durationSeconds)}</span>
        <span>${formatDate(replay.recordedAt)}</span>
      </div>
    </div>
  `;
}

/** Render the left panel list */
export function renderReplayList(state: ReplaysState): string {
  if (state.loading) {
    return '<div class="replay-list-loading">Loading...</div>';
  }

  if (state.error) {
    return `<div class="replay-list-error">${escapeHtml(state.error)}</div>`;
  }

  if (state.replays.length === 0) {
    return `
      <div class="replay-list-empty">
        <p>No replays saved</p>
        <p class="replay-list-hint">Complete missions to save replays</p>
      </div>
    `;
  }

  return state.replays
    .map((r) => renderReplayListItem(r, r.id === state.selectedId))
    .join('');
}

// ============================================================================
// Detail Panel Rendering
// ============================================================================

/** Render the tabs navigation */
function renderTabs(selectedTab: DetailTab): string {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'deploy', label: 'Deploy' },
    { id: 'debrief', label: 'Debrief' },
    { id: 'salvage', label: 'Salvage' },
  ];

  return `
    <div class="replay-detail-tabs" role="tablist">
      ${tabs
        .map(
          (tab) => `
        <button class="btn ${tab.id === selectedTab ? 'btn-primary' : ''}" data-tab="${tab.id}" role="tab" aria-selected="${tab.id === selectedTab}">
          ${tab.label}
        </button>
      `,
        )
        .join('')}
    </div>
  `;
}

/** Render the tab content based on selected tab */
function renderTabContent(replay: FullReplayData, tab: DetailTab): string {
  switch (tab) {
    case 'deploy':
      return renderDeployTab(replay);
    case 'debrief':
      return renderDebriefTab(replay);
    case 'salvage':
      return renderSalvageTab(replay);
  }
}

/** Render the detail panel for selected replay */
export function renderDetailPanel(state: ReplaysState): string {
  // No selection
  if (!state.selectedId) {
    return `
      <div class="replay-detail-empty">
        <div class="replay-detail-empty-icon">▶</div>
        <p>Select a replay to view details</p>
      </div>
    `;
  }

  // Selected but loading replay data
  if (!state.selectedReplay) {
    return `
      <div class="replay-detail-empty">
        <p>Loading...</p>
      </div>
    `;
  }

  const replay = state.selectedReplay;
  const meta = replay.metadata;
  const outcome = getOutcomeDisplay(meta.outcome);
  const durationSecs = meta.durationTicks / 60;

  return `
    <div class="replay-detail-content">
      <div class="replay-detail-header">
        <div class="replay-detail-title-row">
          <h3 class="replay-detail-mission">${escapeHtml(meta.missionName)}</h3>
          <span class="replay-detail-outcome ${outcome.class}">${outcome.text}</span>
        </div>
        <div class="replay-detail-meta">
          S${meta.sector} &middot; ${formatDuration(durationSecs)} &middot; ${formatDateLong(meta.recordedAt)}
        </div>
      </div>

      ${renderTabs(state.selectedTab)}

      <div class="replay-detail-body">
        ${renderTabContent(replay, state.selectedTab)}
      </div>

      <div class="replay-detail-footer">
        <button class="btn btn-primary btn-watch-detail" data-replay-id="${escapeHtml(meta.id)}">
          Watch Replay
        </button>
        <div class="replay-detail-secondary-actions">
          <button class="btn btn-export-detail" data-replay-id="${escapeHtml(meta.id)}">
            Export
          </button>
          <button class="btn btn-danger btn-delete-detail" data-replay-id="${escapeHtml(meta.id)}">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Dialog Rendering
// ============================================================================

/** Render confirm delete dialog */
export function renderConfirmDelete(replayId: string): string {
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
