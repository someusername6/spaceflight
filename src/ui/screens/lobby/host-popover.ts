/**
 * Host Popover - Popover menu for host actions on guest players.
 *
 * Features:
 * - Kick button (UI only - wired in Phase 13)
 * - Permission toggles (UI only - wired in Phase 8)
 *
 * Note: This is currently UI-only, functionality will be added later.
 */

import { escapeHtml } from '../../utils';

/** Render the host popover content */
export function renderHostPopover(playerId: string, callsign: string): string {
  return `
    <div class="host-popover" data-target-player="${escapeHtml(playerId)}">
      <div class="popover-header">
        <span class="popover-title">${escapeHtml(callsign)}</span>
      </div>
      <div class="popover-actions">
        <button class="btn btn-sm btn-danger" id="btn-kick" disabled title="Coming in Phase 13">
          Kick
        </button>
      </div>
      <div class="popover-permissions">
        <div class="permission-row">
          <label class="permission-label">
            <input type="checkbox" checked disabled title="Coming in Phase 8" />
            Can buy items
          </label>
        </div>
        <div class="permission-row">
          <label class="permission-label">
            <input type="checkbox" checked disabled title="Coming in Phase 8" />
            Can sell items
          </label>
        </div>
        <div class="permission-row">
          <label class="permission-label">
            <input type="checkbox" checked disabled title="Coming in Phase 8" />
            Can edit loadouts
          </label>
        </div>
      </div>
    </div>
  `;
}

/** Position popover near a player row */
export function positionPopover(
  popoverEl: HTMLElement,
  targetRow: HTMLElement,
): void {
  const rect = targetRow.getBoundingClientRect();
  const popoverWidth = 200;

  // Position to the right of the row
  let left = rect.right + 8;

  // If it would go off screen, position to the left instead
  if (left + popoverWidth > window.innerWidth) {
    left = rect.left - popoverWidth - 8;
  }

  popoverEl.style.position = 'fixed';
  popoverEl.style.left = `${left}px`;
  popoverEl.style.top = `${rect.top}px`;
}
