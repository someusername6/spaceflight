/**
 * Sector 3: Warzone Missions
 * Enemy skill: Regular → Veteran → Ace
 * Rewards: 4,200-6,700 cr
 *
 * Valid archetypes (S1-S3 weapons):
 * S1-S2: All previous archetypes
 * S3: moth (lightning, swarm), fireant (torch, rocket),
 *     beetle (plasma, torpedo, seeker, decoy), rocketeer (gyrojet, seeker, decoy)
 *
 * S3 weapon coverage required:
 * - Primaries: lightning, torch, gyrojet
 * - Secondaries: torpedo
 */

import type { Contract } from '../types';
import { SECTOR_3_EASY } from './easy';
import { SECTOR_3_HARD } from './hard';
import { SECTOR_3_MEDIUM } from './medium';

export const SECTOR_3_MISSIONS: Contract[] = [
  ...SECTOR_3_EASY,
  ...SECTOR_3_MEDIUM,
  ...SECTOR_3_HARD,
];
