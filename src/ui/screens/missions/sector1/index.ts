/**
 * Sector 1: Frontier Missions
 * Enemy skill: Green → Rookie → Regular
 * Rewards: 2,500-4,600 cr
 *
 * Valid archetypes (S1 weapons only + redLaser exception):
 * - wasp: autocannon, rocket (scout - fast, aggressive, DEADLY)
 * - hornet: plasma, seeker (scout - fast, aggressive, DEADLY)
 * - mantis: plasma, seeker, decoy (fighter - balanced)
 * - glowworm: blueLaser, seeker (patrol - kiting sniper)
 * - gnat: pulse, swarm (scout - missile spammer, weak)
 * - ember: redLaser, rocket (patrol - close-range laser)
 * - shocker: ion, seeker, decoy (fighter - shield disruptor)
 *
 * Balance notes (test loadout: 4x regular fighter):
 * - gnat is weakest - good filler, need 4+ per wave to be threat
 * - glowworm at green is very weak
 * - ember/shocker at regular skill is quite deadly
 * - wasp/hornet are extremely deadly - use sparingly at low skills
 * - Easy 80-90%: 3 enemies at rookie, or 2 mantis/ember
 * - Medium 70-80%: Mix of rookie and regular, light on mantis
 * - Hard 60-70%: Regular skill, include hornet/wasp at rookie
 */

import type { Contract } from '../types';
import { SECTOR_1_EASY } from './easy';
import { SECTOR_1_ESCORT } from './escort';
import { SECTOR_1_HARD } from './hard';
import { SECTOR_1_MEDIUM } from './medium';
import { SECTOR_1_STATION_DEFENSE } from './station-defense';

export const SECTOR_1_MISSIONS: Contract[] = [
  ...SECTOR_1_EASY,
  ...SECTOR_1_ESCORT,
  ...SECTOR_1_STATION_DEFENSE,
  ...SECTOR_1_MEDIUM,
  ...SECTOR_1_HARD,
];
