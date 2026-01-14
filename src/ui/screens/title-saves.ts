/**
 * Title Screen - Save slot rendering and management views.
 */

import {
  getAllSaveMetadata,
  type SaveMetadata,
} from '../../campaign/save-system';
import { escapeHtml } from '../utils';
import { renderSlotHeader, renderSlotInfo } from './save-slot';

/** Render a save slot card */
export function renderSaveSlot(
  metadata: SaveMetadata | null,
  index: number,
): string {
  const slotNum = index + 1;

  if (!metadata) {
    return `
      <div class="save-slot empty" data-slot="${slotNum}">
        ${renderSlotHeader(slotNum, null)}
        <div class="slot-empty">Empty</div>
      </div>
    `;
  }

  return `
    <div class="save-slot occupied" data-slot="${slotNum}">
      ${renderSlotHeader(slotNum, metadata)}
      ${renderSlotInfo(metadata)}
      <div class="slot-actions">
        <button class="btn btn-small btn-load" data-slot="${slotNum}">Load</button>
        <button class="btn btn-small btn-danger btn-delete" data-slot="${slotNum}">Delete</button>
      </div>
    </div>
  `;
}

/** Render saves view (load game) */
export function renderSavesView(): string {
  const saves = getAllSaveMetadata();

  return `
    <div class="title-saves-view">
      <div class="panel-header">
        <h2>Load Game</h2>
      </div>
      <div class="saves-list">
        ${saves.map((save, i) => renderSaveSlot(save, i)).join('')}
      </div>
      <div class="saves-footer">
        <button class="btn btn-large" id="btn-back-to-title">Back</button>
      </div>
    </div>
  `;
}

/** Render delete confirmation view */
export function renderConfirmDeleteView(slot: number): string {
  return `
    <div class="title-confirm-view">
      <div class="title-confirm-content">
        <div class="title-confirm-title">Delete Save?</div>
        <div class="title-confirm-message">
          This will permanently delete the save in Slot ${slot}.
        </div>
        <div class="title-confirm-buttons">
          <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
          <button class="btn btn-large btn-danger" id="btn-confirm-delete" data-slot="${slot}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

/** Render error view */
export function renderErrorView(message: string): string {
  return `
    <div class="title-confirm-view">
      <div class="title-confirm-content">
        <div class="title-confirm-title title-error-title">Error</div>
        <div class="title-confirm-message">${escapeHtml(message)}</div>
        <div class="title-confirm-buttons">
          <button class="btn btn-large" id="btn-error-ok">OK</button>
        </div>
      </div>
    </div>
  `;
}
