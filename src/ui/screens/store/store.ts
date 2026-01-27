/**
 * Store UI - equipment shop for buying/selling ships, weapons, and ammo.
 *
 * Multiplayer support:
 * - Hosts: direct state changes, synced to guests
 * - Guests: actions sent via ActionRequest, state received via CampaignSync
 */

import type { CampaignState } from '../../../campaign/types';
import type { NavDestination } from '../../common/nav-bar';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import {
  getFirstVisibleCategory,
  isCategoryVisible,
  type StoreCategory,
} from './render';
import {
  bindStoreEvents,
  type StoreProps,
  type StoreState,
} from './store-bind';
import { renderStoreContent } from './store-content';

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
export type { StoreProps, StoreState } from './store-bind';

// =============================================================================
// Screen Component
// =============================================================================

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
    bindStoreEvents(api, props);
  },
};

// =============================================================================
// Module State
// =============================================================================

/** Screen handle for external control */
let screenHandle: ScreenHandle<StoreState, StoreProps> | null = null;
/** Store current props for state updates */
let currentProps: StoreProps | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Refresh store UI with new campaign state (for multiplayer sync).
 * Call when campaign state changes externally (e.g., from network).
 */
export function refreshStoreUI(newCampaignState: CampaignState): void {
  if (!screenHandle || !currentProps) return;
  currentProps = { ...currentProps, campaignState: newCampaignState };
  screenHandle.setProps(currentProps);
}

/**
 * Check if the store UI is currently active.
 */
export function isStoreUIActive(): boolean {
  return screenHandle !== null;
}

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
