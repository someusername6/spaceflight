/**
 * Recruit Management - generate and hire pilots.
 */

import type { CampaignState, HireablePilot, Pilot, SkillLevel } from './types';

/** Pilot names pool for random generation */
const PILOT_NAMES = [
  'Vex',
  'Nova',
  'Rex',
  'Kai',
  'Zara',
  'Hawk',
  'Ash',
  'Storm',
  'Blaze',
  'Frost',
  'Raven',
  'Phoenix',
  'Viper',
  'Ghost',
  'Shadow',
  'Bolt',
  'Flint',
  'Steel',
  'Cinder',
  'Drake',
  'Sage',
  'Echo',
  'Jinx',
  'Lynx',
  'Onyx',
  'Pyro',
  'Quill',
  'Razor',
  'Siren',
  'Talon',
];

/** Skill levels with their weights for random selection */
const SKILL_WEIGHTS: { skill: SkillLevel; weight: number; price: number }[] = [
  { skill: 'rookie', weight: 35, price: 75 },
  { skill: 'regular', weight: 35, price: 200 },
  { skill: 'veteran', weight: 20, price: 400 },
  { skill: 'ace', weight: 8, price: 700 },
  { skill: 'elite', weight: 2, price: 1200 },
];

/** Counter for generating unique IDs (not gameplay-sensitive) */
let idCounter = 0;

/** Generate a unique ID using counter (deterministic, no Math.random) */
function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

/** Pick a random skill level based on weights */
function pickRandomSkill(rng: () => number): {
  skill: SkillLevel;
  price: number;
} {
  const totalWeight = SKILL_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of SKILL_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) {
      return { skill: entry.skill, price: entry.price };
    }
  }

  // Fallback to regular
  return { skill: 'regular', price: 200 };
}

/** Pick a random name not already in use */
function pickRandomName(rng: () => number, usedNames: Set<string>): string {
  const availableNames = PILOT_NAMES.filter((n) => !usedNames.has(n));

  if (availableNames.length === 0) {
    // All names used, generate a numbered name
    const index = Math.floor(rng() * PILOT_NAMES.length);
    const baseName = PILOT_NAMES[index];
    let suffix = 2;
    while (usedNames.has(`${baseName} ${suffix}`)) {
      suffix++;
    }
    return `${baseName} ${suffix}`;
  }

  const index = Math.floor(rng() * availableNames.length);
  // Safe: we checked availableNames.length > 0 above
  return availableNames[index] as string;
}

/** Generate a pool of recruits */
export function generateRecruits(
  count: number,
  existingPilots: Pilot[],
  existingRecruits: HireablePilot[],
  rng: () => number,
): HireablePilot[] {
  const usedNames = new Set<string>();

  // Add existing pilot names to avoid duplicates
  for (const pilot of existingPilots) {
    usedNames.add(pilot.name);
  }
  for (const recruit of existingRecruits) {
    usedNames.add(recruit.name);
  }

  const recruits: HireablePilot[] = [];

  for (let i = 0; i < count; i++) {
    const name = pickRandomName(rng, usedNames);
    usedNames.add(name);

    const { skill, price } = pickRandomSkill(rng);

    recruits.push({
      id: generateId('recruit'),
      name,
      skill,
      price,
    });
  }

  return recruits;
}

/** Generate initial recruits for a new campaign */
export function generateInitialRecruits(
  existingPilots: Pilot[],
  rng: () => number,
): HireablePilot[] {
  return generateRecruits(4, existingPilots, [], rng);
}

/** Refresh the recruit pool (called after each mission) */
export function refreshRecruits(
  state: CampaignState,
  rng: () => number,
): CampaignState {
  // Generate 3-5 new recruits
  const count = 3 + Math.floor(rng() * 3); // 3, 4, or 5
  const newRecruits = generateRecruits(count, state.pilots, [], rng);

  return {
    ...state,
    availableRecruits: newRecruits,
  };
}

/** Hire a recruit - adds to roster, removes from available */
export function hirePilot(
  state: CampaignState,
  recruitId: string,
): CampaignState {
  const recruit = state.availableRecruits.find((r) => r.id === recruitId);

  if (!recruit) {
    console.warn(`Recruit ${recruitId} not found`);
    return state;
  }

  if (state.credits < recruit.price) {
    console.warn(`Cannot afford recruit ${recruit.name} (${recruit.price} cr)`);
    return state;
  }

  // Create new pilot from recruit
  const newPilot: Pilot = {
    id: generateId('pilot'),
    name: recruit.name,
    skill: recruit.skill,
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
  };

  return {
    ...state,
    credits: state.credits - recruit.price,
    pilots: [...state.pilots, newPilot],
    availableRecruits: state.availableRecruits.filter(
      (r) => r.id !== recruitId,
    ),
  };
}

/** Get price for a skill level */
export function getSkillPrice(skill: SkillLevel): number {
  const entry = SKILL_WEIGHTS.find((s) => s.skill === skill);
  return entry?.price ?? 200;
}
