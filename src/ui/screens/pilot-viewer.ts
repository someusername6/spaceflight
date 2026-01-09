/**
 * Pilot Viewer - renders detailed pilot information and assignment options.
 */

import type { CampaignState, OwnedShip, Pilot } from '../../campaign/types';
import { getShipIconPath, iconErrorHandler } from '../ship/viewer';

/** Get available ships for pilot assignment (ships without pilots) */
function getAvailableShipsForPilot(state: CampaignState): OwnedShip[] {
  return state.ships.filter((s) => s.pilot === null);
}

/** Group stored ships by ship class, returning first index of each group */
function groupStoredShipsByClass(
  ships: { shipClass: string }[],
): { shipClass: string; firstIndex: number; count: number }[] {
  const groups = new Map<string, { firstIndex: number; count: number }>();
  for (let i = 0; i < ships.length; i++) {
    const ship = ships[i];
    if (!ship) continue;
    const existing = groups.get(ship.shipClass);
    if (existing) {
      existing.count++;
    } else {
      groups.set(ship.shipClass, { firstIndex: i, count: 1 });
    }
  }
  return [...groups.entries()].map(([shipClass, data]) => ({
    shipClass,
    ...data,
  }));
}

/** Render pilot viewer with career stats and assignment options */
export function renderPilotViewer(pilot: Pilot, state: CampaignState): string {
  const isCommander = pilot.id === state.commanderId;
  const isAssigned = state.ships.some((s) => s.pilot?.id === pilot.id);
  const currentShip = state.ships.find((s) => s.pilot?.id === pilot.id);
  const availableShips = getAvailableShipsForPilot(state);

  // Rank: "PLAYER" for commander, skill level for others
  const rankText = isCommander ? 'PLAYER' : pilot.skill.toUpperCase();

  // Unassign button for assigned pilots (including commander)
  const unassignSection =
    isAssigned && currentShip
      ? `
        <div class="pilot-unassign-section">
          <button class="btn btn-large btn-danger btn-unassign-pilot"
                  data-pilot="${pilot.id}"
                  data-ship="${currentShip.id}">
            Unassign Pilot
          </button>
        </div>
      `
      : '';

  // Available ships list for assignment
  const shipOptions =
    !isAssigned && availableShips.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Assign to ship</div>
          <div class="assignment-options">
            ${availableShips
              .map(
                (ship) => `
              <button class="btn btn-assign-pilot"
                      data-pilot="${pilot.id}"
                      data-ship="${ship.id}">
                ${ship.shipClass}
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `
      : '';

  // Stored ships for creating new active ships (grouped by ship class)
  const groupedStoredShips = groupStoredShipsByClass(state.storedShips);
  const storedShipOptions =
    !isAssigned && state.storedShips.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Assign to stored ship</div>
          <div class="stored-ship-options">
            ${groupedStoredShips
              .map((group) => {
                const iconPath = getShipIconPath(group.shipClass);
                const countBadge =
                  group.count > 1
                    ? `<span class="stored-ship-card-count">×${group.count}</span>`
                    : '';
                return `
              <button class="stored-ship-card-btn"
                      data-pilot="${pilot.id}"
                      data-stored-ship-index="${group.firstIndex}">
                <div class="stored-ship-card-icon">
                  <img src="${iconPath}" alt="${group.shipClass}" class="stored-ship-icon-svg" ${iconErrorHandler()} />
                </div>
                <div class="stored-ship-card-name">${group.shipClass}${countBadge}</div>
              </button>
            `;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

  // Message when no ships available
  const noShipsMessage =
    !isAssigned && availableShips.length === 0 && state.storedShips.length === 0
      ? `
        <div class="no-ships-section">
          <div class="no-ships-message">No available ships for this pilot</div>
          <button class="btn btn-go-to-store" data-section="ships">Buy Ship in Store</button>
        </div>
      `
      : '';

  return `
    <div class="pilot-viewer">
      <div class="pilot-viewer-header">
        <div class="pilot-header-info">
          <div class="pilot-viewer-name">${pilot.name}</div>
          <div class="pilot-rank">${rankText}</div>
        </div>
      </div>

      <div class="stat-grid pilot-viewer-stats">
        <div class="stat">
          <span class="stat-value">${pilot.missionsFlown}</span>
          <span class="stat-label">Missions</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.missionsWon}</span>
          <span class="stat-label">Victories</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.kills}</span>
          <span class="stat-label">Kills</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.assists}</span>
          <span class="stat-label">Assists</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.damageDealt.toLocaleString()}</span>
          <span class="stat-label">Dmg Dealt</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.damageReceived.toLocaleString()}</span>
          <span class="stat-label">Dmg Recv</span>
        </div>
      </div>

      ${unassignSection}
      ${shipOptions}
      ${storedShipOptions}
      ${noShipsMessage}
    </div>
  `;
}
