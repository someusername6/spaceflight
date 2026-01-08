/**
 * Pause Menu Modal - In-game menu for saving, settings, and quitting.
 *
 * Can be opened from:
 * - Pre-mission screen (Squadron, Store, Contracts)
 * - During mission (pauses game)
 * - Post-mission (Results, Debrief)
 */

import {
  formatSaveDate,
  getAllSaveMetadata,
  type SaveMetadata,
  saveGame,
} from '../../campaign/save-system';
import type { CampaignState } from '../../campaign/types';
import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';
import { escapeHtml } from '../utils';

/** Pause menu result */
export interface PauseMenuResult {
  action: 'resume' | 'settings' | 'save' | 'quit';
  saveSlot?: number;
}

/** Current view in the pause menu */
type PauseView =
  | 'main'
  | 'save'
  | 'confirm-quit'
  | 'confirm-overwrite'
  | 'error';

/** Pause menu state */
interface PauseState {
  view: PauseView;
  pendingOverwriteSlot: number | null;
  errorMessage: string | null;
}

/** Pause menu props */
interface PauseProps extends ModalProps<PauseMenuResult> {
  campaignState: CampaignState;
  canSave: boolean;
}

/** Render save slot for saving */
function renderSaveSlotForSave(
  metadata: SaveMetadata | null,
  index: number,
): string {
  const slotNum = index + 1;

  if (!metadata) {
    return `
      <div class="pause-save-slot empty" data-slot="${slotNum}">
        <div class="pause-save-header">
          <span class="pause-slot-number">Slot ${slotNum}</span>
        </div>
        <div class="pause-save-empty">Empty Slot</div>
        <button class="btn btn-small btn-success btn-save-to-slot" data-slot="${slotNum}">
          Save Here
        </button>
      </div>
    `;
  }

  return `
    <div class="pause-save-slot occupied" data-slot="${slotNum}">
      <div class="pause-save-header">
        <span class="pause-slot-number">Slot ${slotNum}</span>
        <span class="pause-save-date">${formatSaveDate(metadata.timestamp)}</span>
      </div>
      <div class="pause-save-info">
        <span>Sector ${metadata.currentSector}</span>
        <span>${metadata.missionCount} missions</span>
        <span>${metadata.credits.toLocaleString()} credits</span>
      </div>
      <button class="btn btn-small btn-warning btn-save-to-slot" data-slot="${slotNum}">
        Overwrite
      </button>
    </div>
  `;
}

/** Render save view */
function renderSaveView(): string {
  const saves = getAllSaveMetadata();

  return `
    <div class="pause-save-view">
      <div class="pause-save-title">Save Game</div>
      <div class="pause-save-list">
        ${saves.map((save, i) => renderSaveSlotForSave(save, i)).join('')}
      </div>
      <button class="btn btn-large" id="btn-pause-back">Back</button>
    </div>
  `;
}

/** Render quit confirmation view */
function renderConfirmQuitView(): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title">Quit to Title?</div>
      <div class="pause-confirm-message">Unsaved progress will be lost.</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
        <button class="btn btn-large btn-danger" id="btn-confirm-quit">Quit</button>
      </div>
    </div>
  `;
}

/** Render overwrite confirmation view */
function renderConfirmOverwriteView(slot: number): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title">Overwrite Save?</div>
      <div class="pause-confirm-message">This will replace the save in Slot ${slot}.</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
        <button class="btn btn-large btn-warning" id="btn-confirm-overwrite" data-slot="${slot}">Overwrite</button>
      </div>
    </div>
  `;
}

/** Render error view */
function renderErrorView(message: string): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title pause-error-title">Error</div>
      <div class="pause-confirm-message">${escapeHtml(message)}</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-error-ok">OK</button>
      </div>
    </div>
  `;
}

/** Render main menu view */
function renderMainView(canSave: boolean): string {
  return `
    <div class="pause-main-view">
      <div class="pause-title">Paused</div>
      <div class="pause-menu-buttons">
        <button class="btn btn-large btn-primary" id="btn-pause-resume">
          Resume
        </button>
        <button
          class="btn btn-large"
          id="btn-pause-save"
          ${canSave ? '' : 'disabled'}
          ${canSave ? '' : 'title="Cannot save during mission"'}
        >
          Save Game
        </button>
        <button class="btn btn-large" id="btn-pause-settings">
          Settings
        </button>
        <button class="btn btn-large btn-danger" id="btn-pause-quit">
          Quit to Title
        </button>
      </div>
    </div>
  `;
}

/** Pause menu screen component */
const PauseMenuScreen: Screen<PauseState, PauseProps> = {
  render(state, props) {
    let content: string;

    switch (state.view) {
      case 'main':
        content = renderMainView(props.canSave);
        break;
      case 'save':
        content = renderSaveView();
        break;
      case 'confirm-quit':
        content = renderConfirmQuitView();
        break;
      case 'confirm-overwrite':
        content = renderConfirmOverwriteView(state.pendingOverwriteSlot ?? 1);
        break;
      case 'error':
        content = renderErrorView(state.errorMessage ?? 'An error occurred.');
        break;
    }

    return `
      <div class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <div class="pause-modal">
          ${content}
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<PauseState>, props: PauseProps) {
    // Resume button
    api.on('#btn-pause-resume', 'click', () => {
      props.onComplete({ action: 'resume' });
    });

    // Save button
    api.on('#btn-pause-save', 'click', () => {
      api.setState({ view: 'save' });
    });

    // Settings button
    api.on('#btn-pause-settings', 'click', () => {
      props.onComplete({ action: 'settings' });
    });

    // Quit button - show confirmation
    api.on('#btn-pause-quit', 'click', () => {
      api.setState({ view: 'confirm-quit' });
    });

    // Back button (from save view)
    api.on('#btn-pause-back', 'click', () => {
      api.setState({ view: 'main' });
    });

    // Save to slot buttons
    api.on('.btn-save-to-slot', 'click', (_e, el) => {
      const slot = parseInt(el.dataset.slot ?? '0', 10);
      if (slot > 0) {
        const existing = getAllSaveMetadata()[slot - 1];
        if (existing) {
          // Show overwrite confirmation
          api.setState({
            pendingOverwriteSlot: slot,
            view: 'confirm-overwrite',
          });
        } else {
          // Empty slot, save directly
          if (saveGame(slot, props.campaignState)) {
            props.onComplete({ action: 'save', saveSlot: slot });
          } else {
            api.setState({
              errorMessage: `Failed to save game to Slot ${slot}. Storage may be full.`,
              view: 'error',
            });
          }
        }
      }
    });

    // Error OK button
    api.on('#btn-error-ok', 'click', () => {
      api.setState({ errorMessage: null, view: 'save' });
    });

    // Confirm cancel button
    api.on('#btn-confirm-cancel', 'click', () => {
      const state = api.getState();
      if (state.view === 'confirm-quit') {
        api.setState({ view: 'main' });
      } else {
        api.setState({ pendingOverwriteSlot: null, view: 'save' });
      }
    });

    // Confirm quit button
    api.on('#btn-confirm-quit', 'click', () => {
      props.onComplete({ action: 'quit' });
    });

    // Confirm overwrite button
    api.on('#btn-confirm-overwrite', 'click', () => {
      const state = api.getState();
      if (state.pendingOverwriteSlot) {
        if (saveGame(state.pendingOverwriteSlot, props.campaignState)) {
          props.onComplete({
            action: 'save',
            saveSlot: state.pendingOverwriteSlot,
          });
        } else {
          api.setState({
            errorMessage: `Failed to save game to Slot ${state.pendingOverwriteSlot}. Storage may be full.`,
            pendingOverwriteSlot: null,
            view: 'error',
          });
        }
      }
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        const state = api.getState();

        if (state.view === 'save') {
          api.setState({ view: 'main' });
        } else if (state.view === 'error') {
          api.setState({ errorMessage: null, view: 'save' });
        } else if (state.view === 'confirm-quit') {
          api.setState({ view: 'main' });
        } else if (state.view === 'confirm-overwrite') {
          api.setState({ pendingOverwriteSlot: null, view: 'save' });
        } else {
          props.onComplete({ action: 'resume' });
        }
      }
    });
  },
};

/**
 * Show the pause menu and wait for user action.
 * @param state - Current campaign state (for saving)
 * @param canSave - Whether saving is allowed (false during missions)
 * @returns Promise resolving to the user's action
 */
export function showPauseMenu(
  state: CampaignState,
  canSave: boolean,
): Promise<PauseMenuResult> {
  const initialState: PauseState = {
    view: 'main',
    pendingOverwriteSlot: null,
    errorMessage: null,
  };

  return showModal<PauseState, PauseProps, PauseMenuResult>(
    PauseMenuScreen,
    initialState,
    {
      campaignState: state,
      canSave,
    },
  );
}
