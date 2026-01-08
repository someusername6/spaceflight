/**
 * Ship Picker - Popover for quickly swapping a pilot to a different ship.
 *
 * Displays available ships (empty active ships and stored ships) using
 * the same visual style as the ship card buttons in pilot-viewer.
 */

import {
  swapPilotToShip,
  swapPilotToStoredShip,
  unassignPilot,
} from '../../campaign/loadout';
import type { CampaignState } from '../../campaign/types';
import { FALLBACK_ICON_PATH, getShipIconPath } from '../ship/viewer';

/** Currently active ship picker element */
let activeShipPicker: HTMLElement | null = null;

/** Close any open ship picker */
export function closeShipPicker(): void {
  if (activeShipPicker) {
    activeShipPicker.remove();
    activeShipPicker = null;
  }
}

/** Render a ship card button */
function renderShipCard(
  shipClass: string,
  dataAttrs: string,
  count = 1,
): string {
  const iconPath = getShipIconPath(shipClass);
  const countBadge =
    count > 1 ? `<span class="ship-picker-count">×${count}</span>` : '';
  return `
    <button class="ship-picker-card" ${dataAttrs}>
      <div class="ship-picker-icon">
        <img src="${iconPath}" alt="${shipClass}" class="ship-picker-svg"
             onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'" />
      </div>
      <div class="ship-picker-name">${shipClass}${countBadge}</div>
    </button>
  `;
}

/** Group stored ships by ship class, returning first index of each group */
function groupStoredShipsByClass(
  ships: { shipClass: string }[],
): { shipClass: string; firstIndex: number; count: number }[] {
  const groups = new Map<string, { firstIndex: number; count: number }>();
  for (let i = 0; i < ships.length; i++) {
    const ship = ships[i];
    if (!ship) continue;
    const existing = groups.get(ship.shipClass);
    if (existing) {
      existing.count++;
    } else {
      groups.set(ship.shipClass, { firstIndex: i, count: 1 });
    }
  }
  return [...groups.entries()].map(([shipClass, data]) => ({
    shipClass,
    ...data,
  }));
}

/** Render ship picker content */
function renderShipPickerContent(
  currentShipId: string,
  state: CampaignState,
): string {
  const emptyShips = state.ships.filter(
    (s) => s.pilot === null && s.id !== currentShipId,
  );
  const storedShips = state.storedShips;

  const scrollableSections: string[] = [];

  // Empty active ships section
  if (emptyShips.length > 0) {
    const shipCards = emptyShips
      .map((ship) =>
        renderShipCard(
          ship.shipClass,
          `data-action="swap-to-ship" data-ship-id="${ship.id}"`,
        ),
      )
      .join('');

    scrollableSections.push(`
      <div class="ship-picker-section">
        <div class="ship-picker-section-label">Available Ships</div>
        <div class="ship-picker-grid">${shipCards}</div>
      </div>
    `);
  }

  // Stored ships section (grouped by ship class)
  if (storedShips.length > 0) {
    const groupedShips = groupStoredShipsByClass(storedShips);
    const shipCards = groupedShips
      .map((group) =>
        renderShipCard(
          group.shipClass,
          `data-action="swap-to-stored-ship" data-stored-ship-index="${group.firstIndex}"`,
          group.count,
        ),
      )
      .join('');

    scrollableSections.push(`
      <div class="ship-picker-section">
        <div class="ship-picker-section-label">Stored Ships</div>
        <div class="ship-picker-grid">${shipCards}</div>
      </div>
    `);
  }

  // No options message (if no ships available)
  if (emptyShips.length === 0 && storedShips.length === 0) {
    scrollableSections.push(`
      <div class="ship-picker-empty">
        No other ships available
      </div>
    `);
  }

  // Scrollable content area + sticky unassign footer
  return `
    <div class="ship-picker-content">
      ${scrollableSections.join('')}
    </div>
    <div class="ship-picker-footer">
      <button class="btn btn-danger ship-picker-unassign" data-action="unassign">
        Unassign Pilot
      </button>
    </div>
  `;
}

/** Show ship picker popover */
export function showShipPicker(
  triggerElement: HTMLElement,
  pilotId: string,
  currentShipId: string,
  state: CampaignState,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  closeShipPicker();

  const picker = document.createElement('div');
  picker.className = 'ship-picker';
  picker.innerHTML = renderShipPickerContent(currentShipId, state);

  // Position relative to trigger
  const triggerRect = triggerElement.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.zIndex = '1000';

  document.body.appendChild(picker);
  activeShipPicker = picker;

  // Position after adding to DOM (so we can measure)
  const pickerRect = picker.getBoundingClientRect();
  const padding = 12;

  // Try to position below trigger, centered
  let left = triggerRect.left + triggerRect.width / 2 - pickerRect.width / 2;
  let top = triggerRect.bottom + 8;

  // Adjust if overflowing right
  if (left + pickerRect.width > window.innerWidth - padding) {
    left = window.innerWidth - pickerRect.width - padding;
  }
  // Adjust if overflowing left
  if (left < padding) {
    left = padding;
  }
  // Adjust if overflowing bottom - position above instead
  if (top + pickerRect.height > window.innerHeight - padding) {
    top = triggerRect.top - pickerRect.height - 8;
  }
  // Adjust if overflowing top
  if (top < padding) {
    top = padding;
  }

  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;

  // Bind events
  picker.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = (e.currentTarget as HTMLElement).dataset.action;
      let newState = state;

      switch (action) {
        case 'swap-to-ship': {
          const shipId = (e.currentTarget as HTMLElement).dataset.shipId;
          if (shipId) {
            newState = swapPilotToShip(state, pilotId, shipId);
          }
          break;
        }
        case 'swap-to-stored-ship': {
          const storedShipIndex = parseInt(
            (e.currentTarget as HTMLElement).dataset.storedShipIndex ?? '-1',
            10,
          );
          if (storedShipIndex >= 0) {
            newState = swapPilotToStoredShip(
              state,
              currentShipId,
              storedShipIndex,
            );
          }
          break;
        }
        case 'unassign': {
          newState = unassignPilot(state, currentShipId);
          break;
        }
      }

      if (newState !== state) {
        onStateUpdate(newState);
      }
      closeShipPicker();
      onRerender();
    });
  });

  // Close on outside click
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (activeShipPicker && !activeShipPicker.contains(e.target as Node)) {
      closeShipPicker();
      document.removeEventListener('click', closeOnOutsideClick);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick);
  }, 0);
}

/** Check if ship picker is currently open */
export function isShipPickerOpen(): boolean {
  return activeShipPicker !== null;
}
