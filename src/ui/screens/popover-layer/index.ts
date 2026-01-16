/**
 * Popover Layer Module
 *
 * Screen-based popover system for weapon management UI.
 * Replaces the global popover state management with a proper Screen component.
 */

export { createPopoverLayerAPI, type PopoverLayerAPI } from './api';
// Manager functions (primary interface)
export {
  cancelPopoverClose,
  closePopovers,
  hidePopoverIfNotPinned,
  initPopoverLayer,
  isPopoverOpen,
  mountPopoverLayer,
  pinCurrentPopover,
  showEmptySlotPicker,
  showPrimaryWeaponPopover,
  showSecondaryWeaponPopover,
  unmountPopoverLayer,
  updatePopoverCampaignState,
} from './manager';
// Positioning functions (for custom positioning needs)
export {
  adjustForOverflow,
  calculateInitialPosition,
  calculateSubmenuPosition,
  isPointInRect,
} from './positioning';
// Screen component (for advanced usage)
export { createInitialState, PopoverLayerScreen } from './screen';

// Types
export type {
  EmptySlotContent,
  PopoverContent,
  PopoverLayerProps,
  PopoverLayerState,
  PopoverPosition,
  PrimaryPopoverContent,
  SecondaryPopoverContent,
  SwapMenuContent,
} from './types';
