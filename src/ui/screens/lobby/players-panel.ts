/**
 * Players Panel - Render player list in lobby.
 *
 * Shows:
 * - Player callsign
 * - Ship/spectator status
 * - Ping indicator
 * - Ready status (check/cross)
 * - Host indicator (star)
 * - Self highlight
 */

import type { LobbyPlayer } from '../../../multiplayer/lobby-state';
import { escapeHtml } from '../../utils';

/** Render ready indicator */
function renderReadyIndicator(isReady: boolean): string {
  if (isReady) {
    return '<span class="ready-indicator ready" title="Ready">&#10003;</span>';
  }
  return '<span class="ready-indicator not-ready" title="Not ready">&#10007;</span>';
}

/** Render host indicator */
function renderHostIndicator(isHost: boolean): string {
  if (isHost) {
    return '<span class="host-indicator" title="Host">&#9733;</span>';
  }
  return '';
}

/** Render ping display */
function renderPing(ping: number): string {
  let pingClass = 'ping-good';
  if (ping > 150) {
    pingClass = 'ping-bad';
  } else if (ping > 80) {
    pingClass = 'ping-medium';
  }

  return `<span class="ping ${pingClass}">${ping}ms</span>`;
}

/** Render ship/spectator status */
function renderShipStatus(shipId: string | null): string {
  if (shipId !== null) {
    return `<span class="ship-status assigned">Ship assigned</span>`;
  }
  return '<span class="ship-status spectator">Spectator</span>';
}

/** Render a single player row */
export function renderPlayerRow(
  player: LobbyPlayer,
  isLocalPlayer: boolean,
  showHostPopover: boolean,
): string {
  const rowClass = isLocalPlayer ? 'player-row self' : 'player-row';
  const dataAttr = showHostPopover
    ? `data-player-id="${escapeHtml(player.playerId)}"`
    : '';

  return `
    <div class="${rowClass}" ${dataAttr}>
      <div class="player-info">
        ${renderHostIndicator(player.isHost)}
        <span class="player-callsign">${escapeHtml(player.callsign)}</span>
      </div>
      <div class="player-status">
        ${renderShipStatus(player.shipId)}
        ${renderPing(player.ping)}
        ${renderReadyIndicator(player.isReady)}
      </div>
    </div>
  `;
}

/** Render the full players panel */
export function renderPlayersPanel(
  players: LobbyPlayer[],
  localPlayerId: string,
  isHost: boolean,
): string {
  const playerCount = players.length;
  const readyCount = players.filter((p) => p.isReady).length;

  const playerRows = players
    .map((player) => {
      const isLocalPlayer = player.playerId === localPlayerId;
      // Host can see popover on other players (not themselves)
      const showHostPopover = isHost && !isLocalPlayer;
      return renderPlayerRow(player, isLocalPlayer, showHostPopover);
    })
    .join('');

  return `
    <div class="players-panel">
      <div class="panel-header">
        <h3>Players</h3>
        <span class="player-count">${readyCount}/${playerCount} ready</span>
      </div>
      <div class="player-list">
        ${playerRows || '<div class="no-players">No players connected</div>'}
      </div>
    </div>
  `;
}
