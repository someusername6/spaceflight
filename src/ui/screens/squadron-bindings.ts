/**
 * Squadron Bindings - Event handlers for squadron screen interactions.
 *
 * Extracted from squadron.ts to stay under 400 line limit.
 */

import {
  assignPilotToShip,
  assignPilotToStoredShip,
  unassignPilot,
} from '../../campaign/loadout';
import { hirePilot } from '../../campaign/recruits';
import {
  resupplyAllShipsConstrained,
  resupplyShipConstrained,
} from '../../campaign/resupply-constrained';
import type { CampaignState } from '../../campaign/types';
import { showNotification } from '../common/notification';
import { closeWeaponPicker } from './hangar-equip';
import { bindHardpointEvents } from './hardpoint-bindings';
import { showShipPicker } from './ship-picker';
import type { ListSelection } from './squadron-list';
import type { ViewerTab } from './squadron-viewer';

// Re-export hardpoint bindings
export { bindHardpointEvents };

/** Squadron UI state (shared interface) */
export interface SquadronUIState {
  element: HTMLElement;
  state: CampaignState;
  selection: ListSelection;
  activeTab: ViewerTab;
  onStateUpdate?: ((newState: CampaignState) => void) | undefined;
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

  // Deploy pilot with stored ship
  ui.element.querySelectorAll('.stored-ship-card-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const button = (e.target as HTMLElement).closest(
        '.stored-ship-card-btn',
      ) as HTMLElement;
      if (!button) return;
      const pilotId = button.dataset.pilot;
      const storedShipIndex = Number.parseInt(
        button.dataset.storedShipIndex ?? '0',
        10,
      );
      if (!pilotId) return;

      const newState = assignPilotToStoredShip(
        ui.state,
        pilotId,
        storedShipIndex,
      );
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

/** Bind resupply ship button */
export function bindResupplyShipButton(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  const resupplyBtn = ui.element.querySelector('.btn-resupply-ship');
  if (resupplyBtn) {
    resupplyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const shipId = target.dataset.ship;
      if (!shipId) return;

      const result = resupplyShipConstrained(ui.state, shipId);
      if (result.state !== ui.state) {
        ui.state = result.state;
        if (ui.onStateUpdate) ui.onStateUpdate(result.state);
        // Show notification for each message
        const type = result.success ? 'success' : 'warning';
        for (const msg of result.messages) {
          showNotification(msg, { type });
        }
        rerender();
      }
    });
  }
}

/** Bind resupply all ships button */
export function bindResupplyAllButton(
  ui: SquadronUIState,
  rerender: () => void,
): void {
  const resupplyAllBtn = ui.element.querySelector('.btn-resupply-all');
  if (resupplyAllBtn) {
    resupplyAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const commanderId = target.dataset.commander;
      if (!commanderId) return;

      const result = resupplyAllShipsConstrained(ui.state, commanderId);
      if (result.state !== ui.state) {
        ui.state = result.state;
        if (ui.onStateUpdate) ui.onStateUpdate(result.state);
        // Show notification for each message
        const type = result.success ? 'success' : 'warning';
        for (const msg of result.messages) {
          showNotification(msg, { type });
        }
        rerender();
      }
    });
  }
}
