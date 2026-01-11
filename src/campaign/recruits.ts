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

/** Fixed prices per skill level */
const SKILL_PRICES: Record<SkillLevel, number> = {
  green: 50, // Not typically hired but defined for completeness
  rookie: 75,
  regular: 200,
  veteran: 400,
  ace: 700,
  elite: 1200,
};

/**
 * Skill weights for sector 1 (early game - mostly rookies/regulars).
 * Average skill level: ~1.69
 */
const SECTOR_1_WEIGHTS: Record<SkillLevel, number> = {
  green: 0, // Not available as recruits
  rookie: 50,
  regular: 35,
  veteran: 12,
  ace: 2.5,
  elite: 0.5,
};

/**
 * Skill weights for sector 5 (late game - mostly veterans+).
 * Average skill level: ~3.35
 */
const SECTOR_5_WEIGHTS: Record<SkillLevel, number> = {
  green: 0, // Not available as recruits
  rookie: 5,
  regular: 15,
  veteran: 35,
  ace: 30,
  elite: 15,
};

/** Skills available for recruits (excludes green) */
const RECRUIT_SKILLS: SkillLevel[] = [
  'rookie',
  'regular',
  'veteran',
  'ace',
  'elite',
];

/** Get interpolated skill weights for a sector */
function getSkillWeights(sector: number): Map<SkillLevel, number> {
  // Clamp sector to valid range
  const s = Math.max(1, Math.min(5, sector));
  // Interpolation factor: 0 at sector 1, 1 at sector 5
  const t = (s - 1) / 4;

  const weights = new Map<SkillLevel, number>();
  for (const skill of RECRUIT_SKILLS) {
    const w1 = SECTOR_1_WEIGHTS[skill] ?? 0;
    const w5 = SECTOR_5_WEIGHTS[skill] ?? 0;
    weights.set(skill, w1 + (w5 - w1) * t);
  }

  return weights;
}

/** Counter for generating unique IDs (not gameplay-sensitive) */
let idCounter = 0;

/** Generate a unique ID using counter (deterministic, no Math.random) */
function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

/** Pick a random skill level based on sector-adjusted weights */
function pickRandomSkill(
  rng: () => number,
  sector: number,
): {
  skill: SkillLevel;
  price: number;
} {
  const weights = getSkillWeights(sector);

  let totalWeight = 0;
  for (const skill of RECRUIT_SKILLS) {
    totalWeight += weights.get(skill) ?? 0;
  }

  let roll = rng() * totalWeight;

  for (const skill of RECRUIT_SKILLS) {
    roll -= weights.get(skill) ?? 0;
    if (roll <= 0) {
      return { skill, price: SKILL_PRICES[skill] ?? 200 };
    }
  }

  // Fallback to regular
  return { skill: 'regular', price: SKILL_PRICES.regular ?? 200 };
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

/** Generate a pool of recruits with sector-adjusted skill distribution */
export function generateRecruits(
  count: number,
  existingPilots: Pilot[],
  existingRecruits: HireablePilot[],
  rng: () => number,
  sector: number,
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

    const { skill, price } = pickRandomSkill(rng, sector);

    recruits.push({
      id: generateId('recruit'),
      name,
      skill,
      price,
    });
  }

  return recruits;
}

/** Generate initial recruits for a new campaign (sector 1) */
export function generateInitialRecruits(
  existingPilots: Pilot[],
  rng: () => number,
): HireablePilot[] {
  return generateRecruits(4, existingPilots, [], rng, 1);
}

/** Refresh the recruit pool (called after each mission) */
export function refreshRecruits(
  state: CampaignState,
  rng: () => number,
): CampaignState {
  // Generate 3-5 new recruits with sector-appropriate skill distribution
  const count = 3 + Math.floor(rng() * 3); // 3, 4, or 5
  const newRecruits = generateRecruits(
    count,
    state.pilots,
    [],
    rng,
    state.currentSector,
  );

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
  return SKILL_PRICES[skill] ?? 200;
}
