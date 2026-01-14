/**
 * Pause Menu Modal - In-game menu for settings and quitting.
 *
 * Can be opened from:
 * - Pre-mission screen (Squadron, Store, Contracts)
 * - During mission (pauses game)
 * - Post-mission (Results, Debrief)
 *
 * Note: Saving is automatic - no manual save option needed.
 */

import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';

/** Pause menu result */
export interface PauseMenuResult {
  action: 'resume' | 'settings' | 'quit';
}

/** Current view in the pause menu */
type PauseView = 'main' | 'confirm-quit';

/** Pause menu state */
interface PauseState {
  view: PauseView;
}

/** Pause menu props */
type PauseProps = ModalProps<PauseMenuResult>;

/** Render quit confirmation view */
function renderConfirmQuitView(): string {
  return `
    <div class="pause-confirm-view">
      <div class="pause-confirm-title">Quit to Title?</div>
      <div class="pause-confirm-message">Your progress is automatically saved.</div>
      <div class="pause-confirm-buttons">
        <button class="btn btn-large" id="btn-confirm-cancel">Cancel</button>
        <button class="btn btn-large btn-danger" id="btn-confirm-quit">Quit</button>
      </div>
    </div>
  `;
}

/** Render main menu view */
function renderMainView(): string {
  return `
    <div class="pause-main-view">
      <div class="pause-title">Paused</div>
      <div class="pause-menu-buttons">
        <button class="btn btn-large btn-primary" id="btn-pause-resume">
          Resume
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
  render(state, _props) {
    let content: string;

    switch (state.view) {
      case 'main':
        content = renderMainView();
        break;
      case 'confirm-quit':
        content = renderConfirmQuitView();
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

    // Settings button
    api.on('#btn-pause-settings', 'click', () => {
      props.onComplete({ action: 'settings' });
    });

    // Quit button - show confirmation
    api.on('#btn-pause-quit', 'click', () => {
      api.setState({ view: 'confirm-quit' });
    });

    // Confirm cancel button
    api.on('#btn-confirm-cancel', 'click', () => {
      api.setState({ view: 'main' });
    });

    // Confirm quit button
    api.on('#btn-confirm-quit', 'click', () => {
      props.onComplete({ action: 'quit' });
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        const state = api.getState();

        if (state.view === 'confirm-quit') {
          api.setState({ view: 'main' });
        } else {
          props.onComplete({ action: 'resume' });
        }
      }
    });
  },
};

/**
 * Show the pause menu and wait for user action.
 * @returns Promise resolving to the user's action
 */
export function showPauseMenu(): Promise<PauseMenuResult> {
  const initialState: PauseState = {
    view: 'main',
  };

  return showModal<PauseState, PauseProps, PauseMenuResult>(
    PauseMenuScreen,
    initialState,
    {},
  );
}
