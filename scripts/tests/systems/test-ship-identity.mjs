/**
 * Ship Identity component tests
 */

import {
  createShipIdentity,
  ENEMY_CALLSIGN_PREFIXES,
  generateCallsign,
  getEnemyCallsignPrefix,
  resetCallsignCounters,
} from '../../../src/components/ship-identity.ts';
import { createWorld } from '../../../src/core/ecs.ts';

// Create a world for tests that need systemState
const world = createWorld(12345);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// Test: ShipIdentity component
test('ShipIdentity component creates correctly', () => {
  const identity = createShipIdentity('interceptor', 'Alpha 1');
  assert(identity.type === 'shipIdentity', 'Should be shipIdentity type');
  assert(
    identity.archetype === 'interceptor',
    'Archetype should be interceptor',
  );
  assert(identity.callsign === 'Alpha 1', 'Callsign should be Alpha 1');
});

// Test: Callsign generation
test('Callsign generation produces sequential callsigns', () => {
  resetCallsignCounters(world);
  const call1 = generateCallsign(world, 'Alpha');
  const call2 = generateCallsign(world, 'Alpha');
  const call3 = generateCallsign(world, 'Alpha');
  assert(call1 === 'Alpha 1', 'First Alpha should be Alpha 1');
  assert(call2 === 'Alpha 2', 'Second Alpha should be Alpha 2');
  assert(call3 === 'Alpha 3', 'Third Alpha should be Alpha 3');
});

// Test: Different callsign prefixes are independent
test('Different callsign prefixes have independent counters', () => {
  resetCallsignCounters(world);
  const alpha1 = generateCallsign(world, 'Alpha');
  const bandit1 = generateCallsign(world, 'Bandit');
  const alpha2 = generateCallsign(world, 'Alpha');
  const bandit2 = generateCallsign(world, 'Bandit');
  assert(alpha1 === 'Alpha 1', 'First Alpha should be Alpha 1');
  assert(alpha2 === 'Alpha 2', 'Second Alpha should be Alpha 2');
  assert(bandit1 === 'Bandit 1', 'First Bandit should be Bandit 1');
  assert(bandit2 === 'Bandit 2', 'Second Bandit should be Bandit 2');
});

// Test: Reset callsign counters
test('Reset callsign counters clears all counters', () => {
  resetCallsignCounters(world);
  generateCallsign(world, 'Alpha');
  generateCallsign(world, 'Bandit');
  resetCallsignCounters(world);
  const alpha = generateCallsign(world, 'Alpha');
  const bandit = generateCallsign(world, 'Bandit');
  assert(alpha === 'Alpha 1', 'After reset, Alpha should restart at 1');
  assert(bandit === 'Bandit 1', 'After reset, Bandit should restart at 1');
});

// Test: Enemy callsign prefixes array exists and has entries
test('Enemy callsign prefixes array has at least 10 entries', () => {
  assert(Array.isArray(ENEMY_CALLSIGN_PREFIXES), 'Should be an array');
  assert(
    ENEMY_CALLSIGN_PREFIXES.length >= 10,
    'Should have at least 10 entries',
  );
});

// Test: Get enemy callsign prefix returns correct values
test('getEnemyCallsignPrefix returns correct prefixes', () => {
  const wave0 = getEnemyCallsignPrefix(0);
  const wave1 = getEnemyCallsignPrefix(1);
  const wave2 = getEnemyCallsignPrefix(2);
  assert(wave0 === 'Draco', 'Wave 0 should be Draco');
  assert(wave1 === 'Hydra', 'Wave 1 should be Hydra');
  assert(wave2 === 'Corvus', 'Wave 2 should be Corvus');
});

// Test: Callsign prefix cycles after exhausting list
test('getEnemyCallsignPrefix cycles after exhausting list', () => {
  const len = ENEMY_CALLSIGN_PREFIXES.length;
  const first = getEnemyCallsignPrefix(0);
  const cycled = getEnemyCallsignPrefix(len);
  assert(first === cycled, `Wave ${len} should cycle back to first prefix`);
});

// Test: Enemy callsigns generate correctly
test('Enemy callsigns generate correctly', () => {
  resetCallsignCounters(world);
  const draco1 = generateCallsign(world, 'Draco');
  const draco2 = generateCallsign(world, 'Draco');
  const hydra1 = generateCallsign(world, 'Hydra');
  assert(draco1 === 'Draco 1', 'First Draco should be Draco 1');
  assert(draco2 === 'Draco 2', 'Second Draco should be Draco 2');
  assert(hydra1 === 'Hydra 1', 'First Hydra should be Hydra 1');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
