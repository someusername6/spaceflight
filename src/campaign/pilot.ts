/**
 * Pilot types - pilots that can be assigned to ships.
 */

import type { ProfileName } from '../data/ai-profiles';

/** Skill level for pilots */
export type SkillLevel = ProfileName;

/** A pilot that can be assigned to a ship */
export interface Pilot {
  id: string;
  name: string;
  // Ship-specific skills (missing = not trained)
  // Commander can fly any ship at 'ace' level (checked via commanderId)
  // Multiplayer player pilots have empty shipSkills (human-controlled)
  shipSkills: Partial<Record<string, SkillLevel>>;
  // Career statistics
  kills: number;
  assists: number;
  missionsFlown: number;
  missionsWon: number;
  damageDealt: number;
  damageReceived: number;
  // Ejection tracking (wingmen eject on ship destruction, commander death = game over)
  ejectionCount: number; // Number of times pilot has ejected (increases KIA chance)
  injuredMissionsLeft: number; // 0 = active, 1+ = recovering
  // Unspent XP pool (wingmen only - commander doesn't earn/spend XP)
  // XP is earned from missions and manually spent to unlock/upgrade ship skills
  xp: number;
}

/** Hireable pilot available in the recruit pool */
export interface HireablePilot {
  id: string;
  name: string;
  skill: SkillLevel; // Advertised skill level (becomes their starting ship skill)
  startingShip: string; // Ship class they're trained on
  bonusXP: number; // Unspent XP pool when hired
  price: number;
}
