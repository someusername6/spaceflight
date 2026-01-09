/**
 * Store UI - equipment shop for buying/selling ships, weapons, and ammo.
 */

import { storeResupplyAllShips } from '../../../campaign/state';
import { convertScrapToShip } from '../../../campaign/store/store';
import type { CampaignState } from '../../../campaign/types';
import { bindNavBar, type NavDestination } from '../../common/nav-bar';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import { initShipConnectors } from '../../ship/connectors';
import {
  handleBulkBuy,
  handleBulkSell,
  handleBulkSell100,
  handleBuy,
  handleSell,
} from './events';
import {
  getFirstVisibleCategory,
  isCategoryVisible,
  type StoreCategory,
} from './render';
import { renderStoreContent } from './store-content';

/** Store screen state */
interface StoreState {
  selectedCategory: StoreCategory;
  selectedItem: string | null;
}

/** Store screen props */
interface StoreProps {
  campaignState: CampaignState;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate: (newState: CampaignState) => void;
}

/** Legacy UI interface for backwards compatibility */
export interface StoreUI {
  element: HTMLElement;
  state: CampaignState;
  selectedCategory: StoreCategory;
  selectedItem: string | null;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate: (newState: CampaignState) => void;
}

export type { NavDestination } from '../../common/nav-bar';
// Re-export types for external use
export type { StoreCategory } from './render';

/** Store screen component */
const StoreScreenComponent: Screen<StoreState, StoreProps> = {
  render(state, props) {
    // If current category is no longer visible, switch to first visible one
    let category = state.selectedCategory;
    if (!isCategoryVisible(props.campaignState, category)) {
      category = getFirstVisibleCategory(props.campaignState) ?? 'ships';
    }

    return renderStoreContent(
      category,
      state.selectedItem,
      props.campaignState,
      props.onNavigate,
    );
  },

  bind(api: ScreenAPI<StoreState>, props: StoreProps) {
    const state = api.getState();
    const { onNavigate, onStateUpdate } = props;

    // Bind navigation bar
    // Note: bindNavBar uses addEventListener directly, so we query for this
    // screen's element to avoid finding hidden screens' nav bars
    const screenEl = document.querySelector('#screen-store');
    if (screenEl) {
      bindNavBar(screenEl as HTMLElement, onNavigate);
    }

    // Resupply button
    api.on('#btn-resupply', 'click', () => {
      const newState = storeResupplyAllShips(props.campaignState);
      if (newState !== props.campaignState) {
        onStateUpdate(newState);
      }
    });

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
      const currentState = api.getState();
      if (currentState.selectedItem) {
        const newState = handleBuy(
          props.campaignState,
          currentState.selectedCategory,
          currentState.selectedItem,
        );
        if (newState !== props.campaignState) {
          onStateUpdate(newState);
        }
      }
    });

    // Sell button
    api.on('#btn-sell', 'click', () => {
      const currentState = api.getState();
      if (currentState.selectedItem) {
        const newState = handleSell(
          props.campaignState,
          currentState.selectedCategory,
          currentState.selectedItem,
        );
        if (newState !== props.campaignState) {
          onStateUpdate(newState);
        }
      }
    });

    // Bulk buy button (missiles ×10, ammo ×100)
    api.on('#btn-buy-bulk', 'click', () => {
      const currentState = api.getState();
      if (currentState.selectedItem) {
        const newState = handleBulkBuy(
          props.campaignState,
          currentState.selectedCategory,
          currentState.selectedItem,
        );
        if (newState !== props.campaignState) {
          onStateUpdate(newState);
        }
      }
    });

    // Bulk sell button (missiles ×10, ammo ×100, scrap ×10)
    api.on('#btn-sell-bulk', 'click', () => {
      const currentState = api.getState();
      if (currentState.selectedItem) {
        const newState = handleBulkSell(
          props.campaignState,
          currentState.selectedCategory,
          currentState.selectedItem,
        );
        if (newState !== props.campaignState) {
          onStateUpdate(newState);
        }
      }
    });

    // Bulk sell ×100 button (scrap only)
    api.on('#btn-sell-bulk-100', 'click', () => {
      const currentState = api.getState();
      if (currentState.selectedItem) {
        const newState = handleBulkSell100(
          props.campaignState,
          currentState.selectedCategory,
          currentState.selectedItem,
        );
        if (newState !== props.campaignState) {
          onStateUpdate(newState);
        }
      }
    });

    // Convert scrap to ship button
    api.on('#btn-convert', 'click', () => {
      const currentState = api.getState();
      if (
        currentState.selectedItem &&
        currentState.selectedCategory === 'scrap'
      ) {
        const newState = convertScrapToShip(
          props.campaignState,
          currentState.selectedItem,
        );
        if (newState !== props.campaignState) {
          onStateUpdate(newState);
        }
      }
    });

    // Ship and scrap previews display schematic connector lines from slots to ship
    // hardpoints. These require manual initialization after render since the SVG
    // overlay needs to measure element positions.
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
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<StoreState, StoreProps> | null = null;
/** Store current props for state updates */
let currentProps: StoreProps | null = null;

/** Create store UI */
export function createStoreUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onStateUpdate: (newState: CampaignState) => void,
): StoreUI {
  // Clean up previous handle
  screenHandle?.destroy();

  // Start with first visible category (or ships as fallback if somehow none visible)
  const initialCategory = getFirstVisibleCategory(state) ?? 'ships';

  const initialState: StoreState = {
    selectedCategory: initialCategory,
    selectedItem: null,
  };

  // Wrap onStateUpdate to also update the screen props
  const wrappedOnStateUpdate = (newCampaignState: CampaignState) => {
    onStateUpdate(newCampaignState);
    // Update props for the screen
    if (screenHandle && currentProps) {
      currentProps = { ...currentProps, campaignState: newCampaignState };
      screenHandle.setProps(currentProps);
    }
  };

  currentProps = {
    campaignState: state,
    onNavigate,
    onStateUpdate: wrappedOnStateUpdate,
  };

  screenHandle = createScreen(
    StoreScreenComponent,
    element,
    initialState,
    currentProps,
  );

  // Return legacy UI object for compatibility
  return {
    element,
    state,
    selectedCategory: initialCategory,
    selectedItem: null,
    onNavigate,
    onStateUpdate,
  };
}
