/**
 * Weapon banks display - shows equipped weapons, ammo, heat, and selection state.
 * Performance: Caches DOM elements and only updates when values change.
 */

import type { PrimaryWeapon } from '../../components/weapons';
import {
  getCurrentLinkMode,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
  rebuildSecondaryBanks,
  showSecondaryNone,
  updateSecondaryDisplay,
} from './weapon-display-secondary';
import {
  createBankElement,
  getPrimarySignature,
  getSecondarySignature,
  type WeaponBankCache,
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
  // Link state indicator
  linkIndicator: HTMLElement;
  lastLinkMode: string | null;
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
  primaryHint.textContent = '[V]';
  primaryLabel.appendChild(primaryHint);
  primarySection.appendChild(primaryLabel);

  // Link state indicator
  const linkIndicator = document.createElement('div');
  linkIndicator.className = 'link-indicator';
  primarySection.appendChild(linkIndicator);

  const secondarySection = document.createElement('div');
  secondarySection.className = 'weapon-section secondary-section';
  const secondaryLabel = document.createElement('div');
  secondaryLabel.className = 'section-label';
  secondaryLabel.textContent = 'SECONDARY ';
  const secondaryHint = document.createElement('span');
  secondaryHint.className = 'key-hint';
  secondaryHint.textContent = '[X]';
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
    linkIndicator,
    lastLinkMode: null,
    lastPrimarySignature: '',
    lastSecondarySignature: '',
  };
}

/** Rebuild primary weapon bank elements when loadout changes */
function rebuildPrimaryBanks(
  display: WeaponDisplay,
  weapons: PrimaryWeapon[],
): void {
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

/** Update weapon display with current state */
export function updateWeaponDisplay(
  display: WeaponDisplay,
  world: World,
  player: Entity,
): void {
  const primary = getComponent(world, player, 'primaryWeapons');
  const secondary = getComponent(world, player, 'secondaryWeapons');
  const heat = getComponent(world, player, 'heat');
  const targeting = getComponent(world, player, 'targeting');

  // Update primary weapons
  if (primary && primary.weapons.length > 0) {
    // Rebuild if weapon signature changed (handles count AND type changes)
    const sig = getPrimarySignature(primary.weapons);
    if (sig !== display.lastPrimarySignature) {
      rebuildPrimaryBanks(display, primary.weapons);
    }

    // Update link mode indicator (only if changed)
    const currentMode = getCurrentLinkMode(primary);
    if (display.lastLinkMode !== currentMode) {
      display.lastLinkMode = currentMode;
      let modeLabel: string;
      let isLinked: boolean;

      if (currentMode === 'all') {
        modeLabel = 'ALL';
        isLinked = true;
      } else {
        // Individual bank mode - show weapon name + bank number (1-indexed)
        const bankIndex = Number.parseInt(currentMode, 10);
        if (!Number.isNaN(bankIndex) && primary.weapons[bankIndex]) {
          const weaponName = primary.weapons[bankIndex].name.toUpperCase();
          modeLabel = `${weaponName} ${bankIndex + 1}`;
        } else {
          modeLabel = currentMode.toUpperCase();
        }
        isLinked = false;
      }

      display.linkIndicator.textContent = modeLabel;
      display.linkIndicator.className = isLinked
        ? 'link-indicator linked'
        : 'link-indicator single';
    }

    const heatPct = heat ? Math.round((heat.current / heat.max) * 100) : 0;
    const heatStr = `${heatPct}%`;
    const isHot = heatPct > 80;
    const currentTime = world.systemState.gameTime;
    const timeSinceFire = currentTime - primary.lastFireTime;

    // Calculate fire rate for weapons in current link mode (for cooldown display)
    const linkModeIndices = getWeaponIndicesForCurrentMode(primary);
    let linkModeFireRate = 0;
    for (const i of linkModeIndices) {
      const w = primary.weapons[i];
      if (w && w.category !== 'beam' && w.fireRate > linkModeFireRate) {
        linkModeFireRate = w.fireRate;
      }
    }

    for (let i = 0; i < primary.weapons.length; i++) {
      const w = primary.weapons[i] as (typeof primary.weapons)[0];
      const bank = display.primaryBanks[i] as (typeof display.primaryBanks)[0];
      // Highlight all weapons in current link mode, not just currentIndex
      const isSelected = linkModeIndices.includes(i);
      const ammoText = w.ammo !== undefined ? `${w.ammo}/${w.maxAmmo}` : '∞';

      // Cooldown logic: weapons in current link mode show cooldown together
      // based on slowest fire rate in the group
      const inCurrentMode = linkModeIndices.includes(i);
      const onCooldown =
        w.category !== 'beam' &&
        inCurrentMode &&
        timeSinceFire < linkModeFireRate;

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

  // Update secondary weapons (delegated to extracted module)
  if (secondary && secondary.weapons.length > 0) {
    const sig = getSecondarySignature(secondary.weapons);
    if (sig !== display.lastSecondarySignature) {
      rebuildSecondaryBanks(display, secondary.weapons);
    }

    const lockProgress = secondary.lockProgress ?? 0;
    const hasTarget = targeting?.currentTarget !== undefined;
    const currentTime = world.systemState.gameTime;

    updateSecondaryDisplay(
      display,
      secondary.weapons,
      secondary.currentIndex,
      secondary.lastFireTime,
      lockProgress,
      hasTarget,
      currentTime,
    );
  } else {
    showSecondaryNone(display);
  }
}

// Re-export styles from separate file (for file size management)
export { getWeaponDisplayStyles } from './weapon-display-styles';
