/**
 * Ship Viewer Icons and Abbreviations
 *
 * Helper functions for icons, paths, and abbreviations used in ship viewer.
 */

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

/** Get weapon abbreviation for slot display */
export function getWeaponAbbrev(weaponType: string): string {
  const abbrevs: Record<string, string> = {
    plasma: 'PLS',
    pulse: 'PUL',
    ion: 'ION',
    autocannon: 'AUT',
    railgun: 'RAI',
    flak: 'FLK',
    redlaser: 'RED',
    greenlaser: 'GRN',
    bluelaser: 'BLU',
    lightning: 'LTN',
    nuclearlance: 'NUK',
    torch: 'TCH',
  };
  return (
    abbrevs[weaponType.toLowerCase()] ??
    weaponType.substring(0, 3).toUpperCase()
  );
}

/** Get missile abbreviation */
export function getMissileAbbrev(missileType: string): string {
  const abbrevs: Record<string, string> = {
    rocket: 'RKT',
    cluster: 'CLU',
    seeker: 'SKR',
    dart: 'DRT',
    swarm: 'SWM',
    torpedo: 'TRP',
    nuke: 'NUK',
    decoy: 'DCY',
  };
  return (
    abbrevs[missileType.toLowerCase()] ??
    missileType.substring(0, 3).toUpperCase()
  );
}

/** Get weapon category color - all primaries use same yellow */
export function getWeaponColor(_weaponType: string): string {
  return 'var(--color-warning)';
}

/** Get missile color */
export function getMissileColor(_missileType: string): string {
  // All secondary weapons use red for consistent color scheme
  return 'var(--color-danger)';
}

/** Fallback icon path for missing SVGs */
export const FALLBACK_ICON_PATH = '/icons/fallback.svg';

/** Get path to ship icon SVG */
export function getShipIconPath(shipClass: string): string {
  return `/icons/ships/${shipClass.toLowerCase()}.svg`;
}

/** Get path to weapon icon SVG */
export function getWeaponIconPath(weaponType: string): string {
  return `/icons/weapons/${weaponType.toLowerCase()}.svg`;
}

/** Get path to missile icon SVG */
export function getMissileIconPath(missileType: string): string {
  return `/icons/missiles/${missileType.toLowerCase()}.svg`;
}

/** Generate onerror handler for fallback icon */
export function iconErrorHandler(): string {
  return `onerror="this.onerror=null; this.src='${FALLBACK_ICON_PATH}'"`;
}
