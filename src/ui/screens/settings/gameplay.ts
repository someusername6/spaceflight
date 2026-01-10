/**
 * Settings Gameplay Tab - Gameplay options like autoaim.
 */

import {
  getPlayerAutoaim,
  PLAYER_AUTOAIM_OPTIONS,
  type PlayerAutoaim,
} from '../../../settings/game-settings';

/** Get label for current autoaim value */
export function getAutoaimLabel(value: PlayerAutoaim): string {
  const option = PLAYER_AUTOAIM_OPTIONS.find((opt) => opt.value === value);
  return option?.label ?? `${value}°`;
}

/** Render the autoaim popover */
function renderAutoaimPopover(currentAutoaim: PlayerAutoaim): string {
  const items = PLAYER_AUTOAIM_OPTIONS.map(
    (opt) => `
      <button class="settings-picker-item ${opt.value === currentAutoaim ? 'selected' : ''}"
              data-autoaim="${opt.value}">
        ${opt.label}
      </button>
    `,
  ).join('');

  return `
    <div class="settings-picker" id="autoaim-popover">
      <div class="settings-picker-content">
        ${items}
      </div>
    </div>
  `;
}

/** Render the gameplay tab content */
export function renderGameplayTab(showAutoaimPopover: boolean): string {
  const currentAutoaim = getPlayerAutoaim();

  return `
    <div class="settings-tab-content">
      <div class="gameplay-settings">
        <div class="binding-row">
          <span class="binding-label">Aim Assist</span>
          <div class="binding-controls">
            <div class="settings-picker-trigger-container">
              <button class="settings-picker-trigger" id="autoaim-trigger">
                ${getAutoaimLabel(currentAutoaim)}
              </button>
              ${showAutoaimPopover ? renderAutoaimPopover(currentAutoaim) : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Active popover outside click listener */
let activeAutoaimPopoverListener: ((e: MouseEvent) => void) | null = null;

/** Setup outside click listener for autoaim popover */
export function setupAutoaimPopoverListener(onClose: () => void): void {
  cleanupAutoaimPopoverListener();

  activeAutoaimPopoverListener = (e: MouseEvent) => {
    const popover = document.getElementById('autoaim-popover');
    const trigger = document.getElementById('autoaim-trigger');
    if (
      popover &&
      trigger &&
      !popover.contains(e.target as Node) &&
      !trigger.contains(e.target as Node)
    ) {
      cleanupAutoaimPopoverListener();
      onClose();
    }
  };

  // Delay to avoid catching the opening click
  setTimeout(() => {
    if (activeAutoaimPopoverListener) {
      document.addEventListener('click', activeAutoaimPopoverListener);
    }
  }, 0);
}

/** Cleanup autoaim popover outside click listener */
export function cleanupAutoaimPopoverListener(): void {
  if (activeAutoaimPopoverListener) {
    document.removeEventListener('click', activeAutoaimPopoverListener);
    activeAutoaimPopoverListener = null;
  }
}

/** Position the autoaim popover below its trigger */
export function positionAutoaimPopover(): void {
  const trigger = document.getElementById('autoaim-trigger');
  const popover = document.getElementById('autoaim-popover');
  if (trigger && popover) {
    const rect = trigger.getBoundingClientRect();
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom + 4}px`;
  }
}
