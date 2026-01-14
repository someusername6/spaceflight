/**
 * Load Campaign Screen - Save slot selection for campaign management.
 *
 * Displays:
 * - 3 save slots with campaign metadata
 * - Empty slots show "New Campaign" option
 * - Occupied slots show campaign info and load/delete options
 */

import {
  type CampaignMetadata,
  deleteCampaign,
  getAllSlotsMetadata,
  loadCampaign,
  type SlotId,
  setActiveSlotId,
} from '../../campaign/storage';
import type { CampaignState } from '../../campaign/types';
import { logError } from '../../core/logger';
import {
  createScreen,
  type ModalProps,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import { escapeHtml } from '../utils';
import { getShipSvgInline } from '../utils/inline-svg';

/** Load campaign screen state */
interface LoadCampaignState {
  view: 'slots' | 'loading' | 'confirm-delete' | 'error';
  slots: CampaignMetadata[];
  selectedSlot: SlotId | null;
  errorMessage: string | null;
}

/** Load campaign screen result */
export type LoadCampaignResult =
  | { action: 'load'; state: CampaignState; slotId: SlotId }
  | { action: 'create'; slotId: SlotId }
  | { action: 'cancel' };

/** Props for load campaign screen */
type LoadCampaignProps = ModalProps<LoadCampaignResult>;

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
        <button class="btn btn-sm btn-danger" data-slot="${slotId}" data-action="delete">
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
function renderSlotsView(slots: CampaignMetadata[]): string {
  const slotsHtml = slots
    .map((slot) =>
      slot.exists
        ? renderOccupiedSlot(slot)
        : renderEmptySlot((slot.slotId ?? 1) as SlotId),
    )
    .join('');

  return `
    <div class="load-campaign-modal">
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
function renderLoadingView(): string {
  return `
    <div class="load-campaign-modal">
      <div class="load-campaign-loading">
        <span>Loading...</span>
      </div>
    </div>
  `;
}

/** Render confirm delete view */
function renderConfirmDeleteView(slotId: SlotId): string {
  return `
    <div class="load-campaign-modal">
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
function renderErrorView(message: string): string {
  return `
    <div class="load-campaign-modal">
      <div class="load-campaign-error">
        <h3>Error</h3>
        <p>${escapeHtml(message)}</p>
        <button class="btn" id="btn-error-ok">OK</button>
      </div>
    </div>
  `;
}

/** Load campaign screen component */
const LoadCampaignScreen: Screen<LoadCampaignState, LoadCampaignProps> = {
  render(state) {
    let content: string;

    switch (state.view) {
      case 'slots':
        content = renderSlotsView(state.slots);
        break;
      case 'loading':
        content = renderLoadingView();
        break;
      case 'confirm-delete':
        content = renderConfirmDeleteView(state.selectedSlot ?? 1);
        break;
      case 'error':
        content = renderErrorView(state.errorMessage ?? 'An error occurred.');
        break;
    }

    return `
      <div class="modal-backdrop">
        ${content}
      </div>
    `;
  },

  bind(api: ScreenAPI<LoadCampaignState>, props: LoadCampaignProps) {
    // Empty slot click → create new campaign
    api.on('[data-action="create"]', 'click', (_, element) => {
      const slotId = parseInt(element.dataset.slot ?? '1', 10) as SlotId;
      props.onComplete({ action: 'create', slotId });
    });

    // Load button click
    api.on('[data-action="load"]', 'click', async (_, element) => {
      const slotId = parseInt(element.dataset.slot ?? '1', 10) as SlotId;
      api.setState({ view: 'loading' });

      try {
        const state = await loadCampaign(slotId);
        if (state) {
          setActiveSlotId(slotId);
          props.onComplete({ action: 'load', state, slotId });
        } else {
          api.setState({
            view: 'error',
            errorMessage:
              'Failed to load campaign. The save data may be corrupted.',
          });
        }
      } catch (error) {
        logError('Failed to load campaign:', error);
        api.setState({
          view: 'error',
          errorMessage: `Failed to load campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });

    // Delete button click → show confirmation
    api.on('[data-action="delete"]', 'click', (_, element) => {
      const slotId = parseInt(element.dataset.slot ?? '1', 10) as SlotId;
      api.setState({ view: 'confirm-delete', selectedSlot: slotId });
    });

    // Cancel delete
    api.on('#btn-cancel-delete', 'click', () => {
      api.setState({ view: 'slots', selectedSlot: null });
    });

    // Confirm delete
    api.on('#btn-confirm-delete', 'click', async () => {
      const state = api.getState();
      const slotId = state.selectedSlot;
      if (!slotId) return;

      api.setState({ view: 'loading' });

      try {
        await deleteCampaign(slotId);
        // Refresh slots
        const slots = await getAllSlotsMetadata();
        api.setState({ view: 'slots', slots, selectedSlot: null });
      } catch (error) {
        logError('Failed to delete campaign:', error);
        api.setState({
          view: 'error',
          errorMessage: `Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });

    // Back button
    api.on('#btn-back', 'click', () => {
      props.onComplete({ action: 'cancel' });
    });

    // Error OK button
    api.on('#btn-error-ok', 'click', async () => {
      // Refresh slots and return to slots view
      try {
        const slots = await getAllSlotsMetadata();
        api.setState({ view: 'slots', slots, errorMessage: null });
      } catch {
        api.setState({ view: 'slots', errorMessage: null });
      }
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;
      const state = api.getState();

      if (key === 'Escape') {
        e.preventDefault();
        if (state.view === 'confirm-delete') {
          api.setState({ view: 'slots', selectedSlot: null });
        } else if (state.view === 'error') {
          api.setState({ view: 'slots', errorMessage: null });
        } else if (state.view === 'slots') {
          props.onComplete({ action: 'cancel' });
        }
      }
    });
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<LoadCampaignState, LoadCampaignProps> | null =
  null;

/**
 * Show the load campaign modal.
 * Returns the user's choice.
 */
export async function showLoadCampaignModal(): Promise<LoadCampaignResult> {
  // Load slot metadata before creating the promise
  let slots: CampaignMetadata[];
  try {
    slots = await getAllSlotsMetadata();
  } catch {
    slots = [
      { exists: false, slotId: 1 },
      { exists: false, slotId: 2 },
      { exists: false, slotId: 3 },
    ];
  }

  return new Promise((resolve) => {
    // Create modal container
    const container = document.createElement('div');
    container.className = 'modal-container';
    document.body.appendChild(container);

    const onComplete = (result: LoadCampaignResult) => {
      screenHandle?.destroy();
      screenHandle = null;
      container.remove();
      resolve(result);
    };

    const initialState: LoadCampaignState = {
      view: 'slots',
      slots,
      selectedSlot: null,
      errorMessage: null,
    };

    screenHandle = createScreen(LoadCampaignScreen, container, initialState, {
      onComplete,
    });
  });
}
