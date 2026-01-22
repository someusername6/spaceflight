/**
 * Retirement System - Defines ending tiers based on accumulated credits.
 *
 * Players can retire in sector 5 to end their campaign with a ranked ending.
 * Higher credit totals unlock better tier endings for the leaderboard.
 */

/** Retirement tier definition */
export interface RetirementTier {
  /** Tier identifier */
  id: string;
  /** Display name */
  name: string;
  /** Minimum credits required for this tier */
  minCredits: number;
  /** Short flavor text for the ending */
  description: string;
  /** Longer narrative text shown on retirement */
  narrative: string;
}

/** All retirement tiers, ordered from lowest to highest */
export const RETIREMENT_TIERS: RetirementTier[] = [
  {
    id: 'survival',
    name: 'Survival',
    minCredits: 0,
    description: 'Barely escaped with your lives',
    narrative:
      'Your squadron limps away from the final sector with little to show for it. ' +
      'But you survived, and in this business, that counts for something.',
  },
  {
    id: 'modest',
    name: 'Modest',
    minCredits: 5000,
    description: 'A quiet life on the frontier',
    narrative:
      'With enough credits to disappear, your squadron settles on a quiet frontier moon. ' +
      "It's not glamorous, but the work is done. Time to rest.",
  },
  {
    id: 'comfortable',
    name: 'Comfortable',
    minCredits: 10000,
    description: 'Respected in mercenary circles',
    narrative:
      'Your squadron retires with a solid reputation and healthy accounts. ' +
      'Other pilots speak your callsigns with respect. A job well done.',
  },
  {
    id: 'wealthy',
    name: 'Wealthy',
    minCredits: 15000,
    description: 'Your legend spreads across systems',
    narrative:
      'Credits overflow your accounts. Your squadron becomes the stuff of legend, ' +
      'stories told in station bars across the sector. You earned every bit of it.',
  },
  {
    id: 'legend',
    name: 'Legend',
    minCredits: 25000,
    description: 'The greatest squadron to ever fly',
    narrative:
      'History will remember your squadron as the finest to ever take flight. ' +
      'Wealthy beyond measure, feared by enemies, revered by allies. Perfection.',
  },
];

/**
 * Get the retirement tier for a given credit amount.
 */
export function getRetirementTier(credits: number): RetirementTier {
  // Find the highest tier the player qualifies for
  for (let i = RETIREMENT_TIERS.length - 1; i >= 0; i--) {
    const tier = RETIREMENT_TIERS[i];
    if (tier && credits >= tier.minCredits) {
      return tier;
    }
  }
  // Fallback (should never happen since tier 0 has minCredits: 0)
  return RETIREMENT_TIERS[0] as RetirementTier;
}

/**
 * Get the next tier above the current one (if any).
 * Returns undefined if already at the highest tier.
 */
export function getNextTier(credits: number): RetirementTier | undefined {
  const currentTier = getRetirementTier(credits);
  const currentIndex = RETIREMENT_TIERS.indexOf(currentTier);
  if (currentIndex < RETIREMENT_TIERS.length - 1) {
    return RETIREMENT_TIERS[currentIndex + 1];
  }
  return undefined;
}

/**
 * Get credits needed to reach the next tier.
 * Returns 0 if already at the highest tier.
 */
export function getCreditsToNextTier(credits: number): number {
  const nextTier = getNextTier(credits);
  if (!nextTier) return 0;
  return nextTier.minCredits - credits;
}

/**
 * Get the tier index (0-based) for a given credit amount.
 * Useful for visual progress bars.
 */
export function getTierIndex(credits: number): number {
  const tier = getRetirementTier(credits);
  return RETIREMENT_TIERS.indexOf(tier);
}

/**
 * Get progress within the current tier as a percentage (0-100).
 * Returns 100 if at the highest tier.
 */
export function getTierProgress(credits: number): number {
  const currentTier = getRetirementTier(credits);
  const nextTier = getNextTier(credits);

  if (!nextTier) return 100; // At max tier

  const tierRange = nextTier.minCredits - currentTier.minCredits;
  const creditsIntoTier = credits - currentTier.minCredits;
  return Math.floor((creditsIntoTier / tierRange) * 100);
}
