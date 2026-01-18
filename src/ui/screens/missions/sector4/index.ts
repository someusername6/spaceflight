/**
 * Sector 4: Core Systems Missions
 * Enemy skill: Veteran → Ace
 * Rewards: 5,900-9,600 cr
 *
 * Valid archetypes (S1-S4 weapons):
 * S1-S3: All previous archetypes
 * S4: scorpion (railgun, seeker, decoy), specter (railgun, torpedo, seeker, decoy),
 *     titan (railgun, plasma, torpedo), juggernaut (redLaser, nuke, torpedo, seeker, decoy),
 *     behemoth (torch, nuke, torpedo, seeker, decoy)
 *
 * S4 weapon coverage required:
 * - Primaries: railgun
 * - Secondaries: nuke
 */

import type { Contract } from '../types';
import { SECTOR_4_EASY } from './easy';
import { SECTOR_4_ESCORT } from './escort';
import { SECTOR_4_HARD } from './hard';
import { SECTOR_4_MEDIUM } from './medium';
import { SECTOR_4_STATION_DEFENSE } from './station-defense';

export const SECTOR_4_MISSIONS: Contract[] = [
  ...SECTOR_4_EASY,
  ...SECTOR_4_ESCORT,
  ...SECTOR_4_STATION_DEFENSE,
  ...SECTOR_4_MEDIUM,
  ...SECTOR_4_HARD,
];
