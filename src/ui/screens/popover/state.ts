/**
 * Popover State - Shared state management for weapon popovers and pickers.
 *
 * Uses a single PopoverState object to consolidate all module-level state.
 */

// =============================================================================
// Types
// =============================================================================

/** Consolidated popover state */
export interface PopoverState {
  /** Active popover/picker element */
  picker: HTMLElement | null;
  /** The slot element that triggered the popover */
  slotElement: HTMLElement | null;
  /** Active submenu (weapon swap picker) */
  submenu: HTMLElement | null;
  /** Whether the popover is pinned (locked open) */
  isPinned: boolean;
  /** Whether mouse is currently over the popover */
  isMouseOver: boolean;
  /** Timeout for delayed close */
  closeTimeout: ReturnType<typeof setTimeout> | null;
  /** Stored reference to outside click listener for cleanup */
  outsideClickListener: ((e: MouseEvent) => void) | null;
}

// =============================================================================
// State Management
// =============================================================================

/** Create initial state */
function createPopoverState(): PopoverState {
  return {
    picker: null,
    slotElement: null,
    submenu: null,
    isPinned: false,
    isMouseOver: false,
    closeTimeout: null,
    outsideClickListener: null,
  };
}

/** Single module-level state object */
const state: PopoverState = createPopoverState();

/** Get the current state (for testing/debugging) */
export function getPopoverState(): PopoverState {
  return state;
}

// =============================================================================
// Getters
// =============================================================================

/** Get active picker element */
export function getActivePicker(): HTMLElement | null {
  return state.picker;
}

/** Get active submenu element */
export function getActiveSubmenu(): HTMLElement | null {
  return state.submenu;
}

/** Get active slot element */
export function getActiveSlotElement(): HTMLElement | null {
  return state.slotElement;
}

// =============================================================================
// Setters
// =============================================================================

/** Set active picker */
export function setActivePicker(picker: HTMLElement | null): void {
  state.picker = picker;
}

/** Set active slot element */
export function setActiveSlotElement(el: HTMLElement | null): void {
  state.slotElement = el;
}

/** Set active submenu */
export function setActiveSubmenu(submenu: HTMLElement | null): void {
  state.submenu = submenu;
}

/** Set mouse over popover state */
export function setMouseOverPopover(isOver: boolean): void {
  state.isMouseOver = isOver;
  if (isOver && state.closeTimeout) {
    clearTimeout(state.closeTimeout);
    state.closeTimeout = null;
  }
}

// =============================================================================
// Actions
// =============================================================================

/** Close any open submenu */
export function closeSubmenu(): void {
  if (state.submenu) {
    state.submenu.remove();
    state.submenu = null;
  }
}

/** Reset popover state (called when opening a new picker) */
export function resetPopoverState(): void {
  state.isPinned = false;
  state.isMouseOver = false;
  if (state.closeTimeout) {
    clearTimeout(state.closeTimeout);
    state.closeTimeout = null;
  }
}

/** Close any open popover */
export function closePopover(): void {
  if (state.closeTimeout) {
    clearTimeout(state.closeTimeout);
    state.closeTimeout = null;
  }
  if (state.outsideClickListener) {
    document.removeEventListener('click', state.outsideClickListener);
    state.outsideClickListener = null;
  }
  closeSubmenu();
  if (state.picker) {
    state.picker.remove();
    state.picker = null;
  }
  state.isPinned = false;
  state.isMouseOver = false;
  state.slotElement = null;
}

/** Pin the current popover (called on click) */
export function pinWeaponPopover(): void {
  if (!state.picker || state.isPinned) return;

  state.isPinned = true;
  state.picker.classList.add('pinned');

  // Remove any existing listener before adding new one
  if (state.outsideClickListener) {
    document.removeEventListener('click', state.outsideClickListener);
  }

  // Outside-click pattern: dismiss popover when clicking outside.
  // This pattern appears in several places (ship-picker, swap popover, settings).
  // Each location has slightly different behavior (elements to check, actions to take).
  // Key details:
  // - Use contains() to check if click target is inside the popover
  // - Use setTimeout(0) to defer addEventListener, avoiding the click that opened it
  // - Store listener reference for cleanup, or make it self-removing
  state.outsideClickListener = (e: MouseEvent) => {
    if (state.picker && !state.picker.contains(e.target as Node)) {
      closePopover();
    }
  };

  setTimeout(() => {
    if (state.outsideClickListener) {
      document.addEventListener('click', state.outsideClickListener);
    }
  }, 0);
}

/** Hide popover on mouseleave (only if not pinned) */
export function hideWeaponPopoverIfNotPinned(): void {
  if (state.isPinned) return;

  if (state.closeTimeout) clearTimeout(state.closeTimeout);
  state.closeTimeout = setTimeout(() => {
    if (!state.isPinned && !state.isMouseOver) {
      closePopover();
    }
    state.closeTimeout = null;
  }, 50);
}
