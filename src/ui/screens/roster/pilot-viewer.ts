/**
 * Pilot Viewer - renders detailed pilot information and assignment options.
 */

import {
  getXPProgress,
  isMaxSkillLevel,
  XP_PER_LEVEL,
} from '../../../campaign/pilot-xp';
import type {
  CampaignState,
  OwnedShip,
  Pilot,
  SkillLevel,
} from '../../../campaign/types';
import { getShipIconPath, iconErrorHandler } from '../../ship/viewer';

/** Get display label for the next skill level */
function getNextSkillLabel(current: SkillLevel): string {
  const progression: Record<SkillLevel, string> = {
    green: 'Rookie',
    rookie: 'Regular',
    regular: 'Veteran',
    veteran: 'Ace',
    ace: 'Elite',
    elite: 'Max',
  };
  return progression[current] ?? 'Next';
}

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

  // XP progress bar (wingmen only, not shown for commander or elite pilots)
  const showXPBar = !isCommander && !isMaxSkillLevel(pilot);
  const xpProgress = getXPProgress(pilot);
  const nextSkillLabel = getNextSkillLabel(pilot.skill);
  const xpSection = showXPBar
    ? `
      <div class="pilot-xp-section">
        <div class="xp-header">
          <span class="xp-label">XP to ${nextSkillLabel}</span>
          <span class="xp-value">${pilot.xp} / ${XP_PER_LEVEL}</span>
        </div>
        <div class="xp-bar-container">
          <div class="xp-bar-fill" style="width: ${xpProgress}%"></div>
        </div>
      </div>
    `
    : '';

  // Elite badge (shown instead of XP bar for elite pilots)
  const eliteBadge =
    !isCommander && isMaxSkillLevel(pilot)
      ? `
      <div class="pilot-elite-badge">
        <span class="elite-icon">★</span>
        <span class="elite-text">Elite - Max Rank</span>
      </div>
    `
      : '';

  // Injury status banner (shown when pilot is recovering)
  const isInjured = pilot.injuredMissionsLeft > 0;
  const injuryBanner = isInjured
    ? `
      <div class="pilot-injury-banner">
        <span class="injury-icon">⚠</span>
        <span class="injury-text">Recovering from ejection</span>
        <span class="injury-missions">${pilot.injuredMissionsLeft} mission${pilot.injuredMissionsLeft > 1 ? 's' : ''} remaining</span>
      </div>
    `
    : '';

  // Warning banner for pilots with close calls (higher retirement risk)
  const hasCloseCall = pilot.ejectionCount > 0 && !isInjured;
  const closeCallBanner = hasCloseCall
    ? `
      <div class="pilot-close-call-banner">
        <span class="close-call-icon">⚠</span>
        <span class="close-call-text">Higher retirement risk if ejected</span>
      </div>
    `
    : '';

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

      ${xpSection}
      ${eliteBadge}
      ${injuryBanner}
      ${closeCallBanner}

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
          <span class="stat-value">${Math.round(pilot.damageDealt).toLocaleString()}</span>
          <span class="stat-label">Dmg Dealt</span>
        </div>
        <div class="stat">
          <span class="stat-value">${Math.round(pilot.damageReceived).toLocaleString()}</span>
          <span class="stat-label">Dmg Recv</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.ejectionCount}</span>
          <span class="stat-label">Close Calls</span>
        </div>
      </div>

      ${unassignSection}
      ${shipOptions}
      ${storedShipOptions}
      ${noShipsMessage}
    </div>
  `;
}
