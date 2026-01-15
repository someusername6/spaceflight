/**
 * Tooltip System - Legacy module for generic hover tooltips.
 *
 * Weapon/missile tooltips have been replaced by unified popovers.
 * This module is kept for defensive hideTooltip() calls that ensure
 * no stray tooltips remain visible when opening popovers.
 */

/** Global tooltip element (null - no active tooltip system creates these) */
const tooltipElement: HTMLElement | null = null;

/** Hide tooltip */
export function hideTooltip(): void {
  if (tooltipElement) {
    tooltipElement.style.display = 'none';
  }
}
