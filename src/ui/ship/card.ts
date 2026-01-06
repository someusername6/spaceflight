/**
 * Ship Card Component - Compact ship cards for the flight list
 */

import type { OwnedShip } from '../../campaign/types';
import { SHIP_CLASSES } from '../../data/ships';
import { getShipAbbrev } from './viewer';

/** Get hull stats for a ship class */
export function getMaxHull(shipClass: string): number {
  const stats = SHIP_CLASSES[shipClass];
  return stats?.hull ?? 100;
}

/** Render a compact ship card for the list */
export function renderShipCard(
  ship: OwnedShip,
  isSelected: boolean,
  commanderId: string,
): string {
  const stats = SHIP_CLASSES[ship.shipClass];
  const maxHull = stats?.hull ?? 100;
  const currentHull = maxHull - ship.hullDamage;
  const hullPercent = Math.round((currentHull / maxHull) * 100);
  const isDamaged = ship.hullDamage > 0;
  const abbrev = getShipAbbrev(ship.shipClass);

  // Total bank counts from ship class stats
  const totalPrimary = stats?.primaryBanks.length ?? 0;
  const totalSecondary = stats?.secondaryBanks.length ?? 0;

  // Check if this is the commander's ship
  const isCommander = ship.pilot?.id === commanderId;
  const pilotName = ship.pilot?.name ?? 'Unassigned';

  // Don't show skill for commander
  const pilotSkill = isCommander || !ship.pilot ? '' : ` • ${ship.pilot.skill}`;

  const selectedClass = isSelected ? 'selected' : '';
  const commanderClass = isCommander ? 'commander-ship' : '';

  return `
    <div class="ship-card ${selectedClass} ${commanderClass}"
         data-ship-id="${ship.id}"
         data-ship-class="${ship.shipClass}">
      <div class="ship-card-icon">
        <span class="card-abbrev">${abbrev}</span>
      </div>
      <div class="ship-card-info">
        <div class="card-pilot">${pilotName}${pilotSkill}</div>
        <div class="card-class">${ship.shipClass}</div>
        <div class="card-hull ${isDamaged ? 'damaged' : ''}">
          <div class="hull-bar">
            <div class="hull-fill" style="width: ${hullPercent}%"></div>
          </div>
          <span class="hull-text">${hullPercent}%</span>
        </div>
      </div>
      <div class="ship-card-weapons">
        <span class="weapon-count primary">${totalPrimary}</span>
        <span class="weapon-count secondary">${totalSecondary}</span>
      </div>
    </div>
  `;
}
