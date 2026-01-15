/**
 * Defeat Overlay - Brief "Mission Failed" message for non-ironman defeats.
 *
 * Shows for a short duration before returning to squadron screen.
 * Can be dismissed early by pressing any key.
 */

import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../../framework/screen';

/** Duration to show the overlay in milliseconds */
const OVERLAY_DURATION = 2000;

/** Fade out animation duration */
const FADE_DURATION = 300;

/** Defeat overlay state */
interface DefeatOverlayState {
  fadingOut: boolean;
  dismissed: boolean;
}

/** Defeat overlay props */
type DefeatOverlayProps = ModalProps<void>;

/** Defeat overlay screen component */
const DefeatOverlayScreen: Screen<DefeatOverlayState, DefeatOverlayProps> = {
  render(state) {
    const fadeClass = state.fadingOut ? 'defeat-overlay--fade-out' : '';
    return `
      <div class="defeat-overlay ${fadeClass}" role="alert">
        <div class="defeat-overlay__content">
          <div class="defeat-overlay__title">Mission Failed</div>
          <div class="defeat-overlay__subtitle">Press any key to continue</div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<DefeatOverlayState>, props: DefeatOverlayProps) {
    const state = api.getState();

    // Already dismissed - just wait for fade animation to complete
    if (state.dismissed) {
      setTimeout(() => props.onComplete(), FADE_DURATION);
      return;
    }

    const dismiss = () => {
      if (api.getState().dismissed) return;

      // Mark as dismissed and trigger fade out animation
      api.setState({ fadingOut: true, dismissed: true });
    };

    // Auto-dismiss after duration
    const timer = setTimeout(dismiss, OVERLAY_DURATION);

    // Dismiss on any key press
    api.onGlobal('keydown', (e) => {
      e.preventDefault();
      clearTimeout(timer);
      dismiss();
    });

    // Dismiss on click
    api.onRoot('click', () => {
      clearTimeout(timer);
      dismiss();
    });
  },
};

/**
 * Show the defeat overlay and wait for it to complete.
 * Returns a promise that resolves when the overlay is dismissed.
 */
export function showDefeatOverlay(): Promise<void> {
  return showModal<DefeatOverlayState, DefeatOverlayProps, void>(
    DefeatOverlayScreen,
    { fadingOut: false, dismissed: false },
    {},
  );
}
