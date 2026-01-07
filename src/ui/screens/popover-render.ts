/**
 * Popover Render - HTML rendering functions for weapon popovers.
 */

import { getMaxAmmoCapacity } from '../../campaign/store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../../campaign/types';
import { MISSILES } from '../../data/missiles';
import { weaponUsesAmmo } from '../../data/prices';
import { PRIMARY_WEAPONS, type WeaponStats } from '../../data/weapons';

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
  return `${stats.damage}&nbsp;at&nbsp;${BEAM_EFFECTIVE_RANGE}&nbsp;m, ${damageAtMax}&nbsp;at&nbsp;${stats.range}&nbsp;m`;
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

/** Get category display name */
function categoryName(category: string): string {
  const names: Record<string, string> = {
    energy: 'Energy Weapon',
    ballistic: 'Ballistic Weapon',
    beam: 'Beam Weapon',
  };
  return names[category] ?? category;
}

/** Format a stat row */
function statRow(label: string, value: string | number, unit = ''): string {
  return `<div class="popover-stat"><span class="popover-stat-label">${label}</span><span class="popover-stat-value">${value}${unit}</span></div>`;
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
    return `<div class="popover-header"><div class="popover-title"><span class="manager-name">${weapon.weaponType}</span></div></div>`;
  }

  const category = stats.category ?? 'unknown';
  const isBeam = category === 'beam';
  const isPulseBeam = stats.isPulseBeam === true;
  // For pulse beams, DPS = damage * pulses per second
  // For continuous beams, damage IS the DPS
  // For projectile weapons, DPS = damage / fireRate
  const isContinuousBeam = isBeam && !isPulseBeam;
  const dps = isPulseBeam
    ? Math.round(stats.damage / (stats.pulseInterval ?? 0.1))
    : isBeam
      ? stats.damage
      : Math.round(stats.damage / stats.fireRate);
  const damageLabel = isPulseBeam
    ? 'Dmg/pulse'
    : isContinuousBeam
      ? 'DPS'
      : 'Damage';
  // For beams with falloff, force line break so damage values appear on own line
  const beamDamage = formatBeamDamage(stats);
  const needsLineBreak = isBeam && !stats.noFalloff;
  const damageText = needsLineBreak
    ? `<br>${beamDamage}`
    : isBeam
      ? beamDamage
      : `${stats.damage}`;

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
      ${statRow('Loaded', `${current}/${max}`)}
      <div class="popover-controls">
        <button class="manager-btn" data-action="unload-all" ${canUnload ? '' : 'disabled'} title="Empty">▼</button>
        <button class="manager-btn" data-action="unload" ${canUnload ? '' : 'disabled'}>−</button>
        <button class="manager-btn" data-action="load" ${canLoad ? '' : 'disabled'}>+</button>
        <button class="manager-btn" data-action="load-all" ${canLoad ? '' : 'disabled'} title="Fill">▲</button>
      </div>
      ${statRow('Storage', stored)}
    </div>
    `;
  }

  return `
    <div class="popover-header">
      <div class="popover-title">
        <span class="manager-name">${stats.name}</span>
        <span class="manager-size">×${weapon.bankSize}</span>
      </div>
      <div class="popover-subtitle">${categoryName(category)}</div>
    </div>
    <div class="popover-stats">
      ${statRow(damageLabel, damageText)}
      ${stats.shieldDamageMultiplier && stats.shieldDamageMultiplier !== 1 ? statRow('Shield Dmg', `${Math.round(stats.damage * stats.shieldDamageMultiplier)} (${stats.shieldDamageMultiplier}×)`) : ''}
      ${stats.hullDamageMultiplier && stats.hullDamageMultiplier !== 1 ? statRow('Hull Dmg', `${Math.round(stats.damage * stats.hullDamageMultiplier)} (${stats.hullDamageMultiplier}×)`) : ''}
      ${!isContinuousBeam ? statRow('DPS', `~${dps}`) : ''}
      ${isPulseBeam ? statRow('Pulse rate', `${Math.round(1 / (stats.pulseInterval ?? 0.1))}/s`) : ''}
      ${category !== 'beam' ? statRow('Fire rate', `${Math.round(1 / stats.fireRate)}/s`) : ''}
      ${statRow('Range', stats.range, 'm')}
      ${statRow('Heat', stats.heatPerShot, isPulseBeam ? '/pulse' : isBeam ? '/s' : '/shot')}
      ${category !== 'beam' ? statRow('Velocity', stats.projectileSpeed, ' m/s') : ''}
      ${stats.flakRadius ? statRow('Blast Radius', stats.flakRadius, 'm') : ''}
      ${stats.autoaimFov ? statRow('Auto-Aim', stats.autoaimFov, '°') : ''}
    </div>
    ${ammoStats}
    <div class="manager-actions">
      <button class="manager-unequip" data-ship="${shipId}" data-type="primary" data-index="${slotIndex}">
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
    return `<div class="popover-header"><div class="popover-title"><span class="manager-name">${weapon.weaponType}</span></div></div>`;
  }

  const lockInfo = stats.requiresLock
    ? `${(1 / stats.lockSpeed).toFixed(1)}s`
    : 'None';

  const typeLabel = stats.isDecoy
    ? 'Countermeasure'
    : stats.requiresLock
      ? 'Homing Missile'
      : 'Dumbfire Missile';

  return `
    <div class="popover-header">
      <div class="popover-title">
        <span class="manager-name">${stats.name}</span>
        <span class="manager-size">×${weapon.bankSize}</span>
      </div>
      <div class="popover-subtitle">${typeLabel}</div>
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
      ${statRow('Loaded', `${weapon.count}/${weapon.maxCount}`)}
      <div class="popover-controls">
        <button class="manager-btn" data-action="unload-all" ${canUnload ? '' : 'disabled'} title="Empty">▼</button>
        <button class="manager-btn" data-action="unload" ${canUnload ? '' : 'disabled'}>−</button>
        <button class="manager-btn" data-action="load" ${canLoad ? '' : 'disabled'}>+</button>
        <button class="manager-btn" data-action="load-all" ${canLoad ? '' : 'disabled'} title="Fill">▲</button>
      </div>
      ${statRow('Storage', stored)}
    </div>
    <div class="manager-actions">
      <button class="manager-unequip" data-ship="${shipId}" data-type="secondary" data-index="${slotIndex}">
        Unequip
      </button>
    </div>
  `;
}
