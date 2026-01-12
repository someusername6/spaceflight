/**
 * Sector 5: Endless Mode Missions
 * Enemy skill: Veteran → Ace
 * Rewards: 8,350-13,100 cr
 *
 * Valid archetypes (all weapons):
 * S1-S4: All previous archetypes
 * S5: wraith (nuclearLance, railgun, torpedo, seeker, decoy)
 *
 * S5 weapon coverage required:
 * - Primaries: nuclearLance
 */

import type { Contract } from '../../../../campaign/types';
import { SECTOR_5_EASY } from './easy';
import { SECTOR_5_HARD } from './hard';
import { SECTOR_5_MEDIUM } from './medium';

export const SECTOR_5_MISSIONS: Contract[] = [
  ...SECTOR_5_EASY,
  ...SECTOR_5_MEDIUM,
  ...SECTOR_5_HARD,
];
