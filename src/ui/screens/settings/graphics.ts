/**
 * Settings Graphics Tab - Frame rate and graphics options.
 */

import {
  FRAME_RATE_OPTIONS,
  type FrameRateCap,
  getFrameRateCap,
} from '../../../settings/game-settings';

/** Get label for current FPS cap value */
export function getFpsLabel(value: FrameRateCap): string {
  const option = FRAME_RATE_OPTIONS.find((opt) => opt.value === value);
  return option?.label ?? `${value} FPS`;
}

/** Render the FPS popover */
function renderFpsPopover(currentFps: FrameRateCap): string {
  const items = FRAME_RATE_OPTIONS.map(
    (opt) => `
      <button class="settings-picker-item ${opt.value === currentFps ? 'selected' : ''}"
              data-fps="${opt.value}">
        ${opt.label}
      </button>
    `,
  ).join('');

  return `
    <div class="settings-picker" id="fps-popover">
      <div class="settings-picker-content">
        ${items}
      </div>
    </div>
  `;
}

/** Render the graphics tab content */
export function renderGraphicsTab(showFpsPopover: boolean): string {
  const currentFps = getFrameRateCap();

  return `
    <div class="settings-tab-content">
      <div class="graphics-settings">
        <div class="binding-row">
          <span class="binding-label">Frame Rate Limit</span>
          <div class="binding-controls">
            <div class="settings-picker-trigger-container">
              <button class="settings-picker-trigger" id="fps-cap-trigger">
                ${getFpsLabel(currentFps)}
              </button>
              ${showFpsPopover ? renderFpsPopover(currentFps) : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Active popover outside click listener */
let activePopoverListener: ((e: MouseEvent) => void) | null = null;

/** Setup outside click listener for popover */
export function setupPopoverListener(onClose: () => void): void {
  cleanupPopoverListener();

  activePopoverListener = (e: MouseEvent) => {
    const popover = document.getElementById('fps-popover');
    const trigger = document.getElementById('fps-cap-trigger');
    if (
      popover &&
      trigger &&
      !popover.contains(e.target as Node) &&
      !trigger.contains(e.target as Node)
    ) {
      cleanupPopoverListener();
      onClose();
    }
  };

  // Delay to avoid catching the opening click
  setTimeout(() => {
    if (activePopoverListener) {
      document.addEventListener('click', activePopoverListener);
    }
  }, 0);
}

/** Cleanup popover outside click listener */
export function cleanupPopoverListener(): void {
  if (activePopoverListener) {
    document.removeEventListener('click', activePopoverListener);
    activePopoverListener = null;
  }
}

/** Position the FPS popover below its trigger */
export function positionFpsPopover(): void {
  const trigger = document.getElementById('fps-cap-trigger');
  const popover = document.getElementById('fps-popover');
  if (trigger && popover) {
    const rect = trigger.getBoundingClientRect();
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom + 4}px`;
  }
}
