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

/** Pause menu state (stateless - single view) */
interface PauseState {
  _unused?: never;
}

/** Pause menu props */
type PauseProps = ModalProps<PauseMenuResult>;

/** Pause menu screen component */
const PauseMenuScreen: Screen<PauseState, PauseProps> = {
  render(_state, _props) {
    return `
      <div class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <div class="pause-modal">
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

    // Quit button - go directly to title (progress auto-saved)
    api.on('#btn-pause-quit', 'click', () => {
      props.onComplete({ action: 'quit' });
    });

    // Keyboard: Escape to resume
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        props.onComplete({ action: 'resume' });
      }
    });
  },
};

/**
 * Show the pause menu and wait for user action.
 * @returns Promise resolving to the user's action
 */
export function showPauseMenu(): Promise<PauseMenuResult> {
  return showModal<PauseState, PauseProps, PauseMenuResult>(
    PauseMenuScreen,
    {},
    {},
  );
}
