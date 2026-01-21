/**
 * Sector Loadouts for Balance Testing
 *
 * Defines test loadouts for each sector, used by mission simulation tests.
 */

// ============================================================================
// Sector Loadouts
// ============================================================================

/**
 * Sector-specific test loadouts for balance simulation.
 * Player skill progresses: Regular -> Veteran -> Veteran -> Ace -> Ace
 * Wingmen and ships improve based on expected progression.
 */
export const SECTOR_LOADOUTS = {
  1: [
    // Sector 1: New player, all regular skill, basic fighters
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
  ],
  2: [
    // Sector 2: Improving player, mixed ships
    { archetype: 'fighter', skill: 'veteran' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'interceptor', skill: 'regular' },
    { archetype: 'defender', skill: 'regular' },
  ],
  3: [
    // Sector 3: Solid player, better ships and wingmen
    { archetype: 'interceptor', skill: 'veteran' },
    { archetype: 'interceptor', skill: 'regular' },
    { archetype: 'defender', skill: 'regular' },
    { archetype: 'defender', skill: 'regular' },
  ],
  4: [
    // Sector 4: Skilled player, advanced ships
    { archetype: 'striker', skill: 'ace' },
    { archetype: 'striker', skill: 'veteran' },
    { archetype: 'defender', skill: 'veteran' },
    { archetype: 'defender', skill: 'veteran' },
    { archetype: 'sentinel', skill: 'regular' },
  ],
  5: [
    // Sector 5: Master player, top-tier loadout (all ace)
    { archetype: 'striker', skill: 'ace' },
    { archetype: 'striker', skill: 'ace' },
    { archetype: 'defender', skill: 'ace' },
    { archetype: 'defender', skill: 'ace' },
    { archetype: 'sentinel', skill: 'ace' },
    { archetype: 'sentinel', skill: 'ace' },
  ],
};

/**
 * Sector-specific loadouts optimized for attack-station missions.
 * Uses assault archetypes with flak/autocannon + rockets/starburst.
 * Based on empirical DPS testing from test-station-dps-loadouts.mjs.
 */
export const SECTOR_ASSAULT_LOADOUTS = {
  1: [
    // Sector 1: Assault fighters with autocannon + rockets (~60 DPS each)
    { archetype: 'assaultFighter', skill: 'regular' },
    { archetype: 'assaultFighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
  ],
  2: [
    // Sector 2: Assault interceptors with flak + starburst (~100 DPS each)
    { archetype: 'assaultInterceptor', skill: 'veteran' },
    { archetype: 'assaultInterceptor', skill: 'regular' },
    { archetype: 'assaultFighter', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
  ],
  3: [
    // Sector 3: Assault sentinel + bomber (~140 DPS)
    { archetype: 'assaultSentinel', skill: 'veteran' },
    { archetype: 'assaultBomber', skill: 'regular' },
    { archetype: 'assaultInterceptor', skill: 'regular' },
    { archetype: 'fighter', skill: 'regular' },
  ],
  4: [
    // Sector 4: Assault strikers with flak (~230 DPS each)
    { archetype: 'assaultStriker', skill: 'ace' },
    { archetype: 'assaultStriker', skill: 'veteran' },
    { archetype: 'assaultBomber', skill: 'veteran' },
    { archetype: 'assaultInterceptor', skill: 'veteran' },
    { archetype: 'fighter', skill: 'regular' },
  ],
  5: [
    // Sector 5: Max assault DPS loadout
    { archetype: 'assaultStriker', skill: 'ace' },
    { archetype: 'assaultStriker', skill: 'ace' },
    { archetype: 'assaultBomber', skill: 'ace' },
    { archetype: 'assaultBomber', skill: 'ace' },
    { archetype: 'assaultInterceptor', skill: 'ace' },
    { archetype: 'assaultInterceptor', skill: 'ace' },
  ],
};

/**
 * Get the loadout for a sector.
 */
export function getLoadout(sector) {
  return SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
}

/**
 * Get a human-readable description of a loadout.
 */
export function getLoadoutDescription(sector) {
  const loadout = getLoadout(sector);
  return loadout.map((s) => `${s.skill} ${s.archetype}`).join(', ');
}

/**
 * Get the assault loadout for a sector (for attack-station missions).
 */
export function getAssaultLoadout(sector) {
  return SECTOR_ASSAULT_LOADOUTS[sector] || SECTOR_ASSAULT_LOADOUTS[1];
}

/**
 * Get a human-readable description of an assault loadout.
 */
export function getAssaultLoadoutDescription(sector) {
  const loadout = getAssaultLoadout(sector);
  return loadout.map((s) => `${s.skill} ${s.archetype}`).join(', ');
}
