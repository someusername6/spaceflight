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
 * - Permissions indicator (for guests)
 */

import type { LobbyPlayer } from '../../../multiplayer/lobby-state';
import { getPermissionSummary } from '../../../multiplayer/permissions';
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
  // Add data-player-id for host popover OR for self row (callsign change)
  const dataAttr =
    showHostPopover || isLocalPlayer
      ? `data-player-id="${escapeHtml(player.playerId)}"`
      : '';
  // Add edit hint for self row
  const editHint = isLocalPlayer
    ? '<span class="edit-callsign-hint" title="Click to change callsign">&#9998;</span>'
    : '';

  return `
    <div class="${rowClass}" ${dataAttr}>
      <div class="player-info">
        ${renderHostIndicator(player.isHost)}
        <span class="player-callsign">${escapeHtml(player.callsign)}</span>
        ${editHint}
      </div>
      <div class="player-status">
        ${renderShipStatus(player.shipId)}
        ${renderPing(player.ping)}
        ${renderReadyIndicator(player.isReady)}
      </div>
    </div>
  `;
}

/** Render permissions indicator for guests */
function renderPermissionsIndicator(
  localPlayer: LobbyPlayer | undefined,
): string {
  if (!localPlayer || localPlayer.isHost) {
    return '';
  }

  const summary = getPermissionSummary(localPlayer.permissions);

  return `
    <div class="permissions-indicator">
      <span class="permissions-label">Your permissions:</span>
      <span class="permissions-value">${escapeHtml(summary)}</span>
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
  const localPlayer = players.find((p) => p.playerId === localPlayerId);

  const playerRows = players
    .map((player) => {
      const isLocalPlayer = player.playerId === localPlayerId;
      // Host can see popover on other players (not themselves)
      const showHostPopover = isHost && !isLocalPlayer;
      return renderPlayerRow(player, isLocalPlayer, showHostPopover);
    })
    .join('');

  const permissionsIndicator = renderPermissionsIndicator(localPlayer);

  return `
    <div class="players-panel">
      <div class="panel-header">
        <h3>Players</h3>
        <span class="player-count">${readyCount}/${playerCount} ready</span>
      </div>
      <div class="player-list">
        ${playerRows || '<div class="no-players">No players connected</div>'}
      </div>
      ${permissionsIndicator}
    </div>
  `;
}
