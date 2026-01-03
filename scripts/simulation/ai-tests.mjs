#!/usr/bin/env node
/**
 * AI Behavior Simulation Tests
 *
 * Tests the AI state machine, weapon firing, and constraints.
 *
 * Run: npm run sim:ai
 * Exit code: 0 if all tests pass, 1 if any fail
 */

import { resetCounters, getResults } from './ai-test-utils.mjs';
import { runStateTransitionTests } from './ai-state-tests.mjs';
import {
  runWeaponFiringTests,
  runConstraintTests,
  runMovementTests,
  runDeterminismTests,
} from './ai-combat-tests.mjs';

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
