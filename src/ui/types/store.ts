/**
 * Store screen type definitions.
 *
 * The Store is the equipment shop for buying/selling items.
 */

import type { CampaignState, StoreStock } from '../../campaign/types';
import type { BaseScreenActions, BaseScreenProps } from './common';

/** Store item categories */
export type StoreCategory =
  | 'hulls'
  | 'primaries'
  | 'secondaries'
  | 'ammo'
  | 'scrap';

/** A displayable item in the store */
export interface StoreItem {
  /** Unique identifier (e.g., 'interceptor', 'plasma') */
  id: string;

  /** Display name */
  name: string;

  /** Current stock in store */
  stock: number;

  /** Buy price (0 if not purchasable) */
  buyPrice: number;

  /** Sell price */
  sellPrice: number;
}

/** Props for the Store screen */
export interface StoreProps extends BaseScreenProps {
  /** Current credit balance */
  credits: number;

  /** Currently selected category */
  selectedCategory: StoreCategory;

  /** Currently selected item ID (null if none) */
  selectedItem: string | null;

  /** Store inventory */
  storeStock: StoreStock;

  /** Player's stored scrap (for scrap category) */
  storedScrap: Record<string, number>;

  /** Items in the current category */
  items: StoreItem[];

  /** Count of selected item in player storage */
  selectedItemStorageCount: number;
}

/** Actions the Store screen can trigger */
export interface StoreActions extends BaseScreenActions {
  /** Navigate back to hangar */
  goBack: () => void;

  /** Change the selected category */
  selectCategory: (category: StoreCategory) => void;

  /** Select an item to view details */
  selectItem: (itemId: string | null) => void;

  /** Buy an item (count for consumables) */
  buy: (itemId: string, count?: number) => void;

  /** Sell an item (count for consumables) */
  sell: (itemId: string, count?: number) => void;
}

/** Item detail information for display */
export interface ItemDetails {
  /** Item identifier */
  id: string;

  /** Display name */
  name: string;

  /** Category */
  category: StoreCategory;

  /** Buy price per unit */
  buyPrice: number;

  /** Sell price per unit */
  sellPrice: number;

  /** Current store stock */
  storeStock: number;

  /** Count in player storage */
  storageCount: number;

  /** Whether player can afford to buy one */
  canAfford: boolean;

  /** Whether player has any to sell */
  canSell: boolean;

  /** Item-specific stats (varies by category) */
  stats: Record<string, string | number>;
}

/** Derive StoreProps from state and UI state */
export function deriveStoreProps(
  state: CampaignState,
  selectedCategory: StoreCategory,
  selectedItem: string | null,
  items: StoreItem[],
  storageCount: number,
): StoreProps {
  return {
    state,
    credits: state.credits,
    selectedCategory,
    selectedItem,
    storeStock: state.storeStock,
    storedScrap: state.storedScrap,
    items,
    selectedItemStorageCount: storageCount,
  };
}
