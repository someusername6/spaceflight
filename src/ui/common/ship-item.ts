/**
 * Shared ship list item rendering - used by squadron list and squad selection.
 */

import { getMaxAmmoCapacity } from '../../campaign/store/store-ammo';
import type { OwnedShip } from '../../campaign/types';
import { SHIP_CLASSES } from '../../data/ships';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';

/** Capitalize first letter of a string */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Render bank size indicator (circles for primary, diamonds for secondary) */
function renderBankIndicator(size: number, cssClass: string): string {
  const symbol = cssClass === 'secondary' ? '◆' : '●';
  const symbols = symbol.repeat(size);
  return `<span class="bank-indicator ${cssClass}">${symbols}</span>`;
}

/** Render primary weapons summary for a ship (HTML with colored indicators) */
export function renderPrimarySummary(ship: OwnedShip): string {
  const parts: string[] = [];
  for (const primary of ship.primaryWeapons) {
    if (primary) {
      const indicator = renderBankIndicator(primary.bankSize, 'primary');
      const name = capitalize(primary.weaponType);
      if (primary.currentAmmo !== undefined) {
        const max = getMaxAmmoCapacity(primary.weaponType, primary.bankSize);
        parts.push(`${indicator} ${name} (${primary.currentAmmo}/${max})`);
      } else {
        parts.push(`${indicator} ${name}`);
      }
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'No primary';
}

/** Render secondary weapons summary for a ship (HTML with colored indicators) */
export function renderSecondarySummary(ship: OwnedShip): string {
  const parts: string[] = [];
  for (const secondary of ship.secondaryWeapons) {
    if (secondary && secondary.count > 0) {
      const indicator = renderBankIndicator(secondary.bankSize, 'secondary');
      const name = capitalize(secondary.weaponType);
      parts.push(
        `${indicator} ${name} (${secondary.count}/${secondary.maxCount})`,
      );
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'No secondary';
}

/** Options for rendering a ship item */
export interface ShipItemOptions {
  ship: OwnedShip;
  isCommander: boolean;
  isSelected: boolean;
  /** Additional CSS classes for the article element */
  extraClasses?: string;
  /** Data attributes to add (e.g., { 'ship-id': '123' }) */
  dataAttrs?: Record<string, string>;
  /** Content to render before the icon (e.g., checkbox) */
  beforeContent?: string;
  /** Content to render inside the icon container (e.g., warning badge, tooltip) */
  iconContent?: string;
  /** Content to render after the info section (e.g., weapon counts, loadout) */
  afterContent?: string;
}

/** Render a ship list item with consistent structure */
export function renderShipItem(options: ShipItemOptions): string {
  const {
    ship,
    isCommander,
    isSelected,
    extraClasses = '',
    dataAttrs = {},
    beforeContent = '',
    iconContent = '',
    afterContent = '',
  } = options;

  const pilot = ship.pilot;
  if (!pilot) return '';

  const iconPath = getShipIconPath(ship.shipClass);

  const classes = [
    'ship-item',
    isCommander ? 'commander' : '',
    isSelected ? 'selected' : '',
    extraClasses,
  ]
    .filter(Boolean)
    .join(' ');

  const dataAttrStr = Object.entries(dataAttrs)
    .map(([key, value]) => `data-${key}="${value}"`)
    .join(' ');

  const ariaLabel = [pilot.name, ship.shipClass, isCommander ? 'your ship' : '']
    .filter(Boolean)
    .join(', ');

  return `
    <article
      class="${classes}"
      ${dataAttrStr}
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${ariaLabel}"
    >
      ${beforeContent}

      <div class="ship-item-icon">
        <img
          src="${iconPath}"
          alt="${ship.shipClass}"
          class="ship-item-img"
          onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'"
        />
        ${iconContent}
      </div>

      <div class="ship-item-info">
        <div class="ship-item-name-row">
          <span class="ship-item-pilot">${pilot.name}</span>
          ${isCommander ? '<span class="ship-item-badge commander-badge">You</span>' : ''}
        </div>
        <span class="ship-item-class">${ship.shipClass}</span>
      </div>

      ${afterContent}
    </article>
  `;
}

/** Render weapon status badges with tooltips (e.g., "● 2/2", "◆ 4/8") */
export function renderWeaponBadges(ship: OwnedShip): string {
  const { primary, secondary, primaryUnarmed, secondaryUnarmed } =
    getWeaponStatus(ship);

  const primaryTooltip = renderPrimarySummary(ship);
  const secondaryTooltip = renderSecondarySummary(ship);

  return `
    <div class="ship-item-weapons">
      <span class="weapon-badge primary ${primaryUnarmed ? 'unarmed' : ''}">
        ● ${primary}
        <span class="weapon-tooltip">${primaryTooltip}</span>
      </span>
      <span class="weapon-badge secondary ${secondaryUnarmed ? 'unarmed' : ''}">
        ◆ ${secondary}
        <span class="weapon-tooltip">${secondaryTooltip}</span>
      </span>
    </div>
  `;
}

/** Get weapon slot status for a ship */
export function getWeaponStatus(ship: OwnedShip): {
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
