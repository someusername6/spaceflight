/**
 * Squadron Bindings - Event handlers for squadron screen interactions.
 *
 * Extracted from squadron.ts to stay under 400 line limit.
 */

import {
  assignPilotToHull,
  assignPilotToShip,
  unassignPilot,
} from '../../campaign/loadout';
import { hirePilot } from '../../campaign/recruits';
import type { CampaignState } from '../../campaign/types';
import {
  closeWeaponPicker,
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  showWeaponPicker,
  showWeaponPopover,
} from './hangar-equip';
import { showShipPicker } from './ship-picker';
import type { ListSelection } from './squadron-list';
import type { ViewerTab } from './squadron-viewer';

/** Squadron UI state (shared interface) */
export interface SquadronUIState {
  element: HTMLElement;
  state: CampaignState;
  selection: ListSelection;
  activeTab: ViewerTab;
  onStateUpdate?: (newState: CampaignState) => void;
  onNavigate: (destination: 'squadron' | 'store' | 'contracts') => void;
}

/** Bind list item selection */
export function bindListSelection(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  // Deployed items
  ui.element
    .querySelectorAll('.squadron-item[data-deployed-id]')
    .forEach((item) => {
      const el = item as HTMLElement;
      const shipId = el.dataset.deployedId;

      el.addEventListener('click', () => {
        if (shipId) {
          const isSelected =
            ui.selection.type === 'deployed' && ui.selection.id === shipId;
          ui.selection = isSelected
            ? { type: 'none', id: null }
            : { type: 'deployed', id: shipId };
          ui.activeTab = 'loadout'; // Default to loadout tab
          closeWeaponPicker();
          rerender();
        }
      });
    });

  // Available pilots
  ui.element
    .querySelectorAll('.squadron-item[data-pilot-id]')
    .forEach((item) => {
      const el = item as HTMLElement;
      const pilotId = el.dataset.pilotId;

      el.addEventListener('click', () => {
        if (pilotId) {
          const isSelected =
            ui.selection.type === 'available' && ui.selection.id === pilotId;
          ui.selection = isSelected
            ? { type: 'none', id: null }
            : { type: 'available', id: pilotId };
          rerender();
        }
      });
    });

  // Recruits
  ui.element
    .querySelectorAll('.squadron-item[data-recruit-id]')
    .forEach((item) => {
      const el = item as HTMLElement;
      const recruitId = el.dataset.recruitId;

      el.addEventListener('click', () => {
        if (recruitId) {
          const isSelected =
            ui.selection.type === 'recruit' && ui.selection.id === recruitId;
          ui.selection = isSelected
            ? { type: 'none', id: null }
            : { type: 'recruit', id: recruitId };
          rerender();
        }
      });
    });
}

/** Bind change ship button */
export function bindChangeShipButton(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  const changeShipBtn = ui.element.querySelector('.btn-change-ship');
  if (changeShipBtn) {
    changeShipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const pilotId = target.dataset.pilot;
      const shipId = target.dataset.ship;
      if (!pilotId || !shipId) return;

      showShipPicker(
        target,
        pilotId,
        shipId,
        ui.state,
        (newState) => {
          ui.state = newState;
          if (ui.onStateUpdate) ui.onStateUpdate(newState);
          // Select the new ship that the pilot is now assigned to
          // If pilot was unassigned, select them under Available
          const newShip = newState.ships.find((s) => s.pilot?.id === pilotId);
          ui.selection = newShip
            ? { type: 'deployed', id: newShip.id }
            : { type: 'available', id: pilotId };
        },
        rerender,
      );
    });
  }
}

/** Bind hardpoint slot interactions */
export function bindHardpointEvents(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  ui.element.querySelectorAll('.schematic-slot').forEach((slot) => {
    const el = slot as HTMLElement;
    const slotType = el.dataset.type as 'primary' | 'secondary';
    const shipId = el.dataset.ship;
    const slotIndex = Number.parseInt(el.dataset.index ?? '0', 10);
    const isFilled = el.classList.contains('filled');

    if (!shipId || !slotType) return;

    const ship = ui.state.ships.find((s) => s.id === shipId);
    if (!ship) return;

    if (isFilled) {
      // Filled slot: unified popover (hover to preview, click to pin)
      const weapon =
        slotType === 'primary'
          ? ship.primaryWeapons[slotIndex]
          : ship.secondaryWeapons[slotIndex];
      if (!weapon) return;

      // Hover: show popover preview
      el.addEventListener('mouseenter', () => {
        showWeaponPopover(
          el,
          ui.state,
          shipId,
          slotType,
          slotIndex,
          weapon,
          (newState) => {
            ui.state = newState;
            if (ui.onStateUpdate) ui.onStateUpdate(newState);
          },
          rerender,
        );
      });

      // Click: pin the popover
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        pinWeaponPopover();
      });

      // Leave: hide only if not pinned
      el.addEventListener('mouseleave', () => {
        hideWeaponPopoverIfNotPinned();
      });
    } else {
      // Empty slot: click to show picker
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showWeaponPicker(
          el,
          ui.state,
          shipId,
          slotType,
          slotIndex,
          (newState) => {
            ui.state = newState;
            if (ui.onStateUpdate) ui.onStateUpdate(newState);
          },
          rerender,
        );
      });
    }
  });
}

/** Bind pilot assignment buttons */
export function bindPilotAssignment(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  // Assign pilot to existing ship
  ui.element.querySelectorAll('.btn-assign-pilot').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const pilotId = target.dataset.pilot;
      const shipId = target.dataset.ship;
      if (!pilotId || !shipId) return;

      const newState = assignPilotToShip(ui.state, pilotId, shipId);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Select the ship the pilot was assigned to
        ui.selection = { type: 'deployed', id: shipId };
        ui.activeTab = 'loadout';
        rerender();
      }
    });
  });

  // Deploy pilot with hull
  ui.element.querySelectorAll('.hull-card-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const button = (e.target as HTMLElement).closest(
        '.hull-card-btn',
      ) as HTMLElement;
      if (!button) return;
      const pilotId = button.dataset.pilot;
      const hullIndex = Number.parseInt(button.dataset.hullIndex ?? '0', 10);
      if (!pilotId) return;

      const newState = assignPilotToHull(ui.state, pilotId, hullIndex);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Find the new ship and select it
        const newShip = newState.ships.find((s) => s.pilot?.id === pilotId);
        if (newShip) {
          ui.selection = { type: 'deployed', id: newShip.id };
          ui.activeTab = 'loadout';
        }
        rerender();
      }
    });
  });
}

/** Bind hire recruit button */
export function bindHireRecruit(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  const hireBtn = ui.element.querySelector('#btn-hire-recruit');
  if (hireBtn) {
    hireBtn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const recruitId = target.dataset.recruitId;
      if (!recruitId) return;

      // Find the recruit name before updating state
      const recruit = ui.state.availableRecruits.find(
        (r) => r.id === recruitId,
      );
      if (!recruit) return;
      const recruitName = recruit.name;

      const newState = hirePilot(ui.state, recruitId);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Select the newly hired pilot by name
        const hiredPilot = newState.pilots.find((p) => p.name === recruitName);
        ui.selection = hiredPilot
          ? { type: 'available', id: hiredPilot.id }
          : { type: 'none', id: null };
        rerender();
      }
    });
  }
}

/** Bind go to store button */
export function bindGoToStore(ui: SquadronUIState): void {
  const goToStoreBtn = ui.element.querySelector('.btn-go-to-store');
  if (goToStoreBtn) {
    goToStoreBtn.addEventListener('click', () => {
      ui.onNavigate('store');
    });
  }
}

/** Bind unassign pilot button */
export function bindUnassignPilot(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  ui.element.querySelectorAll('.btn-unassign-pilot').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const pilotId = target.dataset.pilot;
      const shipId = target.dataset.ship;
      if (!pilotId || !shipId) return;

      const newState = unassignPilot(ui.state, shipId);
      if (newState !== ui.state) {
        ui.state = newState;
        if (ui.onStateUpdate) ui.onStateUpdate(newState);
        // Select the unassigned pilot in the Available section
        ui.selection = { type: 'available', id: pilotId };
        rerender();
      }
    });
  });
}
