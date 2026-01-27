/**
 * Host Popover - Popover menu for host actions on guest players.
 *
 * Features:
 * - Kick button (UI only - wired in Phase 13)
 * - Permission toggles (enabled in Phase 8)
 */

import type { Permission } from '../../../multiplayer/protocol/types';
import { escapeHtml } from '../../utils';

/** Options for rendering the host popover */
export interface HostPopoverOptions {
  playerId: string;
  callsign: string;
  permissions: Permission;
}

/** Render the host popover content */
export function renderHostPopover(options: HostPopoverOptions): string {
  const { playerId, callsign, permissions } = options;

  // Convert shipEdit permission to boolean for checkbox
  // 'own' or 'any' = can edit, 'none' = cannot edit
  const canEditLoadouts = permissions.shipEdit !== 'none';

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
            <input type="checkbox"
                   data-permission="canBuy"
                   data-player="${escapeHtml(playerId)}"
                   ${permissions.canBuy ? 'checked' : ''} />
            Can buy items
          </label>
        </div>
        <div class="permission-row">
          <label class="permission-label">
            <input type="checkbox"
                   data-permission="canSell"
                   data-player="${escapeHtml(playerId)}"
                   ${permissions.canSell ? 'checked' : ''} />
            Can sell items
          </label>
        </div>
        <div class="permission-row">
          <label class="permission-label">
            <input type="checkbox"
                   data-permission="canConvertScrap"
                   data-player="${escapeHtml(playerId)}"
                   ${permissions.canConvertScrap ? 'checked' : ''} />
            Can convert scrap
          </label>
        </div>
        <div class="permission-row">
          <label class="permission-label">
            <input type="checkbox"
                   data-permission="shipEdit"
                   data-player="${escapeHtml(playerId)}"
                   ${canEditLoadouts ? 'checked' : ''} />
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
