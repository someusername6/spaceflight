/**
 * Tooltip System - Generic hover tooltips.
 *
 * Note: Weapon/missile tooltips have been replaced by unified popovers
 * in hangar-equip.ts. This module provides generic tooltip utilities.
 */

/** Global tooltip element (singleton) */
let tooltipElement: HTMLElement | null = null;

/** Create or get the tooltip element */
function getTooltipElement(): HTMLElement {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'stat-tooltip';
    tooltipElement.style.display = 'none';
    document.body.appendChild(tooltipElement);
  }
  return tooltipElement;
}

/** Position tooltip near cursor, staying on screen */
function positionTooltip(e: MouseEvent): void {
  const tooltip = getTooltipElement();
  const padding = 15;
  const rect = tooltip.getBoundingClientRect();

  let x = e.clientX + padding;
  let y = e.clientY + padding;

  // Keep on screen horizontally
  if (x + rect.width > window.innerWidth - padding) {
    x = e.clientX - rect.width - padding;
  }

  // Keep on screen vertically
  if (y + rect.height > window.innerHeight - padding) {
    y = e.clientY - rect.height - padding;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

/** Show tooltip with content */
export function showTooltip(content: string, e: MouseEvent): void {
  const tooltip = getTooltipElement();
  tooltip.innerHTML = content;
  tooltip.style.display = 'block';
  positionTooltip(e);
}

/** Hide tooltip */
export function hideTooltip(): void {
  const tooltip = getTooltipElement();
  tooltip.style.display = 'none';
}

/** Update tooltip position on mouse move */
export function updateTooltipPosition(e: MouseEvent): void {
  const tooltip = getTooltipElement();
  if (tooltip.style.display !== 'none') {
    positionTooltip(e);
  }
}

/** Cleanup function type */
export type TooltipCleanup = () => void;

/**
 * Bind tooltip events to an element.
 * Returns a cleanup function to remove the listeners.
 */
export function bindTooltip(
  element: HTMLElement,
  contentFn: () => string,
): TooltipCleanup {
  const onEnter = (e: Event) => {
    showTooltip(contentFn(), e as MouseEvent);
  };

  const onMove = (e: Event) => {
    updateTooltipPosition(e as MouseEvent);
  };

  const onLeave = () => {
    hideTooltip();
  };

  element.addEventListener('mouseenter', onEnter);
  element.addEventListener('mousemove', onMove);
  element.addEventListener('mouseleave', onLeave);

  return () => {
    element.removeEventListener('mouseenter', onEnter);
    element.removeEventListener('mousemove', onMove);
    element.removeEventListener('mouseleave', onLeave);
  };
}
