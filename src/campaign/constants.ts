/**
 * Campaign Constants
 *
 * Shared constants used across campaign modules.
 */

/**
 * Combat ship classes that pilots can fly and train on.
 * Used for pilot skill migration, recruit generation, and UI display.
 */
export const COMBAT_SHIP_CLASSES = [
  'fighter',
  'bomber',
  'interceptor',
  'striker',
  'defender',
] as const;

/** Type for combat ship class names */
export type CombatShipClass = (typeof COMBAT_SHIP_CLASSES)[number];
