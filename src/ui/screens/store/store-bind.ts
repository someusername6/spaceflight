/**
 * Store Bind Handlers - Event binding for store screen.
 *
 * Extracted from store.ts to keep file under 400 lines.
 * Handles buy/sell/convert actions with multiplayer support.
 */

import { convertScrapToShip } from '../../../campaign/store/store';
import type { CampaignState } from '../../../campaign/types';
import {
  requestBuyAction,
  requestConvertScrapAction,
  requestSellAction,
  shouldUseActionRequest,
} from '../../../multiplayer/action-client';
import {
  canBuy,
  canConvertScrap,
  canSell,
} from '../../../multiplayer/context-permissions';
import {
  addScrapConversionMessage,
  addTransactionSystemMessage,
} from '../../../multiplayer/system-messages';
import { bindNavBar, type NavDestination } from '../../common/nav-bar';
import type { ScreenAPI } from '../../framework/screen';
import { initShipConnectors } from '../../ship/connectors';
import {
  handleBulkBuy,
  handleBulkSell,
  handleBulkSell100,
  handleBuy,
  handleSell,
} from './events';
import { getStorageIndex, type StoreCategory } from './render';

// =============================================================================
// Types
// =============================================================================

/** Store screen state */
export interface StoreState {
  selectedCategory: StoreCategory;
  selectedItem: string | null;
}

/** Store screen props */
export interface StoreProps {
  campaignState: CampaignState;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate: (newState: CampaignState) => void;
}

// =============================================================================
// Helpers
// =============================================================================

/** Convert store category to action item type */
function categoryToItemType(
  category: StoreCategory,
): 'ship' | 'primary' | 'secondary' | 'ammo' | 'scrap' | null {
  switch (category) {
    case 'ships':
      return 'ship';
    case 'primaries':
      return 'primary';
    case 'secondaries':
      return 'secondary';
    case 'ammo':
      return 'ammo';
    case 'scrap':
      return 'scrap';
    default:
      return null;
  }
}

// =============================================================================
// Bind Function
// =============================================================================

/**
 * Bind store screen events.
 * Handles navigation, selection, and buy/sell/convert actions.
 */
export function bindStoreEvents(
  api: ScreenAPI<StoreState>,
  props: StoreProps,
): void {
  const state = api.getState();
  const { onNavigate, onStateUpdate } = props;

  // Bind navigation bar (uses Screen framework's event delegation)
  bindNavBar(api, onNavigate);

  // Category buttons
  api.on('[data-cat]', 'click', (_e, el) => {
    const cat = el.dataset.cat as StoreCategory;
    api.setState({ selectedCategory: cat, selectedItem: null });
  });

  // Item selection (store list)
  api.on('.store-item', 'click', (_e, el) => {
    const itemId = el.dataset.item;
    if (itemId) {
      const currentState = api.getState();
      api.setState({
        selectedItem: itemId === currentState.selectedItem ? null : itemId,
      });
    }
  });

  // Storage item selection (synchronized with store)
  api.on('.storage-item', 'click', (_e, el) => {
    const category = el.dataset.category as StoreCategory;
    const itemId = el.dataset.item;
    if (category && itemId) {
      api.setState({ selectedCategory: category, selectedItem: itemId });
    }
  });

  // Buy button
  api.on('#btn-buy', 'click', () => {
    if (!canBuy()) return;

    const currentState = api.getState();
    if (!currentState.selectedItem) return;

    const newState = handleBuy(
      props.campaignState,
      currentState.selectedCategory,
      currentState.selectedItem,
    );
    if (newState !== props.campaignState) {
      onStateUpdate(newState);
      addTransactionSystemMessage('bought', currentState.selectedItem);
    }

    if (shouldUseActionRequest()) {
      const itemType = categoryToItemType(currentState.selectedCategory);
      if (itemType && itemType !== 'scrap') {
        void requestBuyAction(
          props.campaignState,
          itemType,
          currentState.selectedItem,
          currentState.selectedCategory === 'ammo' &&
            currentState.selectedItem === 'autocannon'
            ? 10
            : 1,
        );
      }
    }
  });

  // Sell button
  api.on('#btn-sell', 'click', () => {
    if (!canSell()) return;

    const currentState = api.getState();
    if (!currentState.selectedItem) return;

    const newState = handleSell(
      props.campaignState,
      currentState.selectedCategory,
      currentState.selectedItem,
    );
    if (newState !== props.campaignState) {
      onStateUpdate(newState);
      addTransactionSystemMessage('sold', currentState.selectedItem);
    }

    if (shouldUseActionRequest()) {
      const itemType = categoryToItemType(currentState.selectedCategory);
      if (itemType) {
        let itemId = currentState.selectedItem;
        if (itemType !== 'ammo' && itemType !== 'scrap') {
          const storageIndex = getStorageIndex(
            props.campaignState,
            currentState.selectedCategory,
            currentState.selectedItem,
          );
          if (storageIndex >= 0) {
            itemId = String(storageIndex);
          }
        }
        void requestSellAction(
          props.campaignState,
          itemType,
          itemId,
          currentState.selectedCategory === 'ammo' &&
            currentState.selectedItem === 'autocannon'
            ? 10
            : 1,
        );
      }
    }
  });

  // Bulk buy button (missiles ×10, ammo ×100)
  api.on('#btn-buy-bulk', 'click', () => {
    if (!canBuy()) return;

    const currentState = api.getState();
    if (!currentState.selectedItem) return;

    const newState = handleBulkBuy(
      props.campaignState,
      currentState.selectedCategory,
      currentState.selectedItem,
    );
    if (newState !== props.campaignState) {
      onStateUpdate(newState);
      const bulkQty =
        currentState.selectedCategory === 'secondaries'
          ? 10
          : currentState.selectedItem === 'autocannon'
            ? 100
            : 10;
      addTransactionSystemMessage('bought', currentState.selectedItem, bulkQty);
    }

    if (shouldUseActionRequest()) {
      const itemType = categoryToItemType(currentState.selectedCategory);
      if (itemType === 'secondary' || itemType === 'ammo') {
        const quantity =
          itemType === 'secondary'
            ? 10
            : currentState.selectedItem === 'autocannon'
              ? 100
              : 10;
        void requestBuyAction(
          props.campaignState,
          itemType,
          currentState.selectedItem,
          quantity,
        );
      }
    }
  });

  // Bulk sell button (missiles ×10, ammo ×100, scrap ×10)
  api.on('#btn-sell-bulk', 'click', () => {
    if (!canSell()) return;

    const currentState = api.getState();
    if (!currentState.selectedItem) return;

    const newState = handleBulkSell(
      props.campaignState,
      currentState.selectedCategory,
      currentState.selectedItem,
    );
    if (newState !== props.campaignState) {
      onStateUpdate(newState);
      addTransactionSystemMessage('sold', currentState.selectedItem, 10);
    }

    if (shouldUseActionRequest()) {
      const itemType = categoryToItemType(currentState.selectedCategory);
      if (
        itemType === 'secondary' ||
        itemType === 'ammo' ||
        itemType === 'scrap'
      ) {
        let itemId = currentState.selectedItem;
        let quantity = 10;
        if (itemType === 'secondary') {
          const storageIndex = getStorageIndex(
            props.campaignState,
            currentState.selectedCategory,
            currentState.selectedItem,
          );
          if (storageIndex >= 0) {
            itemId = String(storageIndex);
          }
        } else if (itemType === 'ammo') {
          quantity = currentState.selectedItem === 'autocannon' ? 100 : 10;
        }
        void requestSellAction(props.campaignState, itemType, itemId, quantity);
      }
    }
  });

  // Bulk sell ×100 button (scrap only)
  api.on('#btn-sell-bulk-100', 'click', () => {
    if (!canSell()) return;

    const currentState = api.getState();
    if (!currentState.selectedItem) return;
    if (currentState.selectedCategory !== 'scrap') return;

    const newState = handleBulkSell100(
      props.campaignState,
      currentState.selectedCategory,
      currentState.selectedItem,
    );
    if (newState !== props.campaignState) {
      onStateUpdate(newState);
      addTransactionSystemMessage('sold', currentState.selectedItem, 100);
    }

    if (shouldUseActionRequest()) {
      void requestSellAction(
        props.campaignState,
        'scrap',
        currentState.selectedItem,
        100,
      );
    }
  });

  // Convert scrap to ship button
  api.on('#btn-convert', 'click', () => {
    if (!canConvertScrap()) return;

    const currentState = api.getState();
    if (
      !currentState.selectedItem ||
      currentState.selectedCategory !== 'scrap'
    ) {
      return;
    }

    const newState = convertScrapToShip(
      props.campaignState,
      currentState.selectedItem,
    );
    if (newState !== props.campaignState) {
      onStateUpdate(newState);
      addScrapConversionMessage(currentState.selectedItem);
    }

    if (shouldUseActionRequest()) {
      void requestConvertScrapAction(
        props.campaignState,
        currentState.selectedItem,
      );
    }
  });

  // Ship and scrap previews display schematic connector lines
  if (
    state.selectedCategory === 'ships' ||
    state.selectedCategory === 'scrap'
  ) {
    const previewContainer = document.querySelector(
      '.ship-preview-container, .scrap-preview-container',
    );
    if (previewContainer) {
      initShipConnectors(previewContainer);
    }
  }
}
