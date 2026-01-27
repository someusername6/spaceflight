/**
 * Equip Picker Event Binding - Bind events for weapon/missile pickers.
 *
 * Extracted from equip.ts to keep file under 400 lines.
 */

import { equipPrimary, equipSecondary } from '../../../campaign/loadout';
import type { CampaignState } from '../../../campaign/types';
import {
  requestEquipAction,
  shouldUseActionRequest,
} from '../../../multiplayer/action-client';
import { closePopover } from './weapon';

/** Find first storage index for a weapon type */
function findWeaponIndex(state: CampaignState, weaponType: string): number {
  return state.storedWeapons.findIndex((w) => w.weaponType === weaponType);
}

/** Bind events for primary weapon picker */
export function bindPrimaryPickerEvents(
  picker: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotIndex: number,
  bankSize: number,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  picker.querySelectorAll<HTMLElement>('.picker-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const weaponType = item.dataset.weaponType;
      if (!weaponType) return;

      const storageIndex = findWeaponIndex(state, weaponType);
      if (storageIndex < 0) return;

      // Apply change locally (optimistic update)
      const newState = equipPrimary(
        state,
        shipId,
        storageIndex,
        slotIndex,
        bankSize,
      );
      if (newState !== state) {
        onStateUpdate(newState);
      }

      // For guests: also notify host (fire-and-forget)
      if (shouldUseActionRequest()) {
        void requestEquipAction(
          state,
          shipId,
          slotIndex,
          storageIndex,
          bankSize,
          'primary',
        );
      }

      closePopover();
      onRerender();
    });
  });
}

/** Bind events for secondary weapon picker (with quantity) */
export function bindSecondaryPickerEvents(
  picker: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotIndex: number,
  bankSize: number,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  // Quantity +/- buttons
  picker.querySelectorAll<HTMLElement>('.picker-qty-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const row = btn.closest<HTMLElement>('.picker-missile-row');
      const valueEl = row?.querySelector<HTMLElement>('.picker-qty-value');
      if (!valueEl) return;

      const max = Number.parseInt(valueEl.dataset.max ?? '1', 10);
      let current = Number.parseInt(valueEl.textContent ?? '1', 10);

      if (action === 'inc' && current < max) {
        current++;
      } else if (action === 'dec' && current > 1) {
        current--;
      }
      valueEl.textContent = String(current);
    });
  });

  // Equip buttons
  picker.querySelectorAll<HTMLElement>('.picker-equip-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest<HTMLElement>('.picker-missile-row');
      if (!row) return;

      const weaponType = row.dataset.weaponType;
      const valueEl = row.querySelector('.picker-qty-value');
      const count = Number.parseInt(valueEl?.textContent ?? '1', 10);

      if (!weaponType) return;

      const storageIndex = findWeaponIndex(state, weaponType);
      if (storageIndex < 0) return;

      // Apply change locally (optimistic update)
      const newState = equipSecondary(
        state,
        shipId,
        storageIndex,
        slotIndex,
        bankSize,
        count,
      );
      if (newState !== state) {
        onStateUpdate(newState);
      }

      // For guests: also notify host (fire-and-forget)
      if (shouldUseActionRequest()) {
        void requestEquipAction(
          state,
          shipId,
          slotIndex,
          storageIndex,
          bankSize,
          'secondary',
        );
      }

      closePopover();
      onRerender();
    });
  });
}
