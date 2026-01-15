/**
 * Replay List Render Functions
 *
 * HTML rendering helpers for the replay list screen.
 * Separated from replay-list.ts to keep files under 400 lines.
 */

import type {
  FullReplayData,
  ReplayPrimaryWeapon,
  ReplaySecondaryWeapon,
  ReplayShipLoadout,
  ReplaySummary,
} from '../../../replay/types';
import { escapeHtml } from '../../utils';
import { getShipSvgInline } from '../../utils/inline-svg';

/** Screen state (imported type for renderDetailPanel) */
export interface ReplaysState {
  replays: ReplaySummary[];
  selectedId: string | null;
  selectedReplay: FullReplayData | null;
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

/** Capitalize first letter */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

/** Render bank size indicator */
function renderBankIndicator(size: number, cssClass: string): string {
  const symbol = cssClass === 'secondary' ? '◆' : '●';
  return `<span class="bank-indicator ${cssClass}">${symbol.repeat(size)}</span>`;
}

/** Render primary weapons summary from replay loadout */
function renderPrimaryWeapons(weapons: ReplayPrimaryWeapon[]): string {
  if (weapons.length === 0) return '<span class="no-weapons">No primary</span>';
  return weapons
    .map((w) => {
      const indicator = renderBankIndicator(w.bankSize, 'primary');
      const name = capitalize(w.weaponId);
      if (w.ammo !== undefined && w.maxAmmo !== undefined) {
        return `${indicator} ${name} (${w.ammo}/${w.maxAmmo})`;
      }
      return `${indicator} ${name}`;
    })
    .join(', ');
}

/** Render secondary weapons summary from replay loadout */
function renderSecondaryWeapons(weapons: ReplaySecondaryWeapon[]): string {
  const armed = weapons.filter((w) => w.ammo > 0);
  if (armed.length === 0) return '<span class="no-weapons">No secondary</span>';
  return armed
    .map((w) => {
      const indicator = renderBankIndicator(w.bankSize, 'secondary');
      const name = capitalize(w.weaponId);
      return `${indicator} ${name} (${w.ammo}/${w.maxAmmo})`;
    })
    .join(', ');
}

/** Render a single ship card for the loadout section */
function renderLoadoutShip(
  loadout: ReplayShipLoadout,
  pilotName: string,
  isPlayer: boolean,
): string {
  const svg = getShipSvgInline(loadout.shipClass);
  const badge = isPlayer ? '<span class="replay-loadout-badge">You</span>' : '';
  const primary = renderPrimaryWeapons(loadout.primaryWeapons);
  const secondary = renderSecondaryWeapons(loadout.secondaryWeapons);

  return `
    <div class="replay-loadout-ship">
      <div class="replay-loadout-icon">${svg}</div>
      <div class="replay-loadout-info">
        <div class="replay-loadout-header">
          <span class="replay-loadout-pilot">${escapeHtml(pilotName)}</span>
          ${badge}
        </div>
        <span class="replay-loadout-class">${capitalize(loadout.shipClass)}</span>
        <div class="replay-loadout-weapons">
          <div class="replay-loadout-primary">${primary}</div>
          <div class="replay-loadout-secondary">${secondary}</div>
        </div>
      </div>
    </div>
  `;
}

/** Render the loadout section showing all deployed ships */
function renderLoadoutSection(replay: FullReplayData): string {
  const ships: string[] = [];

  // Player ship (always first)
  ships.push(renderLoadoutShip(replay.playerLoadout, 'Commander', true));

  // Wingmen
  for (const wingman of replay.wingmen) {
    const pilotName = wingman.pilotName ?? 'Wingman';
    ships.push(renderLoadoutShip(wingman.loadout, pilotName, false));
  }

  return `
    <div class="replay-detail-loadout">
      <div class="replay-loadout-label">DEPLOYED SHIPS</div>
      <div class="replay-loadout-list">
        ${ships.join('')}
      </div>
    </div>
  `;
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
        <h3 class="replay-detail-mission">${escapeHtml(meta.missionName)}</h3>
        <span class="replay-detail-outcome ${outcome.class}">${outcome.text}</span>
      </div>

      <div class="replay-detail-body">
        <div class="replay-detail-info">
          <div class="replay-detail-row">
            <span class="replay-detail-label">Sector</span>
            <span class="replay-detail-value">${meta.sector}</span>
          </div>
          <div class="replay-detail-row">
            <span class="replay-detail-label">Duration</span>
            <span class="replay-detail-value">${formatDuration(durationSecs)}</span>
          </div>
          <div class="replay-detail-row">
            <span class="replay-detail-label">Recorded</span>
            <span class="replay-detail-value">${formatDateLong(meta.recordedAt)}</span>
          </div>
        </div>

        <div class="replay-detail-stats">
          <div class="replay-detail-stat">
            <span class="replay-stat-value">${meta.stats.kills}</span>
            <span class="replay-stat-label">Kills</span>
          </div>
          <div class="replay-detail-stat">
            <span class="replay-stat-value">${Math.round(meta.stats.damageDealt)}</span>
            <span class="replay-stat-label">Damage Dealt</span>
          </div>
          <div class="replay-detail-stat">
            <span class="replay-stat-value">${Math.round(meta.stats.damageTaken)}</span>
            <span class="replay-stat-label">Damage Taken</span>
          </div>
        </div>

        ${renderLoadoutSection(replay)}
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
