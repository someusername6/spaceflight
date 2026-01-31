/**
 * Quit Confirm Modal - Confirmation dialog for guest leaving mission.
 *
 * Shown when a guest player clicks quit during a multiplayer mission pause.
 * Warns that their ship will be controlled by AI.
 */

import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';

// =============================================================================
// Types
// =============================================================================

/** Result from quit confirmation */
export interface QuitConfirmResult {
  confirmed: boolean;
}

/** Props for the modal */
type QuitConfirmProps = ModalProps<QuitConfirmResult>;

/** Modal state (stateless) */
interface QuitConfirmState {
  _unused?: never;
}

// =============================================================================
// Screen Component
// =============================================================================

const QuitConfirmScreen: Screen<QuitConfirmState, QuitConfirmProps> = {
  render() {
    return `
      <div class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="quit-confirm-title">
        <div class="pause-modal" style="max-width: 400px;">
          <div class="pause-title" id="quit-confirm-title">Leave Mission?</div>
          <div style="padding: var(--space-4); text-align: center;">
            <p style="margin: 0 0 var(--space-4) 0; color: var(--text-secondary);">
              Your ship will be controlled by AI for the rest of the mission.
            </p>
            <p style="margin: 0; color: var(--text-dim); font-size: var(--text-sm);">
              This cannot be undone.
            </p>
          </div>
          <div class="pause-menu-buttons" style="justify-content: center; gap: var(--space-3);">
            <button class="btn btn-large" id="btn-cancel">
              Cancel
            </button>
            <button class="btn btn-large btn-danger" id="btn-confirm-quit">
              Leave Mission
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<QuitConfirmState>, props: QuitConfirmProps) {
    // Cancel button
    api.on('#btn-cancel', 'click', () => {
      props.onComplete({ confirmed: false });
    });

    // Confirm quit button
    api.on('#btn-confirm-quit', 'click', () => {
      props.onComplete({ confirmed: true });
    });

    // Escape to cancel
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        props.onComplete({ confirmed: false });
      }
    });
  },
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Show the quit confirmation modal.
 *
 * @returns Promise resolving to { confirmed: true } if user confirms quit
 */
export function showQuitConfirmModal(): Promise<QuitConfirmResult> {
  return showModal<QuitConfirmState, QuitConfirmProps, QuitConfirmResult>(
    QuitConfirmScreen,
    {},
    {},
  );
}
