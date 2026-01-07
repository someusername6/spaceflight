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
import { type Hardpoint, SHIP_CLASSES } from '../../data/ships';
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

/** Group hardpoints by row for multi-row rendering */
function groupHardpointsByRow(
  hardpoints: Hardpoint[],
): Map<number, Hardpoint[]> {
  const rows = new Map<number, Hardpoint[]>();
  for (const hp of hardpoints) {
    const rowList = rows.get(hp.row) ?? [];
    rowList.push(hp);
    rows.set(hp.row, rowList);
  }
  return rows;
}

/** Render rows of hardpoint slots */
function renderHardpointRows(
  hardpoints: Hardpoint[],
  banks: number[],
  weapons: (EquippedPrimary | EquippedSecondary | null)[],
  shipId: string,
  slotType: 'primary' | 'secondary',
): string {
  const rows = groupHardpointsByRow(hardpoints);
  const sortedRowNums = [...rows.keys()].sort((a, b) => a - b);

  return sortedRowNums
    .map((rowNum) => {
      const rowHardpoints = rows.get(rowNum) ?? [];
      const slots = rowHardpoints
        .map((hp) => {
          // Find global bank index for this hardpoint
          const globalIdx = hardpoints.indexOf(hp);
          const bankSize = banks[globalIdx] ?? 1;
          const weapon = weapons[globalIdx] ?? null;
          return renderSchematicSlot(
            weapon,
            globalIdx,
            bankSize,
            shipId,
            slotType,
            hp,
          );
        })
        .join('');

      return `<div class="row-slots" data-row="${rowNum}">${slots}</div>`;
    })
    .join('');
}

/** Render the schematic diagram (shared between viewer and preview) */
function renderSchematicDiagram(ship: OwnedShip): string {
  const stats = SHIP_CLASSES[ship.shipClass.toLowerCase()];
  if (!stats) return '';

  const primaryRows = renderHardpointRows(
    stats.primaryHardpoints,
    stats.primaryBanks,
    ship.primaryWeapons,
    ship.id,
    'primary',
  );

  const secondaryRows = renderHardpointRows(
    stats.secondaryHardpoints,
    stats.secondaryBanks,
    ship.secondaryWeapons,
    ship.id,
    'secondary',
  );

  return `
    <div class="schematic-diagram vertical">
      <div class="hardpoint-row primary-row">
        ${primaryRows}
      </div>

      <div class="schematic-center">
        ${renderShipIcon(ship.shipClass)}
      </div>

      <div class="hardpoint-row secondary-row">
        ${secondaryRows}
      </div>
    </div>
  `;
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
  const pilotSkill =
    isCommander || !ship.pilot ? '' : ` • ${ship.pilot.skill.toUpperCase()}`;

  // View in Roster button (only if pilot assigned)
  const viewPilotBtn = ship.pilot
    ? `<button class="btn btn-small btn-view-pilot" data-pilot="${ship.pilot.id}">View</button>`
    : '';

  return `
    <div class="ship-viewer schematic">
      <div class="schematic-header">
        <div class="schematic-header-left">
          <span class="schematic-class">${ship.shipClass.toUpperCase()}</span>
          <span class="schematic-pilot">${pilotName}${pilotSkill}${viewPilotBtn}</span>
        </div>
        <div class="schematic-header-right"></div>
      </div>

      ${renderSchematicDiagram(ship)}

      ${renderShipActions(ship, state)}
    </div>
  `;
}

/** Render a read-only ship preview (for roster screen) */
export function renderShipPreview(ship: OwnedShip): string {
  const stats = SHIP_CLASSES[ship.shipClass.toLowerCase()];
  if (!stats) return '<div class="ship-preview-error">Unknown ship class</div>';

  return `
    <div class="ship-viewer schematic ship-preview readonly">
      ${renderSchematicDiagram(ship)}
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
  hardpoint: Hardpoint,
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

  // Render weapon display: SVG icons repeated based on bank size
  let weaponDisplay = '';
  if (isEmpty) {
    // Show + for each empty slot in the bank
    weaponDisplay = Array(bankSize)
      .fill('<span class="slot-empty-icon">+</span>')
      .join('');
  } else if (isPrimary) {
    const iconPath = getWeaponIconPath(weaponType);
    const icon = `<img src="${iconPath}" alt="${weaponType}" class="slot-weapon-icon" ${iconErrorHandler()} />`;
    weaponDisplay = Array(bankSize).fill(icon).join('');
  } else {
    const iconPath = getMissileIconPath(weaponType);
    const icon = `<img src="${iconPath}" alt="${weaponType}" class="slot-missile-icon" ${iconErrorHandler()} />`;
    weaponDisplay = Array(bankSize).fill(icon).join('');
  }

  // Bank size class for CSS width scaling
  const sizeClass = `bank-${bankSize}`;

  // Convert normalized x (0-1) to percentage
  const xPercent = hardpoint.x * 100;

  // SVG coordinates as percentages (64x64 viewBox)
  const svgXPercent = (hardpoint.svgX / 64) * 100;
  const svgYPercent = (hardpoint.svgY / 64) * 100;

  return `
    <div class="schematic-slot ${slotType} ${isEmpty ? 'empty' : 'filled'} ${sizeClass}"
         data-ship="${shipId}"
         data-type="${slotType}"
         data-index="${bankIndex}"
         data-weapon="${weaponType}"
         style="--slot-x: ${xPercent}%; --svg-x: ${svgXPercent}%; --svg-y: ${svgYPercent}%; --bank-size: ${bankSize}; ${weapon ? `--slot-color: ${color}` : ''}">
      <div class="slot-connector"></div>
      <div class="slot-content">
        <div class="slot-icons">${weaponDisplay}</div>
        ${capacityInfo}
      </div>
    </div>
  `;
}
