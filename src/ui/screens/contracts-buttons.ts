/**
 * Contracts Button Rendering - Button helpers for contracts screen.
 */

import { MAX_SECTOR } from '../../campaign/types';

// =============================================================================
// Button Rendering Helpers
// =============================================================================

/** Render refresh contracts button */
export function renderRefreshButton(
  refreshCost: number,
  canAfford: boolean,
  isNotHost: boolean,
): string {
  const disabled = !canAfford || isNotHost;
  const title = isNotHost
    ? 'Only the host can refresh contracts'
    : canAfford
      ? 'Get different contracts'
      : 'Not enough credits';
  return `
    <button
      class="btn btn-secondary contracts-refresh-btn ${disabled ? 'disabled' : ''}"
      id="btn-refresh-contracts"
      ${disabled ? 'disabled' : ''}
      title="${title}"
    >
      Refresh (${refreshCost} cr)
    </button>
  `;
}

/** Render advance sector button (empty string if at max sector) */
export function renderAdvanceButton(
  currentSector: number,
  advanceCost: number,
  canAfford: boolean,
  isNotHost: boolean,
): string {
  if (currentSector >= MAX_SECTOR) return '';
  const disabled = !canAfford || isNotHost;
  const title = isNotHost
    ? 'Only the host can advance to the next sector'
    : canAfford
      ? `Advance to sector ${currentSector + 1}`
      : 'Not enough credits';
  return `<button
    class="btn btn-secondary contracts-advance-btn ${disabled ? 'disabled' : ''}"
    id="btn-advance-sector"
    ${disabled ? 'disabled' : ''}
    title="${title}"
  >
    Advance&nbsp;to&nbsp;Sector&nbsp;${currentSector + 1} (${advanceCost.toLocaleString()}&nbsp;cr)&nbsp;→
  </button>`;
}

/** Render retire button (empty string if not at max sector) */
export function renderRetireButton(
  currentSector: number,
  isNotHost: boolean,
): string {
  if (currentSector < MAX_SECTOR) return '';
  const title = isNotHost
    ? 'Only the host can retire the squadron'
    : 'End your campaign and retire';
  return `<button
    class="btn btn-primary contracts-retire-btn ${isNotHost ? 'disabled' : ''}"
    id="btn-retire"
    ${isNotHost ? 'disabled' : ''}
    title="${title}"
  >
    Retire Squadron
  </button>`;
}
