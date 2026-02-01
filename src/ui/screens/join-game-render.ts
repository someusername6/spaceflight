/**
 * Join Game Render Functions - HTML templates for join game screen.
 */

import type { ConnectionState } from '../../multiplayer/networking/types';
import { escapeHtml } from '../utils';

/** Current view state */
export type JoinGameView = 'input' | 'connecting' | 'error';

/** Join game screen UI state */
export interface JoinGameState {
  view: JoinGameView;
  roomCode: string;
  callsign: string;
  roomCodeError: string | null;
  callsignError: string | null;
  connectionState: ConnectionState | null;
  errorMessage: string | null;
}

/** Map connection error codes to user-friendly messages */
export function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'invalid_room':
      return 'Room not found. Check the code and try again.';
    case 'room_full':
      return 'This room is full.';
    case 'game_in_progress':
      return 'Cannot join - game already in progress.';
    case 'version_mismatch':
      return 'Version mismatch. Host is on a different version.';
    case 'mesh_timeout':
      return 'Could not connect to all players.';
    case 'peer_connection_failed':
    case 'signaling_error':
      return 'Connection failed. Please try again.';
    case 'callsign_kicked':
      return 'Your callsign has been kicked from this room.';
    default:
      return 'Could not reach server. Check your connection.';
  }
}

/** Get connection progress step display */
function getConnectionProgress(state: ConnectionState | null): string {
  if (!state) return '';

  const steps = [
    { status: 'joining-room', label: 'Joining room...' },
    { status: 'signaling', label: 'Establishing connection...' },
    { status: 'forming-mesh', label: 'Connecting to players...' },
    { status: 'connected', label: 'Connected!' },
  ];

  let html = '<div class="join-progress-steps">';

  for (const step of steps) {
    let stepClass = 'step-pending';
    let icon = '<span class="step-icon">&#9675;</span>'; // Empty circle

    // Check if this step is active or completed
    const stepIndex = steps.findIndex((s) => s.status === step.status);
    const currentIndex = steps.findIndex((s) => s.status === state.status);

    if (currentIndex > stepIndex) {
      stepClass = 'step-complete';
      icon = '<span class="step-icon">&#10003;</span>'; // Checkmark
    } else if (state.status === step.status) {
      stepClass = 'step-active';
      icon = '<span class="step-icon step-spinner"></span>';
    }

    // Add peer count for forming-mesh
    let label = step.label;
    if (
      step.status === 'forming-mesh' &&
      state.status === 'forming-mesh' &&
      'connectedPeers' in state
    ) {
      label = `Connecting to players (${state.connectedPeers}/${state.totalPeers})...`;
    }

    html += `
      <div class="join-progress-step ${stepClass}">
        ${icon}
        <span class="step-label">${label}</span>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

/** Format room code for display with spacing */
function formatRoomCode(code: string): string {
  if (code.length > 4) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}

/** Render input form view */
export function renderInputView(state: JoinGameState): string {
  const roomCodeError = state.roomCodeError
    ? `<div class="field-error">${escapeHtml(state.roomCodeError)}</div>`
    : '';
  const callsignError = state.callsignError
    ? `<div class="field-error">${escapeHtml(state.callsignError)}</div>`
    : '';
  const formattedRoomCode = formatRoomCode(state.roomCode);

  return `
    <div class="join-game-content">
      <div class="join-game-header">
        <h2>Join Game</h2>
        <p class="join-game-subtitle">Enter the room code from the host</p>
      </div>
      <form class="join-game-form" id="join-form">
        <div class="form-field">
          <label for="room-code">Room Code</label>
          <input
            type="text"
            id="room-code"
            name="roomCode"
            value="${escapeHtml(formattedRoomCode)}"
            placeholder="ABCD 1234"
            maxlength="9"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
          />
          ${roomCodeError}
        </div>
        <div class="form-field">
          <label for="callsign">Your Callsign</label>
          <input
            type="text"
            id="callsign"
            name="callsign"
            value="${escapeHtml(state.callsign)}"
            placeholder="Commander"
            maxlength="16"
            autocomplete="off"
            spellcheck="false"
          />
          ${callsignError}
        </div>
        <div class="join-game-actions">
          <button type="button" class="btn" id="btn-back">Back</button>
          <button type="submit" class="btn btn-primary" id="btn-join">Join</button>
        </div>
      </form>
    </div>
  `;
}

/** Render connecting view with progress */
export function renderConnectingView(state: JoinGameState): string {
  const progress = getConnectionProgress(state.connectionState);
  const roomCode = state.roomCode.toUpperCase();

  return `
    <div class="join-game-content">
      <div class="join-game-header">
        <h2>Joining Game</h2>
        <p class="join-game-subtitle">Room: <span class="room-code-display">${escapeHtml(roomCode)}</span></p>
      </div>
      <div class="join-game-connecting">
        ${progress}
      </div>
      <div class="join-game-actions">
        <button type="button" class="btn" id="btn-cancel">Cancel</button>
      </div>
    </div>
  `;
}

/** Render error view */
export function renderErrorView(state: JoinGameState): string {
  const errorMessage = state.errorMessage ?? 'An error occurred.';

  return `
    <div class="join-game-content">
      <div class="join-game-header">
        <h2 class="error-title">Connection Failed</h2>
      </div>
      <div class="join-game-error">
        <p class="error-message">${escapeHtml(errorMessage)}</p>
      </div>
      <div class="join-game-actions">
        <button type="button" class="btn" id="btn-back">Back</button>
        <button type="button" class="btn btn-primary" id="btn-retry">Try Again</button>
      </div>
    </div>
  `;
}
