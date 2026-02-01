/**
 * Ship Viewer Component - Visual ship display with hardpoint management.
 *
 * Renders a central ship display with interactive hardpoint slots for
 * equipping/unequipping weapons.
 */

import { slotArrayToJSON } from '../../campaign/slot-array';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
} from '../../campaign/types';
import { type Hardpoint, SHIP_CLASSES } from '../../data/ships';
import {
  renderMissileIcon,
  renderShipIcon as renderShipIconInline,
  renderWeaponIcon,
} from '../utils/weapon-icon';
import { renderShipActions } from './actions';
import { getWeaponAmmoInfo, shouldUseSegmentedBar } from './slot-utils';
import { getMissileColor, getWeaponColor } from './viewer-icons';

// Re-export for external use
export {
  getShipAbbrev,
  getShipIconPath,
  iconErrorHandler,
} from './viewer-icons';

/** Rendering mode for schematic slots */
export type SchematicRenderMode = 'interactive' | 'hull-preview';

/** Render ship icon using inline SVG */
function renderShipIcon(shipClass: string): string {
  return `
    <div class="ship-icon-large">
      ${renderShipIconInline(shipClass, { className: 'ship-icon-svg' })}
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
  mode: SchematicRenderMode = 'interactive',
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
            mode,
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
    slotArrayToJSON(ship.primaryWeapons),
    ship.id,
    'primary',
  );

  const secondaryRows = renderHardpointRows(
    stats.secondaryHardpoints,
    stats.secondaryBanks,
    slotArrayToJSON(ship.secondaryWeapons),
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
  // Get pilot's skill for this specific ship class
  const shipSkill = ship.pilot?.shipSkills[ship.shipClass];
  const pilotSkill =
    isCommander || !ship.pilot
      ? ''
      : shipSkill
        ? ` • ${shipSkill.toUpperCase()}`
        : '';

  return `
    <div class="ship-viewer schematic">
      <div class="schematic-header">
        <div class="schematic-header-left">
          <span class="schematic-class">${ship.shipClass.toUpperCase()}</span>
          <span class="schematic-pilot">${pilotName}${pilotSkill}</span>
        </div>
        <div class="schematic-header-right"></div>
      </div>

      ${renderSchematicDiagram(ship)}

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
  hardpoint: Hardpoint,
  mode: SchematicRenderMode = 'interactive',
): string {
  const isPrimary = slotType === 'primary';

  // Bank size class for CSS width scaling
  const sizeClass = `bank-${bankSize}`;

  // Convert normalized x (0-1) to percentage
  const xPercent = hardpoint.x * 100;

  // SVG coordinates as percentages (64x64 viewBox)
  const svgXPercent = (hardpoint.svgX / 64) * 100;
  const svgYPercent = (hardpoint.svgY / 64) * 100;

  // Hull preview mode: empty slots with colored borders/lines (no inner content)
  if (mode === 'hull-preview') {
    const slotColor = isPrimary
      ? 'var(--color-primary)'
      : 'var(--color-danger)';
    return `
      <div class="schematic-slot ${slotType} hull-preview ${sizeClass}"
           data-type="${slotType}"
           style="--slot-x: ${xPercent}%; --svg-x: ${svgXPercent}%; --svg-y: ${svgYPercent}%; --bank-size: ${bankSize}; --slot-color: ${slotColor}">
      </div>
    `;
  }

  // Interactive mode: full slot rendering with weapons
  const isEmpty = !weapon;
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

  // Ammo fill bar (for weapons with finite ammo)
  let ammoBar = '';
  if (weapon) {
    const { current, max } = getWeaponAmmoInfo(weapon, slotType);
    if (max > 0) {
      if (shouldUseSegmentedBar(max, bankSize)) {
        // Segmented bar: individual segments for each ammo unit
        const segments = Array.from({ length: max }, (_, i) => {
          const filled = i < current;
          return `<div class="slot-ammo-segment ${filled ? 'filled' : ''}"></div>`;
        }).join('');
        ammoBar = `<div class="slot-ammo-bar segmented">${segments}</div>`;
      } else {
        // Continuous bar: percentage fill
        const fillPercent = Math.round((current / max) * 100);
        ammoBar = `<div class="slot-ammo-bar"><div class="slot-ammo-fill" style="width: ${fillPercent}%"></div></div>`;
      }
    }
  }

  // Render weapon display: inline SVG icons repeated based on bank size
  let weaponDisplay = '';
  if (isEmpty) {
    // Show + for each empty slot in the bank
    weaponDisplay = Array(bankSize)
      .fill('<span class="slot-empty-icon">+</span>')
      .join('');
  } else if (isPrimary) {
    // Size 'lg' is the base size; CSS scales down for larger banks
    const icon = renderWeaponIcon(weaponType, {
      size: 'lg',
      color,
      className: 'slot-weapon-icon',
    });
    weaponDisplay = Array(bankSize).fill(icon).join('');
  } else {
    const icon = renderMissileIcon(weaponType, {
      size: 'lg',
      color,
      className: 'slot-missile-icon',
    });
    weaponDisplay = Array(bankSize).fill(icon).join('');
  }

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
      </div>
      ${ammoBar}
    </div>
  `;
}

/** Render a hull schematic for store preview (empty slots with colored borders) */
export function renderHullSchematic(shipClass: string): string {
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];
  if (!stats) return '';

  // Create empty weapon arrays for preview
  const emptyPrimaries = stats.primaryBanks.map(() => null);
  const emptySecondaries = stats.secondaryBanks.map(() => null);

  const primaryRows = renderHardpointRows(
    stats.primaryHardpoints,
    stats.primaryBanks,
    emptyPrimaries,
    '',
    'primary',
    'hull-preview',
  );

  const secondaryRows = renderHardpointRows(
    stats.secondaryHardpoints,
    stats.secondaryBanks,
    emptySecondaries,
    '',
    'secondary',
    'hull-preview',
  );

  return `
    <div class="schematic-diagram vertical hull-schematic-preview">
      <div class="hardpoint-row primary-row">
        ${primaryRows}
      </div>

      <div class="schematic-center">
        ${renderShipIcon(shipClass)}
      </div>

      <div class="hardpoint-row secondary-row">
        ${secondaryRows}
      </div>
    </div>
  `;
}
