/**
 * Ship Viewer Icons and Abbreviations
 *
 * Helper functions for icons, paths, and abbreviations used in ship viewer.
 *
 * For inline SVG injection (to style currentColor via CSS), use the functions
 * in `../utils/inline-svg.ts` instead.
 */

import {
  getFallbackSvgUrl,
  getMissileSvgUrl,
  getShipSvgUrl,
  getWeaponSvgUrl,
} from '../utils/inline-svg';

/** Get 3-letter abbreviation for ship class */
export function getShipAbbrev(shipClass: string): string {
  const abbrevs: Record<string, string> = {
    patrol: 'PTR',
    scout: 'SCT',
    fighter: 'FTR',
    interceptor: 'INT',
    striker: 'STR',
    bomber: 'BMR',
    defender: 'DEF',
    raider: 'RAI',
    sentinel: 'SNT',
  };
  return (
    abbrevs[shipClass.toLowerCase()] ?? shipClass.substring(0, 3).toUpperCase()
  );
}

/** Get weapon category color - all primaries use amber */
export function getWeaponColor(_weaponType: string): string {
  return 'var(--color-primary)';
}

/** Get missile color */
export function getMissileColor(_missileType: string): string {
  // All secondary weapons use red for consistent color scheme
  return 'var(--color-danger)';
}

/** Get fallback icon URL (hashed asset URL) */
export function getFallbackIconPath(): string {
  return getFallbackSvgUrl();
}

/** @deprecated Use getFallbackIconPath() instead */
export const FALLBACK_ICON_PATH = getFallbackSvgUrl();

/** Get path to ship icon SVG (hashed asset URL) */
export function getShipIconPath(shipClass: string): string {
  return getShipSvgUrl(shipClass);
}

/** Get path to weapon icon SVG (hashed asset URL) */
export function getWeaponIconPath(weaponType: string): string {
  return getWeaponSvgUrl(weaponType);
}

/** Get path to missile icon SVG (hashed asset URL) */
export function getMissileIconPath(missileType: string): string {
  return getMissileSvgUrl(missileType);
}

/**
 * Generate onerror handler for fallback icon.
 * Note: With Vite asset imports, missing icons already return the fallback URL,
 * so this handler mainly catches network errors.
 */
export function iconErrorHandler(): string {
  return `onerror="this.onerror=null; this.src='${getFallbackSvgUrl()}'"`;
}
