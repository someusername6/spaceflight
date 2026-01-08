/**
 * Squadron List - Unified list component showing deployed, available, and recruits.
 */

import type { HireablePilot, OwnedShip, Pilot } from '../../campaign/types';
import { SHIP_CLASSES } from '../../data/ships';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';

/** List selection types */
export type ListSelection =
  | { type: 'none'; id: null }
  | { type: 'deployed'; id: string }
  | { type: 'available'; id: string }
  | { type: 'recruit'; id: string }
  | { type: 'ship'; id: string };

/** Render weapon status (e.g., "2/2" or "4/8") */
function renderWeaponStatus(ship: OwnedShip): {
  primary: string;
  secondary: string;
  primaryUnarmed: boolean;
  secondaryUnarmed: boolean;
} {
  const stats = SHIP_CLASSES[ship.shipClass];
  const totalPrimary = stats?.primaryBanks.length ?? 0;
  const totalSecondary = stats?.secondaryBanks.length ?? 0;
  const equippedPrimary = ship.primaryWeapons.filter((w) => w !== null).length;
  const equippedSecondary = ship.secondaryWeapons.filter(
    (w) => w !== null,
  ).length;

  return {
    primary: `${equippedPrimary}/${totalPrimary}`,
    secondary: `${equippedSecondary}/${totalSecondary}`,
    primaryUnarmed: equippedPrimary === 0 && totalPrimary > 0,
    secondaryUnarmed: equippedSecondary === 0 && totalSecondary > 0,
  };
}

/** Render a deployed item (pilot-ship pair) */
function renderDeployedItem(
  ship: OwnedShip,
  isSelected: boolean,
  isCommander: boolean,
): string {
  const pilot = ship.pilot;
  if (!pilot) return '';

  const weapons = renderWeaponStatus(ship);
  const selectedClass = isSelected ? 'selected' : '';
  const commanderClass = isCommander ? 'commander' : '';
  const iconPath = getShipIconPath(ship.shipClass);

  return `
    <article
      class="squadron-item deployed ${selectedClass} ${commanderClass}"
      data-deployed-id="${ship.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${pilot.name}, ${ship.shipClass}"
    >
      <div class="squadron-item-icon">
        <img src="${iconPath}" alt="${ship.shipClass}" class="squadron-ship-icon" onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'" />
      </div>
      <div class="squadron-item-info">
        <div class="squadron-item-name">${isCommander ? '<span class="commander-icon" aria-label="Commander">★</span>' : ''}${pilot.name}</div>
        <div class="squadron-item-ship">${ship.shipClass}</div>
      </div>
      <div class="squadron-item-weapons">
        <span class="weapon-count primary ${weapons.primaryUnarmed ? 'unarmed' : ''}">${weapons.primary}</span>
        <span class="weapon-count secondary ${weapons.secondaryUnarmed ? 'unarmed' : ''}">${weapons.secondary}</span>
      </div>
    </article>
  `;
}

/** Render an available pilot item */
function renderAvailableItem(
  pilot: Pilot,
  isSelected: boolean,
  isCommander: boolean,
): string {
  const selectedClass = isSelected ? 'selected' : '';
  const commanderClass = isCommander ? 'commander' : '';

  return `
    <article
      class="squadron-item available ${selectedClass} ${commanderClass}"
      data-pilot-id="${pilot.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${pilot.name}, available"
    >
      <div class="squadron-item-icon">
        <img src="${FALLBACK_ICON_PATH}" alt="No ship" class="squadron-ship-icon squadron-ship-icon-empty" />
      </div>
      <div class="squadron-item-info">
        <div class="squadron-item-name">${isCommander ? '<span class="commander-icon" aria-label="Commander">★</span>' : ''}${pilot.name}</div>
        <div class="squadron-item-status">Available</div>
      </div>
    </article>
  `;
}

/** Render a recruit item */
function renderRecruitItem(
  recruit: HireablePilot,
  isSelected: boolean,
  canAfford: boolean,
): string {
  const selectedClass = isSelected ? 'selected' : '';
  const affordClass = canAfford ? '' : 'unaffordable';
  const skillClass = recruit.skill.toLowerCase();

  return `
    <article
      class="squadron-item recruit ${selectedClass} ${affordClass}"
      data-recruit-id="${recruit.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${recruit.name}, ${recruit.skill} pilot, ${recruit.price} credits${canAfford ? '' : ', cannot afford'}"
    >
      <div class="squadron-item-info">
        <div class="squadron-item-name">${recruit.name}</div>
        <div class="squadron-item-status ${skillClass}">${recruit.skill}</div>
      </div>
      <div class="squadron-item-price">${recruit.price} cr</div>
    </article>
  `;
}

/** Render the complete squadron list */
export function renderSquadronList(
  ships: OwnedShip[],
  pilots: Pilot[],
  recruits: HireablePilot[],
  commanderId: string,
  credits: number,
  selection: ListSelection,
): string {
  // Deployed: ships with pilots
  const deployedShips = ships.filter((s) => s.pilot !== null);
  const deployedHtml = deployedShips
    .map((ship) => {
      const isSelected =
        selection.type === 'deployed' && selection.id === ship.id;
      const isCommander = ship.pilot?.id === commanderId;
      return renderDeployedItem(ship, isSelected, isCommander);
    })
    .join('');

  // Available: pilots without ships
  const assignedPilotIds = new Set<string>();
  for (const ship of ships) {
    if (ship.pilot) {
      assignedPilotIds.add(ship.pilot.id);
    }
  }
  const availablePilots = pilots.filter((p) => !assignedPilotIds.has(p.id));
  const availableHtml = availablePilots
    .map((pilot) => {
      const isSelected =
        selection.type === 'available' && selection.id === pilot.id;
      const isCommander = pilot.id === commanderId;
      return renderAvailableItem(pilot, isSelected, isCommander);
    })
    .join('');

  // Recruits
  const recruitsHtml = recruits
    .map((recruit) => {
      const isSelected =
        selection.type === 'recruit' && selection.id === recruit.id;
      const canAfford = credits >= recruit.price;
      return renderRecruitItem(recruit, isSelected, canAfford);
    })
    .join('');

  // Build sections
  const deployedSection =
    deployedShips.length > 0
      ? `
        <div class="squadron-section">
          <header class="panel-header">
            <span class="panel-icon" aria-hidden="true">◈</span>
            <span class="panel-title">Deployed</span>
            <span class="panel-count" aria-label="${deployedShips.length} deployed">${deployedShips.length}</span>
          </header>
          <div class="squadron-items" role="listbox" aria-label="Deployed pilots">
            ${deployedHtml}
          </div>
        </div>
      `
      : '';

  const availableSection =
    availablePilots.length > 0
      ? `
        <div class="squadron-section">
          <header class="panel-header available-header">
            <span class="panel-icon" aria-hidden="true">★</span>
            <span class="panel-title">Available</span>
            <span class="panel-count" aria-label="${availablePilots.length} available">${availablePilots.length}</span>
          </header>
          <div class="squadron-items" role="listbox" aria-label="Available pilots">
            ${availableHtml}
          </div>
        </div>
      `
      : '';

  const recruitsSection =
    recruits.length > 0
      ? `
        <div class="squadron-section">
          <header class="panel-header recruits-header">
            <span class="panel-icon" aria-hidden="true">+</span>
            <span class="panel-title">Recruits</span>
            <span class="panel-count" aria-label="${recruits.length} recruits">${recruits.length}</span>
          </header>
          <div class="squadron-items" role="listbox" aria-label="Available recruits">
            ${recruitsHtml || '<div class="no-recruits">No recruits available</div>'}
          </div>
        </div>
      `
      : '';

  return `
    <aside class="squadron-list" aria-label="Squadron list">
      ${deployedSection}
      ${availableSection}
      ${recruitsSection}
    </aside>
  `;
}
