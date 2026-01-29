/**
 * Popover Render - HTML rendering functions for weapon popovers.
 */

import { getMaxAmmoCapacity } from '../../../campaign/store/store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../../campaign/types';
import { getMissileDisplayName, MISSILES } from '../../../data/missiles';
import { weaponUsesAmmo } from '../../../data/prices';
import {
  getWeaponDisplayName,
  PRIMARY_WEAPONS,
  type WeaponStats,
} from '../../../data/weapons';
import { canEditShip } from '../../../multiplayer/context-permissions';

/** Effective range for beam weapons (full damage at this distance or closer) */
const BEAM_EFFECTIVE_RANGE = 100;

/** Format beam damage display with falloff info */
function formatBeamDamage(stats: WeaponStats): string {
  if (stats.noFalloff) {
    return `${stats.damage}`;
  }
  // Calculate damage at max range using 1/d falloff
  const damageAtMax = Math.round(
    stats.damage / (stats.range / BEAM_EFFECTIVE_RANGE),
  );
  return `${stats.damage}&nbsp;at&nbsp;${BEAM_EFFECTIVE_RANGE}&nbsp;m,<br>${damageAtMax}&nbsp;at&nbsp;${stats.range}&nbsp;m`;
}

/** Get stored ammo count for a weapon type */
function getStoredAmmoCount(state: CampaignState, weaponType: string): number {
  const stored = state.storedAmmo.find((a) => a.weaponType === weaponType);
  return stored?.count ?? 0;
}

/** Get stored missile count for a weapon type */
function getStoredMissileCount(
  state: CampaignState,
  weaponType: string,
): number {
  const stored = state.storedWeapons.find(
    (w) => w.category === 'secondary' && w.weaponType === weaponType,
  );
  return stored?.count ?? 0;
}

/** Check if there are alternative primary weapons available to swap to */
function hasAlternativePrimary(
  state: CampaignState,
  currentType: string,
  equippedCount: number,
): boolean {
  for (const w of state.storedWeapons) {
    if (w.category !== 'primary') continue;
    if (w.weaponType !== currentType) return true;
    if (w.count > equippedCount) return true;
  }
  return false;
}

/** Check if there are alternative secondary weapons available to swap to */
function hasAlternativeSecondary(
  state: CampaignState,
  currentType: string,
  equippedCount: number,
): boolean {
  for (const w of state.storedWeapons) {
    if (w.category !== 'secondary') continue;
    if (w.weaponType !== currentType) return true;
    if (w.count > equippedCount) return true;
  }
  return false;
}

/** Format a stat row */
function statRow(label: string, value: string | number, unit = ''): string {
  return `<div class="popover-stat"><span class="popover-stat-label">${label}</span><span class="popover-stat-value">${value}${unit}</span></div>`;
}

/** Max segments before switching to continuous bar in popover */
const MAX_POPOVER_SEGMENTS = 16;

/** Render ammo bar - segmented for low counts, continuous for high */
function renderAmmoBar(current: number, max: number): string {
  if (max <= MAX_POPOVER_SEGMENTS) {
    // Segmented bar
    const segments = Array.from(
      { length: max },
      (_, i) =>
        `<div class="ammo-segment${i < current ? ' filled' : ''}"></div>`,
    ).join('');
    return `<div class="ammo-bar segmented">${segments}</div>`;
  }
  // Continuous bar
  const fillPct = max > 0 ? Math.round((current / max) * 100) : 0;
  return `<div class="ammo-bar"><div class="ammo-bar-fill" style="width: ${fillPct}%"></div></div>`;
}

/** Render primary weapon popover content (full stats + actions) */
export function renderPrimaryPopover(
  weapon: EquippedPrimary,
  shipId: string,
  slotIndex: number,
  state: CampaignState,
): string {
  const stats = PRIMARY_WEAPONS[weapon.weaponType];

  if (!stats) {
    return `<div class="popover-header"><div class="popover-title"><span class="manager-name">${getWeaponDisplayName(weapon.weaponType)}</span></div></div>`;
  }

  const category = stats.category ?? 'unknown';
  const isBeam = category === 'beam';
  const isPulseBeam = stats.isPulseBeam === true;
  const isInstantBeam = stats.isInstantBeam === true;
  // For pulse beams, DPS = damage * pulses per second
  // For continuous beams, damage IS the DPS
  // For instant beams, DPS = damage / fireRate (cooldown)
  // For projectile weapons, DPS = damage / fireRate
  const isContinuousBeam = isBeam && !isPulseBeam && !isInstantBeam;
  const dps = isPulseBeam
    ? Math.round(stats.damage / (stats.pulseInterval ?? 0.1))
    : isContinuousBeam
      ? stats.damage
      : Math.round(stats.damage / stats.fireRate);
  const damageLabel = isPulseBeam
    ? 'Dmg/pulse'
    : isContinuousBeam
      ? 'DPS'
      : isInstantBeam
        ? 'Dmg/shot'
        : 'Damage';
  const damageText = isBeam ? formatBeamDamage(stats) : `${stats.damage}`;

  // Ammo section (only for ballistic weapons)
  let ammoStats = '';
  if (weaponUsesAmmo(weapon.weaponType)) {
    const current = weapon.currentAmmo ?? 0;
    const max = getMaxAmmoCapacity(weapon.weaponType, weapon.bankSize);
    const stored = getStoredAmmoCount(state, weapon.weaponType);
    const canLoad = stored > 0 && current < max;
    const canUnload = current > 0;

    ammoStats = `
    <div class="popover-ammo">
      ${renderAmmoBar(current, max)}
      <div class="ammo-count">${current}<span class="ammo-max">/${max}</span></div>
      <div class="popover-controls">
        <button class="manager-btn" data-action="unload-all" data-label="All" ${canUnload ? '' : 'disabled'}>▼</button>
        <button class="manager-btn" data-action="unload" data-label="−10" ${canUnload ? '' : 'disabled'}>−</button>
        <button class="manager-btn" data-action="load" data-label="+10" ${canLoad ? '' : 'disabled'}>+</button>
        <button class="manager-btn" data-action="load-all" data-label="All" ${canLoad ? '' : 'disabled'}>▲</button>
      </div>
    </div>
    `;
  }

  return `
    <div class="popover-header popover-header-primary">
      <div class="popover-title">
        <span class="manager-size">${'●'.repeat(weapon.bankSize)}</span>
        <span class="manager-name">${stats.name}</span>
      </div>
    </div>
    <div class="popover-stats">
      ${statRow(damageLabel, damageText)}
      ${stats.shieldDamageMultiplier && stats.shieldDamageMultiplier !== 1 ? statRow('Shield Dmg', `${Math.round(stats.damage * stats.shieldDamageMultiplier)} (${stats.shieldDamageMultiplier}×)`) : ''}
      ${stats.hullDamageMultiplier && stats.hullDamageMultiplier !== 1 ? statRow('Hull Dmg', `${Math.round(stats.damage * stats.hullDamageMultiplier)} (${stats.hullDamageMultiplier}×)`) : ''}
      ${statRow('Range', stats.range, 'm')}
      ${category !== 'beam' ? statRow('Speed', stats.projectileSpeed, ' m/s') : ''}
      ${isPulseBeam ? statRow('Pulse rate', `${Math.round(1 / (stats.pulseInterval ?? 0.1))}/s`) : ''}
      ${isInstantBeam ? statRow('Cooldown', `${stats.fireRate}s`) : ''}
      ${category !== 'beam' ? statRow('Fire rate', `${Math.round(1 / stats.fireRate)}/s`) : ''}
      ${statRow('Heat', stats.heatPerShot, isPulseBeam ? '/pulse' : isContinuousBeam ? '/s' : '/shot')}
      ${stats.flakRadius ? statRow('Blast Radius', stats.flakRadius, 'm') : ''}
      ${!isContinuousBeam && !isInstantBeam ? statRow('DPS', `~${dps}`) : ''}
    </div>
    ${ammoStats}
    <div class="manager-actions">
      <button class="btn btn-small btn-change-weapon" data-ship="${shipId}" data-type="primary" data-index="${slotIndex}" ${hasAlternativePrimary(state, weapon.weaponType, weapon.bankSize) && canEditShip(shipId) ? '' : 'disabled'}>
        Change
      </button>
      <button class="btn btn-small btn-unequip" data-ship="${shipId}" data-type="primary" data-index="${slotIndex}" ${canEditShip(shipId) ? '' : 'disabled'}>
        Unequip
      </button>
    </div>
  `;
}

/** Render secondary weapon popover content (full stats + actions) */
export function renderSecondaryPopover(
  weapon: EquippedSecondary,
  shipId: string,
  slotIndex: number,
  state: CampaignState,
): string {
  const stats = MISSILES[weapon.weaponType];
  const stored = getStoredMissileCount(state, weapon.weaponType);
  const canLoad = stored > 0 && weapon.count < weapon.maxCount;
  const canUnload = weapon.count > 0;

  if (!stats) {
    return `<div class="popover-header"><div class="popover-title"><span class="manager-name">${getMissileDisplayName(weapon.weaponType)}</span></div></div>`;
  }

  const lockInfo = stats.requiresLock
    ? `${(1 / stats.lockSpeed).toFixed(1)}s`
    : 'None';

  return `
    <div class="popover-header popover-header-secondary">
      <div class="popover-title">
        <span class="manager-size">${'◆'.repeat(weapon.bankSize)}</span>
        <span class="manager-name">${stats.name}</span>
      </div>
    </div>
    <div class="popover-stats">
      ${!stats.isDecoy ? statRow('Damage', stats.damage) : ''}
      ${statRow('Speed', stats.speed, ' m/s')}
      ${stats.turnRate > 0 ? statRow('Tracking', stats.turnRate, '°/s') : ''}
      ${!stats.isDecoy ? statRow('Range', stats.range, 'm') : ''}
      ${statRow('Lock Time', lockInfo)}
      ${stats.aoeRadius ? statRow('Blast Radius', stats.aoeRadius, 'm') : ''}
    </div>
    <div class="popover-ammo">
      ${renderAmmoBar(weapon.count, weapon.maxCount)}
      <div class="ammo-count">${weapon.count}<span class="ammo-max">/${weapon.maxCount}</span></div>
      <div class="popover-controls">
        <button class="manager-btn" data-action="unload-all" data-label="All" ${canUnload ? '' : 'disabled'}>▼</button>
        <button class="manager-btn" data-action="unload" data-label="−1" ${canUnload ? '' : 'disabled'}>−</button>
        <button class="manager-btn" data-action="load" data-label="+1" ${canLoad ? '' : 'disabled'}>+</button>
        <button class="manager-btn" data-action="load-all" data-label="All" ${canLoad ? '' : 'disabled'}>▲</button>
      </div>
    </div>
    <div class="manager-actions">
      <button class="btn btn-small btn-change-weapon" data-ship="${shipId}" data-type="secondary" data-index="${slotIndex}" ${hasAlternativeSecondary(state, weapon.weaponType, weapon.count) && canEditShip(shipId) ? '' : 'disabled'}>
        Change
      </button>
      <button class="btn btn-small btn-unequip" data-ship="${shipId}" data-type="secondary" data-index="${slotIndex}" ${canEditShip(shipId) ? '' : 'disabled'}>
        Unequip
      </button>
    </div>
  `;
}
