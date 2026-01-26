/**
 * Join Game Screen - UI for joining multiplayer games.
 *
 * Displays:
 * - Room code input form
 * - Callsign input (persisted)
 * - Connection progress steps
 * - Error messages with retry
 */

import {
  getStoredCallsign,
  setStoredCallsign,
  validateCallsign,
} from '../../multiplayer/callsign-storage';
import {
  type ConnectionFlow,
  createConnectionFlow,
} from '../../multiplayer/networking/connection-flow';
import type {
  ConnectionResult,
  ConnectionState,
} from '../../multiplayer/networking/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import {
  getErrorMessage,
  type JoinGameState,
  renderConnectingView,
  renderErrorView,
  renderInputView,
} from './join-game-render';

/** Valid room code: 8 uppercase alphanumeric characters */
const ROOM_CODE_LENGTH = 8;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{8}$/;

/** Validate room code */
function validateRoomCode(code: string): { valid: boolean; error?: string } {
  const normalized = code.toUpperCase().trim();

  if (normalized.length === 0) {
    return { valid: false, error: 'Room code is required' };
  }

  if (normalized.length !== ROOM_CODE_LENGTH) {
    return {
      valid: false,
      error: `Room code must be ${ROOM_CODE_LENGTH} characters`,
    };
  }

  if (!ROOM_CODE_PATTERN.test(normalized)) {
    return {
      valid: false,
      error: 'Room code can only contain letters and numbers',
    };
  }

  return { valid: true };
}

/** Callbacks for join game screen */
export interface JoinGameCallbacks {
  onBack: () => void;
  onJoined: (result: ConnectionResult, connectionFlow: ConnectionFlow) => void;
}

/** Join game screen component */
const JoinGameScreenComponent: Screen<JoinGameState, JoinGameCallbacks> = {
  render(state) {
    let content: string;

    switch (state.view) {
      case 'input':
        content = renderInputView(state);
        break;
      case 'connecting':
        content = renderConnectingView(state);
        break;
      case 'error':
        content = renderErrorView(state);
        break;
    }

    return `
      <div class="join-game-screen">
        <div class="join-game-wrapper">
          ${content}
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<JoinGameState>, props: JoinGameCallbacks) {
    // Form submission
    api.on('#join-form', 'submit', async (e) => {
      e.preventDefault();
      await handleJoin(api, props);
    });

    // Room code input - auto-uppercase, filter, and format as "XXXX XXXX"
    api.on('#room-code', 'input', (e) => {
      const input = e.target as HTMLInputElement;
      // Strip to raw alphanumeric uppercase, max 8 chars
      const raw = input.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
      // Format with space for display: "ABCD 1234"
      const formatted =
        raw.length > 4 ? `${raw.slice(0, 4)} ${raw.slice(4)}` : raw;
      input.value = formatted;
      api.updateState({ roomCode: raw, roomCodeError: null });
    });

    // Callsign input
    api.on('#callsign', 'input', (e) => {
      const input = e.target as HTMLInputElement;
      api.updateState({ callsign: input.value, callsignError: null });
    });

    // Back button
    api.on('#btn-back', 'click', () => {
      cleanupJoinGameScreen();
      props.onBack();
    });

    // Cancel button (during connection)
    api.on('#btn-cancel', 'click', () => {
      cancelConnection();
      api.setState({
        view: 'input',
        connectionState: null,
        errorMessage: null,
      });
    });

    // Retry button
    api.on('#btn-retry', 'click', () => {
      api.setState({
        view: 'input',
        connectionState: null,
        errorMessage: null,
        roomCodeError: null,
        callsignError: null,
      });
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;
      const state = api.getState();

      if (key === 'Escape') {
        e.preventDefault();
        if (state.view === 'connecting') {
          cancelConnection();
          api.setState({
            view: 'input',
            connectionState: null,
            errorMessage: null,
          });
        } else if (state.view === 'error') {
          api.setState({
            view: 'input',
            connectionState: null,
            errorMessage: null,
          });
        } else if (state.view === 'input') {
          cleanupJoinGameScreen();
          props.onBack();
        }
      }
    });

    // Focus room code input on input view
    if (api.getState().view === 'input') {
      requestAnimationFrame(() => {
        const input = document.getElementById('room-code') as HTMLInputElement;
        input?.focus();
      });
    }
  },
};

/** Handle join attempt */
async function handleJoin(
  api: ScreenAPI<JoinGameState>,
  props: JoinGameCallbacks,
): Promise<void> {
  const state = api.getState();

  // Validate room code
  const roomCodeValidation = validateRoomCode(state.roomCode);
  if (!roomCodeValidation.valid) {
    api.setState({ roomCodeError: roomCodeValidation.error ?? null });
    return;
  }

  // Validate callsign
  const callsignValidation = validateCallsign(state.callsign);
  if (!callsignValidation.valid) {
    api.setState({ callsignError: callsignValidation.error ?? null });
    return;
  }

  // Save callsign for next time
  setStoredCallsign(state.callsign.trim());

  // Start connection
  api.setState({
    view: 'connecting',
    connectionState: { status: 'joining-room', roomCode: state.roomCode },
  });

  try {
    // Create connection flow with state updates
    connectionFlow = createConnectionFlow(
      {},
      {
        onStateChange: (connectionState: ConnectionState) => {
          api.updateState({ connectionState });

          // Check for errors
          if (connectionState.status === 'error') {
            const errorMessage = getErrorMessage(connectionState.error.code);
            api.setState({
              view: 'error',
              errorMessage,
              connectionState: null,
            });
          }
        },
      },
    );

    // Attempt to join
    const normalizedCode = state.roomCode.toUpperCase();
    const result = await connectionFlow.joinRoom(normalizedCode);

    // Success - pass to callback
    props.onJoined(result, connectionFlow);
  } catch {
    // Error already handled by onStateChange callback which sets UI to error view.
    // This catch prevents unhandled rejection if onStateChange wasn't set up.
  }
}

/** Cancel an in-progress connection */
function cancelConnection(): void {
  if (connectionFlow) {
    connectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    connectionFlow.dispose();
    connectionFlow = null;
  }
}

/** Screen handle for external control */
let screenHandle: ScreenHandle<JoinGameState, JoinGameCallbacks> | null = null;

/** Active connection flow */
let connectionFlow: ConnectionFlow | null = null;

/** Render the join game screen */
export function renderJoinGameScreen(element: HTMLElement): void {
  const storedCallsign = getStoredCallsign() ?? '';

  const initialState: JoinGameState = {
    view: 'input',
    roomCode: '',
    callsign: storedCallsign,
    roomCodeError: null,
    callsignError: null,
    connectionState: null,
    errorMessage: null,
  };

  element.innerHTML = JoinGameScreenComponent.render(initialState, {
    onBack: () => {},
    onJoined: () => {},
  });
}

/** Bind join game screen event handlers */
export function bindJoinGameScreen(
  element: HTMLElement,
  callbacks: JoinGameCallbacks,
): void {
  // Clean up previous handle if exists
  screenHandle?.destroy();
  cancelConnection();

  const storedCallsign = getStoredCallsign() ?? '';

  const initialState: JoinGameState = {
    view: 'input',
    roomCode: '',
    callsign: storedCallsign,
    roomCodeError: null,
    callsignError: null,
    connectionState: null,
    errorMessage: null,
  };

  screenHandle = createScreen(
    JoinGameScreenComponent,
    element,
    initialState,
    callbacks,
  );
}

/** Cleanup join game screen */
export function cleanupJoinGameScreen(): void {
  cancelConnection();
  screenHandle?.destroy();
  screenHandle = null;
}
