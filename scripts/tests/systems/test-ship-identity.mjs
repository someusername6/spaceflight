/**
 * Ship Identity component tests
 */

import {
  createShipIdentity,
  generateCallsign,
  resetCallsignCounters,
} from '../../../src/components/ship-identity.ts';

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
  resetCallsignCounters();
  const call1 = generateCallsign('Alpha');
  const call2 = generateCallsign('Alpha');
  const call3 = generateCallsign('Alpha');
  assert(call1 === 'Alpha 1', 'First Alpha should be Alpha 1');
  assert(call2 === 'Alpha 2', 'Second Alpha should be Alpha 2');
  assert(call3 === 'Alpha 3', 'Third Alpha should be Alpha 3');
});

// Test: Different callsign prefixes are independent
test('Different callsign prefixes have independent counters', () => {
  resetCallsignCounters();
  const alpha1 = generateCallsign('Alpha');
  const bandit1 = generateCallsign('Bandit');
  const alpha2 = generateCallsign('Alpha');
  const bandit2 = generateCallsign('Bandit');
  assert(alpha1 === 'Alpha 1', 'First Alpha should be Alpha 1');
  assert(alpha2 === 'Alpha 2', 'Second Alpha should be Alpha 2');
  assert(bandit1 === 'Bandit 1', 'First Bandit should be Bandit 1');
  assert(bandit2 === 'Bandit 2', 'Second Bandit should be Bandit 2');
});

// Test: Reset callsign counters
test('Reset callsign counters clears all counters', () => {
  resetCallsignCounters();
  generateCallsign('Alpha');
  generateCallsign('Bandit');
  resetCallsignCounters();
  const alpha = generateCallsign('Alpha');
  const bandit = generateCallsign('Bandit');
  assert(alpha === 'Alpha 1', 'After reset, Alpha should restart at 1');
  assert(bandit === 'Bandit 1', 'After reset, Bandit should restart at 1');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
