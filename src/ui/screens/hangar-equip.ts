/**
 * Hangar Equip/Unequip UI - Weapon picker dropdown for hardpoint slots
 */

import {
  equipPrimary,
  equipSecondary,
  swapPilotToStoredShip,
  unassignPilot,
} from '../../campaign/loadout';
import { getMaxMissileCapacity } from '../../campaign/store-ammo';
import type { CampaignState } from '../../campaign/types';
import { MISSILES } from '../../data/missiles';
import { SHIP_CLASSES } from '../../data/ships';
import { PRIMARY_WEAPONS } from '../../data/weapons';
import { hideTooltip } from '../common/tooltip';
import {
  getMissileIconPath,
  getWeaponIconPath,
  iconErrorHandler,
} from '../ship/viewer-icons';
import {
  activePicker,
  closePopover,
  hideWeaponPopoverIfNotPinned,
  resetPopoverState,
  setActivePicker,
  setMouseOverPopover,
} from './weapon-popover';

// Re-export popover functions for hangar.ts
export {
  closePopover as closeWeaponPicker,
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  setChangeWeaponHandler,
  showWeaponPopover,
} from './weapon-popover';

/** Grouped weapon for display */
export interface GroupedWeapon {
  weaponType: string;
  category: 'primary' | 'secondary';
  totalCount: number;
  firstIndex: number;
}

/** Check if popover is currently open */
export function isPopoverOpen(): boolean {
  return activePicker !== null;
}

/** Get the bank size for a slot on a ship */
export function getBankSize(
  state: CampaignState,
  shipId: string,
  slotType: 'primary' | 'secondary',
  slotIndex: number,
): number {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship) return 1;

  const stats = SHIP_CLASSES[ship.shipClass];
  if (!stats) return 1;

  const banks =
    slotType === 'primary' ? stats.primaryBanks : stats.secondaryBanks;
  return banks[slotIndex] ?? 1;
}

/** Get available weapons grouped by type */
export function getGroupedWeapons(
  state: CampaignState,
  slotType: 'primary' | 'secondary',
): GroupedWeapon[] {
  const groups = new Map<string, GroupedWeapon>();

  state.storedWeapons.forEach((weapon, index) => {
    if (weapon.category !== slotType) return;

    const existing = groups.get(weapon.weaponType);
    if (existing) {
      existing.totalCount += weapon.count;
    } else {
      groups.set(weapon.weaponType, {
        weaponType: weapon.weaponType,
        category: slotType,
        totalCount: weapon.count,
        firstIndex: index,
      });
    }
  });

  return Array.from(groups.values());
}

/** Render primary weapon picker content (simple click to equip) */
export function renderPrimaryPickerContent(weapons: GroupedWeapon[]): string {
  if (weapons.length === 0) {
    return '<div class="picker-empty">No primary weapons in storage</div>';
  }

  return weapons
    .map((w) => {
      const iconPath = getWeaponIconPath(w.weaponType);
      const displayName = PRIMARY_WEAPONS[w.weaponType]?.name ?? w.weaponType;
      return `
        <button class="picker-item" data-weapon-type="${w.weaponType}">
          <img src="${iconPath}" alt="${w.weaponType}" class="picker-icon" ${iconErrorHandler()} />
          <span class="picker-name">${displayName}</span>
          <span class="picker-stock">×${w.totalCount}</span>
        </button>
      `;
    })
    .join('');
}

/** Render secondary weapon picker content (with quantity selector) */
export function renderSecondaryPickerContent(
  weapons: GroupedWeapon[],
  bankSize: number,
): string {
  if (weapons.length === 0) {
    return '<div class="picker-empty">No missiles in storage</div>';
  }

  return weapons
    .map((w) => {
      const iconPath = getMissileIconPath(w.weaponType);
      const displayName = MISSILES[w.weaponType]?.name ?? w.weaponType;
      const maxCapacity = getMaxMissileCapacity(w.weaponType, bankSize);
      const maxLoadable = Math.min(w.totalCount, maxCapacity);
      return `
        <div class="picker-missile-row" data-weapon-type="${w.weaponType}">
          <div class="picker-missile-info">
            <img src="${iconPath}" alt="${w.weaponType}" class="picker-icon" ${iconErrorHandler()} />
            <span class="picker-name">${displayName}</span>
            <span class="picker-storage">×${w.totalCount}</span>
          </div>
          <div class="picker-quantity">
            <button class="picker-qty-btn" data-action="dec">−</button>
            <span class="picker-qty-value" data-max="${maxLoadable}">${maxLoadable}</span>
            <button class="picker-qty-btn" data-action="inc">+</button>
            <button class="picker-equip-btn">Equip</button>
          </div>
        </div>
      `;
    })
    .join('');
}

/** Find first storage index for a weapon type */
function findWeaponIndex(state: CampaignState, weaponType: string): number {
  return state.storedWeapons.findIndex((w) => w.weaponType === weaponType);
}

/** Show weapon picker dropdown for an empty slot (hover to preview, click to pin) */
export function showWeaponPicker(
  slotElement: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotType: 'primary' | 'secondary',
  slotIndex: number,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  // Don't reopen for the same slot
  if (activePicker && slotElement.contains(activePicker)) return;

  closePopover();
  hideTooltip();

  const grouped = getGroupedWeapons(state, slotType);
  const bankSize = getBankSize(state, shipId, slotType, slotIndex);

  const picker = document.createElement('div');
  picker.className = `weapon-popover weapon-popover-${slotType}`;

  const content =
    slotType === 'primary'
      ? renderPrimaryPickerContent(grouped)
      : renderSecondaryPickerContent(grouped, bankSize);

  picker.innerHTML = `<div class="popover-content picker-content">${content}</div>`;

  // Position relative to slot
  const slotRect = slotElement.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${slotRect.left}px`;
  picker.style.top = `${slotRect.bottom + 4}px`;
  picker.style.zIndex = '1000';

  document.body.appendChild(picker);
  setActivePicker(picker);
  resetPopoverState();

  // Track mouse over picker (same as popover)
  picker.addEventListener('mouseenter', () => {
    setMouseOverPopover(true);
  });

  picker.addEventListener('mouseleave', () => {
    setMouseOverPopover(false);
    hideWeaponPopoverIfNotPinned();
  });

  // Adjust position if overflowing
  const pickerRect = picker.getBoundingClientRect();
  const padding = 8;

  if (pickerRect.bottom > window.innerHeight - padding) {
    const newTop = slotRect.top - pickerRect.height - 4;
    if (newTop >= padding) {
      picker.style.top = `${newTop}px`;
    } else {
      picker.style.top = `${padding}px`;
    }
  }

  if (pickerRect.right > window.innerWidth - padding) {
    const newLeft = window.innerWidth - pickerRect.width - padding;
    picker.style.left = `${Math.max(padding, newLeft)}px`;
  }

  if (slotType === 'primary') {
    bindPrimaryPickerEvents(
      picker,
      state,
      shipId,
      slotIndex,
      bankSize,
      onStateUpdate,
      onRerender,
    );
  } else {
    bindSecondaryPickerEvents(
      picker,
      state,
      shipId,
      slotIndex,
      bankSize,
      onStateUpdate,
      onRerender,
    );
  }
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
  picker.querySelectorAll('.picker-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const weaponType = target.dataset.weaponType;
      if (!weaponType) return;

      const storageIndex = findWeaponIndex(state, weaponType);
      if (storageIndex < 0) return;

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
  picker.querySelectorAll('.picker-qty-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const action = target.dataset.action;
      const row = target.closest('.picker-missile-row');
      const valueEl = row?.querySelector('.picker-qty-value') as HTMLElement;
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
  picker.querySelectorAll('.picker-equip-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = (e.currentTarget as HTMLElement).closest(
        '.picker-missile-row',
      );
      if (!row) return;

      const weaponType = (row as HTMLElement).dataset.weaponType;
      const valueEl = row.querySelector('.picker-qty-value');
      const count = Number.parseInt(valueEl?.textContent ?? '1', 10);

      if (!weaponType) return;

      const storageIndex = findWeaponIndex(state, weaponType);
      if (storageIndex < 0) return;

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
      closePopover();
      onRerender();
    });
  });
}

/** Handle swapping pilot to a different stored ship */
export function handleSwapToStoredShip(
  state: CampaignState,
  shipId: string,
  storedShipIndex: number,
  onStateUpdate: (newState: CampaignState) => void,
): boolean {
  const newState = swapPilotToStoredShip(state, shipId, storedShipIndex);
  if (newState !== state) {
    onStateUpdate(newState);
    return true;
  }
  return false;
}

/** Handle unassigning a pilot from a wingman ship */
export function handleUnassignPilot(
  state: CampaignState,
  shipId: string,
  onStateUpdate: (newState: CampaignState) => void,
): boolean {
  const newState = unassignPilot(state, shipId);
  if (newState !== state) {
    onStateUpdate(newState);
    return true;
  }
  return false;
}

// Re-export showWeaponSwapPicker from weapon-swap module
export { showWeaponSwapPicker } from './weapon-swap';
