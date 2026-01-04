/**
 * Combat Simulation Scenarios
 *
 * Defines team compositions for balance testing. Each scenario has:
 * - teamA: Array of ships (archetype + AI profile)
 * - teamB: Array of ships (archetype + AI profile)
 * - startDistance: Optional spawn distance (default 500m)
 *
 * Scenario categories:
 * - 1v1 mirrors: Test fairness (should be ~50/50)
 * - Profile ladder: Test skill progression
 * - Long range: Test missile behavior at distance
 * - Asymmetric: Test different ship matchups
 * - Wingmate: Test multi-ship battles
 */

export const SCENARIOS = {
  // === 1v1 MIRROR MATCHES ===
  // These test basic fairness - identical ships should win ~50/50

  '1v1-interceptor-regular': {
    name: '1v1 Interceptor (Regular vs Regular)',
    teamA: [{ archetype: 'interceptor', profile: 'regular' }],
    teamB: [{ archetype: 'interceptor', profile: 'regular' }],
  },
  '1v1-scout-regular': {
    name: '1v1 Scout (Regular vs Regular)',
    teamA: [{ archetype: 'scout', profile: 'regular' }],
    teamB: [{ archetype: 'scout', profile: 'regular' }],
  },
  '1v1-striker-regular': {
    name: '1v1 Striker (Regular vs Regular)',
    teamA: [{ archetype: 'striker', profile: 'regular' }],
    teamB: [{ archetype: 'striker', profile: 'regular' }],
  },
  '1v1-defender-regular': {
    name: '1v1 Defender (Regular vs Regular)',
    teamA: [{ archetype: 'defender', profile: 'regular' }],
    teamB: [{ archetype: 'defender', profile: 'regular' }],
  },
  '1v1-bomber-regular': {
    name: '1v1 Bomber (Regular vs Regular)',
    teamA: [{ archetype: 'bomber', profile: 'regular' }],
    teamB: [{ archetype: 'bomber', profile: 'regular' }],
  },
  '1v1-raider-regular': {
    name: '1v1 Raider (Regular vs Regular)',
    teamA: [{ archetype: 'raider', profile: 'regular' }],
    teamB: [{ archetype: 'raider', profile: 'regular' }],
  },
  '1v1-sentinel-regular': {
    name: '1v1 Sentinel (Regular vs Regular)',
    teamA: [{ archetype: 'sentinel', profile: 'regular' }],
    teamB: [{ archetype: 'sentinel', profile: 'regular' }],
  },

  // === PROFILE LADDER ===
  // Test AI skill progression: rookie < regular < veteran < ace

  'profile-rookie-vs-regular': {
    name: 'Profile: Rookie vs Regular (Interceptor)',
    teamA: [{ archetype: 'interceptor', profile: 'rookie' }],
    teamB: [{ archetype: 'interceptor', profile: 'regular' }],
  },
  'profile-regular-vs-veteran': {
    name: 'Profile: Regular vs Veteran (Interceptor)',
    teamA: [{ archetype: 'interceptor', profile: 'regular' }],
    teamB: [{ archetype: 'interceptor', profile: 'veteran' }],
  },
  'profile-veteran-vs-ace': {
    name: 'Profile: Veteran vs Ace (Interceptor)',
    teamA: [{ archetype: 'interceptor', profile: 'veteran' }],
    teamB: [{ archetype: 'interceptor', profile: 'ace' }],
  },
  'profile-rookie-vs-ace': {
    name: 'Profile: Rookie vs Ace (Interceptor)',
    teamA: [{ archetype: 'interceptor', profile: 'rookie' }],
    teamB: [{ archetype: 'interceptor', profile: 'ace' }],
  },

  // === LONG RANGE ===
  // Start at 1500m to test missile lock and engagement at distance

  '1v1-interceptor-longrange': {
    name: '1v1 Interceptor Long Range (1500m start)',
    teamA: [{ archetype: 'interceptor', profile: 'regular' }],
    teamB: [{ archetype: 'interceptor', profile: 'regular' }],
    startDistance: 1500,
  },
  '1v1-bomber-longrange': {
    name: '1v1 Bomber Long Range (1500m start)',
    teamA: [{ archetype: 'bomber', profile: 'regular' }],
    teamB: [{ archetype: 'bomber', profile: 'regular' }],
    startDistance: 1500,
  },

  // === ASYMMETRIC MATCHUPS ===
  // Test different ship archetypes against each other

  'asymmetry-scout-vs-striker': {
    name: 'Asymmetry: Scout vs Striker',
    teamA: [{ archetype: 'scout', profile: 'regular' }],
    teamB: [{ archetype: 'striker', profile: 'regular' }],
  },
  'asymmetry-raider-vs-defender': {
    name: 'Asymmetry: Raider vs Defender',
    teamA: [{ archetype: 'raider', profile: 'regular' }],
    teamB: [{ archetype: 'defender', profile: 'regular' }],
  },
  'asymmetry-bomber-vs-interceptor': {
    name: 'Asymmetry: Bomber vs Interceptor',
    teamA: [{ archetype: 'bomber', profile: 'regular' }],
    teamB: [{ archetype: 'interceptor', profile: 'regular' }],
  },

  // === WINGMATE SCENARIOS ===
  // Multi-ship battles to test coordination and numbers advantage

  'wingmate-2v3': {
    name: 'Wingmate: 2 Regular vs 3 Rookie',
    teamA: [
      { archetype: 'interceptor', profile: 'regular' },
      { archetype: 'interceptor', profile: 'regular' },
    ],
    teamB: [
      { archetype: 'interceptor', profile: 'rookie' },
      { archetype: 'interceptor', profile: 'rookie' },
      { archetype: 'interceptor', profile: 'rookie' },
    ],
  },
  'wingmate-3v4-mixed': {
    name: 'Wingmate: 3 (Vet+2Reg) vs 4 Regular',
    teamA: [
      { archetype: 'interceptor', profile: 'veteran' },
      { archetype: 'interceptor', profile: 'regular' },
      { archetype: 'interceptor', profile: 'regular' },
    ],
    teamB: [
      { archetype: 'interceptor', profile: 'regular' },
      { archetype: 'interceptor', profile: 'regular' },
      { archetype: 'interceptor', profile: 'regular' },
      { archetype: 'interceptor', profile: 'regular' },
    ],
  },
  'wingmate-2v2-heavy': {
    name: 'Wingmate: 2 Strikers vs 2 Defenders',
    teamA: [
      { archetype: 'striker', profile: 'regular' },
      { archetype: 'striker', profile: 'regular' },
    ],
    teamB: [
      { archetype: 'defender', profile: 'regular' },
      { archetype: 'defender', profile: 'regular' },
    ],
  },
};
