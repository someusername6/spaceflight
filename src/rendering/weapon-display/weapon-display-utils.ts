/**
 * Weapon display utility functions - extracted for file size management.
 */
import type { PrimaryWeapon, SecondaryWeapon } from '../../components/weapons';

/** Cached state for a single weapon bank element */
export interface WeaponBankCache {
  element: HTMLElement;
  nameEl: HTMLElement;
  ammoEl: HTMLElement;
  heatEl: HTMLElement | null;
  lockEl: HTMLElement | null;
  typeEl: HTMLElement | null;
  lastSelected: boolean;
  lastAmmo: string;
  lastHeat: string;
  lastLock: string;
  lastEmpty: boolean;
  lastOnCooldown: boolean;
}

/** Create a single weapon bank element */
export function createBankElement(
  isSecondary: boolean,
  isBeam: boolean,
): WeaponBankCache {
  const element = document.createElement('div');
  element.className = 'weapon-bank';
  const nameEl = document.createElement('div');
  nameEl.className = 'weapon-name';
  const infoEl = document.createElement('div');
  infoEl.className = 'weapon-info';
  const ammoEl = document.createElement('span');
  ammoEl.className = 'ammo';
  infoEl.appendChild(ammoEl);

  let heatEl: HTMLElement | null = null;
  let lockEl: HTMLElement | null = null;
  let typeEl: HTMLElement | null = null;

  if (!isSecondary) {
    heatEl = document.createElement('span');
    heatEl.className = 'heat-mini';
    infoEl.appendChild(heatEl);
    if (isBeam) {
      typeEl = document.createElement('div');
      typeEl.className = 'weapon-type beam';
      typeEl.textContent = 'BEAM';
    }
  } else {
    lockEl = document.createElement('span');
    lockEl.className = 'lock-status';
    infoEl.appendChild(lockEl);
  }
  element.appendChild(nameEl);
  element.appendChild(infoEl);
  if (typeEl) element.appendChild(typeEl);

  return {
    element,
    nameEl,
    ammoEl,
    heatEl,
    lockEl,
    typeEl,
    lastSelected: false,
    lastAmmo: '',
    lastHeat: '',
    lastLock: '',
    lastEmpty: false,
    lastOnCooldown: false,
  };
}

/** Generate signature for primary weapons (name + category) - uses loop to avoid .map() allocation */
export function getPrimarySignature(weapons: PrimaryWeapon[]): string {
  let sig = '';
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i] as PrimaryWeapon;
    if (i > 0) sig += ',';
    sig += w.name;
    sig += ':';
    sig += w.category;
  }
  return sig;
}

/** Generate signature for secondary weapons (name + requiresLock) - uses loop to avoid .map() allocation */
export function getSecondarySignature(weapons: SecondaryWeapon[]): string {
  let sig = '';
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i] as SecondaryWeapon;
    if (i > 0) sig += ',';
    sig += w.name;
    sig += ':';
    sig += w.requiresLock;
  }
  return sig;
}
