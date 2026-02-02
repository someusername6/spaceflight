/**
 * Sector constants - sector names and deployment limits.
 */

/** Sector names for display */
export const SECTOR_NAMES: Record<number, string> = {
  1: 'Frontier',
  2: 'Contested Zone',
  3: 'Warzone',
  4: 'Core Systems',
  5: 'Endless',
};

/** Maximum sector (5 = endless mode) */
export const MAX_SECTOR = 5;

/** Maximum ships deployable per sector */
export const SECTOR_DEPLOYMENT_LIMITS: Record<number, number> = {
  1: 4,
  2: 4,
  3: 4,
  4: 5,
  5: 6,
};

/** Get deployment limit for a sector (defaults to 4 for unknown sectors) */
export function getDeploymentLimit(sector: number): number {
  return SECTOR_DEPLOYMENT_LIMITS[sector] ?? 4;
}
