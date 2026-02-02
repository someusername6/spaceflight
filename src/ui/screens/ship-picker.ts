/**
 * Ship Picker - Popover for quickly swapping a pilot to a different ship.
 *
 * Displays available ships (empty active ships and stored ships) using
 * the same visual style as the ship card buttons in pilot-viewer.
 *
 * Converted to use Screen framework for automatic event cleanup.
 */

import {
  swapPilotToShip,
  swapPilotToStoredShip,
  unassignPilot,
} from '../../campaign/loadout';
import type { CampaignState } from '../../campaign/types';
import type { Screen, ScreenHandle } from '../framework/screen';
import { createScreen } from '../framework/screen';
import { getShipIconPath, iconErrorHandler } from '../ship/viewer';
import { canPilotFlyShip, formatShipClass } from './roster/skill-rendering';

/** Ship picker state */
interface ShipPickerState {
  pilotId: string;
  currentShipId: string;
  campaignState: CampaignState;
}

/** Ship picker props */
interface ShipPickerProps {
  onStateUpdate: (newState: CampaignState) => void;
  onClose: () => void;
}

/** Currently active ship picker handle and container */
let activeHandle: ScreenHandle<ShipPickerState, ShipPickerProps> | null = null;
let activeContainer: HTMLElement | null = null;

/** Close any open ship picker */
export function closeShipPicker(): void {
  if (activeHandle) {
    activeHandle.destroy();
    activeHandle = null;
  }
  if (activeContainer) {
    activeContainer.remove();
    activeContainer = null;
  }
}

/** Render a ship card button */
function renderShipCard(
  shipClass: string,
  dataAttrs: string,
  count = 1,
  disabled = false,
): string {
  const iconPath = getShipIconPath(shipClass);
  const countBadge =
    count > 1 ? `<span class="ship-picker-count">×${count}</span>` : '';
  const disabledAttr = disabled
    ? `disabled title="Pilot needs ${formatShipClass(shipClass)} skill"`
    : '';
  return `
    <button class="ship-picker-card" ${dataAttrs} ${disabledAttr}>
      <div class="ship-picker-icon">
        <img src="${iconPath}" alt="${shipClass}" class="ship-picker-svg"
             ${iconErrorHandler()} />
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

/** The ship picker screen definition */
const ShipPickerScreen: Screen<ShipPickerState, ShipPickerProps> = {
  render(state, _props) {
    const { pilotId, currentShipId, campaignState } = state;
    const pilot = campaignState.pilots.find((p) => p.id === pilotId);
    const emptyShips = campaignState.ships.filter(
      (s) => s.pilot === null && s.id !== currentShipId,
    );
    const storedShips = campaignState.storedShips;

    const scrollableSections: string[] = [];

    // Empty active ships section
    if (emptyShips.length > 0) {
      const shipCards = emptyShips
        .map((ship) => {
          const canFly = pilot
            ? canPilotFlyShip(pilot, ship.shipClass, campaignState)
            : false;
          return renderShipCard(
            ship.shipClass,
            `data-action="swap-to-ship" data-ship-id="${ship.id}"`,
            1,
            !canFly,
          );
        })
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
        .map((group) => {
          const canFly = pilot
            ? canPilotFlyShip(pilot, group.shipClass, campaignState)
            : false;
          return renderShipCard(
            group.shipClass,
            `data-action="swap-to-stored-ship" data-stored-ship-index="${group.firstIndex}"`,
            group.count,
            !canFly,
          );
        })
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
  },

  bind(api, props) {
    const { onStateUpdate, onClose } = props;

    // Handle action buttons
    api.on('[data-action]', 'click', (e, el) => {
      e.stopPropagation();
      const state = api.getState();
      const action = el.dataset.action;
      let newState = state.campaignState;

      switch (action) {
        case 'swap-to-ship': {
          const shipId = el.dataset.shipId;
          if (shipId) {
            newState = swapPilotToShip(
              state.campaignState,
              state.pilotId,
              shipId,
            );
          }
          break;
        }
        case 'swap-to-stored-ship': {
          const storedShipIndex = parseInt(
            el.dataset.storedShipIndex ?? '-1',
            10,
          );
          if (storedShipIndex >= 0) {
            newState = swapPilotToStoredShip(
              state.campaignState,
              state.currentShipId,
              storedShipIndex,
            );
          }
          break;
        }
        case 'unassign': {
          newState = unassignPilot(state.campaignState, state.currentShipId);
          break;
        }
      }

      if (newState !== state.campaignState) {
        onStateUpdate(newState);
      }
      onClose();
    });

    // Close on outside click
    // Use requestAnimationFrame to defer registration until after the current
    // click event has finished processing, ensuring the triggering click doesn't
    // immediately close the picker. The listener is still tracked for cleanup.
    requestAnimationFrame(() => {
      // Check if we're still mounted (handle destroyed before rAF fires)
      if (!activeContainer) return;

      api.onGlobal('click', (e) => {
        const container = activeContainer;
        if (container && !container.contains(e.target as Node)) {
          onClose();
        }
      });
    });
  },
};

/** Position picker relative to trigger element */
function positionPicker(picker: HTMLElement, triggerRect: DOMRect): void {
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

  // Create container
  const container = document.createElement('div');
  container.className = 'ship-picker';
  container.style.position = 'fixed';
  container.style.zIndex = '1000';

  document.body.appendChild(container);
  activeContainer = container;

  // Create screen handle
  const handle = createScreen(
    ShipPickerScreen,
    container,
    { pilotId, currentShipId, campaignState: state },
    {
      onStateUpdate,
      onClose: () => {
        closeShipPicker();
        onRerender();
      },
    },
  );
  activeHandle = handle;

  // Position after adding to DOM (so we can measure)
  const triggerRect = triggerElement.getBoundingClientRect();
  positionPicker(container, triggerRect);
}

/** Check if ship picker is currently open */
export function isShipPickerOpen(): boolean {
  return activeContainer !== null;
}
