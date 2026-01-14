/**
 * Alert Modal - Simple modal for displaying messages to the user.
 */

import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';
import { escapeHtml } from '../utils';

/** Alert modal state */
interface AlertState {
  title: string;
  message: string;
  buttonText: string;
}

/** Alert modal props */
interface AlertProps extends ModalProps<void> {
  title: string;
  message: string;
  buttonText: string;
}

/** Alert modal screen component */
const AlertModalScreen: Screen<AlertState, AlertProps> = {
  render(state) {
    return `
      <div class="alert-overlay" role="dialog" aria-modal="true">
        <div class="alert-modal">
          <div class="alert-title">${escapeHtml(state.title)}</div>
          <div class="alert-message">${escapeHtml(state.message)}</div>
          <div class="alert-buttons">
            <button class="btn btn-large btn-primary" id="btn-alert-ok">
              ${escapeHtml(state.buttonText)}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<AlertState>, props: AlertProps) {
    api.on('#btn-alert-ok', 'click', () => {
      props.onComplete();
    });

    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        props.onComplete();
      }
      if ((e as KeyboardEvent).code === 'Enter') {
        e.preventDefault();
        props.onComplete();
      }
    });
  },
};

/**
 * Show an alert modal and wait for the user to dismiss it.
 */
export function showAlert(
  title: string,
  message: string,
  buttonText = 'OK',
): Promise<void> {
  return showModal<AlertState, AlertProps, void>(
    AlertModalScreen,
    { title, message, buttonText },
    { title, message, buttonText },
  );
}

/**
 * Show an error alert modal.
 */
export function showError(message: string): Promise<void> {
  return showAlert('Error', message);
}

/**
 * Show a success alert modal.
 */
export function showSuccess(message: string): Promise<void> {
  return showAlert('Success', message);
}
