/**
 * Sector 2: Contested Zone Missions
 * Enemy skill: Rookie → Regular → Veteran
 * Rewards: 3,200-5,800 cr
 *
 * Valid archetypes (S1-S2 weapons):
 * S1: wasp, hornet, mantis, glowworm, gnat, ember, shocker
 * S2: dragonfly (pulse, dart), stinger (ion, seeker, dart), firefly (redLaser, dart),
 *     viper (greenLaser, seeker, decoy), locust (pulse, cluster),
 *     phantom (greenLaser, dart, seeker, decoy), bruiser (slugCannon, dart),
 *     shredder (flak, seeker, decoy), sparkler (greenLaser, starburst)
 *
 * S2 weapon coverage required:
 * - Primaries: greenLaser, slugCannon, flak
 * - Secondaries: dart, cluster, starburst
 */

import type { Contract } from '../../../../campaign/types';
import { SECTOR_2_EASY } from './easy';
import { SECTOR_2_HARD } from './hard';
import { SECTOR_2_MEDIUM } from './medium';

export const SECTOR_2_MISSIONS: Contract[] = [
  ...SECTOR_2_EASY,
  ...SECTOR_2_MEDIUM,
  ...SECTOR_2_HARD,
];
