/**
 * Campaign Creation Screen - Configure new campaign settings.
 *
 * Displays:
 * - Commander name input
 * - Ironman mode toggle with warning
 * - Autoaim setting selector
 * - Clear descriptions of each mode's consequences
 */

import type { SlotId } from '../../campaign/storage';
import type { CampaignSettings } from '../../campaign/types';
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../campaign/types';
import {
  getPlayerAutoaim,
  PLAYER_AUTOAIM_OPTIONS,
  type PlayerAutoaim,
} from '../../settings/game-settings';
import {
  createScreen,
  type ModalProps,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import { escapeHtml } from '../utils';
import { getAutoaimLabel, positionAutoaimPopover } from './settings/gameplay';

/** Campaign creation screen state */
interface CampaignCreateState {
  commanderName: string;
  ironmanMode: boolean;
  autoaimDegrees: PlayerAutoaim;
  showAutoaimPopover: boolean;
  slotId: SlotId | null;
}

/** Campaign creation result */
export type CampaignCreateResult =
  | { action: 'create'; settings: CampaignSettings; slotId: SlotId | null }
  | { action: 'cancel' };

/** Props for campaign creation screen */
type CampaignCreateProps = ModalProps<CampaignCreateResult>;

/** Render the autoaim selector popover */
function renderAutoaimPopover(currentAutoaim: PlayerAutoaim): string {
  const items = PLAYER_AUTOAIM_OPTIONS.map(
    (opt) => `
      <button class="settings-picker-item ${opt.value === currentAutoaim ? 'selected' : ''}"
              data-autoaim="${opt.value}">
        ${opt.label}
      </button>
    `,
  ).join('');

  return `
    <div class="settings-picker" id="autoaim-popover">
      <div class="settings-picker-content">
        ${items}
      </div>
    </div>
  `;
}

/** Campaign creation screen component */
const CampaignCreateScreen: Screen<CampaignCreateState, CampaignCreateProps> = {
  render(state) {
    const ironmanWarning = state.ironmanMode
      ? `<p class="campaign-warning">
           Campaign ends permanently if your ship is destroyed.
           Aim assist setting is locked for the campaign duration.
         </p>`
      : `<p class="campaign-info">
           Mission failure returns you to the hangar.
           Aim assist can be changed anytime in settings.
         </p>`;

    const slotLabel = state.slotId ? ` (Slot ${state.slotId})` : '';

    return `
      <div class="modal-backdrop">
        <div class="campaign-create-modal">
          <h2>New Campaign${slotLabel}</h2>

          <div class="campaign-form">
            <div class="form-group">
              <label for="commander-name">Commander Name</label>
              <input type="text"
                     id="commander-name"
                     class="form-input"
                     value="${escapeHtml(state.commanderName)}"
                     maxlength="20"
                     placeholder="Commander">
            </div>

            <div class="form-group">
              <div class="form-row">
                <label>Game Mode</label>
                <div class="toggle-group">
                  <button class="toggle-btn ${!state.ironmanMode ? 'active' : ''}"
                          id="btn-standard">
                    Standard
                  </button>
                  <button class="toggle-btn ${state.ironmanMode ? 'active' : ''}"
                          id="btn-ironman">
                    Ironman
                  </button>
                </div>
              </div>
              ${ironmanWarning}
            </div>

            <div class="form-group">
              <div class="form-row">
                <label>Aim Assist</label>
                <div class="settings-picker-trigger-container">
                  <button class="settings-picker-trigger" id="autoaim-trigger">
                    ${getAutoaimLabel(state.autoaimDegrees)}
                  </button>
                  ${state.showAutoaimPopover ? renderAutoaimPopover(state.autoaimDegrees) : ''}
                </div>
              </div>
              <p class="form-hint">
                Aim assist adds a margin of error to weapon targeting.
                Higher values make aiming easier.
              </p>
            </div>
          </div>

          <div class="modal-buttons">
            <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-start">Start Campaign</button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<CampaignCreateState>, props: CampaignCreateProps) {
    // Commander name input
    api.on('#commander-name', 'input', (e) => {
      const input = e.target as HTMLInputElement;
      api.updateState({ commanderName: input.value });
    });

    // Game mode toggles
    api.on('#btn-ironman', 'click', () => {
      api.setState({ ironmanMode: true });
    });

    api.on('#btn-standard', 'click', () => {
      api.setState({ ironmanMode: false });
    });

    // Autoaim popover trigger
    api.on('#autoaim-trigger', 'click', () => {
      const state = api.getState();
      api.setState({ showAutoaimPopover: !state.showAutoaimPopover });
    });

    // Autoaim selection
    api.on('[data-autoaim]', 'click', (_, element) => {
      const value = parseFloat(element.dataset.autoaim ?? '0') as PlayerAutoaim;
      api.setState({ autoaimDegrees: value, showAutoaimPopover: false });
    });

    // Close popover when clicking outside
    api.onGlobal('click', (e) => {
      const target = e.target as HTMLElement;
      const state = api.getState();
      if (
        state.showAutoaimPopover &&
        !target.closest('#autoaim-trigger') &&
        !target.closest('#autoaim-popover')
      ) {
        api.setState({ showAutoaimPopover: false });
      }
    });

    // Cancel button
    api.on('#btn-cancel', 'click', () => {
      props.onComplete({ action: 'cancel' });
    });

    // Start button
    api.on('#btn-start', 'click', () => {
      const state = api.getState();
      const commanderName = state.commanderName.trim() || 'Commander';

      props.onComplete({
        action: 'create',
        settings: {
          commanderName,
          ironmanMode: state.ironmanMode,
          autoaimDegrees: state.autoaimDegrees,
        },
        slotId: state.slotId,
      });
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;
      const state = api.getState();

      if (key === 'Escape') {
        e.preventDefault();
        if (state.showAutoaimPopover) {
          api.setState({ showAutoaimPopover: false });
        } else {
          props.onComplete({ action: 'cancel' });
        }
      } else if (key === 'Enter') {
        // Don't submit if popover is open or focus is on a toggle button
        const activeElement = document.activeElement;
        const isToggleButton =
          activeElement?.id === 'btn-ironman' ||
          activeElement?.id === 'btn-standard';

        if (!state.showAutoaimPopover && !isToggleButton) {
          e.preventDefault();
          const commanderName = state.commanderName.trim() || 'Commander';

          props.onComplete({
            action: 'create',
            settings: {
              commanderName,
              ironmanMode: state.ironmanMode,
              autoaimDegrees: state.autoaimDegrees,
            },
            slotId: state.slotId,
          });
        }
      }
    });

    // Position autoaim popover
    if (api.getState().showAutoaimPopover) {
      positionAutoaimPopover();
    }

    // Auto-focus commander name input on first render
    const nameInput = document.getElementById('commander-name');
    if (nameInput && document.activeElement !== nameInput) {
      (nameInput as HTMLInputElement).focus();
      (nameInput as HTMLInputElement).select();
    }
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<
  CampaignCreateState,
  CampaignCreateProps
> | null = null;

/** Options for the campaign creation modal */
export interface CampaignCreateOptions {
  /** The slot this campaign will be saved to (for display) */
  slotId?: SlotId;
}

/**
 * Show the campaign creation modal.
 * Returns the user's choices or null if cancelled.
 *
 * @param options - Optional configuration for the modal
 */
export function showCampaignCreateModal(
  options?: CampaignCreateOptions,
): Promise<CampaignCreateResult> {
  return new Promise((resolve) => {
    // Create modal container
    const container = document.createElement('div');
    container.className = 'modal-container';
    document.body.appendChild(container);

    const onComplete = (result: CampaignCreateResult) => {
      screenHandle?.destroy();
      screenHandle = null;
      container.remove();
      resolve(result);
    };

    // Initial state: always default to Standard mode
    const initialState: CampaignCreateState = {
      commanderName: DEFAULT_CAMPAIGN_SETTINGS.commanderName,
      ironmanMode: false,
      autoaimDegrees: getPlayerAutoaim(),
      showAutoaimPopover: false,
      slotId: options?.slotId ?? null,
    };

    screenHandle = createScreen(CampaignCreateScreen, container, initialState, {
      onComplete,
    });
  });
}
