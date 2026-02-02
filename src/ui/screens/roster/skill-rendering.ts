/**
 * Skill Rendering - shared utilities for displaying pilot skills.
 */

import type { SkillLevel } from '../../../campaign/types';

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
  return shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
}
