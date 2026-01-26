/**
 * Lobby Screen - Main multiplayer lobby UI.
 *
 * Features:
 * - Two-column layout: players (left), chat (right)
 * - Room code header (host only, with copy button)
 * - Ready/Unready button
 * - Leave button
 * - Host popover on guest hover (UI only)
 */

import type { LobbyState } from '../../../multiplayer/lobby-state';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import { copyToClipboard } from '../../utils/clipboard';
import { scrollChatToBottom } from './chat-panel';
import { positionPopover, renderHostPopover } from './host-popover';
import { type LobbyViewState, renderLobbyView } from './lobby-render';

// =============================================================================
// Types
// =============================================================================

/** Callbacks for lobby screen */
export interface LobbyCallbacks {
  onReady: (ready: boolean) => void;
  onSendChat: (text: string) => void;
  onBack: () => void;
}

// =============================================================================
// Screen Component
// =============================================================================

/** Lobby screen component */
const LobbyScreenComponent: Screen<LobbyViewState, LobbyCallbacks> = {
  render(state) {
    return renderLobbyView(state);
  },

  bind(api: ScreenAPI<LobbyViewState>, props: LobbyCallbacks) {
    const state = api.getState();

    // Copy button (host only)
    api.on('#btn-copy', 'click', async () => {
      const currentState = api.getState();
      await copyToClipboard(currentState.roomCode);
      api.setState({ copied: true });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        api.updateState({ copied: false });
      }, 2000);
    });

    // Ready button
    api.on('#btn-ready', 'click', () => {
      const currentState = api.getState();
      const localPlayer = currentState.players.find(
        (p) => p.playerId === currentState.localPlayerId,
      );
      const isReady = localPlayer?.isReady ?? false;
      props.onReady(!isReady);
    });

    // Leave button
    api.on('#btn-back', 'click', () => {
      props.onBack();
    });

    // Chat form submit
    api.on('#chat-form', 'submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input') as HTMLInputElement;
      const text = input?.value.trim() ?? '';
      if (text.length > 0) {
        props.onSendChat(text);
        input.value = '';
      }
    });

    // Error dismiss button
    api.on('#btn-error-dismiss', 'click', () => {
      api.setState({ errorMessage: null });
    });

    // Host popover on guest row hover
    if (state.isHost) {
      let activePopover: HTMLElement | null = null;

      api.onDirect('.player-row[data-player-id]', 'mouseenter', (_e, el) => {
        const playerId = el.getAttribute('data-player-id');
        if (!playerId) return;

        const currentState = api.getState();
        const player = currentState.players.find(
          (p) => p.playerId === playerId,
        );
        if (!player) return;

        // Remove any existing popover
        activePopover?.remove();

        // Create new popover
        const popoverHtml = renderHostPopover(player.playerId, player.callsign);
        const popoverContainer = document.createElement('div');
        popoverContainer.innerHTML = popoverHtml;
        const popoverEl = popoverContainer.firstElementChild as HTMLElement;

        document.body.appendChild(popoverEl);
        positionPopover(popoverEl, el);
        activePopover = popoverEl;
      });

      api.onDirect('.player-row[data-player-id]', 'mouseleave', () => {
        // Small delay to allow moving to the popover
        setTimeout(() => {
          if (
            activePopover &&
            !activePopover.matches(':hover') &&
            !document.querySelector('.player-row:hover')
          ) {
            activePopover.remove();
            activePopover = null;
          }
        }, 100);
      });

      // Close popover when clicking outside
      api.onGlobal('click', (e) => {
        const target = e.target as HTMLElement;
        if (
          activePopover &&
          !activePopover.contains(target) &&
          !target.closest('.player-row[data-player-id]')
        ) {
          activePopover.remove();
          activePopover = null;
        }
      });
    }

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;

      if (key === 'Escape') {
        const currentState = api.getState();
        if (currentState.errorMessage) {
          e.preventDefault();
          api.setState({ errorMessage: null });
        }
      }
    });

    // Auto-scroll chat to bottom
    requestAnimationFrame(() => {
      scrollChatToBottom();
    });
  },
};

// =============================================================================
// Public API
// =============================================================================

/** Screen handle for external control */
let screenHandle: ScreenHandle<LobbyViewState, LobbyCallbacks> | null = null;

/** Render the lobby screen */
export function renderLobbyScreen(element: HTMLElement): void {
  const initialState: LobbyViewState = {
    roomCode: '',
    localPlayerId: '',
    isHost: false,
    players: [],
    chatMessages: [],
    errorMessage: null,
    copied: false,
  };

  element.innerHTML = LobbyScreenComponent.render(initialState, {
    onReady: () => {},
    onSendChat: () => {},
    onBack: () => {},
  });
}

/** Bind lobby screen event handlers */
export function bindLobbyScreen(
  element: HTMLElement,
  initialState: LobbyState,
  callbacks: LobbyCallbacks,
): void {
  // Clean up previous handle if exists
  screenHandle?.destroy();

  const viewState: LobbyViewState = {
    ...initialState,
    copied: false,
  };

  screenHandle = createScreen(
    LobbyScreenComponent,
    element,
    viewState,
    callbacks,
  );
}

/** Update lobby state */
export function updateLobbyState(state: LobbyState): void {
  if (!screenHandle) return;

  const currentState = screenHandle.getState();
  screenHandle.setState({
    ...state,
    copied: currentState.copied,
  });

  // Auto-scroll chat
  requestAnimationFrame(() => {
    scrollChatToBottom();
  });
}

/** Show error message */
export function showLobbyError(message: string): void {
  screenHandle?.setState({ errorMessage: message });
}

/** Cleanup lobby screen */
export function cleanupLobbyScreen(): void {
  // Remove any orphaned popovers
  const popovers = document.querySelectorAll('.host-popover');
  for (const popover of popovers) {
    popover.remove();
  }

  screenHandle?.destroy();
  screenHandle = null;
}

/** Get current lobby screen handle (for testing) */
export function getLobbyScreenHandle(): ScreenHandle<
  LobbyViewState,
  LobbyCallbacks
> | null {
  return screenHandle;
}
