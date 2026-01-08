/**
 * Recruit Viewer - renders hireable pilot details and hire option.
 */

import type {
  CampaignState,
  HireablePilot,
  SkillLevel,
} from '../../campaign/types';

/** Get skill description for display */
function getSkillDescription(skill: SkillLevel): string {
  switch (skill) {
    case 'rookie':
      return 'New to combat. Lower accuracy and slower reactions, but eager to prove themselves.';
    case 'regular':
      return 'Competent pilot with solid fundamentals. Reliable in standard engagements.';
    case 'veteran':
      return 'Battle-hardened with excellent situational awareness. Rarely misses a shot.';
    case 'ace':
      return 'Elite combatant with exceptional skills. Deadly accurate with lightning reflexes.';
    case 'elite':
      return 'Legendary pilot. Masters of evasion and precision. Worth every credit.';
    default:
      return 'Standard combat training.';
  }
}

/** Render recruit viewer with details and hire button */
export function renderRecruitViewer(
  recruit: HireablePilot,
  state: CampaignState,
): string {
  const canAfford = state.credits >= recruit.price;

  return `
    <div class="recruit-viewer">
      <div class="recruit-viewer-header">
        <div class="recruit-header-info">
          <div class="recruit-viewer-name">${recruit.name}</div>
          <div class="recruit-rank">${recruit.skill.toUpperCase()}</div>
        </div>
      </div>

      <div class="recruit-description">
        <div class="recruit-description-title">Profile</div>
        <div class="recruit-description-text">${getSkillDescription(recruit.skill)}</div>
      </div>

      <div class="recruit-hire-section">
        <div class="recruit-price-large">
          ${recruit.price.toLocaleString()}<span class="currency">cr</span>
        </div>
        <button
          class="btn btn-large btn-success btn-hire-pilot"
          id="btn-hire-recruit"
          data-recruit-id="${recruit.id}"
          ${canAfford ? '' : 'disabled'}
        >
          Hire Pilot
        </button>
        ${canAfford ? '' : '<div class="recruit-hire-note error">Insufficient credits</div>'}
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
      aria-label="${recruit.name}, ${recruit.skill} pilot, ${recruit.price} credits${canAfford ? '' : ', cannot afford'}"
    >
      <div class="roster-pilot-info">
        <div class="roster-pilot-name">${recruit.name}</div>
        <div class="roster-pilot-status ${skillClass}">${recruit.skill}</div>
      </div>
      <div class="recruit-price">${recruit.price} cr</div>
    </article>
  `;
}
