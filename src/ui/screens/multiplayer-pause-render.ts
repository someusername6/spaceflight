/**
 * Multiplayer Pause Screen - Render Helpers
 *
 * Helper functions for rendering pause modal UI components.
 */

import type { SkillLevel } from '../../campaign/types';
import type { ChatEntry } from '../../multiplayer/lobby-state';
import type { PausePlayer, PauseState } from '../../multiplayer/pause-state';
import { escapeHtml } from '../utils';
import { renderChatMessage } from './lobby/chat-panel';

// =============================================================================
// Constants
// =============================================================================

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'rookie', label: 'Rookie' },
  { value: 'regular', label: 'Regular' },
  { value: 'veteran', label: 'Veteran' },
  { value: 'ace', label: 'Ace' },
];

// =============================================================================
// Render Helpers
// =============================================================================

export function formatPauseReason(state: PauseState): string {
  switch (state.reason) {
    case 'player-request':
      return `Paused by ${escapeHtml(state.initiatedByCallsign)}`;
    case 'player-disconnect':
      return `Player disconnected: ${escapeHtml(state.initiatedByCallsign)}`;
    case 'lag-detected':
      return `Lag detected - game paused`;
    default:
      return 'Game paused';
  }
}

function renderDropMenu(playerId: string): string {
  const options = SKILL_LEVELS.map(
    (skill) => `
      <button data-skill="${skill.value}" data-drop-player-id="${escapeHtml(playerId)}">
        ${skill.label}
      </button>
    `,
  ).join('');

  return `
    <div class="drop-player-menu">
      ${options}
    </div>
  `;
}

export function renderPausePlayerRow(
  player: PausePlayer,
  isLocalPlayer: boolean,
  isHost: boolean,
  showDropMenu: boolean,
): string {
  const statusClass =
    player.status === 'disconnected'
      ? 'disconnected'
      : player.status === 'dropped'
        ? 'dropped'
        : '';
  const selfClass = isLocalPlayer ? 'self' : '';

  const statusText =
    player.status === 'disconnected'
      ? '[Disconnected]'
      : player.status === 'dropped'
        ? `[AI: ${player.droppedAISkill}]`
        : '';

  const statusHtml = statusText
    ? `<span class="pause-player-status ${statusClass}">${statusText}</span>`
    : '';

  const hostIndicator = player.isHost
    ? '<span class="host-indicator" title="Host">&#9733;</span>'
    : '';

  // Ready indicator (only for connected players)
  const readyIndicator =
    player.status === 'connected'
      ? `<span class="pause-ready-indicator ${player.isReady ? 'ready' : 'not-ready'}">
           ${player.isReady ? '&#10003;' : '&#10007;'}
         </span>`
      : '';

  // Drop button for host (only for disconnected players)
  let dropButton = '';
  if (isHost && !isLocalPlayer && player.status === 'disconnected') {
    dropButton = `
      <div class="drop-player-dropdown">
        <button class="btn btn-sm btn-danger btn-drop-player" data-player-id="${escapeHtml(player.playerId)}">
          Drop
        </button>
        ${showDropMenu ? renderDropMenu(player.playerId) : ''}
      </div>
    `;
  }

  return `
    <div class="pause-player-row ${selfClass} ${statusClass}" data-player-id="${escapeHtml(player.playerId)}">
      <div class="pause-player-info">
        ${hostIndicator}
        <span class="pause-player-callsign">${escapeHtml(player.callsign)}</span>
        ${statusHtml}
      </div>
      <div class="pause-player-actions">
        ${readyIndicator}
        ${dropButton}
      </div>
    </div>
  `;
}

export function renderPlayersPanel(
  players: PausePlayer[],
  localPlayerId: string,
  isHost: boolean,
  dropMenuPlayerId: string | null,
): string {
  const rows = players
    .map((player) =>
      renderPausePlayerRow(
        player,
        player.playerId === localPlayerId,
        isHost,
        player.playerId === dropMenuPlayerId,
      ),
    )
    .join('');

  const readyCount = players.filter(
    (p) => p.isReady && p.status === 'connected',
  ).length;
  const connectedCount = players.filter((p) => p.status === 'connected').length;

  return `
    <div class="pause-players-panel">
      <div class="panel-header">
        <h3>Players</h3>
        <span class="player-count">${readyCount}/${connectedCount} ready</span>
      </div>
      <div class="player-list">
        ${rows}
      </div>
    </div>
  `;
}

export function renderPauseChatPanel(messages: ChatEntry[]): string {
  const messageHtml = messages.map(renderChatMessage).join('');

  return `
    <div class="pause-chat-panel">
      <div class="panel-header">
        <h3>Chat</h3>
      </div>
      <div class="pause-chat-messages" id="pause-chat-messages">
        ${messageHtml || '<div class="chat-empty">No messages</div>'}
      </div>
      <form class="chat-input-form" id="pause-chat-form">
        <input
          type="text"
          id="pause-chat-input"
          class="chat-input"
          placeholder="Type a message..."
          maxlength="200"
          autocomplete="off"
        />
        <button type="submit" class="btn btn-sm">Send</button>
      </form>
    </div>
  `;
}

export function renderCountdown(seconds: number | null): string {
  if (seconds === null) return '';

  return `
    <div class="pause-countdown">
      <span class="pause-countdown-text">
        Resuming in <span class="pause-countdown-number">${seconds}</span>...
      </span>
    </div>
  `;
}

export function scrollPauseChatToBottom(): void {
  const chatMessages = document.getElementById('pause-chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
