/**
 * Forbidden Tooltip - Shared utility for positioning tooltips that need to
 * escape overflow containers by moving to document.body.
 *
 * Used by ship-picker and squadron screens for "pilot can't fly ship" tooltips.
 */

import type { ScreenAPI } from '../framework/screen';

/**
 * Store reference to source element for each active tooltip.
 * This prevents returning tooltips to wrong elements on quick hover transitions.
 */
const tooltipSources = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Show a forbidden tooltip by moving it to body and positioning it.
 * Called on mouseenter of a .forbidden element.
 */
function showForbiddenTooltip(el: HTMLElement): void {
  const tooltip = el.querySelector('.forbidden-tooltip') as HTMLElement;
  if (!tooltip) return;

  const cardRect = el.getBoundingClientRect();

  // Move tooltip to body to escape overflow containers
  tooltip.classList.add('forbidden-tooltip-active');
  tooltipSources.set(tooltip, el);
  document.body.appendChild(tooltip);

  // Measure after moving to body
  const tooltipRect = tooltip.getBoundingClientRect();

  // Position above the card, centered horizontally
  let left = cardRect.left + cardRect.width / 2 - tooltipRect.width / 2;
  let top = cardRect.top - tooltipRect.height - 8;

  // Adjust if overflowing viewport edges
  const padding = 8;
  if (left < padding) left = padding;
  if (left + tooltipRect.width > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width - padding;
  }
  if (top < padding) {
    // Position below instead
    top = cardRect.bottom + 8;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

/**
 * Hide a forbidden tooltip by moving it back to its source element.
 * Called on mouseleave of a .forbidden element.
 */
function hideForbiddenTooltip(el: HTMLElement): void {
  // Find tooltip that belongs to this element
  const tooltips = document.body.querySelectorAll('.forbidden-tooltip-active');
  for (const tooltip of tooltips) {
    const source = tooltipSources.get(tooltip as HTMLElement);
    if (source === el) {
      const htmlTooltip = tooltip as HTMLElement;
      tooltipSources.delete(htmlTooltip);
      htmlTooltip.classList.remove('forbidden-tooltip-active');
      htmlTooltip.style.left = '';
      htmlTooltip.style.top = '';
      el.appendChild(htmlTooltip);
      return;
    }
  }
}

/**
 * Clean up any orphaned tooltips in the body.
 * Call this when destroying a component that uses forbidden tooltips.
 */
export function cleanupForbiddenTooltips(): void {
  const tooltips = document.body.querySelectorAll('.forbidden-tooltip-active');
  for (const tooltip of tooltips) {
    tooltip.remove();
  }
}

/**
 * Bind forbidden tooltip handlers to a screen.
 * Uses onDirect because mouseenter/mouseleave don't bubble.
 */
export function bindForbiddenTooltips<S>(api: ScreenAPI<S>): void {
  api.onDirect('.forbidden', 'mouseenter', (_e: Event, el: HTMLElement) => {
    showForbiddenTooltip(el);
  });

  api.onDirect('.forbidden', 'mouseleave', (_e: Event, el: HTMLElement) => {
    hideForbiddenTooltip(el);
  });
}
