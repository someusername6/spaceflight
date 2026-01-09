/**
 * Weapon Popover - Unified hover/pin popover for equipped weapons.
 *
 * Shows weapon stats on hover, pins on click for load/unload controls.
 */

import { unequipPrimary, unequipSecondary } from '../../campaign/loadout';
import {
  loadAmmoToWeapon,
  loadMissilesToWeapon,
  unloadAmmoFromWeapon,
  unloadMissilesFromWeapon,
} from '../../campaign/store/store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../campaign/types';
import { getWeaponAmmoInfo } from '../ship/slot-utils';
import { renderPrimaryPopover, renderSecondaryPopover } from './popover-render';
import {
  activePicker,
  activeSubmenu,
  closePopover,
  closeSubmenu,
  getActiveSlotElement,
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  resetPopoverState,
  setActivePicker,
  setActiveSlotElement,
  setActiveSubmenu,
  setMouseOverPopover,
} from './popover-state';

// Re-export state management functions
export {
  activePicker,
  activeSubmenu,
  closePopover,
  closeSubmenu,
  hideWeaponPopoverIfNotPinned,
  pinWeaponPopover,
  resetPopoverState,
  setActivePicker,
  setActiveSubmenu,
  setMouseOverPopover,
};

/** Update a slot's ammo fill bar directly (without re-rendering the viewer) */
function updateSlotAmmoBar(
  slotType: 'primary' | 'secondary',
  weapon: EquippedPrimary | EquippedSecondary,
): void {
  const slot = getActiveSlotElement();
  if (!slot) return;

  const ammoBar = slot.querySelector('.slot-ammo-bar') as HTMLElement;
  if (!ammoBar) return;

  const { current, max } = getWeaponAmmoInfo(weapon, slotType);

  if (ammoBar.classList.contains('segmented')) {
    const segments = ammoBar.querySelectorAll('.slot-ammo-segment');
    segments.forEach((seg, i) => {
      seg.classList.toggle('filled', i < current);
    });
  } else {
    const fillBar = ammoBar.querySelector('.slot-ammo-fill') as HTMLElement;
    if (fillBar) {
      const fillPercent = max > 0 ? Math.round((current / max) * 100) : 0;
      fillBar.style.width = `${fillPercent}%`;
    }
  }
}

/** Change weapon handler - set by hangar.ts to avoid circular imports */
type ChangeWeaponHandler = (
  buttonElement: HTMLElement,
  slotElement: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotType: 'primary' | 'secondary',
  slotIndex: number,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
) => void;

let changeWeaponHandler: ChangeWeaponHandler | null = null;

/** Set the change weapon handler (called from hangar.ts) */
export function setChangeWeaponHandler(handler: ChangeWeaponHandler): void {
  changeWeaponHandler = handler;
}

/** Bind events for weapon popover */
function bindPopoverEvents(
  popover: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotType: 'primary' | 'secondary',
  slotIndex: number,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  // Ammo/missile control buttons
  popover.querySelectorAll('.manager-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = (e.currentTarget as HTMLElement).dataset.action;
      if (!action) return;

      let newState = state;

      if (slotType === 'primary') {
        switch (action) {
          case 'load':
            newState = loadAmmoToWeapon(state, shipId, slotIndex, 10);
            break;
          case 'unload':
            newState = unloadAmmoFromWeapon(state, shipId, slotIndex, 10);
            break;
          case 'load-all':
            newState = loadAmmoToWeapon(state, shipId, slotIndex, Infinity);
            break;
          case 'unload-all':
            newState = unloadAmmoFromWeapon(state, shipId, slotIndex, Infinity);
            break;
        }
      } else {
        switch (action) {
          case 'load':
            newState = loadMissilesToWeapon(state, shipId, slotIndex, 1);
            break;
          case 'unload':
            newState = unloadMissilesFromWeapon(state, shipId, slotIndex, 1);
            break;
          case 'load-all':
            newState = loadMissilesToWeapon(state, shipId, slotIndex, Infinity);
            break;
          case 'unload-all':
            newState = unloadMissilesFromWeapon(
              state,
              shipId,
              slotIndex,
              Infinity,
            );
            break;
        }
      }

      if (newState !== state) {
        // Check if we unloaded all missiles - auto-unequip
        if (slotType === 'secondary') {
          const ship = newState.ships.find((s) => s.id === shipId);
          const weapon = ship?.secondaryWeapons[slotIndex];
          if (weapon && weapon.count === 0) {
            newState = unequipSecondary(newState, shipId, slotIndex);
            onStateUpdate(newState);
            closePopover();
            onRerender();
            return;
          }
        }

        onStateUpdate(newState);

        // Refresh popover content in-place
        const ship = newState.ships.find((s) => s.id === shipId);
        if (ship && activePicker) {
          const weapon =
            slotType === 'primary'
              ? ship.primaryWeapons[slotIndex]
              : ship.secondaryWeapons[slotIndex];
          if (weapon) {
            const content =
              slotType === 'primary'
                ? renderPrimaryPopover(
                    weapon as EquippedPrimary,
                    shipId,
                    slotIndex,
                    newState,
                  )
                : renderSecondaryPopover(
                    weapon as EquippedSecondary,
                    shipId,
                    slotIndex,
                    newState,
                  );
            const contentEl = activePicker.querySelector('.popover-content');
            if (contentEl) {
              contentEl.innerHTML = content;
              bindPopoverEvents(
                activePicker,
                newState,
                shipId,
                slotType,
                slotIndex,
                onStateUpdate,
                onRerender,
              );
            }

            // Update the slot's ammo fill bar directly
            updateSlotAmmoBar(slotType, weapon);
          }
        }
      }
    });
  });

  // Change weapon button
  const changeBtn = popover.querySelector('.btn-change-weapon');
  if (changeBtn) {
    changeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const slotEl = getActiveSlotElement();
      if (changeWeaponHandler && slotEl) {
        changeWeaponHandler(
          e.currentTarget as HTMLElement,
          slotEl,
          state,
          shipId,
          slotType,
          slotIndex,
          onStateUpdate,
          onRerender,
        );
      }
    });
  }

  // Unequip button
  popover.querySelector('.btn-unequip')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const newState =
      slotType === 'primary'
        ? unequipPrimary(state, shipId, slotIndex)
        : unequipSecondary(state, shipId, slotIndex);

    if (newState !== state) {
      onStateUpdate(newState);
    }
    closePopover();
    onRerender();
  });
}

/** Show weapon popover for a filled slot (hover preview mode) */
export function showWeaponPopover(
  slotElement: HTMLElement,
  state: CampaignState,
  shipId: string,
  slotType: 'primary' | 'secondary',
  slotIndex: number,
  weapon: EquippedPrimary | EquippedSecondary,
  onStateUpdate: (newState: CampaignState) => void,
  onRerender: () => void,
): void {
  // Don't reopen for the same slot
  if (getActiveSlotElement() === slotElement && activePicker) return;

  closePopover();

  const popover = document.createElement('div');
  popover.className = `weapon-popover weapon-popover-${slotType}`;

  const content =
    slotType === 'primary'
      ? renderPrimaryPopover(
          weapon as EquippedPrimary,
          shipId,
          slotIndex,
          state,
        )
      : renderSecondaryPopover(
          weapon as EquippedSecondary,
          shipId,
          slotIndex,
          state,
        );

  popover.innerHTML = `<div class="popover-content">${content}</div>`;

  // Position relative to slot
  const slotRect = slotElement.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = `${slotRect.left}px`;
  popover.style.top = `${slotRect.bottom + 4}px`;
  popover.style.zIndex = '1000';

  document.body.appendChild(popover);
  setActivePicker(popover);
  setActiveSlotElement(slotElement);
  resetPopoverState();

  // Track mouse over popover
  popover.addEventListener('mouseenter', () => {
    setMouseOverPopover(true);
  });

  popover.addEventListener('mouseleave', () => {
    setMouseOverPopover(false);
    hideWeaponPopoverIfNotPinned();
  });

  // Adjust position if overflowing
  const popoverRect = popover.getBoundingClientRect();
  const padding = 8;

  if (popoverRect.bottom > window.innerHeight - padding) {
    const newTop = slotRect.top - popoverRect.height - 4;
    if (newTop >= padding) {
      popover.style.top = `${newTop}px`;
    } else {
      popover.style.top = `${padding}px`;
    }
  }

  if (popoverRect.right > window.innerWidth - padding) {
    const newLeft = window.innerWidth - popoverRect.width - padding;
    popover.style.left = `${Math.max(padding, newLeft)}px`;
  }

  bindPopoverEvents(
    popover,
    state,
    shipId,
    slotType,
    slotIndex,
    onStateUpdate,
    onRerender,
  );
}
