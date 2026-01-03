/**
 * Test Fixtures - Reusable test data derived from real game data.
 *
 * These fixtures ensure tests use consistent, real data rather than
 * hardcoded assumptions. When game data changes, tests automatically
 * reflect those changes.
 */

import { AI_PROFILES, type AIProfile } from './ai-profiles';

/**
 * AI Profile fixtures for testing.
 *
 * Using real profiles ensures tests match actual game behavior.
 * Prefer 'regular' profile for most tests (baseline AI).
 */
export const TEST_AI_PROFILES = {
  /** Standard AI for baseline tests */
  regular: AI_PROFILES.regular as AIProfile,
  /** Easy AI for testing low-skill behaviors */
  rookie: AI_PROFILES.rookie as AIProfile,
  /** Hard AI for testing high-skill behaviors */
  veteran: AI_PROFILES.veteran as AIProfile,
  /** Boss AI for testing elite behaviors */
  ace: AI_PROFILES.ace as AIProfile,
} as const;

/**
 * Default test profile - use 'regular' for most tests.
 * This provides consistent baseline behavior.
 */
export const DEFAULT_TEST_PROFILE: AIProfile = TEST_AI_PROFILES.regular;

/**
 * Get a test profile by name.
 * Falls back to 'regular' if name not found.
 */
export function getTestProfile(name: keyof typeof TEST_AI_PROFILES): AIProfile {
  return TEST_AI_PROFILES[name] ?? TEST_AI_PROFILES.regular;
}
