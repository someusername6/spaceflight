/**
 * Campaign Constants
 *
 * Shared constants used across campaign modules.
 */

/**
 * Combat ship classes that pilots can fly and train on.
 * Used for pilot skill migration, recruit generation, and UI display.
 * Order matches store unlock progression (S1 → S4).
 */
export const COMBAT_SHIP_CLASSES = [
  // Sector 1
  'patrol',
  'scout',
  'fighter',
  // Sector 2
  'interceptor',
  'raider',
  // Sector 3
  'bomber',
  'sentinel',
  // Sector 4
  'striker',
  'defender',
] as const;
