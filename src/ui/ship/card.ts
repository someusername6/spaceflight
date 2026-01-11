/**
 * Ship Card Component - Compact ship cards for the flight list
 */

import { countOccupied } from '../../campaign/slot-array';
import type { OwnedShip } from '../../campaign/types';
import { SHIP_CLASSES } from '../../data/ships';
import { getShipAbbrev, getShipIconPath, iconErrorHandler } from './viewer';

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
  const abbrev = getShipAbbrev(ship.shipClass);

  // Total bank counts from ship class stats
  const totalPrimary = stats?.primaryBanks.length ?? 0;
  const totalSecondary = stats?.secondaryBanks.length ?? 0;

  // Equipped weapon counts (count non-null slots)
  const equippedPrimary = countOccupied(ship.primaryWeapons);
  const equippedSecondary = countOccupied(ship.secondaryWeapons);

  // Warning states for unarmed slots
  const primaryUnarmed = equippedPrimary === 0 && totalPrimary > 0;
  const secondaryUnarmed = equippedSecondary === 0 && totalSecondary > 0;

  // Check if this is the commander's ship
  const isCommander = ship.pilot?.id === commanderId;
  const pilotName = ship.pilot?.name ?? 'Unassigned';

  const selectedClass = isSelected ? 'selected' : '';
  const commanderClass = isCommander ? 'commander-ship' : '';

  const iconPath = getShipIconPath(ship.shipClass);

  return `
    <div class="ship-card ${selectedClass} ${commanderClass}"
         data-ship-id="${ship.id}"
         data-ship-class="${ship.shipClass}">
      <div class="ship-card-icon">
        <img src="${iconPath}" alt="${abbrev}" class="card-icon-svg" ${iconErrorHandler()} />
      </div>
      <div class="ship-card-info">
        <div class="card-pilot">${pilotName}</div>
        <div class="card-class">${ship.shipClass}</div>
      </div>
      <div class="ship-card-weapons">
        <span class="weapon-count primary ${primaryUnarmed ? 'unarmed' : ''}">${equippedPrimary}/${totalPrimary}</span>
        <span class="weapon-count secondary ${secondaryUnarmed ? 'unarmed' : ''}">${equippedSecondary}/${totalSecondary}</span>
      </div>
    </div>
  `;
}
