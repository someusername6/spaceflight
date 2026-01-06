/**
 * Ship Viewer Component - Visual ship display with hardpoint management.
 *
 * Renders a central ship display with interactive hardpoint slots for
 * equipping/unequipping weapons.
 */

import { getMaxAmmoCapacity } from '../../campaign/store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
} from '../../campaign/types';
import { weaponUsesAmmo } from '../../data/prices';
import { SHIP_CLASSES } from '../../data/ships';
import { PRIMARY_WEAPONS } from '../../data/weapons';
import { renderShipActions } from './actions';

/** Get 3-letter abbreviation for ship class */
export function getShipAbbrev(shipClass: string): string {
  const abbrevs: Record<string, string> = {
    patrol: 'PTR',
    scout: 'SCT',
    fighter: 'FTR',
    interceptor: 'INT',
    striker: 'STR',
    bomber: 'BMR',
    defender: 'DEF',
    raider: 'RAI',
    sentinel: 'SNT',
  };
  return (
    abbrevs[shipClass.toLowerCase()] ?? shipClass.substring(0, 3).toUpperCase()
  );
}

/** Get weapon abbreviation for slot display */
export function getWeaponAbbrev(weaponType: string): string {
  const abbrevs: Record<string, string> = {
    plasma: 'PLS',
    pulse: 'PUL',
    ion: 'ION',
    autocannon: 'AUT',
    railgun: 'RAI',
    flak: 'FLK',
    redlaser: 'RED',
    greenlaser: 'GRN',
    bluelaser: 'BLU',
    lightning: 'LTN',
    nuclearlance: 'NUK',
  };
  return (
    abbrevs[weaponType.toLowerCase()] ??
    weaponType.substring(0, 3).toUpperCase()
  );
}

/** Get missile abbreviation */
export function getMissileAbbrev(missileType: string): string {
  const abbrevs: Record<string, string> = {
    rocket: 'RKT',
    cluster: 'CLU',
    seeker: 'SKR',
    dart: 'DRT',
    swarm: 'SWM',
    torpedo: 'TRP',
    nuke: 'NUK',
    decoy: 'DCY',
  };
  return (
    abbrevs[missileType.toLowerCase()] ??
    missileType.substring(0, 3).toUpperCase()
  );
}

/** Get weapon category color */
function getWeaponColor(weaponType: string): string {
  const stats = PRIMARY_WEAPONS[weaponType.toLowerCase()];
  if (!stats) return 'var(--color-secondary)';

  switch (stats.category) {
    case 'energy':
      return 'var(--color-primary)';
    case 'ballistic':
      return 'var(--color-warning)';
    case 'beam':
      return 'var(--color-danger)';
    default:
      return 'var(--color-secondary)';
  }
}

/** Get missile color */
function getMissileColor(_missileType: string): string {
  // All secondary weapons use red for consistent color scheme
  return 'var(--color-danger)';
}

/** Fallback icon path for missing SVGs */
export const FALLBACK_ICON_PATH = '/icons/fallback.svg';

/** Get path to ship icon SVG */
export function getShipIconPath(shipClass: string): string {
  return `/icons/ships/${shipClass.toLowerCase()}.svg`;
}

/** Get path to weapon icon SVG */
export function getWeaponIconPath(weaponType: string): string {
  return `/icons/weapons/${weaponType.toLowerCase()}.svg`;
}

/** Get path to missile icon SVG */
export function getMissileIconPath(missileType: string): string {
  return `/icons/missiles/${missileType.toLowerCase()}.svg`;
}

/** Generate onerror handler for fallback icon */
function iconErrorHandler(): string {
  return `onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'"`;
}

/** Render ship icon using SVG */
function renderShipIcon(shipClass: string): string {
  const iconPath = getShipIconPath(shipClass);

  return `
    <div class="ship-icon-large">
      <img src="${iconPath}" alt="${shipClass}" class="ship-icon-svg" ${iconErrorHandler()} />
    </div>
  `;
}

/** Get hardpoint positions for a ship class from ship stats */
function getHardpointPositions(shipClass: string): {
  primary: number[];
  secondary: number[];
} {
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];
  if (stats) {
    return {
      primary: stats.primaryPositions,
      secondary: stats.secondaryPositions,
    };
  }
  return { primary: [50], secondary: [50] };
}

/** Render the complete ship viewer - TOP/BOTTOM SCHEMATIC LAYOUT */
export function renderShipViewer(
  ship: OwnedShip,
  state: CampaignState,
): string {
  const stats = SHIP_CLASSES[ship.shipClass.toLowerCase()];
  if (!stats) return '<div class="ship-viewer-error">Unknown ship class</div>';

  // Check if this is the commander's ship
  const isCommander = ship.pilot?.id === state.commanderId;

  const pilotName = ship.pilot?.name.toUpperCase() ?? 'NO PILOT';

  // Don't show skill for commander
  const pilotSkill =
    isCommander || !ship.pilot ? '' : ` • ${ship.pilot.skill.toUpperCase()}`;

  const positions = getHardpointPositions(ship.shipClass);

  // Render primary weapon slots (TOP - front of ship)
  const primarySlots = stats.primaryBanks
    .map((bankSize, i) => {
      const weapon = ship.primaryWeapons[i] ?? null;
      const xPos = positions.primary[i] ?? 50;
      return renderSchematicSlot(weapon, i, bankSize, ship.id, 'primary', xPos);
    })
    .join('');

  // Render secondary weapon slots (BOTTOM - back of ship)
  const secondarySlots = stats.secondaryBanks
    .map((bankSize, i) => {
      const weapon = ship.secondaryWeapons[i] ?? null;
      const xPos = positions.secondary[i] ?? 50;
      return renderSchematicSlot(
        weapon,
        i,
        bankSize,
        ship.id,
        'secondary',
        xPos,
      );
    })
    .join('');

  return `
    <div class="ship-viewer schematic">
      <div class="schematic-header">
        <div class="schematic-header-left">
          <span class="schematic-class">${ship.shipClass.toUpperCase()}</span>
          <span class="schematic-pilot">${pilotName}${pilotSkill}</span>
        </div>
        <div class="schematic-header-right"></div>
      </div>

      <div class="schematic-diagram vertical">
        <div class="hardpoint-row primary-row">
          <div class="row-label">PRIMARY</div>
          <div class="row-slots">
            ${primarySlots}
          </div>
        </div>

        <div class="schematic-center">
          ${renderShipIcon(ship.shipClass)}
        </div>

        <div class="hardpoint-row secondary-row">
          <div class="row-slots">
            ${secondarySlots}
          </div>
          <div class="row-label">SECONDARY</div>
        </div>
      </div>

      ${renderShipActions(ship, state)}
    </div>
  `;
}

/** Render a schematic slot with connecting line */
function renderSchematicSlot(
  weapon: EquippedPrimary | EquippedSecondary | null,
  bankIndex: number,
  bankSize: number,
  shipId: string,
  slotType: 'primary' | 'secondary',
  xPosition: number,
): string {
  const isEmpty = !weapon;
  const isPrimary = slotType === 'primary';
  const weaponType = weapon
    ? isPrimary
      ? (weapon as EquippedPrimary).weaponType
      : (weapon as EquippedSecondary).weaponType
    : '';
  const color = weapon
    ? isPrimary
      ? getWeaponColor(weaponType)
      : getMissileColor(weaponType)
    : '';

  // Capacity/ammo info
  let capacityInfo = '';
  if (weapon) {
    if (isPrimary) {
      const primary = weapon as EquippedPrimary;
      if (weaponUsesAmmo(primary.weaponType)) {
        const current = primary.currentAmmo ?? 0;
        const max = getMaxAmmoCapacity(primary.weaponType, primary.bankSize);
        capacityInfo = `<span class="slot-capacity">${current}/${max}</span>`;
      }
    } else {
      const secondary = weapon as EquippedSecondary;
      capacityInfo = `<span class="slot-capacity">${secondary.count}/${secondary.maxCount}</span>`;
    }
  }

  // Render weapon display: SVG icon for both primaries and secondaries
  let weaponDisplay = '';
  if (isEmpty) {
    weaponDisplay = `<span class="slot-empty-icon">+</span>`;
  } else if (isPrimary) {
    const iconPath = getWeaponIconPath(weaponType);
    weaponDisplay = `<img src="${iconPath}" alt="${weaponType}" class="slot-weapon-icon" ${iconErrorHandler()} />`;
  } else {
    const iconPath = getMissileIconPath(weaponType);
    weaponDisplay = `<img src="${iconPath}" alt="${weaponType}" class="slot-missile-icon" ${iconErrorHandler()} />`;
  }

  return `
    <div class="schematic-slot ${slotType} ${isEmpty ? 'empty' : 'filled'}"
         data-ship="${shipId}"
         data-type="${slotType}"
         data-index="${bankIndex}"
         data-weapon="${weaponType}"
         style="--slot-x: ${xPosition}%; ${weapon ? `--slot-color: ${color}` : ''}">
      <div class="slot-connector"></div>
      <div class="slot-content">
        ${weaponDisplay}
        <span class="slot-size">×${bankSize}</span>
        ${capacityInfo}
      </div>
    </div>
  `;
}
