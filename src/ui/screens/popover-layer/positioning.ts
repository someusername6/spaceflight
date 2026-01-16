/**
 * Popover Positioning Logic
 *
 * Pure functions for calculating popover positions.
 * No DOM manipulation - just math based on rects and viewport.
 */

import type { PopoverPosition } from './types';

/** Padding from viewport edges */
const VIEWPORT_PADDING = 8;

/** Gap between trigger and popover */
const TRIGGER_GAP = 4;

/**
 * Calculate initial popover position below trigger.
 * The popover is positioned with its top-left at (trigger.left, trigger.bottom + gap).
 */
export function calculateInitialPosition(triggerRect: DOMRect): {
  top: number;
  left: number;
} {
  return {
    top: triggerRect.bottom + TRIGGER_GAP,
    left: triggerRect.left,
  };
}

/**
 * Adjust position to prevent overflow, flipping if needed.
 *
 * @param position - Initial position
 * @param popoverRect - Popover dimensions (width/height)
 * @param triggerRect - Trigger element rect
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @returns Adjusted position with flip flag
 */
export function adjustForOverflow(
  position: { top: number; left: number },
  popoverRect: { width: number; height: number },
  triggerRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
): PopoverPosition {
  let { top, left } = position;
  let flipped = false;

  // Check bottom overflow - flip above trigger if needed
  const bottomEdge = top + popoverRect.height;
  if (bottomEdge > viewportHeight - VIEWPORT_PADDING) {
    const newTop = triggerRect.top - popoverRect.height - TRIGGER_GAP;
    if (newTop >= VIEWPORT_PADDING) {
      top = newTop;
      flipped = true;
    } else {
      // Can't flip, clamp to top
      top = VIEWPORT_PADDING;
    }
  }

  // Check right overflow - shift left
  const rightEdge = left + popoverRect.width;
  if (rightEdge > viewportWidth - VIEWPORT_PADDING) {
    const newLeft = viewportWidth - popoverRect.width - VIEWPORT_PADDING;
    left = Math.max(VIEWPORT_PADDING, newLeft);
  }

  return { top, left, flipped };
}

/**
 * Calculate submenu position relative to a button in the parent popover.
 * Submenu appears BELOW the button, or above if no room below.
 * Horizontally aligned with the button's left edge.
 */
export function calculateSubmenuPosition(
  buttonRect: DOMRect,
  submenuRect: { width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
): PopoverPosition {
  // Position below the button initially
  let top = buttonRect.bottom + TRIGGER_GAP;
  let left = buttonRect.left;
  let flipped = false;

  // Check bottom overflow - flip above button if needed
  const bottomEdge = top + submenuRect.height;
  if (bottomEdge > viewportHeight - VIEWPORT_PADDING) {
    const newTop = buttonRect.top - submenuRect.height - TRIGGER_GAP;
    if (newTop >= VIEWPORT_PADDING) {
      top = newTop;
      flipped = true;
    } else {
      // Can't flip, clamp to bottom
      top = viewportHeight - submenuRect.height - VIEWPORT_PADDING;
    }
  }

  // Check right overflow - shift left
  const rightEdge = left + submenuRect.width;
  if (rightEdge > viewportWidth - VIEWPORT_PADDING) {
    const newLeft = viewportWidth - submenuRect.width - VIEWPORT_PADDING;
    left = Math.max(VIEWPORT_PADDING, newLeft);
  }

  // Check left overflow - shift right
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  return { top, left, flipped };
}

/**
 * Check if a point is inside a rect (with optional padding).
 */
export function isPointInRect(
  x: number,
  y: number,
  rect: DOMRect,
  padding = 0,
): boolean {
  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  );
}
