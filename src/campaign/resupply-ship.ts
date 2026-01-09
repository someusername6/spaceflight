/**
 * Resupply Ship - Single ship resupply operation.
 */

import { getAmmoPrice, getSecondaryPrice } from '../data/prices';
import { getMaxPrimaryAmmo, getShipResupplyNeeds } from './resupply-needs';
import type { CampaignState, StoredAmmo, StoredWeapon } from './types';

/** Result of a constrained resupply operation */
export interface ResupplyResult {
  state: CampaignState;
  success: boolean;
  fromStorage: { ammo: Map<string, number>; missiles: Map<string, number> };
  bought: { ammo: Map<string, number>; missiles: Map<string, number> };
  creditsSpent: number;
  shortages: { ammo: Map<string, number>; missiles: Map<string, number> };
  shortageReason: 'none' | 'credits' | 'stock' | 'both';
  messages: string[];
}

/** Helper to consume ammo from player storage */
function consumeFromStorage(
  storedAmmo: StoredAmmo[],
  weaponType: string,
  amount: number,
): { newStorage: StoredAmmo[]; consumed: number } {
  const index = storedAmmo.findIndex((a) => a.weaponType === weaponType);
  if (index < 0 || amount <= 0) {
    return { newStorage: storedAmmo, consumed: 0 };
  }

  const stored = storedAmmo[index];
  if (!stored) return { newStorage: storedAmmo, consumed: 0 };

  const consumed = Math.min(amount, stored.count);
  const remaining = stored.count - consumed;

  const newStorage = [...storedAmmo];
  if (remaining <= 0) {
    newStorage.splice(index, 1);
  } else {
    newStorage[index] = { weaponType, count: remaining };
  }

  return { newStorage, consumed };
}

/** Helper to consume missiles from stored weapons */
function consumeMissilesFromStorage(
  storedWeapons: StoredWeapon[],
  weaponType: string,
  amount: number,
): { newStorage: StoredWeapon[]; consumed: number } {
  const index = storedWeapons.findIndex(
    (w) => w.weaponType === weaponType && w.category === 'secondary',
  );
  if (index < 0 || amount <= 0) {
    return { newStorage: storedWeapons, consumed: 0 };
  }

  const stored = storedWeapons[index];
  if (!stored) return { newStorage: storedWeapons, consumed: 0 };

  const consumed = Math.min(amount, stored.count);
  const remaining = stored.count - consumed;

  const newStorage = [...storedWeapons];
  if (remaining <= 0) {
    newStorage.splice(index, 1);
  } else {
    newStorage[index] = { ...stored, count: remaining };
  }

  return { newStorage, consumed };
}

/** Create empty result helper */
export function emptyResult(
  state: CampaignState,
  success: boolean,
  messages: string[],
): ResupplyResult {
  return {
    state,
    success,
    fromStorage: { ammo: new Map(), missiles: new Map() },
    bought: { ammo: new Map(), missiles: new Map() },
    creditsSpent: 0,
    shortages: { ammo: new Map(), missiles: new Map() },
    shortageReason: 'none',
    messages,
  };
}

/** Resupply a single ship using storage first, then buying from store */
export function resupplyShipConstrained(
  state: CampaignState,
  shipId: string,
): ResupplyResult {
  const shipIndex = state.ships.findIndex((s) => s.id === shipId);
  if (shipIndex < 0) {
    return emptyResult(state, false, ['Ship not found']);
  }

  const ship = state.ships[shipIndex];
  if (!ship) {
    return emptyResult(state, false, ['Ship not found']);
  }

  const needs = getShipResupplyNeeds(ship);
  if (needs.totalNeeded === 0) {
    return emptyResult(state, true, ['Already fully supplied']);
  }

  const fromStorage = {
    ammo: new Map<string, number>(),
    missiles: new Map<string, number>(),
  };
  const bought = {
    ammo: new Map<string, number>(),
    missiles: new Map<string, number>(),
  };
  const shortages = {
    ammo: new Map<string, number>(),
    missiles: new Map<string, number>(),
  };
  let creditsSpent = 0;

  let newStoredAmmo = [...state.storedAmmo];
  let newStoredWeapons = [...state.storedWeapons];
  let newCredits = state.credits;
  const newStoreStock = {
    ...state.storeStock,
    ammo: { ...state.storeStock.ammo },
    secondaries: { ...state.storeStock.secondaries },
  };

  // Process ammo needs
  const ammoToAdd = new Map<string, number>();
  for (const [weaponType, needed] of needs.ammo) {
    let remaining = needed;

    // First: use storage
    const storageResult = consumeFromStorage(
      newStoredAmmo,
      weaponType,
      remaining,
    );
    newStoredAmmo = storageResult.newStorage;
    if (storageResult.consumed > 0) {
      fromStorage.ammo.set(weaponType, storageResult.consumed);
      remaining -= storageResult.consumed;
    }

    // Second: buy from store
    if (remaining > 0) {
      const stock = newStoreStock.ammo[weaponType] ?? 0;
      const pricePerUnit = getAmmoPrice(weaponType, 'buy');
      const canAfford =
        pricePerUnit > 0 ? Math.floor(newCredits / pricePerUnit) : 0;
      const toBuy = Math.min(remaining, stock, canAfford);

      if (toBuy > 0) {
        const cost = Math.round(toBuy * pricePerUnit);
        bought.ammo.set(weaponType, toBuy);
        newCredits -= cost;
        creditsSpent += cost;
        newStoreStock.ammo[weaponType] = stock - toBuy;
        remaining -= toBuy;
      }
    }

    const totalToAdd =
      (fromStorage.ammo.get(weaponType) ?? 0) +
      (bought.ammo.get(weaponType) ?? 0);
    if (totalToAdd > 0) {
      ammoToAdd.set(weaponType, totalToAdd);
    }

    if (remaining > 0) {
      shortages.ammo.set(weaponType, remaining);
    }
  }

  // Process missile needs (storage first, then buy from store)
  const missilesToAdd = new Map<string, number>();
  for (const [weaponType, needed] of needs.missiles) {
    let remaining = needed;

    // First: use stored missiles
    const storageResult = consumeMissilesFromStorage(
      newStoredWeapons,
      weaponType,
      remaining,
    );
    newStoredWeapons = storageResult.newStorage;
    if (storageResult.consumed > 0) {
      fromStorage.missiles.set(weaponType, storageResult.consumed);
      remaining -= storageResult.consumed;
    }

    // Second: buy from store
    if (remaining > 0) {
      const stock = newStoreStock.secondaries[weaponType] ?? 0;
      const pricePerUnit = getSecondaryPrice(weaponType, 'buy');
      const canAfford =
        pricePerUnit > 0 ? Math.floor(newCredits / pricePerUnit) : 0;
      const toBuy = Math.min(remaining, stock, canAfford);

      if (toBuy > 0) {
        const cost = toBuy * pricePerUnit;
        bought.missiles.set(weaponType, toBuy);
        newCredits -= cost;
        creditsSpent += cost;
        newStoreStock.secondaries[weaponType] = stock - toBuy;
        remaining -= toBuy;
      }
    }

    const totalToAdd =
      (fromStorage.missiles.get(weaponType) ?? 0) +
      (bought.missiles.get(weaponType) ?? 0);
    if (totalToAdd > 0) {
      missilesToAdd.set(weaponType, totalToAdd);
    }

    if (remaining > 0) {
      shortages.missiles.set(weaponType, remaining);
    }
  }

  // Apply ammo/missiles to ship
  const newPrimaries = ship.primaryWeapons.map((primary) => {
    if (primary === null || primary.currentAmmo === undefined) return primary;
    const toAdd = ammoToAdd.get(primary.weaponType) ?? 0;
    if (toAdd === 0) return primary;

    const maxAmmo = getMaxPrimaryAmmo(primary);
    const actualAdd = Math.min(toAdd, maxAmmo - primary.currentAmmo);
    ammoToAdd.set(primary.weaponType, toAdd - actualAdd);

    return { ...primary, currentAmmo: primary.currentAmmo + actualAdd };
  });

  const newSecondaries = ship.secondaryWeapons.map((secondary) => {
    if (secondary === null) return secondary;
    const toAdd = missilesToAdd.get(secondary.weaponType) ?? 0;
    if (toAdd === 0) return secondary;

    const actualAdd = Math.min(toAdd, secondary.maxCount - secondary.count);
    missilesToAdd.set(secondary.weaponType, toAdd - actualAdd);

    return { ...secondary, count: secondary.count + actualAdd };
  });

  const newShip = {
    ...ship,
    primaryWeapons: newPrimaries,
    secondaryWeapons: newSecondaries,
  };
  const newShips = [...state.ships];
  newShips[shipIndex] = newShip;

  // Build message with item details
  const messages: string[] = [];
  const totalShortage =
    [...shortages.ammo.values()].reduce((a, b) => a + b, 0) +
    [...shortages.missiles.values()].reduce((a, b) => a + b, 0);

  // Determine shortage reason
  let shortageReason: 'none' | 'credits' | 'stock' | 'both' = 'none';
  if (totalShortage > 0) {
    const hasStockIssue =
      [...shortages.ammo.keys()].some(
        (wt) => (newStoreStock.ammo[wt] ?? 0) === 0,
      ) ||
      [...shortages.missiles.keys()].some(
        (wt) => (newStoreStock.secondaries[wt] ?? 0) === 0,
      );
    const hasCreditIssue = newCredits < 1;

    if (hasStockIssue && hasCreditIssue) {
      shortageReason = 'both';
    } else if (hasCreditIssue) {
      shortageReason = 'credits';
    } else if (hasStockIssue) {
      shortageReason = 'stock';
    } else {
      shortageReason = 'both';
    }
  }

  // Build detailed loaded messages (one per item type)
  for (const [wt, count] of fromStorage.ammo) {
    messages.push(`Loaded ${count} ${wt} ammo from storage`);
  }
  for (const [wt, count] of fromStorage.missiles) {
    messages.push(`Loaded ${count} ${wt} from storage`);
  }

  // Build detailed bought messages (one per item type)
  for (const [wt, count] of bought.ammo) {
    const pricePerUnit = getAmmoPrice(wt, 'buy');
    const cost = Math.round(count * pricePerUnit);
    messages.push(`Bought ${count} ${wt} ammo for ${cost} cr`);
  }
  for (const [wt, count] of bought.missiles) {
    const pricePerUnit = getSecondaryPrice(wt, 'buy');
    const cost = count * pricePerUnit;
    messages.push(`Bought ${count} ${wt} for ${cost} cr`);
  }

  if (totalShortage > 0) {
    if (shortageReason === 'credits') {
      messages.push(`${totalShortage} unavailable (insufficient credits)`);
    } else if (shortageReason === 'stock') {
      messages.push(`${totalShortage} unavailable (out of stock)`);
    } else {
      messages.push(`${totalShortage} unavailable (low credits/stock)`);
    }
  }

  return {
    state: {
      ...state,
      ships: newShips,
      credits: newCredits,
      storedAmmo: newStoredAmmo,
      storedWeapons: newStoredWeapons,
      storeStock: newStoreStock,
    },
    success: totalShortage === 0,
    fromStorage,
    bought,
    creditsSpent,
    shortages,
    shortageReason,
    messages: messages.length > 0 ? messages : ['Resupplied'],
  };
}
