/**
 * Lobby Render - HTML templates for lobby screen.
 *
 * Provides:
 * - Main lobby layout (two columns: players, chat)
 * - Room code header with copy button
 * - Ready/Back buttons
 */

import type { LobbyState } from '../../../multiplayer/lobby-state';
import { renderNavBar } from '../../common/nav-bar';
import { escapeHtml } from '../../utils';
import { renderChatPanel } from './chat-panel';
import { renderPlayersPanel } from './players-panel';

/** Format room code for display (add space in middle) */
function formatRoomCode(code: string): string {
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}

/** Render room code header (host only) */
function renderRoomCodeHeader(
  roomCode: string,
  isHost: boolean,
  copied: boolean,
): string {
  if (!isHost) {
    return '';
  }

  const formattedCode = formatRoomCode(roomCode);
  const copyButtonText = copied ? 'Copied!' : 'Copy';
  const copyButtonClass = copied ? 'btn btn-sm copied' : 'btn btn-sm';

  return `
    <div class="room-code-header">
      <span class="room-code-label">Room Code:</span>
      <span class="room-code-value">${escapeHtml(formattedCode)}</span>
      <button class="${copyButtonClass}" id="btn-copy">${copyButtonText}</button>
    </div>
  `;
}

/** Render action buttons */
function renderActions(isReady: boolean): string {
  const readyButtonText = isReady ? 'Not Ready' : 'Ready';
  const readyButtonClass = isReady
    ? 'btn btn-primary ready-active'
    : 'btn btn-primary';

  return `
    <div class="lobby-actions">
      <button type="button" class="btn" id="btn-back">Leave</button>
      <button type="button" class="${readyButtonClass}" id="btn-ready">
        ${readyButtonText}
      </button>
    </div>
  `;
}

/** Render error overlay */
function renderError(errorMessage: string): string {
  return `
    <div class="lobby-error-overlay">
      <div class="lobby-error-content">
        <h3>Error</h3>
        <p>${escapeHtml(errorMessage)}</p>
        <button type="button" class="btn" id="btn-error-dismiss">OK</button>
      </div>
    </div>
  `;
}

/** Extended state with UI-only fields */
export interface LobbyViewState extends LobbyState {
  copied: boolean;
  credits: number;
  currentSector: number;
}

/** Render the full lobby view */
export function renderLobbyView(state: LobbyViewState): string {
  const localPlayer = state.players.find(
    (p) => p.playerId === state.localPlayerId,
  );
  const isReady = localPlayer?.isReady ?? false;

  const roomCodeHeader = renderRoomCodeHeader(
    state.roomCode,
    state.isHost,
    state.copied,
  );

  const playersPanel = renderPlayersPanel(
    state.players,
    state.localPlayerId,
    state.isHost,
  );

  const chatPanel = renderChatPanel(state.chatMessages);
  const actions = renderActions(isReady);
  const errorOverlay = state.errorMessage
    ? renderError(state.errorMessage)
    : '';

  const navBar = renderNavBar({
    activeTab: 'lobby',
    credits: state.credits,
    sector: state.currentSector,
  });

  return `
    <div class="campaign-page">
      ${navBar}
      <div class="lobby-screen scanline-overlay-screen">
        <div class="lobby-wrapper">
          <div class="lobby-content">
            ${roomCodeHeader}
            <div class="lobby-main">
              <div class="lobby-left">
                ${playersPanel}
              </div>
              <div class="lobby-right">
                ${chatPanel}
              </div>
            </div>
            ${actions}
          </div>
          ${errorOverlay}
        </div>
      </div>
    </div>
  `;
}
