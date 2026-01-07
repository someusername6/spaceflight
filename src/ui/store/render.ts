/**
 * Store UI Renderers - stat displays and data helpers for the store.
 */

import {
  getAvailableAmmo,
  getAvailableHulls,
  getAvailablePrimaries,
  getAvailableSecondaries,
  getScrapTypes,
} from '../../campaign/store';
import type { CampaignState, StoreStock } from '../../campaign/types';
import { MISSILES } from '../../data/missiles';
import {
  getAmmoPrice,
  getHullPrice,
  getPrimaryPrice,
  getScrapPrice,
  getSecondaryPrice,
} from '../../data/prices';
import { SHIP_CLASSES } from '../../data/ships';
import { PRIMARY_WEAPONS } from '../../data/weapons';
import {
  FALLBACK_ICON_PATH,
  getMissileIconPath,
  getShipIconPath,
  getWeaponIconPath,
} from '../ship/viewer';

/** Generate onerror handler for fallback icon */
const iconError = `onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'"`;

export type StoreCategory =
  | 'hulls'
  | 'primaries'
  | 'secondaries'
  | 'ammo'
  | 'scrap';

/** Render item preview - stylized visual representation */
function renderItemPreview(category: StoreCategory, id: string): string {
  const categoryColors: Record<StoreCategory, string> = {
    hulls: 'var(--color-secondary)',
    primaries: 'var(--color-primary)',
    secondaries: 'var(--color-danger)',
    ammo: 'var(--color-success)',
    scrap: 'var(--color-text-dim)',
  };

  // Use ship SVG icon for hulls
  if (category === 'hulls') {
    const iconPath = getShipIconPath(id);
    return `
      <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
        <img src="${iconPath}" alt="${id}" class="item-preview-ship-icon" ${iconError} />
      </div>
    `;
  }

  // Use ship SVG icon for scrap (dim coloring)
  if (category === 'scrap') {
    const iconPath = getShipIconPath(id);
    return `
      <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
        <img src="${iconPath}" alt="${id}" class="item-preview-scrap-icon" ${iconError} />
      </div>
    `;
  }

  // Use weapon SVG icon for primaries
  if (category === 'primaries') {
    const iconPath = getWeaponIconPath(id);
    return `
      <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
        <img src="${iconPath}" alt="${id}" class="item-preview-weapon-icon" ${iconError} />
      </div>
    `;
  }

  // Use missile SVG icon for secondaries
  if (category === 'secondaries') {
    const iconPath = getMissileIconPath(id);
    return `
      <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
        <img src="${iconPath}" alt="${id}" class="item-preview-missile-icon" ${iconError} />
      </div>
    `;
  }

  // Use weapon SVG icon for ammo (green coloring)
  // category === 'ammo' is the only remaining case
  const iconPath = getWeaponIconPath(id);
  return `
    <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
      <img src="${iconPath}" alt="${id}" class="item-preview-ammo-icon" ${iconError} />
    </div>
  `;
}

/** Render ship hull stats */
export function renderHullStats(shipClass: string): string {
  const stats = SHIP_CLASSES[shipClass];
  if (!stats) return '';

  const primarySlots = stats.primaryBanks.length;
  const secondarySlots = stats.secondaryBanks.length;
  const primaryBanks = stats.primaryBanks.join(', ');
  const secondaryBanks = stats.secondaryBanks.join(', ');

  return `
    ${renderItemPreview('hulls', shipClass)}
    <div class="item-stats">
      <div class="stat-row"><span>Hull:</span><span>${stats.hull}</span></div>
      <div class="stat-row"><span>Shields:</span><span>${stats.shields}</span></div>
      <div class="stat-row"><span>Max Speed:</span><span>${stats.maxSpeed} m/s</span></div>
      <div class="stat-row"><span>Turn Rate:</span><span>${stats.turnRate}°/s</span></div>
      <div class="stat-row"><span>Primary Slots:</span><span>${primarySlots} (${primaryBanks})</span></div>
      <div class="stat-row"><span>Secondary Slots:</span><span>${secondarySlots} (${secondaryBanks})</span></div>
    </div>
  `;
}

/** Render primary weapon stats */
export function renderPrimaryStats(weaponType: string): string {
  const stats = PRIMARY_WEAPONS[weaponType];
  if (!stats) return '';

  const ammoText =
    stats.ammo !== undefined ? `${stats.ammo} rounds` : 'Unlimited';
  const categoryText =
    stats.category.charAt(0).toUpperCase() + stats.category.slice(1);

  return `
    ${renderItemPreview('primaries', weaponType)}
    <div class="item-stats">
      <div class="stat-row"><span>Category:</span><span>${categoryText}</span></div>
      <div class="stat-row"><span>Damage:</span><span>${stats.damage}</span></div>
      <div class="stat-row"><span>Range:</span><span>${stats.range} m</span></div>
      <div class="stat-row"><span>Fire Rate:</span><span>${(1 / stats.fireRate).toFixed(1)}/s</span></div>
      <div class="stat-row"><span>Heat/Shot:</span><span>${stats.heatPerShot}</span></div>
      <div class="stat-row"><span>Ammo:</span><span>${ammoText}</span></div>
    </div>
  `;
}

/** Render secondary weapon stats */
export function renderSecondaryStats(weaponType: string): string {
  const stats = MISSILES[weaponType];
  if (!stats) return '';

  const trackingText = stats.turnRate > 0 ? `${stats.turnRate}°/s` : 'None';
  const lockText = stats.requiresLock
    ? `${(1 / stats.lockSpeed).toFixed(1)}s`
    : 'N/A';

  return `
    ${renderItemPreview('secondaries', weaponType)}
    <div class="item-stats">
      <div class="stat-row"><span>Damage:</span><span>${stats.damage}</span></div>
      <div class="stat-row"><span>Speed:</span><span>${stats.speed} m/s</span></div>
      <div class="stat-row"><span>Range:</span><span>${stats.range} m</span></div>
      <div class="stat-row"><span>Tracking:</span><span>${trackingText}</span></div>
      <div class="stat-row"><span>Lock Time:</span><span>${lockText}</span></div>
      ${stats.aoeRadius ? `<div class="stat-row"><span>AoE Radius:</span><span>${stats.aoeRadius} m</span></div>` : ''}
    </div>
  `;
}

/** Render ammo stats */
export function renderAmmoStats(weaponType: string): string {
  const weapon = PRIMARY_WEAPONS[weaponType];
  if (!weapon || weapon.ammo === undefined) return '';

  return `
    ${renderItemPreview('ammo', weaponType)}
    <div class="item-stats">
      <div class="stat-row"><span>For Weapon:</span><span>${weapon.name}</span></div>
      <div class="stat-row"><span>Capacity per bank size:</span><span>${weapon.ammo} rounds</span></div>
    </div>
  `;
}

/** Render scrap stats */
export function renderScrapStats(shipClass: string): string {
  const ship = SHIP_CLASSES[shipClass];
  if (!ship) return '';

  const displayName = shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
  return `
    ${renderItemPreview('scrap', shipClass)}
    <div class="item-stats">
      <div class="stat-row"><span>Ship Type:</span><span>${displayName}</span></div>
      <div class="stat-note">Scrap of destroyed ships. Sell for credits, or convert to a hull.</div>
    </div>
  `;
}

/**
 * Get items for current category.
 * Most categories filter by store stock > 0.
 * Scrap is special: items come from player storage (storedScrap).
 */
export function getCategoryItems(
  category: StoreCategory,
  storeStock: StoreStock,
  storedScrap?: Record<string, number>,
): Array<{ id: string; name: string; stock: number }> {
  switch (category) {
    case 'hulls':
      return getAvailableHulls()
        .filter(({ shipClass }) => (storeStock.hulls[shipClass] ?? 0) > 0)
        .map(({ shipClass }) => ({
          id: shipClass,
          name: shipClass.charAt(0).toUpperCase() + shipClass.slice(1),
          stock: storeStock.hulls[shipClass] ?? 0,
        }));
    case 'primaries':
      return getAvailablePrimaries()
        .filter(({ weaponType }) => (storeStock.primaries[weaponType] ?? 0) > 0)
        .map(({ weaponType }) => ({
          id: weaponType,
          name: PRIMARY_WEAPONS[weaponType]?.name ?? weaponType,
          stock: storeStock.primaries[weaponType] ?? 0,
        }));
    case 'secondaries':
      return getAvailableSecondaries()
        .filter(({ weaponType }) => !MISSILES[weaponType]?.isDecoy)
        .filter(
          ({ weaponType }) => (storeStock.secondaries[weaponType] ?? 0) > 0,
        )
        .map(({ weaponType }) => ({
          id: weaponType,
          name: MISSILES[weaponType]?.name ?? weaponType,
          stock: storeStock.secondaries[weaponType] ?? 0,
        }));
    case 'ammo':
      return getAvailableAmmo()
        .filter(({ weaponType }) => (storeStock.ammo[weaponType] ?? 0) > 0)
        .map(({ weaponType }) => ({
          id: weaponType,
          name: PRIMARY_WEAPONS[weaponType]?.name ?? weaponType,
          stock: storeStock.ammo[weaponType] ?? 0,
        }));
    case 'scrap':
      // Scrap items come from player storage, not store stock
      // Show all types that the player has
      return getScrapTypes()
        .filter(({ shipClass }) => (storedScrap?.[shipClass] ?? 0) > 0)
        .map(({ shipClass }) => ({
          id: shipClass,
          name: `${shipClass.charAt(0).toUpperCase() + shipClass.slice(1)} Scrap`,
          stock: storedScrap?.[shipClass] ?? 0,
        }));
  }
}

/** Get price for item */
export function getItemPrice(
  category: StoreCategory,
  id: string,
  type: 'buy' | 'sell',
): number {
  switch (category) {
    case 'hulls':
      return getHullPrice(id, type);
    case 'primaries':
      return getPrimaryPrice(id, type);
    case 'secondaries':
      return getSecondaryPrice(id, type);
    case 'ammo':
      return getAmmoPrice(id, type);
    case 'scrap':
      // Scrap can only be sold, not bought
      return type === 'sell' ? getScrapPrice(id) : 0;
  }
}

/** Get count of item in player's storage */
export function getStorageCount(
  state: CampaignState,
  category: StoreCategory,
  id: string,
): number {
  switch (category) {
    case 'hulls':
      return state.storedHulls.filter((h) => h.shipClass === id).length;
    case 'primaries':
      return state.storedWeapons.filter(
        (w) => w.category === 'primary' && w.weaponType === id,
      ).length;
    case 'secondaries':
      // Sum all matching entries (in case of fragmented storage)
      return state.storedWeapons
        .filter((w) => w.category === 'secondary' && w.weaponType === id)
        .reduce((sum, w) => sum + w.count, 0);
    case 'ammo':
      // Sum all matching entries (in case of fragmented storage)
      return state.storedAmmo
        .filter((a) => a.weaponType === id)
        .reduce((sum, a) => sum + a.count, 0);
    case 'scrap':
      // Scrap is stored directly as shipClass -> count
      return state.storedScrap[id] ?? 0;
  }
}

/**
 * Get storage index for selling an item (-1 if not found).
 * For scrap, returns 0 if the player has any (sellScrap uses shipClass directly).
 */
export function getStorageIndex(
  state: CampaignState,
  category: StoreCategory,
  id: string,
): number {
  switch (category) {
    case 'hulls':
      return state.storedHulls.findIndex((h) => h.shipClass === id);
    case 'primaries':
      return state.storedWeapons.findIndex(
        (w) => w.category === 'primary' && w.weaponType === id,
      );
    case 'secondaries':
      return state.storedWeapons.findIndex(
        (w) => w.category === 'secondary' && w.weaponType === id,
      );
    case 'ammo':
      return state.storedAmmo.findIndex((a) => a.weaponType === id);
    case 'scrap':
      // Scrap uses shipClass directly, not index. Return 0 if any exists.
      return (state.storedScrap[id] ?? 0) > 0 ? 0 : -1;
  }
}
