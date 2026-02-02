/**
 * Recruit Viewer - renders hireable pilot details and hire option.
 */

import { getUnlockedShipClasses } from '../../../campaign/store/store-unlocks';
import type {
  CampaignState,
  HireablePilot,
  SkillLevel,
} from '../../../campaign/types';
import { isHost } from '../../../multiplayer/context-permissions';
import { formatShipClass, renderSkillBar } from './skill-rendering';

/** Render recruit viewer with details and hire button */
export function renderRecruitViewer(
  recruit: HireablePilot,
  state: CampaignState,
): string {
  const canAfford = state.credits >= recruit.price;
  const hostOnly = !isHost();
  const canHire = canAfford && !hostOnly;
  const hireDisabled = canHire
    ? ''
    : hostOnly
      ? 'disabled title="Only the host can hire recruits"'
      : 'disabled';

  // XP section showing bonus XP the recruit brings
  const xpSection = `
    <div class="pilot-xp-section">
      <div class="xp-header">
        <span class="xp-label">Bonus XP</span>
        <span class="xp-value">${recruit.bonusXP}</span>
      </div>
    </div>
  `;

  // Ship skills section (read-only, no upgrade buttons)
  const unlockedShips = getUnlockedShipClasses(state.currentSector);
  const shipSkillsSection = `
    <div class="pilot-ship-skills">
      <div class="ship-skills-header">Ship Skills</div>
      <div class="ship-skills-grid">
        ${unlockedShips
          .map((shipClass) => {
            // Recruit only has skill on their starting ship
            const skill =
              shipClass === recruit.startingShip
                ? (recruit.skill as SkillLevel)
                : undefined;

            return `
            <div class="ship-skill-row recruit-skill-row">
              <span class="ship-skill-name">${formatShipClass(shipClass)}</span>
              <div class="ship-skill-bar-container">
                ${renderSkillBar(skill)}
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>
  `;

  return `
    <div class="recruit-viewer">
      <div class="recruit-viewer-header">
        <div class="recruit-header-info">
          <div class="recruit-viewer-name">${recruit.name}</div>
          <div class="recruit-rank">${recruit.skill.toUpperCase()}</div>
        </div>
      </div>

      ${xpSection}
      ${shipSkillsSection}

      <div class="recruit-hire-section">
        <div class="recruit-price-large${canAfford ? '' : ' expensive'}">
          ${recruit.price.toLocaleString()}<span class="currency">cr</span>
        </div>
        <button
          class="btn btn-large btn-success btn-hire-pilot"
          id="btn-hire-recruit"
          data-recruit-id="${recruit.id}"
          ${hireDisabled}
        >
          Hire Pilot
        </button>
      </div>
    </div>
  `;
}

/** Render a recruit card for the list (matches pilot card structure) */
export function renderRecruitCard(
  recruit: HireablePilot,
  isSelected: boolean,
  canAfford: boolean,
): string {
  const selectedClass = isSelected ? 'selected' : '';
  const affordClass = canAfford ? '' : 'unaffordable';
  const skillClass = recruit.skill.toLowerCase();

  return `
    <article
      class="roster-pilot-card recruit-card ${selectedClass} ${affordClass}"
      data-recruit-id="${recruit.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${recruit.name}, ${recruit.skill} ${recruit.startingShip} pilot, ${recruit.price} credits${canAfford ? '' : ', cannot afford'}"
    >
      <div class="roster-pilot-info">
        <div class="roster-pilot-name">${recruit.name}</div>
        <div class="roster-pilot-status ${skillClass}">${recruit.skill} ${formatShipClass(recruit.startingShip)}</div>
      </div>
      <div class="recruit-price">${recruit.price} cr</div>
    </article>
  `;
}
