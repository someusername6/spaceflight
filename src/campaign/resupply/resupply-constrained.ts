/**
 * Constrained Resupply - Storage first, then buy from store.
 *
 * These functions prioritize using player's stored ammo before purchasing,
 * and respect store stock and credit limits.
 */

import type { CampaignState } from '../types';
import { needsResupply } from './resupply-needs';
import {
  buildResupplyMessages,
  determineShortageReason,
  type ResupplyResult,
  resupplyShipConstrained,
} from './resupply-ship';

export {
  estimateAllShipsResupplyCost,
  estimateShipResupplyCost,
  type ResupplyCostEstimate,
} from './resupply-estimate';
// Re-export from sub-modules for convenience
export {
  getAttentionReasons,
  getShipResupplyNeeds,
  needsAmmoResupply,
  needsAttention,
  needsPrimaryAttention,
  needsResupply,
  needsSecondaryAttention,
  type ShipResupplyNeeds,
} from './resupply-needs';
export { type ResupplyResult, resupplyShipConstrained } from './resupply-ship';

/** Resupply all ships with priority ordering (commander first) */
export function resupplyAllShipsConstrained(
  state: CampaignState,
  commanderId: string,
): ResupplyResult {
  const sortedShips = [...state.ships].sort((a, b) => {
    const aIsCommander = a.pilot?.id === commanderId;
    const bIsCommander = b.pilot?.id === commanderId;
    if (aIsCommander && !bIsCommander) return -1;
    if (!aIsCommander && bIsCommander) return 1;
    return 0;
  });

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
  let currentState = state;
  let shipsResupplied = 0;

  for (const ship of sortedShips) {
    if (!needsResupply(ship)) continue;

    const result = resupplyShipConstrained(currentState, ship.id);
    currentState = result.state;
    creditsSpent += result.creditsSpent;

    // Merge results
    for (const [k, v] of result.fromStorage.ammo) {
      fromStorage.ammo.set(k, (fromStorage.ammo.get(k) ?? 0) + v);
    }
    for (const [k, v] of result.fromStorage.missiles) {
      fromStorage.missiles.set(k, (fromStorage.missiles.get(k) ?? 0) + v);
    }
    for (const [k, v] of result.bought.ammo) {
      bought.ammo.set(k, (bought.ammo.get(k) ?? 0) + v);
    }
    for (const [k, v] of result.bought.missiles) {
      bought.missiles.set(k, (bought.missiles.get(k) ?? 0) + v);
    }
    for (const [k, v] of result.shortages.ammo) {
      shortages.ammo.set(k, (shortages.ammo.get(k) ?? 0) + v);
    }
    for (const [k, v] of result.shortages.missiles) {
      shortages.missiles.set(k, (shortages.missiles.get(k) ?? 0) + v);
    }

    shipsResupplied++;
  }

  // Build messages
  if (shipsResupplied === 0) {
    return {
      state: currentState,
      success: true,
      fromStorage,
      bought,
      creditsSpent,
      shortages,
      shortageReason: 'none',
      messages: ['All ships fully supplied'],
    };
  }

  const messages: string[] = [];
  const totalShortage =
    [...shortages.ammo.values()].reduce((a, b) => a + b, 0) +
    [...shortages.missiles.values()].reduce((a, b) => a + b, 0);

  // Determine shortage reason
  let shortageReason: 'none' | 'credits' | 'stock' | 'both' = 'none';
  if (totalShortage > 0) {
    const hasStockIssue =
      [...shortages.ammo.keys()].some(
        (wt) => (currentState.storeStock.ammo[wt] ?? 0) === 0,
      ) ||
      [...shortages.missiles.keys()].some(
        (wt) => (currentState.storeStock.secondaries[wt] ?? 0) === 0,
      );
    const hasCreditIssue = currentState.credits < 1;
    shortageReason = determineShortageReason(hasStockIssue, hasCreditIssue);
  }

  buildResupplyMessages(
    messages,
    fromStorage,
    bought,
    shortages,
    currentState.storeStock,
    currentState.credits,
  );

  return {
    state: currentState,
    success: totalShortage === 0,
    fromStorage,
    bought,
    creditsSpent,
    shortages,
    shortageReason,
    messages:
      messages.length > 0
        ? messages
        : [
            `Resupplied ${shipsResupplied} ${shipsResupplied === 1 ? 'ship' : 'ships'}`,
          ],
  };
}
