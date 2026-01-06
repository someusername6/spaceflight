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
import { MISSILES } from '../../data/missiles';
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
function getMissileColor(missileType: string): string {
  const stats = MISSILES[missileType.toLowerCase()];
  if (!stats) return 'var(--color-secondary)';

  if (stats.isDecoy) return 'var(--color-success)';
  if (stats.isNuke) return 'var(--color-danger)';
  if (stats.requiresLock) return 'var(--color-secondary)';
  return 'var(--color-warning)';
}

/** Render ship icon placeholder */
function renderShipIcon(shipClass: string): string {
  const abbrev = getShipAbbrev(shipClass);
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];

  // Create a visual representation based on ship type
  const role = stats ? getShipSilhouette(stats) : 'fighter';

  return `
    <div class="ship-icon-large" data-role="${role}">
      <div class="ship-icon-frame">
        <div class="ship-icon-content">
          <span class="ship-abbrev">${abbrev}</span>
          <div class="ship-silhouette ${role}"></div>
        </div>
        <div class="ship-icon-scanline"></div>
      </div>
      <div class="ship-icon-glow"></div>
    </div>
  `;
}

/** Determine ship silhouette type */
function getShipSilhouette(stats: {
  primaryBanks: number[];
  secondaryBanks: number[];
  maxSpeed: number;
  hull: number;
}): string {
  const totalSecondary = stats.secondaryBanks.reduce((a, b) => a + b, 0);
  const totalPrimary = stats.primaryBanks.reduce((a, b) => a + b, 0);

  if (totalSecondary > totalPrimary * 2) return 'bomber';
  if (stats.hull >= 120) return 'heavy';
  if (stats.maxSpeed >= 280) return 'interceptor';
  return 'fighter';
}

/** Hardpoint X-positions for each ship class (percentage from left) */
const HARDPOINT_POSITIONS: Record<
  string,
  { primary: number[]; secondary: number[] }
> = {
  patrol: { primary: [35, 65], secondary: [50] },
  scout: { primary: [35, 65], secondary: [50] },
  fighter: { primary: [35, 65], secondary: [35, 65] },
  interceptor: { primary: [20, 50, 80], secondary: [25, 50, 75] },
  striker: { primary: [10, 28, 50, 72, 90], secondary: [50] },
  bomber: { primary: [50], secondary: [8, 22, 36, 50, 64, 78, 92] },
  defender: { primary: [35, 65], secondary: [15, 32, 50, 68, 85] },
  raider: { primary: [15, 38, 62, 85], secondary: [25, 50, 75] },
  sentinel: { primary: [20, 50, 80], secondary: [25, 50, 75] },
};

/** Get hardpoint positions for a ship class */
function getHardpointPositions(shipClass: string): {
  primary: number[];
  secondary: number[];
} {
  return (
    HARDPOINT_POSITIONS[shipClass.toLowerCase()] ?? {
      primary: [50],
      secondary: [50],
    }
  );
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
  const abbrev = weapon
    ? isPrimary
      ? getWeaponAbbrev((weapon as EquippedPrimary).weaponType)
      : getMissileAbbrev((weapon as EquippedSecondary).weaponType)
    : '';
  const color = weapon
    ? isPrimary
      ? getWeaponColor((weapon as EquippedPrimary).weaponType)
      : getMissileColor((weapon as EquippedSecondary).weaponType)
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

  return `
    <div class="schematic-slot ${slotType} ${isEmpty ? 'empty' : 'filled'}"
         data-ship="${shipId}"
         data-type="${slotType}"
         data-index="${bankIndex}"
         data-weapon="${weapon ? (isPrimary ? (weapon as EquippedPrimary).weaponType : (weapon as EquippedSecondary).weaponType) : ''}"
         style="--slot-x: ${xPosition}%; ${weapon ? `--slot-color: ${color}` : ''}">
      <div class="slot-connector"></div>
      <div class="slot-content">
        ${
          isEmpty
            ? `<span class="slot-empty-icon">+</span>`
            : `<span class="slot-abbrev">${abbrev}</span>`
        }
        <span class="slot-size">×${bankSize}</span>
        ${capacityInfo}
      </div>
    </div>
  `;
}
