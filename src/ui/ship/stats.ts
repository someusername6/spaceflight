/**
 * Ship Stats Renderer - shared stats display for hangar and store.
 */

import { SHIP_CLASSES } from '../../data/ships';

/** Options for rendering ship stats */
export interface ShipStatsOptions {
  /** Current hull damage (0 if new/undamaged) */
  hullDamage?: number;
  /** CSS class prefix: 'detail' for hangar, 'stat' for store */
  classPrefix?: 'detail' | 'stat';
}

/** Render ship stats rows */
export function renderShipStatsRows(
  shipClass: string,
  options: ShipStatsOptions = {},
): string {
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];
  if (!stats) return '';

  const { hullDamage = 0, classPrefix = 'stat' } = options;

  const maxHull = stats.hull;
  const currentHull = maxHull - hullDamage;
  const hullPercent = Math.round((currentHull / maxHull) * 100);

  const primaryBankStr = stats.primaryBanks.join(', ');
  const secondaryBankStr = stats.secondaryBanks.join(', ');

  // Use appropriate class names based on prefix
  const rowClass = `${classPrefix}-row`;
  const labelClass = classPrefix === 'detail' ? 'detail-label' : '';
  const valueClass = classPrefix === 'detail' ? 'detail-value' : '';
  const dividerClass = `${classPrefix}-divider`;

  // Helper to create a row
  const row = (label: string, value: string, extraClass = '') => {
    if (classPrefix === 'detail') {
      return `
        <div class="${rowClass}">
          <span class="${labelClass}">${label}</span>
          <span class="${valueClass} ${extraClass}">${value}</span>
        </div>`;
    }
    return `<div class="${rowClass}"><span>${label}</span><span>${value}</span></div>`;
  };

  // Hull display varies: show damage for owned ships, just max for store
  const hullValue = hullDamage > 0 ? `${currentHull}/${maxHull}` : `${maxHull}`;
  const hullClass = hullPercent < 100 ? 'damaged' : '';

  return `
    ${row('Hull', hullValue, hullClass)}
    ${row('Shields', `${stats.shields} (+${stats.shieldRegen}/s)`)}
    ${row('Speed', `${stats.maxSpeed} m/s`)}
    ${row('Turn rate', `${stats.turnRate}°/s`)}
    ${row('Acceleration', `${stats.acceleration} m/s²`)}
    <div class="${dividerClass}"></div>
    ${row('Primary banks', `${stats.primaryBanks.length} (${primaryBankStr})`)}
    ${row('Secondary banks', `${stats.secondaryBanks.length} (${secondaryBankStr})`)}
    ${row('Heat capacity', `${stats.maxHeat}`)}
    ${row('Cooling rate', `${stats.coolingRate}/s`)}
  `;
}
