/**
 * Ship Stats Renderer - shared stats display for hangar and store.
 */

import { SHIP_CLASSES } from '../../data/ships';

/** Options for rendering ship stats */
export interface ShipStatsOptions {
  /** CSS class prefix: 'detail' for hangar, 'stat' for store */
  classPrefix?: 'detail' | 'stat';
}

/**
 * Format bank sizes as colored shapes with counts.
 * Uses different shapes for accessibility (colorblind support):
 * - Primary banks: ● (filled circle)
 * - Secondary banks: ◆ (filled diamond)
 * Example: [2, 2, 1, 1, 1] → "●● ×2, ● ×3" (with color class)
 */
export function formatBankSizes(
  banks: number[],
  colorClass: string,
  shape: '●' | '◆' = '●',
): string {
  // Count occurrences of each bank size
  const counts = new Map<number, number>();
  for (const size of banks) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  // Sort by bank size descending (larger banks first)
  const sorted = [...counts.entries()].sort((a, b) => b[0] - a[0]);

  // Format each group with colored shapes (always show count)
  return sorted
    .map(([size, count]) => {
      const shapes = `<span class="${colorClass}">${shape.repeat(size)}</span>`;
      return `${shapes} ×${count}`;
    })
    .join(', ');
}

/** Render ship stats rows */
export function renderShipStatsRows(
  shipClass: string,
  options: ShipStatsOptions = {},
): string {
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];
  if (!stats) return '';

  const { classPrefix = 'stat' } = options;

  const primaryBankStr = formatBankSizes(
    stats.primaryBanks,
    'bank-dots-primary',
    '●',
  );
  const secondaryBankStr = formatBankSizes(
    stats.secondaryBanks,
    'bank-dots-secondary',
    '◆',
  );

  // Use appropriate class names based on prefix
  const rowClass = `${classPrefix}-row`;
  const labelClass = classPrefix === 'detail' ? 'detail-label' : '';
  const valueClass = classPrefix === 'detail' ? 'detail-value' : '';

  // Helper to create a row
  const row = (label: string, value: string) => {
    if (classPrefix === 'detail') {
      return `
        <div class="${rowClass}">
          <span class="${labelClass}">${label}</span>
          <span class="${valueClass}">${value}</span>
        </div>`;
    }
    return `<div class="${rowClass}"><span>${label}</span><span>${value}</span></div>`;
  };

  return `
    ${row('Hull', `${stats.hull}`)}
    ${row('Shields', `${stats.shields} (+${stats.shieldRegen}/s)`)}
    ${row('Speed', `${stats.maxSpeed} m/s`)}
    ${row('Turn rate', `${stats.turnRate}°/s`)}
    ${row('Acceleration', `${stats.acceleration} m/s²`)}
    ${row('Primary banks', primaryBankStr)}
    ${row('Secondary banks', secondaryBankStr)}
    ${row('Heat capacity', `${stats.maxHeat}`)}
    ${row('Cooling rate', `${stats.coolingRate}/s`)}
  `;
}
