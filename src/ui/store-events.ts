/**
 * Store Event Handlers - Buy/sell button event binding for the store UI.
 */

import {
  buyAmmo,
  buyHull,
  buyPrimaryWeapon,
  buySecondaryWeapon,
  sellAmmo,
  sellHull,
  sellPrimaryWeapon,
  sellScrap,
  sellSecondaryWeapon,
} from '../campaign/store';
import type { CampaignState } from '../campaign/types';
import { getStorageIndex, type StoreCategory } from './store-render';

/** Get single buy/sell amount for ammo (autocannon ×10, others ×1) */
function getAmmoSingleAmount(itemId: string): number {
  return itemId === 'autocannon' ? 10 : 1;
}

/** Get bulk buy/sell amount for ammo (autocannon ×100, others ×10) */
function getAmmoBulkAmount(itemId: string): number {
  return itemId === 'autocannon' ? 100 : 10;
}

/** Handle buy button click */
export function handleBuy(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
): CampaignState {
  switch (category) {
    case 'hulls':
      return buyHull(state, itemId);
    case 'primaries':
      return buyPrimaryWeapon(state, itemId);
    case 'secondaries':
      return buySecondaryWeapon(state, itemId, 1);
    case 'ammo':
      return buyAmmo(state, itemId, getAmmoSingleAmount(itemId));
    default:
      return state;
  }
}

/** Handle bulk buy button click */
export function handleBulkBuy(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
): CampaignState {
  if (category === 'secondaries') {
    return buySecondaryWeapon(state, itemId, 10);
  } else if (category === 'ammo') {
    return buyAmmo(state, itemId, getAmmoBulkAmount(itemId));
  }
  return state;
}

/** Handle sell button click */
export function handleSell(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
): CampaignState {
  const storageIndex = getStorageIndex(state, category, itemId);
  if (storageIndex < 0) return state;

  switch (category) {
    case 'hulls':
      return sellHull(state, storageIndex);
    case 'primaries':
      return sellPrimaryWeapon(state, storageIndex);
    case 'secondaries':
      return sellSecondaryWeapon(state, storageIndex, 1);
    case 'ammo':
      return sellAmmo(state, itemId, getAmmoSingleAmount(itemId));
    case 'scrap':
      return sellScrap(state, itemId, 1);
    default:
      return state;
  }
}

/** Handle bulk sell button click */
export function handleBulkSell(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
): CampaignState {
  const storageIndex = getStorageIndex(state, category, itemId);
  if (storageIndex < 0) return state;

  if (category === 'secondaries') {
    return sellSecondaryWeapon(state, storageIndex, 10);
  } else if (category === 'ammo') {
    return sellAmmo(state, itemId, getAmmoBulkAmount(itemId));
  } else if (category === 'scrap') {
    return sellScrap(state, itemId, 10);
  }
  return state;
}

/** Handle bulk sell ×100 button click (scrap only) */
export function handleBulkSell100(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
): CampaignState {
  if (category !== 'scrap') return state;
  return sellScrap(state, itemId, 100);
}
