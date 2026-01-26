/**
 * Room Created Render Functions - HTML templates for room created screen.
 */

import { escapeHtml } from '../utils';

/** Current view state */
export type RoomCreatedView = 'waiting' | 'error';

/** Room created screen UI state */
export interface RoomCreatedState {
  view: RoomCreatedView;
  roomCode: string;
  peerCount: number;
  copied: boolean;
  errorMessage: string | null;
}

/** Format room code for display with spacing */
function formatRoomCode(code: string): string {
  // Split into two groups of 4 for readability: ABCD 1234
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}

/** Render waiting view */
export function renderWaitingView(state: RoomCreatedState): string {
  const formattedCode = formatRoomCode(state.roomCode);
  const copyButtonText = state.copied ? 'Copied!' : 'Copy';
  const copyButtonClass = state.copied ? 'btn btn-sm copied' : 'btn btn-sm';
  const peerText =
    state.peerCount === 1
      ? '1 player connected'
      : `${state.peerCount} players connected`;

  return `
    <div class="room-created-content">
      <div class="room-created-header">
        <h2>Room Created</h2>
        <p class="room-created-subtitle">Share this code with other players</p>
      </div>
      <div class="room-code-container">
        <div class="room-code-value">${escapeHtml(formattedCode)}</div>
        <button class="${copyButtonClass}" id="btn-copy">${copyButtonText}</button>
      </div>
      <div class="room-status">
        <div class="status-spinner"></div>
        <span class="status-text">Waiting for players...</span>
      </div>
      <div class="room-peers">
        <span class="peer-count">${peerText}</span>
      </div>
      <div class="room-created-actions">
        <button type="button" class="btn" id="btn-cancel">Cancel</button>
      </div>
    </div>
  `;
}

/** Render error view */
export function renderErrorView(state: RoomCreatedState): string {
  const errorMessage = state.errorMessage ?? 'An error occurred.';

  return `
    <div class="room-created-content">
      <div class="room-created-header">
        <h2 class="error-title">Room Error</h2>
      </div>
      <div class="room-created-error">
        <p class="error-message">${escapeHtml(errorMessage)}</p>
      </div>
      <div class="room-created-actions">
        <button type="button" class="btn" id="btn-back">Back</button>
      </div>
    </div>
  `;
}
