/**
 * Pilot Viewer - renders detailed pilot information and assignment options.
 */

import type { CampaignState, OwnedShip, Pilot } from '../../campaign/types';
import {
  FALLBACK_ICON_PATH,
  getShipIconPath,
  renderShipPreview,
} from '../ship/viewer';

/** Get available ships for pilot assignment (ships without pilots) */
function getAvailableShipsForPilot(state: CampaignState): OwnedShip[] {
  return state.ships.filter((s) => s.pilot === null);
}

/** Group stored hulls by ship class, returning first index of each group */
function groupHullsByClass(
  hulls: { shipClass: string }[],
): { shipClass: string; firstIndex: number; count: number }[] {
  const groups = new Map<string, { firstIndex: number; count: number }>();
  for (let i = 0; i < hulls.length; i++) {
    const hull = hulls[i];
    if (!hull) continue;
    const existing = groups.get(hull.shipClass);
    if (existing) {
      existing.count++;
    } else {
      groups.set(hull.shipClass, { firstIndex: i, count: 1 });
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

  // Ship preview with actions when pilot is assigned
  const shipPreviewSection =
    isAssigned && currentShip
      ? `
        <div class="pilot-ship-section">
          <div class="assignment-row">
            <span class="assignment-label">Currently assigned</span>
            <span class="assignment-ship">${currentShip.shipClass}</span>
          </div>
          <div class="ship-preview-container">
            ${renderShipPreview(currentShip)}
          </div>
          <div class="assignment-actions">
            <button class="btn btn-lg btn-change-ship"
                    data-ship="${currentShip.id}"
                    data-pilot="${pilot.id}">
              Change Ship
            </button>
            <button class="btn btn-lg btn-view-ship"
                    data-ship="${currentShip.id}">
              Edit in Hangar
            </button>
          </div>
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

  // Stored hulls for creating new ships (grouped by ship class)
  const groupedHulls = groupHullsByClass(state.storedHulls);
  const hullOptions =
    !isAssigned && state.storedHulls.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Deploy with hull</div>
          <div class="hull-options">
            ${groupedHulls
              .map((group) => {
                const iconPath = getShipIconPath(group.shipClass);
                const countBadge =
                  group.count > 1
                    ? `<span class="hull-card-count">×${group.count}</span>`
                    : '';
                return `
              <button class="hull-card-btn"
                      data-pilot="${pilot.id}"
                      data-hull-index="${group.firstIndex}">
                <div class="hull-card-icon">
                  <img src="${iconPath}" alt="${group.shipClass}" class="hull-icon-svg" onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'" />
                </div>
                <div class="hull-card-name">${group.shipClass}${countBadge}</div>
              </button>
            `;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

  // Message when no ships or hulls available
  const noHullsMessage =
    !isAssigned && availableShips.length === 0 && state.storedHulls.length === 0
      ? `
        <div class="no-hulls-section">
          <div class="no-hulls-message">No available ships or hulls for this pilot</div>
          <button class="btn btn-go-to-store" data-section="hulls">Buy Hull in Store</button>
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

      ${shipPreviewSection}
      ${shipOptions}
      ${hullOptions}
      ${noHullsMessage}
    </div>
  `;
}
