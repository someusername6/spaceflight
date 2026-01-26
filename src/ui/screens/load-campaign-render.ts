/**
 * Load Campaign Render Functions - HTML templates for load campaign screen.
 */

import type { CampaignMetadata, SlotId } from '../../campaign/storage';
import { escapeHtml } from '../utils';
import { getShipSvgInline } from '../utils/inline-svg';

/** Render ship silhouettes for a slot */
function renderShipSilhouettes(shipClasses: string[] | undefined): string {
  if (!shipClasses || shipClasses.length === 0) return '';

  // Show up to 6 ship silhouettes
  const shipsToShow = shipClasses.slice(0, 6);
  const remaining = shipClasses.length - shipsToShow.length;

  const silhouettes = shipsToShow
    .map((shipClass) => {
      const svg = getShipSvgInline(shipClass);
      return `<span class="slot-ship-icon">${svg}</span>`;
    })
    .join('');

  const overflow =
    remaining > 0
      ? `<span class="slot-ship-overflow">+${remaining}</span>`
      : '';

  return `<div class="slot-ships">${silhouettes}${overflow}</div>`;
}

/** Render an empty slot (compact horizontal card) */
function renderEmptySlot(slotId: SlotId): string {
  return `
    <button class="save-slot empty" data-slot="${slotId}" data-action="create">
      <div class="slot-number">Slot ${slotId}</div>
      <div class="slot-empty-content">
        <span class="slot-empty-icon">+</span>
        <span class="slot-empty-text">New Campaign</span>
      </div>
    </button>
  `;
}

/** Render an occupied slot (compact horizontal card) */
function renderOccupiedSlot(metadata: CampaignMetadata): string {
  const slotId = metadata.slotId ?? 1;
  const ironmanBadge = metadata.ironmanMode
    ? '<span class="slot-badge ironman">IRONMAN</span>'
    : '';

  const commanderName = metadata.commanderName ?? 'Commander';
  const sector = metadata.sector ?? 1;
  const missions = metadata.missionCount ?? 0;
  const credits = (metadata.credits ?? 0).toLocaleString();
  const shipSilhouettes = renderShipSilhouettes(metadata.shipClasses);

  return `
    <div class="save-slot occupied" data-slot="${slotId}">
      <div class="slot-number">Slot ${slotId}</div>
      <div class="slot-commander">
        <span class="slot-commander-name">${escapeHtml(commanderName)}</span>
        ${ironmanBadge}
      </div>
      ${shipSilhouettes}
      <div class="slot-stats">
        <span class="slot-progress">Sector ${sector} <span class="slot-separator">•</span> ${missions} missions</span>
        <span class="slot-credits">◈ ${credits}</span>
      </div>
      <div class="slot-actions">
        <button class="btn btn-sm btn-danger-subdued" data-slot="${slotId}" data-action="delete">
          Delete
        </button>
        <button class="btn btn-sm btn-primary" data-slot="${slotId}" data-action="load">
          Load
        </button>
      </div>
    </div>
  `;
}

/** Render slots view */
export function renderSlotsView(slots: CampaignMetadata[]): string {
  const slotsHtml = slots
    .map((slot) =>
      slot.exists
        ? renderOccupiedSlot(slot)
        : renderEmptySlot((slot.slotId ?? 1) as SlotId),
    )
    .join('');

  return `
    <div class="load-campaign-content">
      <div class="load-campaign-header">
        <h2>Load Campaign</h2>
      </div>
      <div class="saves-list">
        ${slotsHtml}
      </div>
      <div class="load-campaign-footer">
        <button class="btn" id="btn-back">Back</button>
      </div>
    </div>
  `;
}

/** Render loading view */
export function renderLoadingView(): string {
  return `
    <div class="load-campaign-content">
      <div class="load-campaign-loading">
        <span>Loading...</span>
      </div>
    </div>
  `;
}

/** Render confirm delete view */
export function renderConfirmDeleteView(slotId: SlotId): string {
  return `
    <div class="load-campaign-content">
      <div class="load-campaign-confirm">
        <h3>Delete Campaign?</h3>
        <p>This will permanently delete the campaign in Slot ${slotId}.</p>
        <p class="confirm-warning">This action cannot be undone.</p>
        <div class="confirm-buttons">
          <button class="btn" id="btn-cancel-delete">Cancel</button>
          <button class="btn btn-danger" id="btn-confirm-delete">Delete</button>
        </div>
      </div>
    </div>
  `;
}

/** Render error view */
export function renderErrorView(message: string): string {
  return `
    <div class="load-campaign-content">
      <div class="load-campaign-error">
        <h3>Error</h3>
        <p>${escapeHtml(message)}</p>
        <button class="btn" id="btn-error-ok">OK</button>
      </div>
    </div>
  `;
}
