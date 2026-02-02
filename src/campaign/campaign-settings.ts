/**
 * Campaign settings - configuration chosen at campaign creation.
 */

import type { PlayerAutoaim } from '../settings/game-settings';

/** Campaign creation settings (locked after creation) */
export interface CampaignSettings {
  /** Custom name for the commander pilot */
  commanderName: string;
  /**
   * Ironman mode - true = permadeath (campaign ends on death, autoaim locked).
   * false = mission failure returns to pre-mission state.
   */
  ironmanMode: boolean;
  /** Autoaim assist in degrees (locked if ironman mode enabled) */
  autoaimDegrees: PlayerAutoaim;
}

/** Default campaign settings */
export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  commanderName: 'Commander',
  ironmanMode: false,
  autoaimDegrees: 2.5,
};
