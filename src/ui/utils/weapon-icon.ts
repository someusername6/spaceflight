/**
 * Weapon Icon Renderer
 *
 * Renders weapon/missile icons as inline SVG with proper styling.
 * This ensures consistent rendering across all UI contexts:
 * - Store detail preview
 * - Weapon picker popovers
 * - Ship schematic slots
 *
 * ## Why Inline SVG?
 *
 * SVG icons using `currentColor` only inherit CSS `color` when inline.
 * `<img>` tags treat SVGs as external images with no CSS access.
 *
 * ## Dual Coloring
 *
 * Laser weapons have two color zones:
 * - Fixed color (beam) - defined in SVG, has internal glow filter
 * - currentColor (body) - controlled via CSS `color` property
 *
 * Other weapons use currentColor throughout and get CSS drop-shadow glow.
 */

import {
  getMissileSvgInline,
  getShipSvgInline,
  getWeaponSvgInline,
} from './inline-svg';

/** Weapons with internal SVG glow filters (don't need CSS drop-shadow) */
const WEAPONS_WITH_SVG_GLOW = new Set(['redlaser', 'bluelaser', 'greenlaser']);

/** Check if a weapon has internal SVG glow filters */
export function hasInternalGlow(weaponType: string): boolean {
  return WEAPONS_WITH_SVG_GLOW.has(weaponType.toLowerCase());
}

/** Icon size presets */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Options for rendering weapon icons */
export interface WeaponIconOptions {
  /** Additional CSS class(es) to apply */
  className?: string;
  /** Size preset (default: 'md') */
  size?: IconSize;
  /** Icon color - sets currentColor in SVG (default: 'var(--color-primary)') */
  color?: string;
  /** Glow color for drop-shadow (default: same as color) */
  glowColor?: string;
}

/** Options for rendering missile icons */
export interface MissileIconOptions {
  className?: string;
  size?: IconSize;
  color?: string;
  glowColor?: string;
}

/** Options for rendering ship icons */
export interface ShipIconOptions {
  className?: string;
  size?: IconSize;
  color?: string;
  glowColor?: string;
}

/**
 * Render a weapon icon as inline SVG.
 *
 * @example
 * ```typescript
 * // In picker popover
 * renderWeaponIcon('redlaser', { size: 'sm' })
 *
 * // In store detail
 * renderWeaponIcon('railgun', { size: 'xl', className: 'store-preview' })
 *
 * // In ship slot
 * renderWeaponIcon('autocannon', { size: 'xs', color: 'var(--color-primary)' })
 * ```
 */
export function renderWeaponIcon(
  weaponType: string,
  options: WeaponIconOptions = {},
): string {
  const {
    className = '',
    size = 'md',
    color = 'var(--color-primary)',
    glowColor = 'var(--color-primary-glow)',
  } = options;

  const svg = getWeaponSvgInline(weaponType);
  const hasGlow = hasInternalGlow(weaponType);
  const glowClass = hasGlow ? 'has-svg-glow' : '';
  const classes = ['weapon-icon', `weapon-icon-${size}`, glowClass, className]
    .filter(Boolean)
    .join(' ');

  // Weapons with internal glow don't need CSS drop-shadow
  const glowStyle = hasGlow ? '' : `--glow-color: ${glowColor};`;

  return `<span class="${classes}" style="color: ${color}; ${glowStyle}">${svg}</span>`;
}

/**
 * Render a missile icon as inline SVG.
 */
export function renderMissileIcon(
  missileType: string,
  options: MissileIconOptions = {},
): string {
  const {
    className = '',
    size = 'md',
    color = 'var(--color-danger)',
    glowColor = 'var(--color-danger-glow)',
  } = options;

  const svg = getMissileSvgInline(missileType);
  const classes = ['missile-icon', `missile-icon-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return `<span class="${classes}" style="color: ${color}; --glow-color: ${glowColor};">${svg}</span>`;
}

/**
 * Render a ship icon as inline SVG.
 */
export function renderShipIcon(
  shipClass: string,
  options: ShipIconOptions = {},
): string {
  const {
    className = '',
    size = 'md',
    color = 'var(--color-secondary)',
    glowColor = 'var(--color-secondary-glow)',
  } = options;

  const svg = getShipSvgInline(shipClass);
  const classes = ['ship-icon', `ship-icon-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return `<span class="${classes}" style="color: ${color}; --glow-color: ${glowColor};">${svg}</span>`;
}
