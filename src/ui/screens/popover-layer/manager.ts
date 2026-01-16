/**
 * Popover Layer Manager
 *
 * Singleton manager for the popover layer screen.
 * Provides global access to show/hide popovers from any screen.
 */

import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../../campaign/types';
import { createScreen, type ScreenHandle } from '../../framework/screen';
import {
  createInitialState,
  createPopoverLayerAPI,
  type PopoverLayerAPI,
  PopoverLayerScreen,
} from './screen';
import type {
  PopoverContent,
  PopoverLayerProps,
  PopoverLayerState,
} from './types';

/** Internal state */
let containerElement: HTMLElement | null = null;
let screenHandle: ScreenHandle<PopoverLayerState, PopoverLayerProps> | null =
  null;
let popoverAPI: PopoverLayerAPI | null = null;
let currentCampaignState: CampaignState | null = null;
let stateUpdateCallback: ((newState: CampaignState) => void) | null = null;

/**
 * Initialize the popover layer.
 * Call once at app startup.
 */
export function initPopoverLayer(): void {
  if (containerElement) return; // Already initialized

  containerElement = document.createElement('div');
  containerElement.id = 'popover-layer';
  containerElement.className = 'popover-layer';
  document.body.appendChild(containerElement);
}

/**
 * Mount the popover layer screen.
 * Call when entering a screen that needs popovers (Squadron, Store).
 */
export function mountPopoverLayer(
  getCampaignState: () => CampaignState,
  onStateChange: (newState: CampaignState) => void,
): void {
  if (!containerElement) {
    initPopoverLayer();
  }

  // Destroy existing handle
  if (screenHandle) {
    screenHandle.destroy();
  }

  currentCampaignState = getCampaignState();
  stateUpdateCallback = onStateChange;

  // Cache reference to avoid closure issues with null checks
  const getState = () => {
    if (!currentCampaignState) {
      throw new Error('Campaign state not initialized');
    }
    return currentCampaignState;
  };

  const props: PopoverLayerProps = {
    getCampaignState: getState,
    onStateChange: (newState) => {
      currentCampaignState = newState;
      if (stateUpdateCallback) {
        stateUpdateCallback(newState);
      }
    },
  };

  // containerElement is guaranteed non-null by initPopoverLayer() above
  const container = containerElement as HTMLElement;
  screenHandle = createScreen(
    PopoverLayerScreen,
    container,
    createInitialState(),
    props,
  );

  // Store handle reference for closure
  const handle = screenHandle;
  popoverAPI = createPopoverLayerAPI(
    {
      setState: (partial) => handle.setState(partial),
      getState: () => handle.getState(),
    },
    getState,
  );
}

/**
 * Unmount the popover layer.
 * Call when leaving a screen that uses popovers.
 */
export function unmountPopoverLayer(): void {
  if (screenHandle) {
    screenHandle.destroy();
    screenHandle = null;
  }
  popoverAPI = null;
  currentCampaignState = null;
  stateUpdateCallback = null;
}

/**
 * Update the campaign state reference.
 * Call when campaign state changes externally.
 */
export function updatePopoverCampaignState(state: CampaignState): void {
  currentCampaignState = state;
}

/**
 * Show a primary weapon popover.
 */
export function showPrimaryWeaponPopover(
  triggerElement: HTMLElement,
  weapon: EquippedPrimary,
  shipId: string,
  slotIndex: number,
  pin = false,
): void {
  if (!popoverAPI) return;

  const content: PopoverContent = {
    type: 'primary',
    weapon,
    shipId,
    slotIndex,
  };

  popoverAPI.show(content, triggerElement.getBoundingClientRect(), pin);
}

/**
 * Show a secondary weapon popover.
 */
export function showSecondaryWeaponPopover(
  triggerElement: HTMLElement,
  weapon: EquippedSecondary,
  shipId: string,
  slotIndex: number,
  pin = false,
): void {
  if (!popoverAPI) return;

  const content: PopoverContent = {
    type: 'secondary',
    weapon,
    shipId,
    slotIndex,
  };

  popoverAPI.show(content, triggerElement.getBoundingClientRect(), pin);
}

/**
 * Show an empty slot weapon picker.
 */
export function showEmptySlotPicker(
  triggerElement: HTMLElement,
  slotType: 'primary' | 'secondary',
  shipId: string,
  slotIndex: number,
  availableBankSizes: number[],
  pin = false,
): void {
  if (!popoverAPI) return;

  const content: PopoverContent = {
    type: 'empty',
    slotType,
    shipId,
    slotIndex,
    availableBankSizes,
  };

  popoverAPI.show(content, triggerElement.getBoundingClientRect(), pin);
}

/**
 * Close all popovers.
 */
export function closePopovers(): void {
  popoverAPI?.close();
}

/**
 * Check if any popover is currently open.
 */
export function isPopoverOpen(): boolean {
  return popoverAPI?.isOpen() ?? false;
}

/**
 * Pin the current popover (if in hover state).
 */
export function pinCurrentPopover(): void {
  if (!screenHandle) return;

  const state = screenHandle.getState();
  if (state.main && state.main.visibility === 'hover') {
    screenHandle.setState({
      main: { ...state.main, visibility: 'pinned' },
    });
  }
}

/**
 * Hide popover if not pinned (for mouseleave behavior).
 * Schedules close with 50ms delay, cancelled if mouse enters popover.
 */
export function hidePopoverIfNotPinned(): void {
  if (!screenHandle) return;

  const state = screenHandle.getState();
  if (state.main && state.main.visibility !== 'pinned') {
    // Cancel any existing timeout
    if (state.closeTimeoutId) {
      clearTimeout(state.closeTimeoutId);
    }

    // Schedule close with delay, checking isMouseOverPopover when it fires
    const timeoutId = setTimeout(() => {
      const currentState = screenHandle?.getState();
      if (
        currentState &&
        currentState.main?.visibility !== 'pinned' &&
        !currentState.isMouseOverPopover
      ) {
        closePopovers();
      }
    }, 50);

    screenHandle.updateState({ closeTimeoutId: timeoutId });
  }
}

/**
 * Cancel any pending close timeout.
 */
export function cancelPopoverClose(): void {
  if (!screenHandle) return;

  const state = screenHandle.getState();
  if (state.closeTimeoutId) {
    clearTimeout(state.closeTimeoutId);
    screenHandle.updateState({ closeTimeoutId: null });
  }
}
