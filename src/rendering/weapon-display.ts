/**
 * Weapon banks display - shows equipped weapons, ammo, heat, and selection state.
 * Performance: Caches DOM elements and only updates when values change.
 */
import type { World, Entity } from '../core/types';
import { getComponent } from '../core/ecs';
import type { PrimaryWeapons, SecondaryWeapons, PrimaryWeapon, SecondaryWeapon } from '../components/weapons';
import type { Targeting } from '../components/targeting';
import type { Heat } from '../components/heat';
import { getGameTime } from '../systems/weapons';
import {
  type WeaponBankCache,
  createBankElement,
  getPrimarySignature,
  getSecondarySignature,
} from './weapon-display-utils';

/** Weapon display state */
export interface WeaponDisplay {
  container: HTMLElement;
  primarySection: HTMLElement;
  secondarySection: HTMLElement;
  primaryBanks: WeaponBankCache[];
  secondaryBanks: WeaponBankCache[];
  // Track "NONE" divs so they can be removed
  primaryNoneEl: HTMLElement | null;
  secondaryNoneEl: HTMLElement | null;
  // Track weapon signatures to detect type changes (not just count)
  lastPrimarySignature: string;
  lastSecondarySignature: string;
}

/** Create weapon display HTML */
export function createWeaponDisplay(parent: HTMLElement): WeaponDisplay {
  const container = document.createElement('div');
  container.className = 'weapon-display';

  const primarySection = document.createElement('div');
  primarySection.className = 'weapon-section primary-section';
  const primaryLabel = document.createElement('div');
  primaryLabel.className = 'section-label';
  primaryLabel.textContent = 'PRIMARY ';
  const primaryHint = document.createElement('span');
  primaryHint.className = 'key-hint';
  primaryHint.textContent = '[</>]';
  primaryLabel.appendChild(primaryHint);
  primarySection.appendChild(primaryLabel);

  const secondarySection = document.createElement('div');
  secondarySection.className = 'weapon-section secondary-section';
  const secondaryLabel = document.createElement('div');
  secondaryLabel.className = 'section-label';
  secondaryLabel.textContent = 'SECONDARY ';
  const secondaryHint = document.createElement('span');
  secondaryHint.className = 'key-hint';
  secondaryHint.textContent = '[</>]';
  secondaryLabel.appendChild(secondaryHint);
  secondarySection.appendChild(secondaryLabel);

  container.appendChild(primarySection);
  container.appendChild(secondarySection);
  parent.appendChild(container);

  return {
    container,
    primarySection,
    secondarySection,
    primaryBanks: [],
    secondaryBanks: [],
    primaryNoneEl: null,
    secondaryNoneEl: null,
    lastPrimarySignature: '',
    lastSecondarySignature: '',
  };
}

/** Rebuild primary weapon bank elements when loadout changes */
function rebuildPrimaryBanks(display: WeaponDisplay, weapons: PrimaryWeapon[]): void {
  // Remove old elements and NONE div if present
  for (const bank of display.primaryBanks) bank.element.remove();
  if (display.primaryNoneEl) {
    display.primaryNoneEl.remove();
    display.primaryNoneEl = null;
  }
  display.primaryBanks = [];

  // Create new elements
  for (const w of weapons) {
    const isBeam = w.category === 'beam';
    const bank = createBankElement(false, isBeam);
    bank.nameEl.textContent = w.name;
    display.primarySection.appendChild(bank.element);
    display.primaryBanks.push(bank);
  }

  display.lastPrimarySignature = getPrimarySignature(weapons);
}

/** Rebuild secondary weapon bank elements when loadout changes */
function rebuildSecondaryBanks(display: WeaponDisplay, weapons: SecondaryWeapon[]): void {
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

/** Update weapon display with current state */
export function updateWeaponDisplay(
  display: WeaponDisplay,
  world: World,
  player: Entity
): void {
  const primary = getComponent<PrimaryWeapons>(world, player, 'primaryWeapons');
  const secondary = getComponent<SecondaryWeapons>(world, player, 'secondaryWeapons');
  const heat = getComponent<Heat>(world, player, 'heat');
  const targeting = getComponent<Targeting>(world, player, 'targeting');

  // Update primary weapons
  if (primary && primary.weapons.length > 0) {
    // Rebuild if weapon signature changed (handles count AND type changes)
    const sig = getPrimarySignature(primary.weapons);
    if (sig !== display.lastPrimarySignature) {
      rebuildPrimaryBanks(display, primary.weapons);
    }

    const heatPct = heat ? Math.round((heat.current / heat.max) * 100) : 0;
    const heatStr = `${heatPct}%`;
    const isHot = heatPct > 80;
    const currentTime = getGameTime();

    for (let i = 0; i < primary.weapons.length; i++) {
      const w = primary.weapons[i]!;
      const bank = display.primaryBanks[i]!;
      const isSelected = i === primary.currentIndex;
      const ammoText = w.ammo !== undefined ? `${w.ammo}/${w.maxAmmo}` : '∞';

      // Check cooldown for selected weapon (fire rate based on current weapon)
      const timeSinceFire = currentTime - primary.lastFireTime;
      const onCooldown = isSelected && timeSinceFire < w.fireRate;

      // Update cooldown state
      if (bank.lastOnCooldown !== onCooldown) {
        bank.element.classList.toggle('cooldown', onCooldown);
        bank.lastOnCooldown = onCooldown;
      }

      // Update only if changed
      if (bank.lastSelected !== isSelected) {
        bank.element.classList.toggle('selected', isSelected);
        bank.lastSelected = isSelected;
      }

      if (bank.lastAmmo !== ammoText) {
        bank.ammoEl.textContent = ammoText;
        bank.lastAmmo = ammoText;
      }

      // Heat only shown for selected weapon
      if (bank.heatEl) {
        const showHeat = isSelected ? heatStr : '';
        if (bank.lastHeat !== showHeat) {
          bank.heatEl.textContent = showHeat;
          bank.heatEl.classList.toggle('hot', isSelected && isHot);
          bank.lastHeat = showHeat;
        }
      }
    }
  } else {
    // No weapons - show "NONE"
    if (display.primaryBanks.length > 0) {
      for (const bank of display.primaryBanks) bank.element.remove();
      display.primaryBanks = [];
      display.lastPrimarySignature = '';
    }
    if (!display.primaryNoneEl) {
      display.primaryNoneEl = document.createElement('div');
      display.primaryNoneEl.className = 'no-weapon';
      display.primaryNoneEl.textContent = 'NONE';
      display.primarySection.appendChild(display.primaryNoneEl);
    }
  }

  // Update secondary weapons
  if (secondary && secondary.weapons.length > 0) {
    // Rebuild if weapon signature changed (handles count AND type changes)
    const sig = getSecondarySignature(secondary.weapons);
    if (sig !== display.lastSecondarySignature) {
      rebuildSecondaryBanks(display, secondary.weapons);
    }

    const lockProgress = secondary.lockProgress ?? 0;
    const hasTarget = targeting?.currentTarget !== undefined;
    const currentTime = getGameTime();

    for (let i = 0; i < secondary.weapons.length; i++) {
      const w = secondary.weapons[i]!;
      const bank = display.secondaryBanks[i]!;
      const isSelected = i === secondary.currentIndex;
      const countText = `${w.count}/${w.maxCount}`;
      const isEmpty = w.count <= 0;

      // Check cooldown for selected weapon
      const timeSinceFire = currentTime - secondary.lastFireTime;
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
          bank.lockEl.className = 'lock-status' + (lockClass ? ` ${lockClass}` : '');
          bank.lastLock = lockKey;
        }
      }
    }
  } else {
    // No weapons - show "NONE"
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
}

// Re-export styles from separate file (for file size management)
export { getWeaponDisplayStyles } from './weapon-display-styles';
