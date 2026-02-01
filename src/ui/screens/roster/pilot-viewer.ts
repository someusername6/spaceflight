/**
 * Pilot Viewer - renders detailed pilot information and assignment options.
 */

import { COMBAT_SHIP_CLASSES } from '../../../campaign/constants';
import { getUpgradeCost } from '../../../campaign/pilot-skills';
import type {
  CampaignState,
  OwnedShip,
  Pilot,
  SkillLevel,
} from '../../../campaign/types';
import { canEditShip, isHost } from '../../../multiplayer/context-permissions';
import {
  isHumanControlled,
  isPlayerPilot,
} from '../../../multiplayer/ship-assignment';
import { getShipIconPath, iconErrorHandler } from '../../ship/viewer';

/** Render skill stars for a skill level */
function renderSkillStars(skill: SkillLevel): string {
  const levels: SkillLevel[] = ['rookie', 'regular', 'veteran', 'ace', 'elite'];
  const index = levels.indexOf(skill);
  return '★'.repeat(index + 1) + '☆'.repeat(4 - index);
}

/** Format ship class name for display */
function formatShipClass(shipClass: string): string {
  return shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
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
  const isPlayerControlled = isPlayerPilot(pilot) && isHumanControlled(pilot);
  const isAssigned = state.ships.some((s) => s.pilot?.id === pilot.id);
  const currentShip = state.ships.find((s) => s.pilot?.id === pilot.id);
  const availableShips = getAvailableShipsForPilot(state);

  // Get pilot's skill for current ship, or highest skill, or special display
  let rankText = 'PLAYER';
  if (isPlayerControlled) {
    // Human-controlled player pilot shows as PLAYER
    rankText = 'PLAYER';
  } else if (!isCommander) {
    const skills = Object.values(pilot.shipSkills);
    if (currentShip && pilot.shipSkills[currentShip.shipClass]) {
      rankText = (
        pilot.shipSkills[currentShip.shipClass] as string
      ).toUpperCase();
    } else if (skills.length > 0) {
      // Show highest skill level
      const skillOrder = ['rookie', 'regular', 'veteran', 'ace', 'elite'];
      const highest = skills.reduce(
        (best, s) =>
          skillOrder.indexOf(s ?? '') > skillOrder.indexOf(best ?? '')
            ? s
            : best,
        skills[0],
      );
      rankText = (highest as string)?.toUpperCase() ?? 'ROOKIE';
    } else {
      rankText = 'UNTRAINED';
    }
  }

  // XP pool display (roster wingmen only - not commander, not player pilots)
  const showXPSection = !isCommander && !isPlayerPilot(pilot);
  const xpSection = showXPSection
    ? `
      <div class="pilot-xp-section">
        <div class="xp-header">
          <span class="xp-label">Available XP</span>
          <span class="xp-value">${pilot.xp}</span>
        </div>
      </div>
    `
    : '';

  // Ship skills section (roster wingmen only - not commander, not player pilots)
  const showSkillsSection = !isCommander && !isPlayerPilot(pilot);
  const hostCanUpgrade = isHost();
  const shipSkillsSection = showSkillsSection
    ? `
      <div class="pilot-ship-skills">
        <div class="ship-skills-header">Ship Skills</div>
        <div class="ship-skills-grid">
          ${COMBAT_SHIP_CLASSES.map((shipClass) => {
            const skill = pilot.shipSkills[shipClass] as SkillLevel | undefined;
            const upgradeCost = getUpgradeCost(skill ?? null);
            const canAfford = pilot.xp >= upgradeCost;
            const isMaxed = skill === 'elite';
            const showButton = hostCanUpgrade && !isMaxed;
            const buttonLabel = skill ? 'Upgrade' : 'Unlock';
            const disabledAttr = canAfford ? '' : 'disabled';

            return `
              <div class="ship-skill-row">
                <span class="ship-skill-name">${formatShipClass(shipClass)}</span>
                ${
                  skill
                    ? `
                  <span class="ship-skill-stars">${renderSkillStars(skill)}</span>
                  <span class="ship-skill-label">${skill}</span>
                `
                    : `
                  <span class="ship-skill-untrained">Not Trained</span>
                `
                }
                ${
                  showButton
                    ? `
                  <button class="btn btn-small btn-upgrade-skill ${canAfford ? '' : 'btn-disabled'}"
                          data-pilot-id="${pilot.id}"
                          data-ship-class="${shipClass}"
                          ${disabledAttr}>
                    ${buttonLabel} (${upgradeCost} XP)
                  </button>
                `
                    : ''
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
    : '';

  // Commander badge (shown for commander only)
  const commanderBadge = isCommander
    ? `
      <div class="pilot-commander-badge">
        <span class="commander-icon">★</span>
        <span class="commander-text">Commander</span>
        <div class="commander-note">Ace on all ships • No salary</div>
      </div>
    `
    : '';

  // Player badge (shown for human-controlled player pilots)
  const playerBadge = isPlayerControlled
    ? `
      <div class="pilot-player-badge">
        <span class="player-icon">●</span>
        <span class="player-text">Player</span>
        <div class="player-note">Human-controlled • No salary</div>
      </div>
    `
    : '';

  // Elite badge (shown if pilot has any elite skills)
  const hasEliteSkill = Object.values(pilot.shipSkills).includes('elite');
  const eliteBadge =
    !isCommander && hasEliteSkill
      ? `
      <div class="pilot-elite-badge">
        <span class="elite-icon">★</span>
        <span class="elite-text">Elite Pilot</span>
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
  const canUnassign = canEditShip(pilot.id);
  const unassignDisabled = canUnassign
    ? ''
    : 'disabled title="You do not have permission to edit this ship"';
  const unassignSection =
    isAssigned && currentShip
      ? `
        <div class="pilot-unassign-section">
          <button class="btn btn-large btn-danger btn-unassign-pilot"
                  data-pilot="${pilot.id}"
                  data-ship="${currentShip.id}"
                  ${unassignDisabled}>
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

  // Dismiss button (host only, not for commander or player pilots)
  const canDismiss = !isCommander && !isPlayerPilot(pilot) && isHost();
  const dismissSection = canDismiss
    ? `
        <div class="pilot-dismiss-section">
          <button class="btn btn-danger btn-dismiss-pilot"
                  data-pilot-id="${pilot.id}"
                  data-pilot-name="${pilot.name}">
            Dismiss Pilot
          </button>
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

      ${commanderBadge}
      ${playerBadge}
      ${xpSection}
      ${shipSkillsSection}
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
      ${dismissSection}
    </div>
  `;
}
