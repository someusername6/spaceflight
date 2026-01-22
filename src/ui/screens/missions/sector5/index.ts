/**
 * Sector 5: Endless Mode Missions
 * Enemy skill: Veteran → Ace → Elite
 * Rewards: 8,350-13,100 cr
 *
 * Valid archetypes (all weapons):
 * S1-S4: All previous archetypes (phantom, dragonfly, firefly, behemoth, specter,
 *        titan, juggernaut, scorpion, etc.)
 * S5: wraith (nuclearLance, railgun, torpedo, seeker, decoy)
 *
 * S5 weapon coverage required:
 * - Primaries: nuclearLance (wraith)
 * - Elite heavies: titan (railgun), juggernaut (nuke), scorpion (railgun)
 */

import type { Contract } from '../types';
import { SECTOR_5_AMBUSH } from './ambush';
import { SECTOR_5_ATTACK_STATION } from './attack-station';
import { SECTOR_5_EASY } from './easy';
import { SECTOR_5_ESCORT } from './escort';
import { SECTOR_5_HARD } from './hard';
import { SECTOR_5_MEDIUM } from './medium';
import { SECTOR_5_STATION_DEFENSE } from './station-defense';

export const SECTOR_5_MISSIONS: Contract[] = [
  ...SECTOR_5_EASY,
  ...SECTOR_5_ESCORT,
  ...SECTOR_5_AMBUSH,
  ...SECTOR_5_STATION_DEFENSE,
  ...SECTOR_5_ATTACK_STATION,
  ...SECTOR_5_MEDIUM,
  ...SECTOR_5_HARD,
];
