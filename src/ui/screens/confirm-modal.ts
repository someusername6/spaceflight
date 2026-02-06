/**
 * Confirm Modal - Reusable confirmation dialog for user decisions.
 */

import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';
import { escapeHtml } from '../utils';

/** Confirm modal state (empty - all data comes from props) */
type ConfirmState = Record<string, never>;

/** Confirm modal props */
interface ConfirmProps extends ModalProps<boolean> {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

/** Confirm modal screen component */
const ConfirmModalScreen: Screen<ConfirmState, ConfirmProps> = {
  render(_state, props) {
    const confirmBtnClass = props.danger
      ? 'btn btn-large btn-danger'
      : 'btn btn-large btn-primary';

    return `
      <div class="alert-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="alert-modal">
          <div class="alert-title" id="confirm-title">${escapeHtml(props.title)}</div>
          <div class="alert-message">${escapeHtml(props.message)}</div>
          <div class="alert-buttons">
            <button class="btn btn-large" id="btn-confirm-cancel">
              ${escapeHtml(props.cancelText)}
            </button>
            <button class="${confirmBtnClass}" id="btn-confirm-ok">
              ${escapeHtml(props.confirmText)}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<ConfirmState>, props: ConfirmProps) {
    api.on('#btn-confirm-cancel', 'click', () => {
      props.onComplete(false);
    });

    api.on('#btn-confirm-ok', 'click', () => {
      props.onComplete(true);
    });

    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;
      if (key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        props.onComplete(false);
      }
    });
  },
};

/** Options for showConfirm */
export interface ConfirmOptions {
  /** Text for the confirm button (default: "Confirm") */
  confirmText?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelText?: string;
  /** Use danger styling for confirm button (default: false) */
  danger?: boolean;
}

/**
 * Show a confirmation modal and wait for user response.
 * @returns Promise resolving to true if confirmed, false if cancelled
 */
export function showConfirm(
  title: string,
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  const {
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
  } = options;

  return showModal<ConfirmState, ConfirmProps, boolean>(
    ConfirmModalScreen,
    {},
    { title, message, confirmText, cancelText, danger },
  );
}
