/**
 * Loadout UI Event Handlers - binds click events for loadout panel.
 */

import {
  equipPrimary,
  equipSecondary,
  swapPilotToHull,
  unassignPilot,
  unequipPrimary,
  unequipSecondary,
} from '../../campaign/loadout';
import {
  loadAmmoToWeapon,
  loadMissilesToWeapon,
  unloadAmmoFromWeapon,
  unloadMissilesFromWeapon,
} from '../../campaign/store-ammo';
import type { CampaignState } from '../../campaign/types';

/** Callback to update campaign state */
export type StateUpdater = (newState: CampaignState) => void;

/** Bind loadout panel event handlers */
export function bindLoadoutEvents(
  element: HTMLElement,
  state: CampaignState,
  onUpdate: StateUpdater,
  onClose: () => void,
): void {
  // Close button
  const closeBtn = element.querySelector('#btn-close-loadout');
  if (closeBtn) {
    closeBtn.addEventListener('click', onClose);
  }

  // Unequip buttons
  element.querySelectorAll('.btn-unequip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const type = target.dataset.type;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);

      if (!shipId) return;

      let newState: CampaignState;
      if (type === 'primary') {
        newState = unequipPrimary(state, shipId, index);
      } else {
        newState = unequipSecondary(state, shipId, index);
      }
      onUpdate(newState);
    });
  });

  // Equip buttons
  element.querySelectorAll('.btn-equip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const type = target.dataset.type;
      const storageIndex = Number.parseInt(target.dataset.storage ?? '0', 10);
      const slotIndex = Number.parseInt(target.dataset.slot ?? '0', 10);
      const bankSize = Number.parseInt(target.dataset.bank ?? '1', 10);

      if (!shipId) return;

      let newState: CampaignState;
      if (type === 'primary') {
        newState = equipPrimary(
          state,
          shipId,
          storageIndex,
          slotIndex,
          bankSize,
        );
      } else {
        newState = equipSecondary(
          state,
          shipId,
          storageIndex,
          slotIndex,
          bankSize,
        );
      }
      onUpdate(newState);
    });
  });

  // Load ammo buttons (load 10 at a time)
  element.querySelectorAll('.btn-load').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = loadAmmoToWeapon(state, shipId, index, 10);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Unload ammo buttons (unload 10 at a time)
  element.querySelectorAll('.btn-unload').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = unloadAmmoFromWeapon(state, shipId, index, 10);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Load missile buttons (load 1 at a time)
  element.querySelectorAll('.btn-load-missile').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = loadMissilesToWeapon(state, shipId, index, 1);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Unload missile buttons (unload 1 at a time)
  element.querySelectorAll('.btn-unload-missile').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = unloadMissilesFromWeapon(state, shipId, index, 1);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Swap hull buttons (move pilot to different hull)
  element.querySelectorAll('.btn-swap-hull').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const hullIndex = Number.parseInt(target.dataset.hullIndex ?? '0', 10);
      if (!shipId) return;

      const newState = swapPilotToHull(state, shipId, hullIndex);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Unassign pilot button (bench pilot, ship to storage)
  element.querySelectorAll('.btn-unassign').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      if (!shipId) return;

      const newState = unassignPilot(state, shipId);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Load all ammo buttons (fill weapon)
  element.querySelectorAll('.btn-load-all').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = loadAmmoToWeapon(state, shipId, index, Infinity);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Unload all ammo buttons (empty weapon)
  element.querySelectorAll('.btn-unload-all').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = unloadAmmoFromWeapon(state, shipId, index, Infinity);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Load all missile buttons (fill weapon)
  element.querySelectorAll('.btn-load-missile-all').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = loadMissilesToWeapon(state, shipId, index, Infinity);
      if (newState !== state) onUpdate(newState);
    });
  });

  // Unload all missile buttons (empty weapon)
  element.querySelectorAll('.btn-unload-missile-all').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipId = target.dataset.ship;
      const index = Number.parseInt(target.dataset.index ?? '0', 10);
      if (!shipId) return;

      const newState = unloadMissilesFromWeapon(state, shipId, index, Infinity);
      if (newState !== state) onUpdate(newState);
    });
  });
}
