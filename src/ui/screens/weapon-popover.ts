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
} from '../../campaign/store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../campaign/types';
import { renderPrimaryPopover, renderSecondaryPopover } from './popover-render';

/** Popover state - shared with hangar-equip for coordination */
export let activePicker: HTMLElement | null = null;
let isPopoverPinned = false;
let isMouseOverPopover = false;
let closeTimeout: ReturnType<typeof setTimeout> | null = null;
let activeSlotElement: HTMLElement | null = null;

/** Close any open popover */
export function closePopover(): void {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  if (activePicker) {
    activePicker.remove();
    activePicker = null;
  }
  isPopoverPinned = false;
  isMouseOverPopover = false;
  activeSlotElement = null;
}

/** Set the active picker (called from hangar-equip for picker dropdowns) */
export function setActivePicker(picker: HTMLElement | null): void {
  activePicker = picker;
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
          }
        }
      }
    });
  });

  // Unequip button
  popover.querySelector('.manager-unequip')?.addEventListener('click', (e) => {
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
  if (activeSlotElement === slotElement && activePicker) return;

  closePopover();

  const popover = document.createElement('div');
  popover.className = 'weapon-popover';

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
  activePicker = popover;
  activeSlotElement = slotElement;
  isPopoverPinned = false;
  isMouseOverPopover = false;

  // Track mouse over popover
  popover.addEventListener('mouseenter', () => {
    isMouseOverPopover = true;
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  });

  popover.addEventListener('mouseleave', () => {
    isMouseOverPopover = false;
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

/** Pin the current popover (called on click) */
export function pinWeaponPopover(): void {
  if (!activePicker || isPopoverPinned) return;

  isPopoverPinned = true;
  activePicker.classList.add('pinned');

  const closeOnOutsideClick = (e: MouseEvent) => {
    if (activePicker && !activePicker.contains(e.target as Node)) {
      closePopover();
      document.removeEventListener('click', closeOnOutsideClick);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick);
  }, 0);
}

/** Hide popover on mouseleave (only if not pinned) */
export function hideWeaponPopoverIfNotPinned(): void {
  if (isPopoverPinned) return;

  if (closeTimeout) clearTimeout(closeTimeout);
  closeTimeout = setTimeout(() => {
    if (!isPopoverPinned && !isMouseOverPopover) {
      closePopover();
    }
    closeTimeout = null;
  }, 50);
}
