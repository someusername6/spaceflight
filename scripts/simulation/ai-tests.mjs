#!/usr/bin/env node

/**
 * AI Behavior Simulation Tests
 *
 * Tests the AI state machine, weapon firing, and constraints.
 *
 * Run: npm run sim:ai
 * Exit code: 0 if all tests pass, 1 if any fail
 */

import {
  runConstraintTests,
  runDeterminismTests,
  runMovementTests,
  runWeaponFiringTests,
} from './ai-combat-tests.mjs';
import { runStateTransitionTests } from './ai-state-tests.mjs';
import { getResults, resetCounters } from './ai-test-utils.mjs';

// ============================================================================
// Main
// ============================================================================

const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');

if (!quiet) {
  console.log('=== AI Behavior Simulation Tests ===');
}

resetCounters();

runStateTransitionTests();
runWeaponFiringTests();
runConstraintTests();
runMovementTests();
runDeterminismTests();

const { passed, failed } = getResults();
const allPass = failed === 0;

if (!quiet) {
  console.log(`\n${allPass ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
}

process.exit(allPass ? 0 : 1);
