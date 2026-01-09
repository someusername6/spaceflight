/**
 * Store Item Stats Renderers - render stat displays for store items.
 */

import { MISSILES } from '../../../data/missiles';
import { SHIP_CLASSES } from '../../../data/ships';
import { PRIMARY_WEAPONS, type WeaponStats } from '../../../data/weapons';
import { formatBankSizes, renderShipStatsRows } from '../../ship/stats';
import {
  FALLBACK_ICON_PATH,
  getMissileIconPath,
  getWeaponIconPath,
  renderHullSchematic,
} from '../../ship/viewer';
import type { StoreCategory } from './render';

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

/** Generate onerror handler for fallback icon */
const iconError = `onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'"`;

/** Render item preview - stylized visual representation */
function renderItemPreview(category: StoreCategory, id: string): string {
  const categoryColors: Record<StoreCategory, string> = {
    ships: 'var(--color-secondary)',
    primaries: 'var(--color-primary)',
    secondaries: 'var(--color-danger)',
    ammo: 'var(--color-success)',
    scrap: 'var(--color-text-dim)',
  };

  // Use ship schematic for ships (shows ship + hardpoint slots)
  if (category === 'ships') {
    return `
      <div class="item-preview ship-preview-container" style="--preview-color: ${categoryColors[category]}">
        ${renderHullSchematic(id)}
      </div>
    `;
  }

  // Use hull schematic for scrap (gray, no glow)
  if (category === 'scrap') {
    return `
      <div class="item-preview scrap-preview-container" style="--preview-color: ${categoryColors[category]}">
        ${renderHullSchematic(id)}
      </div>
    `;
  }

  // Use weapon SVG icon for primaries
  if (category === 'primaries') {
    const iconPath = getWeaponIconPath(id);
    return `
      <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
        <img src="${iconPath}" alt="${id}" class="item-preview-weapon-icon" ${iconError} />
      </div>
    `;
  }

  // Use missile SVG icon for secondaries
  if (category === 'secondaries') {
    const iconPath = getMissileIconPath(id);
    return `
      <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
        <img src="${iconPath}" alt="${id}" class="item-preview-missile-icon" ${iconError} />
      </div>
    `;
  }

  // Use weapon SVG icon for ammo (green coloring)
  // category === 'ammo' is the only remaining case
  const iconPath = getWeaponIconPath(id);
  return `
    <div class="item-preview" style="--preview-color: ${categoryColors[category]}">
      <img src="${iconPath}" alt="${id}" class="item-preview-ammo-icon" ${iconError} />
    </div>
  `;
}

/** Render ship stats */
export function renderShipStats(shipClass: string): string {
  const statsRows = renderShipStatsRows(shipClass, { classPrefix: 'stat' });
  if (!statsRows) return '';

  return `
    ${renderItemPreview('ships', shipClass)}
    <div class="item-stats">
      ${statsRows}
    </div>
  `;
}

/** Render primary weapon stats */
export function renderPrimaryStats(weaponType: string): string {
  const stats = PRIMARY_WEAPONS[weaponType];
  if (!stats) return '';

  const ammoText =
    stats.ammo !== undefined ? `${stats.ammo} rounds` : 'Unlimited';
  const categoryText =
    stats.category.charAt(0).toUpperCase() + stats.category.slice(1);

  // Beam weapon classification
  const isBeam = stats.category === 'beam';
  const isPulseBeam = stats.isPulseBeam === true;
  const isContinuousBeam = isBeam && !isPulseBeam;

  // Fire rate display
  const fireRateText = isPulseBeam
    ? `${Math.round(1 / (stats.pulseInterval ?? 0.1))} pulses/s`
    : isContinuousBeam
      ? 'Continuous'
      : `${(1 / stats.fireRate).toFixed(1)}/s`;

  // Damage label and text
  const damageLabel = isPulseBeam
    ? 'Damage per pulse'
    : isContinuousBeam
      ? 'Damage per second'
      : 'Damage';
  const damageText = isBeam ? formatBeamDamage(stats) : `${stats.damage}`;

  // Heat label
  const heatLabel = isPulseBeam
    ? 'Heat per pulse'
    : isContinuousBeam
      ? 'Heat per second'
      : 'Heat per shot';

  // Flak-specific stats
  const flakStats = stats.flakRadius
    ? `
      <div class="stat-row"><span>Burst radius</span><span>${stats.flakRadius} m</span></div>
      <div class="stat-row"><span>Shrapnel count</span><span>${stats.shrapnelCount}</span></div>
    `
    : '';

  // Shield damage multiplier (for Ion and similar weapons)
  const shieldDamageMultiplier = stats.shieldDamageMultiplier ?? 1;
  const shieldDamageText =
    shieldDamageMultiplier !== 1
      ? `${Math.round(stats.damage * shieldDamageMultiplier)} (${shieldDamageMultiplier}×)`
      : '';

  // Hull damage multiplier (for Torch and similar weapons)
  const hullDamageMultiplier = stats.hullDamageMultiplier ?? 1;
  const hullDamageText =
    hullDamageMultiplier !== 1
      ? `${Math.round(stats.damage * hullDamageMultiplier)} (${hullDamageMultiplier}×)`
      : '';

  // Projectile speed (only for non-beam weapons)
  const speedText =
    stats.projectileSpeed > 0 ? `${stats.projectileSpeed} m/s` : '';

  return `
    ${renderItemPreview('primaries', weaponType)}
    <div class="item-stats">
      <div class="stat-row"><span>Category</span><span>${categoryText}</span></div>
      <div class="stat-row"><span>${damageLabel}</span><span>${damageText}</span></div>
      ${shieldDamageText ? `<div class="stat-row"><span>Shield damage</span><span>${shieldDamageText}</span></div>` : ''}
      ${hullDamageText ? `<div class="stat-row"><span>Hull damage</span><span>${hullDamageText}</span></div>` : ''}
      <div class="stat-row"><span>Range</span><span>${stats.range} m</span></div>
      ${speedText ? `<div class="stat-row"><span>Speed</span><span>${speedText}</span></div>` : ''}
      <div class="stat-row"><span>Fire rate</span><span>${fireRateText}</span></div>
      <div class="stat-row"><span>${heatLabel}</span><span>${stats.heatPerShot}</span></div>
      ${flakStats}
      <div class="stat-row"><span>Ammo</span><span>${ammoText}</span></div>
    </div>
  `;
}

/** Render secondary weapon stats */
export function renderSecondaryStats(weaponType: string): string {
  const stats = MISSILES[weaponType];
  if (!stats) return '';

  const trackingText = stats.turnRate > 0 ? `${stats.turnRate}°/s` : 'None';
  const lockText = stats.requiresLock
    ? `${(1 / stats.lockSpeed).toFixed(1)}s`
    : 'N/A';

  return `
    ${renderItemPreview('secondaries', weaponType)}
    <div class="item-stats">
      <div class="stat-row"><span>Size</span><span>${stats.capacity} per bank</span></div>
      <div class="stat-row"><span>Damage</span><span>${stats.damage}</span></div>
      <div class="stat-row"><span>Speed</span><span>${stats.speed} m/s</span></div>
      <div class="stat-row"><span>Range</span><span>${stats.range} m</span></div>
      <div class="stat-row"><span>Tracking</span><span>${trackingText}</span></div>
      <div class="stat-row"><span>Lock time</span><span>${lockText}</span></div>
      ${stats.aoeRadius ? `<div class="stat-row"><span>AoE radius</span><span>${stats.aoeRadius} m</span></div>` : ''}
    </div>
  `;
}

/** Render ammo stats */
export function renderAmmoStats(weaponType: string): string {
  const weapon = PRIMARY_WEAPONS[weaponType];
  if (!weapon || weapon.ammo === undefined) return '';

  const roundsText = weapon.ammo === 1 ? 'round' : 'rounds';
  return `
    ${renderItemPreview('ammo', weaponType)}
    <div class="item-stats">
      <div class="stat-row"><span>Weapon</span><span>${weapon.name}</span></div>
      <div class="stat-row"><span>Capacity per bank size</span><span>${weapon.ammo} ${roundsText}</span></div>
    </div>
  `;
}

/** Render scrap stats */
export function renderScrapStats(shipClass: string): string {
  const ship = SHIP_CLASSES[shipClass];
  if (!ship) return '';

  const displayName = shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
  const primaryBankStr = formatBankSizes(
    ship.primaryBanks,
    'bank-dots-primary',
  );
  const secondaryBankStr = formatBankSizes(
    ship.secondaryBanks,
    'bank-dots-secondary',
  );

  return `
    ${renderItemPreview('scrap', shipClass)}
    <div class="item-stats">
      <div class="stat-row"><span>Hull</span><span>${displayName}</span></div>
      <div class="stat-row"><span>Primary banks</span><span>${primaryBankStr}</span></div>
      <div class="stat-row"><span>Secondary banks</span><span>${secondaryBankStr}</span></div>
    </div>
  `;
}
