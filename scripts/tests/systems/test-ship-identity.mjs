/**
 * Ship Identity component tests
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

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

describe('Ship Identity', () => {
  describe('ShipIdentity Component', () => {
    it('ShipIdentity component creates correctly', () => {
      const identity = createShipIdentity('interceptor', 'Alpha 1');
      assert.strictEqual(
        identity.type,
        'shipIdentity',
        'Should be shipIdentity type',
      );
      assert.strictEqual(
        identity.archetype,
        'interceptor',
        'Archetype should be interceptor',
      );
      assert.strictEqual(
        identity.callsign,
        'Alpha 1',
        'Callsign should be Alpha 1',
      );
    });
  });

  describe('Callsign Generation', () => {
    it('Callsign generation produces sequential callsigns', () => {
      resetCallsignCounters(world);
      const call1 = generateCallsign(world, 'Alpha');
      const call2 = generateCallsign(world, 'Alpha');
      const call3 = generateCallsign(world, 'Alpha');
      assert.strictEqual(call1, 'Alpha 1', 'First Alpha should be Alpha 1');
      assert.strictEqual(call2, 'Alpha 2', 'Second Alpha should be Alpha 2');
      assert.strictEqual(call3, 'Alpha 3', 'Third Alpha should be Alpha 3');
    });

    it('Different callsign prefixes have independent counters', () => {
      resetCallsignCounters(world);
      const alpha1 = generateCallsign(world, 'Alpha');
      const bandit1 = generateCallsign(world, 'Bandit');
      const alpha2 = generateCallsign(world, 'Alpha');
      const bandit2 = generateCallsign(world, 'Bandit');
      assert.strictEqual(alpha1, 'Alpha 1', 'First Alpha should be Alpha 1');
      assert.strictEqual(alpha2, 'Alpha 2', 'Second Alpha should be Alpha 2');
      assert.strictEqual(
        bandit1,
        'Bandit 1',
        'First Bandit should be Bandit 1',
      );
      assert.strictEqual(
        bandit2,
        'Bandit 2',
        'Second Bandit should be Bandit 2',
      );
    });

    it('Reset callsign counters clears all counters', () => {
      resetCallsignCounters(world);
      generateCallsign(world, 'Alpha');
      generateCallsign(world, 'Bandit');
      resetCallsignCounters(world);
      const alpha = generateCallsign(world, 'Alpha');
      const bandit = generateCallsign(world, 'Bandit');
      assert.strictEqual(
        alpha,
        'Alpha 1',
        'After reset, Alpha should restart at 1',
      );
      assert.strictEqual(
        bandit,
        'Bandit 1',
        'After reset, Bandit should restart at 1',
      );
    });
  });

  describe('Enemy Callsign Prefixes', () => {
    it('Enemy callsign prefixes array has at least 10 entries', () => {
      assert.ok(Array.isArray(ENEMY_CALLSIGN_PREFIXES), 'Should be an array');
      assert.ok(
        ENEMY_CALLSIGN_PREFIXES.length >= 10,
        'Should have at least 10 entries',
      );
    });

    it('getEnemyCallsignPrefix returns prefixes matching array order', () => {
      const wave0 = getEnemyCallsignPrefix(0);
      const wave1 = getEnemyCallsignPrefix(1);
      const wave2 = getEnemyCallsignPrefix(2);
      assert.strictEqual(
        wave0,
        ENEMY_CALLSIGN_PREFIXES[0],
        'Wave 0 should match first prefix',
      );
      assert.strictEqual(
        wave1,
        ENEMY_CALLSIGN_PREFIXES[1],
        'Wave 1 should match second prefix',
      );
      assert.strictEqual(
        wave2,
        ENEMY_CALLSIGN_PREFIXES[2],
        'Wave 2 should match third prefix',
      );
    });

    it('getEnemyCallsignPrefix cycles after exhausting list', () => {
      const len = ENEMY_CALLSIGN_PREFIXES.length;
      const first = getEnemyCallsignPrefix(0);
      const cycled = getEnemyCallsignPrefix(len);
      assert.strictEqual(
        first,
        cycled,
        `Wave ${len} should cycle back to first prefix`,
      );
    });

    it('Enemy callsigns generate correctly', () => {
      resetCallsignCounters(world);
      const prefix0 = ENEMY_CALLSIGN_PREFIXES[0];
      const prefix1 = ENEMY_CALLSIGN_PREFIXES[1];
      const call1 = generateCallsign(world, prefix0);
      const call2 = generateCallsign(world, prefix0);
      const call3 = generateCallsign(world, prefix1);
      assert.strictEqual(
        call1,
        `${prefix0} 1`,
        `First ${prefix0} should be ${prefix0} 1`,
      );
      assert.strictEqual(
        call2,
        `${prefix0} 2`,
        `Second ${prefix0} should be ${prefix0} 2`,
      );
      assert.strictEqual(
        call3,
        `${prefix1} 1`,
        `First ${prefix1} should be ${prefix1} 1`,
      );
    });
  });
});
