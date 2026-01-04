/**
 * Secondary weapons display update logic - extracted for file size management.
 */

import type { SecondaryWeapon } from '../../components/weapons';
import type { WeaponBankCache } from './weapon-display-utils';
import {
  createBankElement,
  getSecondarySignature,
} from './weapon-display-utils';

/** Secondary display state (subset of WeaponDisplay) */
export interface SecondaryDisplayState {
  secondarySection: HTMLElement;
  secondaryBanks: WeaponBankCache[];
  secondaryNoneEl: HTMLElement | null;
  lastSecondarySignature: string;
}

/** Rebuild secondary weapon bank elements when loadout changes */
export function rebuildSecondaryBanks(
  display: SecondaryDisplayState,
  weapons: SecondaryWeapon[],
): void {
  // Remove old elements and NONE div if present
  for (const bank of display.secondaryBanks) bank.element.remove();
  if (display.secondaryNoneEl) {
    display.secondaryNoneEl.remove();
    display.secondaryNoneEl = null;
  }
  display.secondaryBanks = [];

  // Create new elements
  for (const w of weapons) {
    const bank = createBankElement(true, false);
    bank.nameEl.textContent = w.name;
    display.secondarySection.appendChild(bank.element);
    display.secondaryBanks.push(bank);
  }

  display.lastSecondarySignature = getSecondarySignature(weapons);
}

/** Update secondary weapons display */
export function updateSecondaryDisplay(
  display: SecondaryDisplayState,
  weapons: SecondaryWeapon[],
  currentIndex: number,
  lastFireTime: number,
  lockProgress: number,
  hasTarget: boolean,
  currentTime: number,
): void {
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i] as (typeof weapons)[0];
    const bank = display.secondaryBanks[
      i
    ] as (typeof display.secondaryBanks)[0];
    const isSelected = i === currentIndex;
    const countText = `${w.count}/${w.maxCount}`;
    const isEmpty = w.count <= 0;

    // Check cooldown for selected weapon
    const timeSinceFire = currentTime - lastFireTime;
    const onCooldown = isSelected && timeSinceFire < w.fireRate;

    // Update cooldown state
    if (bank.lastOnCooldown !== onCooldown) {
      bank.element.classList.toggle('cooldown', onCooldown);
      bank.lastOnCooldown = onCooldown;
    }

    // Update selection state
    if (bank.lastSelected !== isSelected) {
      bank.element.classList.toggle('selected', isSelected);
      bank.lastSelected = isSelected;
    }

    // Update empty state
    if (bank.lastEmpty !== isEmpty) {
      bank.element.classList.toggle('empty', isEmpty);
      bank.ammoEl.classList.toggle('depleted', isEmpty);
      bank.lastEmpty = isEmpty;
    }

    // Update ammo count
    if (bank.lastAmmo !== countText) {
      bank.ammoEl.textContent = countText;
      bank.lastAmmo = countText;
    }

    // Update lock status (show for ALL secondaries, not just selected)
    if (bank.lockEl) {
      let lockText = '';
      let lockClass = '';

      if (w.requiresLock) {
        if (isSelected) {
          // Selected lock-required: show actual lock state
          if (!hasTarget) {
            lockText = 'NO TGT';
            lockClass = 'no-target';
          } else if (lockProgress >= 1) {
            lockText = 'LOCKED';
            lockClass = 'locked';
          } else {
            lockText = `LOCK ${Math.round(lockProgress * 100)}%`;
            lockClass = 'locking';
          }
        } else {
          // Non-selected lock-required: show requirement indicator
          lockText = 'LOCK REQ';
          lockClass = 'lock-req';
        }
      } else {
        // Dumbfire: always show (so player knows it's always ready)
        lockText = 'DUMBFIRE';
        lockClass = isSelected ? 'dumbfire' : 'dumbfire-dim';
      }

      const lockKey = `${lockText}:${lockClass}`;
      if (bank.lastLock !== lockKey) {
        bank.lockEl.textContent = lockText;
        bank.lockEl.className = `lock-status${lockClass ? ` ${lockClass}` : ''}`;
        bank.lastLock = lockKey;
      }
    }
  }
}

/** Show "NONE" for empty secondary weapons */
export function showSecondaryNone(display: SecondaryDisplayState): void {
  if (display.secondaryBanks.length > 0) {
    for (const bank of display.secondaryBanks) bank.element.remove();
    display.secondaryBanks = [];
    display.lastSecondarySignature = '';
  }
  if (!display.secondaryNoneEl) {
    display.secondaryNoneEl = document.createElement('div');
    display.secondaryNoneEl.className = 'no-weapon';
    display.secondaryNoneEl.textContent = 'NONE';
    display.secondarySection.appendChild(display.secondaryNoneEl);
  }
}
