/**
 * Multiplayer Pause Screen - Modal for paused multiplayer missions.
 *
 * Features:
 * - Players panel with ready status
 * - Chat panel for communication
 * - Ready-to-resume flow with countdown
 * - Host can drop disconnected players
 * - Guest can quit (ship becomes AI)
 */

import type { SkillLevel } from '../../campaign/types';
import type { PauseCoordinatorHandle } from '../../multiplayer/pause-coordinator';
import type { PauseState } from '../../multiplayer/pause-state';
import {
  createScreen,
  type ModalProps,
  type Screen,
  type ScreenAPI,
} from '../framework/screen';
import {
  formatPauseReason,
  renderCountdown,
  renderPauseChatPanel,
  renderPlayersPanel,
  scrollPauseChatToBottom,
} from './multiplayer-pause-render';

// =============================================================================
// Types
// =============================================================================

/** Result returned when pause modal closes */
export interface MultiplayerPauseResult {
  action: 'resumed' | 'quit' | 'settings';
}

/** Props for the multiplayer pause modal */
export interface MultiplayerPauseProps
  extends ModalProps<MultiplayerPauseResult> {
  initialState: PauseState;
  coordinator: PauseCoordinatorHandle;
  onChat: (text: string) => void;
}

/** Internal modal state */
interface PauseModalState {
  pauseState: PauseState;
  dropMenuPlayerId: string | null;
}

// =============================================================================
// Screen Component
// =============================================================================

const MultiplayerPauseScreen: Screen<PauseModalState, MultiplayerPauseProps> = {
  render(state, _props) {
    const { pauseState, dropMenuPlayerId } = state;
    const localPlayer = pauseState.players.find(
      (p) => p.playerId === pauseState.localPlayerId,
    );
    const isReady = localPlayer?.isReady ?? false;

    const readyButtonClass = isReady ? 'btn-primary ready-active' : '';
    const readyButtonText = isReady ? 'Not Ready' : 'Ready to Resume';

    // Host cannot quit, guest can
    const quitDisabled = pauseState.isHost ? 'disabled' : '';
    const quitTitle = pauseState.isHost
      ? 'Host cannot quit during mission'
      : 'Leave mission (your ship becomes AI)';

    return `
      <div class="multiplayer-pause-overlay" role="dialog" aria-modal="true">
        <div class="multiplayer-pause-modal">
          <div class="pause-header">
            <h2>Paused</h2>
            <div class="pause-reason">${formatPauseReason(pauseState)}</div>
          </div>

          <div class="pause-content">
            <div class="pause-left">
              ${renderPlayersPanel(
                pauseState.players,
                pauseState.localPlayerId,
                pauseState.isHost,
                dropMenuPlayerId,
              )}
            </div>
            <div class="pause-right">
              ${renderPauseChatPanel(pauseState.chatMessages)}
            </div>
          </div>

          ${renderCountdown(pauseState.countdownSeconds)}

          <div class="pause-actions">
            <button class="btn btn-large btn-ready-to-resume ${readyButtonClass}" id="btn-pause-ready">
              ${readyButtonText}
            </button>
            <button class="btn btn-large" id="btn-pause-settings">
              Settings
            </button>
            <button class="btn btn-large btn-danger btn-quit" id="btn-quit" ${quitDisabled} title="${quitTitle}">
              Quit
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<PauseModalState>, props: MultiplayerPauseProps) {
    const { coordinator, onChat, onComplete } = props;

    // Ready button toggle
    api.on('#btn-pause-ready', 'click', () => {
      const state = api.getState();
      const localPlayer = state.pauseState.players.find(
        (p) => p.playerId === state.pauseState.localPlayerId,
      );
      const newReady = !(localPlayer?.isReady ?? false);
      coordinator.setReadyToResume(newReady);
    });

    // Settings button
    api.on('#btn-pause-settings', 'click', () => {
      onComplete({ action: 'settings' });
    });

    // Quit button (guest only)
    api.on('#btn-quit', 'click', () => {
      const state = api.getState();
      if (state.pauseState.isHost) return;
      // Will trigger quit confirmation via handler
      coordinator.requestQuit();
      onComplete({ action: 'quit' });
    });

    // Chat form submission
    api.on('#pause-chat-form', 'submit', (e) => {
      e.preventDefault();
      const input = document.getElementById(
        'pause-chat-input',
      ) as HTMLInputElement;
      if (input?.value.trim()) {
        onChat(input.value.trim());
        input.value = '';
      }
    });

    // Drop player button (host only)
    api.on('.btn-drop-player', 'click', (_, element) => {
      const playerId = element.getAttribute('data-player-id');
      if (!playerId) return;

      const state = api.getState();
      // Toggle drop menu
      const newDropMenuPlayerId =
        state.dropMenuPlayerId === playerId ? null : playerId;
      api.setState({ dropMenuPlayerId: newDropMenuPlayerId });
    });

    // Drop skill selection
    api.on('[data-drop-player-id]', 'click', (_, element) => {
      const playerId = element.getAttribute('data-drop-player-id');
      const skill = element.getAttribute('data-skill') as SkillLevel;
      if (!playerId || !skill) return;

      coordinator.dropPlayer(playerId, skill);
      api.setState({ dropMenuPlayerId: null });
    });

    // Close drop menu when clicking outside
    api.onGlobal('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.drop-player-dropdown')) {
        const state = api.getState();
        if (state.dropMenuPlayerId) {
          api.setState({ dropMenuPlayerId: null });
        }
      }
    });

    // Escape to toggle ready (not close)
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Toggle ready state
        const state = api.getState();
        const localPlayer = state.pauseState.players.find(
          (p) => p.playerId === state.pauseState.localPlayerId,
        );
        const newReady = !(localPlayer?.isReady ?? false);
        coordinator.setReadyToResume(newReady);
      }
    });

    // Scroll chat to bottom
    scrollPauseChatToBottom();
  },
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Show the multiplayer pause menu.
 *
 * The modal will close when:
 * - All players ready and countdown completes (action: 'resumed')
 * - Guest clicks quit (action: 'quit')
 * - Player clicks settings (action: 'settings')
 */
export function showMultiplayerPauseMenu(
  coordinator: PauseCoordinatorHandle,
  onChat: (text: string) => void,
  onPauseStateChange: (state: PauseState) => void,
): Promise<MultiplayerPauseResult> {
  const initialState = coordinator.getPauseState();
  if (!initialState) {
    return Promise.resolve({ action: 'resumed' });
  }

  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.className = 'modal-container';
    document.body.appendChild(container);

    let destroyed = false;

    const cleanup = () => {
      if (destroyed) return;
      destroyed = true;
      container.remove();
    };

    const onComplete = (result: MultiplayerPauseResult) => {
      cleanup();
      resolve(result);
    };

    // Create the screen handle
    const handle = createScreen(
      MultiplayerPauseScreen,
      container,
      { pauseState: initialState, dropMenuPlayerId: null },
      { initialState, coordinator, onChat, onComplete },
    );

    // Listen for pause state changes from coordinator
    const stateChangeHandler = (newState: PauseState) => {
      if (destroyed) return;

      handle.setState({ pauseState: newState });
      onPauseStateChange(newState);

      // Auto-close when countdown reaches 0 (resume triggered)
      if (
        newState.countdownSeconds !== null &&
        newState.countdownSeconds <= 0
      ) {
        onComplete({ action: 'resumed' });
      }
    };

    // Wire up the state change callback
    // Note: The coordinator should call this when state changes
    onPauseStateChange(initialState);

    // Store the handler reference for external use
    (
      container as { _stateChangeHandler?: typeof stateChangeHandler }
    )._stateChangeHandler = stateChangeHandler;
  });
}

/**
 * Update the pause modal with new state.
 * Call this from the pause handler when coordinator state changes.
 */
export function updatePauseModalState(state: PauseState): void {
  const container = document.querySelector(
    '.modal-container',
  ) as HTMLElement & {
    _stateChangeHandler?: (state: PauseState) => void;
  };
  if (container?._stateChangeHandler) {
    container._stateChangeHandler(state);
  }
}
