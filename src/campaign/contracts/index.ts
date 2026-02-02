/**
 * Mission Index - Aggregates all sector missions.
 */

import type { Contract } from '../types';
import { SECTOR_1_MISSIONS } from './sector1';
import { SECTOR_2_MISSIONS } from './sector2';
import { SECTOR_3_MISSIONS } from './sector3';
import { SECTOR_4_MISSIONS } from './sector4';
import { SECTOR_5_MISSIONS } from './sector5';

/** All missions across all sectors */
export const ALL_MISSIONS: Contract[] = [
  ...SECTOR_1_MISSIONS,
  ...SECTOR_2_MISSIONS,
  ...SECTOR_3_MISSIONS,
  ...SECTOR_4_MISSIONS,
  ...SECTOR_5_MISSIONS,
];

/** Re-export sector arrays for direct access */
export {
  SECTOR_1_MISSIONS,
  SECTOR_2_MISSIONS,
  SECTOR_3_MISSIONS,
  SECTOR_4_MISSIONS,
  SECTOR_5_MISSIONS,
};
