/**
 * Skill Rendering - shared utilities for displaying pilot skills.
 */

import type { CampaignState, Pilot, SkillLevel } from '../../../campaign/types';
import {
  isHumanControlled,
  isPlayerPilot,
} from '../../../multiplayer/ship-assignment';
import { capitalize } from '../../utils/text';

/** Skill levels in order */
export const SKILL_LEVELS: SkillLevel[] = [
  'rookie',
  'regular',
  'veteran',
  'ace',
  'elite',
];

/** Render segmented skill bar for a skill level */
export function renderSkillBar(skill: SkillLevel | undefined): string {
  const filledCount = skill ? SKILL_LEVELS.indexOf(skill) + 1 : 0;

  const segments = SKILL_LEVELS.map((level, i) => {
    const isFilled = i < filledCount;
    const isElite = level === 'elite';
    const classes = [
      'skill-segment',
      isFilled ? 'filled' : '',
      isElite ? 'elite' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<div class="${classes}" title="${level}"></div>`;
  }).join('');

  return `<div class="skill-bar">${segments}</div>`;
}

/** Format ship class name for display */
export function formatShipClass(shipClass: string): string {
  return capitalize(shipClass);
}

/** Check if pilot can fly a ship class (has skill, is commander, or is player) */
export function canPilotFlyShip(
  pilot: Pilot,
  shipClass: string,
  state: CampaignState,
): boolean {
  // Commander can fly any ship
  if (pilot.id === state.commanderId) return true;
  // Player-controlled pilots can fly any ship
  if (isPlayerPilot(pilot) && isHumanControlled(pilot)) return true;
  // AI wingmen need the skill
  return pilot.shipSkills[shipClass] !== undefined;
}
