/**
 * Resupply functions - re-exports constrained resupply for ships.
 *
 * The constrained resupply system respects store stock and player storage,
 * prioritizing storage over store purchases.
 */

// Re-export constrained resupply functions
export {
  estimateAllShipsResupplyCost,
  estimateShipResupplyCost,
  getShipResupplyNeeds,
  needsAmmoResupply,
  needsAttention,
  needsResupply,
  type ResupplyCostEstimate,
  type ResupplyResult,
  resupplyAllShipsConstrained,
  resupplyShipConstrained,
  type ShipResupplyNeeds,
} from './resupply-constrained';
