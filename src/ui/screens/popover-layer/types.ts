/**
 * Popover Layer Types
 *
 * Type definitions for the popover layer screen system.
 * All state is managed through the Screen framework.
 */

import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../../campaign/types';

/** Position of a popover relative to viewport */
export interface PopoverPosition {
  top: number;
  left: number;
  /** Whether the popover is positioned above the trigger (flipped) */
  flipped: boolean;
}

/** Primary weapon popover content */
export interface PrimaryPopoverContent {
  type: 'primary';
  weapon: EquippedPrimary;
  shipId: string;
  slotIndex: number;
}

/** Secondary weapon popover content */
export interface SecondaryPopoverContent {
  type: 'secondary';
  weapon: EquippedSecondary;
  shipId: string;
  slotIndex: number;
}

/** Empty slot picker content */
export interface EmptySlotContent {
  type: 'empty';
  slotType: 'primary' | 'secondary';
  shipId: string;
  slotIndex: number;
  /** Available bank sizes for this slot */
  availableBankSizes: number[];
}

/** Weapon swap submenu content */
export interface SwapMenuContent {
  type: 'swap';
  slotType: 'primary' | 'secondary';
  shipId: string;
  slotIndex: number;
  currentWeaponType: string;
}

/** Union of all popover content types */
export type PopoverContent =
  | PrimaryPopoverContent
  | SecondaryPopoverContent
  | EmptySlotContent
  | SwapMenuContent;

/** Popover visibility state */
export type PopoverVisibility = 'hidden' | 'hover' | 'pinned';

/** Single popover instance state */
export interface PopoverInstance {
  /** Unique ID for this popover */
  id: string;
  /** Content to render */
  content: PopoverContent;
  /** Computed position */
  position: PopoverPosition;
  /** Current visibility state */
  visibility: PopoverVisibility;
  /** Trigger element rect (for repositioning) */
  triggerRect: DOMRect;
}

/** Popover layer screen state */
export interface PopoverLayerState {
  /** Main popover (weapon info, empty slot picker) */
  main: PopoverInstance | null;
  /** Submenu (weapon swap picker) */
  submenu: PopoverInstance | null;
  /** Campaign state reference for data access */
  campaignState: CampaignState | null;
  /** Close timeout ID (for debounced close) */
  closeTimeoutId: ReturnType<typeof setTimeout> | null;
  /** Whether mouse is over the popover (for close debounce) */
  isMouseOverPopover: boolean;
}

/** Popover layer props (passed on mount) */
export interface PopoverLayerProps {
  /** Callback when campaign state is modified */
  onStateChange: (newState: CampaignState) => void;
  /** Get fresh campaign state */
  getCampaignState: () => CampaignState;
}

/** Show popover options */
export interface ShowPopoverOptions {
  content: PopoverContent;
  triggerRect: DOMRect;
  pinned?: boolean;
}

/** Popover action types for event handling */
export type PopoverAction =
  | { type: 'load'; amount: number }
  | { type: 'unload'; amount: number }
  | { type: 'load-all' }
  | { type: 'unload-all' }
  | { type: 'change-weapon' }
  | { type: 'unequip' }
  | { type: 'select-weapon'; weaponType: string; bankSize?: number };
