/**
 * Tooltip System - Hover tooltips for ships, weapons, and missiles.
 *
 * Provides data-rich stat displays on hover with tactical styling.
 */

import { MISSILES } from '../data/missiles';
import { PRIMARY_WEAPONS } from '../data/weapons';

/** Global tooltip element (singleton) */
let tooltipElement: HTMLElement | null = null;

/** Create or get the tooltip element */
function getTooltipElement(): HTMLElement {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'stat-tooltip';
    tooltipElement.style.display = 'none';
    document.body.appendChild(tooltipElement);
  }
  return tooltipElement;
}

/** Position tooltip near cursor, staying on screen */
function positionTooltip(e: MouseEvent): void {
  const tooltip = getTooltipElement();
  const padding = 15;
  const rect = tooltip.getBoundingClientRect();

  let x = e.clientX + padding;
  let y = e.clientY + padding;

  // Keep on screen horizontally
  if (x + rect.width > window.innerWidth - padding) {
    x = e.clientX - rect.width - padding;
  }

  // Keep on screen vertically
  if (y + rect.height > window.innerHeight - padding) {
    y = e.clientY - rect.height - padding;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

/** Show tooltip with content */
export function showTooltip(content: string, e: MouseEvent): void {
  const tooltip = getTooltipElement();
  tooltip.innerHTML = content;
  tooltip.style.display = 'block';
  positionTooltip(e);
}

/** Hide tooltip */
export function hideTooltip(): void {
  const tooltip = getTooltipElement();
  tooltip.style.display = 'none';
}

/** Update tooltip position on mouse move */
export function updateTooltipPosition(e: MouseEvent): void {
  const tooltip = getTooltipElement();
  if (tooltip.style.display !== 'none') {
    positionTooltip(e);
  }
}

/** Format a stat row for tooltip */
function statRow(label: string, value: string | number, unit = ''): string {
  return `<div class="tooltip-stat"><span class="tooltip-label">${label}</span><span class="tooltip-value">${value}${unit}</span></div>`;
}

/** Format a header row */
function headerRow(title: string, subtitle?: string): string {
  return `
    <div class="tooltip-header">
      <div class="tooltip-title">${title}</div>
      ${subtitle ? `<div class="tooltip-subtitle">${subtitle}</div>` : ''}
    </div>
  `;
}

/** Format a divider */
function divider(): string {
  return '<div class="tooltip-divider"></div>';
}

/** Get weapon category display name */
function categoryName(category: string): string {
  const names: Record<string, string> = {
    energy: 'Energy Weapon',
    ballistic: 'Ballistic Weapon',
    beam: 'Beam Weapon',
  };
  return names[category] ?? category;
}

/** Generate tooltip content for a primary weapon */
export function weaponTooltipContent(weaponType: string): string {
  const stats = PRIMARY_WEAPONS[weaponType.toLowerCase()];
  if (!stats) return `<div class="tooltip-header">${weaponType}</div>`;

  const dps =
    stats.category === 'beam'
      ? stats.damage
      : Math.round(stats.damage / stats.fireRate);

  const ammoInfo =
    stats.ammo !== undefined ? `${stats.ammo} rounds` : '∞ Unlimited';

  return `
    ${headerRow(stats.name.toUpperCase(), categoryName(stats.category))}
    ${divider()}
    ${statRow('Damage', stats.damage)}
    ${statRow('DPS', `~${dps}`)}
    ${stats.category !== 'beam' ? statRow('Fire Rate', `${Math.round(1 / stats.fireRate)}/s`) : ''}
    ${statRow('Range', stats.range, 'm')}
    ${statRow('Heat', stats.heatPerShot, '/shot')}
    ${divider()}
    ${statRow('Ammo', ammoInfo)}
    ${stats.category !== 'beam' ? statRow('Velocity', stats.projectileSpeed, ' m/s') : ''}
    ${stats.flakRadius ? statRow('Blast Radius', stats.flakRadius, 'm') : ''}
    ${stats.autoaimFov ? statRow('Auto-Aim', stats.autoaimFov, '° cone') : ''}
  `;
}

/** Generate tooltip content for a missile/secondary */
export function missileTooltipContent(missileType: string): string {
  const stats = MISSILES[missileType.toLowerCase()];
  if (!stats) return `<div class="tooltip-header">${missileType}</div>`;

  const lockInfo = stats.requiresLock
    ? `${(1 / stats.lockSpeed).toFixed(1)}s`
    : 'None';

  const typeLabel = stats.isDecoy
    ? 'Countermeasure'
    : stats.requiresLock
      ? 'Homing Missile'
      : 'Dumbfire Missile';

  return `
    ${headerRow(stats.name.toUpperCase(), typeLabel)}
    ${divider()}
    ${!stats.isDecoy ? statRow('Damage', stats.damage) : ''}
    ${statRow('Speed', stats.speed, ' m/s')}
    ${stats.turnRate > 0 ? statRow('Tracking', stats.turnRate, '°/s') : ''}
    ${!stats.isDecoy ? statRow('Range', stats.range, 'm') : ''}
    ${divider()}
    ${statRow('Lock Time', lockInfo)}
    ${statRow('Capacity', stats.capacity, '/bank')}
    ${stats.aoeRadius ? statRow('Blast Radius', stats.aoeRadius, 'm') : ''}
    ${stats.isDecoy ? '<div class="tooltip-note">Distracts incoming missiles</div>' : ''}
  `;
}

/** Bind tooltip events to an element */
export function bindTooltip(
  element: HTMLElement,
  contentFn: () => string,
): void {
  element.addEventListener('mouseenter', (e) => {
    showTooltip(contentFn(), e as MouseEvent);
  });

  element.addEventListener('mousemove', (e) => {
    updateTooltipPosition(e as MouseEvent);
  });

  element.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}
