/**
 * Constrained Resupply - Storage first, then buy from store.
 *
 * These functions prioritize using player's stored ammo before purchasing,
 * and respect store stock and credit limits.
 */

import { getAmmoPrice, getSecondaryPrice } from '../../data/prices';
import type { CampaignState } from '../types';
import { needsResupply } from './resupply-needs';
import { type ResupplyResult, resupplyShipConstrained } from './resupply-ship';

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
  needsResupply,
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
  let shipsWithShortages = 0;

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
    if (!result.success) {
      shipsWithShortages++;
    }
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

  if (shipsWithShortages > 0) {
    const shipWord = shipsWithShortages === 1 ? 'ship' : 'ships';
    if (shortageReason === 'credits') {
      messages.push(
        `${shipsWithShortages} ${shipWord} short (insufficient credits)`,
      );
    } else if (shortageReason === 'stock') {
      messages.push(`${shipsWithShortages} ${shipWord} short (out of stock)`);
    } else {
      messages.push(
        `${shipsWithShortages} ${shipWord} short (insufficient credits)`,
      );
      messages.push(`${shipsWithShortages} ${shipWord} short (out of stock)`);
    }
  }

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
