/**
 * Shared Save Slot Rendering
 *
 * Common slot info display used by both pause menu (save) and title screen (load).
 * Ensures consistent appearance across save/load interfaces.
 */

import { formatSaveDate, type SaveMetadata } from '../../campaign/save-system';

/**
 * Render the slot info content (stats grid).
 * Used by both pause menu and title screen for consistent display.
 */
export function renderSlotInfo(metadata: SaveMetadata): string {
  return `
    <div class="slot-info-grid">
      <div class="slot-stat">
        <span class="slot-stat-label">Sector</span>
        <span class="slot-stat-value">${metadata.currentSector}</span>
      </div>
      <div class="slot-stat">
        <span class="slot-stat-label">Missions</span>
        <span class="slot-stat-value">${metadata.missionCount}</span>
      </div>
      <div class="slot-stat">
        <span class="slot-stat-label">Credits</span>
        <span class="slot-stat-value">${metadata.credits.toLocaleString()}</span>
      </div>
      <div class="slot-stat">
        <span class="slot-stat-label">Ships</span>
        <span class="slot-stat-value">${metadata.shipCount}</span>
      </div>
    </div>
  `;
}

/**
 * Render a slot header with number and date.
 */
export function renderSlotHeader(
  slotNum: number,
  metadata: SaveMetadata | null,
): string {
  return `
    <div class="slot-header">
      <span class="slot-number">Slot ${slotNum}</span>
      ${metadata ? `<span class="slot-date">${formatSaveDate(metadata.timestamp)}</span>` : ''}
    </div>
  `;
}
