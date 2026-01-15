/**
 * Popover State - Shared state management for weapon popovers and pickers.
 */

/** Active popover/picker element */
export let activePicker: HTMLElement | null = null;

/** Whether the popover is pinned (locked open) */
let isPopoverPinned = false;

/** Whether mouse is currently over the popover */
let isMouseOverPopover = false;

/** Timeout for delayed close */
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

/** The slot element that triggered the popover */
let activeSlotElement: HTMLElement | null = null;

/** Active submenu (weapon swap picker) */
export let activeSubmenu: HTMLElement | null = null;

/** Stored reference to outside click listener for cleanup */
let outsideClickListener: ((e: MouseEvent) => void) | null = null;

/** Set active picker */
export function setActivePicker(picker: HTMLElement | null): void {
  activePicker = picker;
}

/** Get active slot element */
export function getActiveSlotElement(): HTMLElement | null {
  return activeSlotElement;
}

/** Set active slot element */
export function setActiveSlotElement(el: HTMLElement | null): void {
  activeSlotElement = el;
}

/** Set active submenu */
export function setActiveSubmenu(submenu: HTMLElement | null): void {
  activeSubmenu = submenu;
}

/** Close any open submenu */
export function closeSubmenu(): void {
  if (activeSubmenu) {
    activeSubmenu.remove();
    activeSubmenu = null;
  }
}

/** Reset popover state (called when opening a new picker) */
export function resetPopoverState(): void {
  isPopoverPinned = false;
  isMouseOverPopover = false;
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
}

/** Set mouse over popover state */
export function setMouseOverPopover(isOver: boolean): void {
  isMouseOverPopover = isOver;
  if (isOver && closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
}

/** Close any open popover */
export function closePopover(): void {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  if (outsideClickListener) {
    document.removeEventListener('click', outsideClickListener);
    outsideClickListener = null;
  }
  closeSubmenu();
  if (activePicker) {
    activePicker.remove();
    activePicker = null;
  }
  isPopoverPinned = false;
  isMouseOverPopover = false;
  activeSlotElement = null;
}

/** Pin the current popover (called on click) */
export function pinWeaponPopover(): void {
  if (!activePicker || isPopoverPinned) return;

  isPopoverPinned = true;
  activePicker.classList.add('pinned');

  // Remove any existing listener before adding new one
  if (outsideClickListener) {
    document.removeEventListener('click', outsideClickListener);
  }

  // Outside-click pattern: dismiss popover when clicking outside.
  // This pattern appears in several places (ship-picker, swap popover, settings).
  // Each location has slightly different behavior (elements to check, actions to take).
  // Key details:
  // - Use contains() to check if click target is inside the popover
  // - Use setTimeout(0) to defer addEventListener, avoiding the click that opened it
  // - Store listener reference for cleanup, or make it self-removing
  outsideClickListener = (e: MouseEvent) => {
    if (activePicker && !activePicker.contains(e.target as Node)) {
      closePopover();
    }
  };

  setTimeout(() => {
    if (outsideClickListener) {
      document.addEventListener('click', outsideClickListener);
    }
  }, 0);
}

/** Hide popover on mouseleave (only if not pinned) */
export function hideWeaponPopoverIfNotPinned(): void {
  if (isPopoverPinned) return;

  if (closeTimeout) clearTimeout(closeTimeout);
  closeTimeout = setTimeout(() => {
    if (!isPopoverPinned && !isMouseOverPopover) {
      closePopover();
    }
    closeTimeout = null;
  }, 50);
}
