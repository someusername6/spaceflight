/**
 * Pilot Viewer - renders detailed pilot information and assignment options.
 */

import type { CampaignState, OwnedShip, Pilot } from '../../campaign/types';
import { getMaxHull } from '../ship/card';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';

/** Get available ships for pilot assignment (ships without pilots) */
function getAvailableShipsForPilot(state: CampaignState): OwnedShip[] {
  return state.ships.filter((s) => s.pilot === null);
}

/** Render pilot viewer with career stats and assignment options */
export function renderPilotViewer(pilot: Pilot, state: CampaignState): string {
  const isCommander = pilot.id === state.commanderId;
  const isAssigned = state.ships.some((s) => s.pilot?.id === pilot.id);
  const currentShip = state.ships.find((s) => s.pilot?.id === pilot.id);
  const availableShips = getAvailableShipsForPilot(state);

  // Rank: "PLAYER" for commander, skill level for others
  const rankText = isCommander ? 'PLAYER' : pilot.skill.toUpperCase();

  // Unassign option when pilot is assigned
  const unassignOption =
    isAssigned && currentShip
      ? `
        <div class="pilot-assignment">
          <div class="assignment-row">
            <span class="assignment-label">Currently assigned:</span>
            <span class="assignment-ship">${currentShip.shipClass}</span>
          </div>
          <button class="btn btn-danger btn-unassign-pilot"
                  data-ship="${currentShip.id}"
                  data-pilot="${pilot.id}">
            Unassign
          </button>
        </div>
      `
      : '';

  // Available ships list for assignment
  const shipOptions =
    !isAssigned && availableShips.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Assign to ship:</div>
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

  // Stored hulls for creating new ships
  const hullOptions =
    !isAssigned && state.storedHulls.length > 0
      ? `
        <div class="pilot-assignment">
          <div class="assignment-label">Deploy with hull:</div>
          <div class="hull-options">
            ${state.storedHulls
              .map((hull, index) => {
                const maxHull = getMaxHull(hull.shipClass);
                const currentHull = maxHull - hull.hullDamage;
                const hullPercent = Math.round((currentHull / maxHull) * 100);
                const iconPath = getShipIconPath(hull.shipClass);
                const isDamaged = hull.hullDamage > 0;
                return `
              <button class="hull-card-btn"
                      data-pilot="${pilot.id}"
                      data-hull-index="${index}">
                <div class="hull-card-icon">
                  <img src="${iconPath}" alt="${hull.shipClass}" class="hull-icon-svg" onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'" />
                </div>
                <div class="hull-card-name">${hull.shipClass}</div>
                <div class="hull-card-health ${isDamaged ? 'damaged' : ''}">
                  <div class="hull-bar">
                    <div class="hull-fill" style="width: ${hullPercent}%"></div>
                  </div>
                  <span class="hull-text">${hullPercent}%</span>
                </div>
              </button>
            `;
              })
              .join('')}
          </div>
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
        <div class="pilot-header-right">
          <button class="btn-close-viewer" id="btn-close-pilot-viewer">✕</button>
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

      ${unassignOption}
      ${shipOptions}
      ${hullOptions}
    </div>
  `;
}
