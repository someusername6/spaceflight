/**
 * Store UI Renderers - data helpers for the store.
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
import { PRIMARY_WEAPONS } from '../../data/weapons';

// Re-export stat renderers from item-stats module
export {
  renderAmmoStats,
  renderHullStats,
  renderPrimaryStats,
  renderScrapStats,
  renderSecondaryStats,
} from './item-stats';

export type StoreCategory =
  | 'hulls'
  | 'primaries'
  | 'secondaries'
  | 'ammo'
  | 'scrap';

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
        .map(({ weaponType }) => {
          const weapon = PRIMARY_WEAPONS[weaponType];
          return {
            id: weaponType,
            name: weapon?.listName ?? weapon?.name ?? weaponType,
            stock: storeStock.primaries[weaponType] ?? 0,
          };
        });
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
        .map(({ weaponType }) => {
          const weapon = PRIMARY_WEAPONS[weaponType];
          return {
            id: weaponType,
            name: weapon?.listName ?? weapon?.name ?? weaponType,
            stock: storeStock.ammo[weaponType] ?? 0,
          };
        });
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

/** Check if a category has any items in store stock */
function hasStoreStock(state: CampaignState, category: StoreCategory): boolean {
  switch (category) {
    case 'hulls':
      return Object.values(state.storeStock.hulls).some((count) => count > 0);
    case 'primaries':
      return Object.values(state.storeStock.primaries).some(
        (count) => count > 0,
      );
    case 'secondaries':
      return Object.values(state.storeStock.secondaries).some(
        (count) => count > 0,
      );
    case 'ammo':
      return Object.values(state.storeStock.ammo).some((count) => count > 0);
    case 'scrap':
      // Scrap has no store stock, only player storage
      return false;
  }
}

/** Check if a category has any items in player storage */
function hasStorageItems(
  state: CampaignState,
  category: StoreCategory,
): boolean {
  switch (category) {
    case 'hulls':
      return state.storedHulls.length > 0;
    case 'primaries':
      return state.storedWeapons.some((w) => w.category === 'primary');
    case 'secondaries':
      return state.storedWeapons.some((w) => w.category === 'secondary');
    case 'ammo':
      return state.storedAmmo.length > 0;
    case 'scrap':
      return Object.values(state.storedScrap).some((count) => count > 0);
  }
}

/** Check if a category should be visible (has store stock OR player storage) */
export function isCategoryVisible(
  state: CampaignState,
  category: StoreCategory,
): boolean {
  return hasStoreStock(state, category) || hasStorageItems(state, category);
}

/** Get first visible category */
export function getFirstVisibleCategory(
  state: CampaignState,
): StoreCategory | null {
  const categories: StoreCategory[] = [
    'hulls',
    'primaries',
    'secondaries',
    'ammo',
    'scrap',
  ];
  return categories.find((cat) => isCategoryVisible(state, cat)) ?? null;
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
