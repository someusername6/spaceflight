/**
 * Weapon Swap UI - Submenu for changing equipped weapons.
 *
 * Shows available weapons excluding the currently equipped one.
 * Only swaps (unequip + equip) when a selection is made.
 */

import {
  equipPrimary,
  equipSecondary,
  unequipPrimary,
  unequipSecondary,
} from '../../../campaign/loadout';
import { getSlot } from '../../../campaign/slot-array';
import { getMaxMissileCapacity } from '../../../campaign/store/store-ammo';
import type { CampaignState, EquippedSecondary } from '../../../campaign/types';
import { MISSILES } from '../../../data/missiles';
import { PRIMARY_WEAPONS } from '../../../data/weapons';
import { hideTooltip } from '../../common/tooltip';
import { renderMissileIcon, renderWeaponIcon } from '../../utils/weapon-icon';
import { type GroupedWeapon, getBankSize, getGroupedWeapons } from './equip';
import {
  activePicker,
  closePopover,
  closeSubmenu,
  setActiveSubmenu,
} from './weapon';

/** Filter grouped weapons to exclude/reduce the currently equipped weapon */
function filterForSwap(
  grouped: GroupedWeapon[],
  currentWeaponType: string,
  equippedCount: number,
): GroupedWeapon[] {
  return grouped
    .map((w) => {
      if (w.weaponType === currentWeaponType) {
        // Reduce count by what's equipped
        const remaining = w.totalCount - equippedCount;
        if (remaining <= 0) return null;
        return { ...w, totalCount: remaining };
      }
      return w;
    })
    .filter((w): w is GroupedWeapon => w !== null);
}

/** Render primary weapon picker content for swap */
function renderSwapPrimaryContent(weapons: GroupedWeapon[]): string {
  if (weapons.length === 0) {
    return '<div class="picker-empty">No other weapons available</div>';
  }

  return weapons
    .map((w) => {
      const displayName = PRIMARY_WEAPONS[w.weaponType]?.name ?? w.weaponType;
      return `
        <button class="picker-item" data-weapon-type="${w.weaponType}">
          ${renderWeaponIcon(w.weaponType, { size: 'sm', className: 'picker-icon' })}
          <span class="picker-name">${displayName}</span>
          <span class="picker-stock">×${w.totalCount}</span>
        </button>
      `;
    })
    .join('');
}

/** Render secondary weapon picker content for swap */
function renderSwapSecondaryContent(
  weapons: GroupedWeapon[],
  bankSize: number,
): string {
  if (weapons.length === 0) {
    return '<div class="picker-empty">No other missiles available</div>';
  }

  return weapons
    .map((w) => {
      const displayName = MISSILES[w.weaponType]?.name ?? w.weaponType;
      const maxCapacity = getMaxMissileCapacity(w.weaponType, bankSize);
      const maxLoadable = Math.min(w.totalCount, maxCapacity);
      return `
        <div class="picker-missile-row" data-weapon-type="${w.weaponType}">
          <div class="picker-missile-info">
            ${renderMissileIcon(w.weaponType, { size: 'sm', className: 'picker-icon' })}
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

/** Show weapon swap picker as submenu - keeps parent popover open */
export function showWeaponSwapPicker(
  buttonElement: HTMLElement,
  _slotElement: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotType: 'primary' | 'secondary',
  slotIndex: number,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  closeSubmenu();
  hideTooltip();

  // Get the currently equipped weapon info
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship) return;

  const currentWeapon =
    slotType === 'primary'
      ? getSlot(ship.primaryWeapons, slotIndex)
      : getSlot(ship.secondaryWeapons, slotIndex);

  if (!currentWeapon) return;

  const currentWeaponType = currentWeapon.weaponType;
  const equippedCount =
    slotType === 'primary'
      ? currentWeapon.bankSize
      : (currentWeapon as EquippedSecondary).count;

  // Get available weapons, filtering out/reducing the current weapon
  const allGrouped = getGroupedWeapons(state, slotType);
  const filtered = filterForSwap(allGrouped, currentWeaponType, equippedCount);
  const bankSize = getBankSize(state, shipId, slotType, slotIndex);

  const submenu = document.createElement('div');
  submenu.className = `weapon-popover weapon-submenu weapon-popover-${slotType}`;

  const content =
    slotType === 'primary'
      ? renderSwapPrimaryContent(filtered)
      : renderSwapSecondaryContent(filtered, bankSize);

  submenu.innerHTML = `<div class="popover-content picker-content">${content}</div>`;

  // Position below the Change button, left-aligned with its left edge
  const btnRect = buttonElement.getBoundingClientRect();
  const padding = 8;
  const gap = 4;

  submenu.style.position = 'fixed';
  submenu.style.left = `${btnRect.left}px`;
  submenu.style.top = `${btnRect.bottom + gap}px`;
  submenu.style.zIndex = '1001';

  document.body.appendChild(submenu);
  setActiveSubmenu(submenu);

  // Adjust position if overflowing
  const submenuRect = submenu.getBoundingClientRect();

  // If submenu goes below viewport, position above the button instead
  if (submenuRect.bottom > window.innerHeight - padding) {
    const topAbove = btnRect.top - submenuRect.height - gap;
    if (topAbove >= padding) {
      submenu.style.top = `${topAbove}px`;
    } else {
      // Neither fits well, default to constrained position
      submenu.style.top = `${padding}px`;
    }
  }

  // Adjust horizontal if overflowing right edge
  if (submenuRect.right > window.innerWidth - padding) {
    const newLeft = window.innerWidth - submenuRect.width - padding;
    submenu.style.left = `${Math.max(padding, newLeft)}px`;
  }

  // Bind swap events for primary weapons
  if (slotType === 'primary') {
    submenu.querySelectorAll<HTMLElement>('.picker-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const weaponType = item.dataset.weaponType;
        if (!weaponType) return;

        const storageIndex = findWeaponIndex(state, weaponType);
        if (storageIndex < 0) return;

        // Unequip current, then equip new
        let newState = unequipPrimary(state, shipId, slotIndex);
        newState = equipPrimary(
          newState,
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
  } else {
    // Bind quantity buttons for secondary weapons
    submenu.querySelectorAll<HTMLElement>('.picker-qty-btn').forEach((btn) => {
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

    // Bind equip buttons for secondary weapons
    submenu
      .querySelectorAll<HTMLElement>('.picker-equip-btn')
      .forEach((btn) => {
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

          // Unequip current, then equip new
          let newState = unequipSecondary(state, shipId, slotIndex);
          newState = equipSecondary(
            newState,
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

  // Close submenu on click outside (but not the parent popover)
  const closeOnOutsideClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (submenu.contains(target)) return;
    if (activePicker?.contains(target)) {
      closeSubmenu();
      document.removeEventListener('click', closeOnOutsideClick);
      return;
    }
    closePopover();
    onRerender();
    document.removeEventListener('click', closeOnOutsideClick);
  };
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick);
  }, 0);
}
