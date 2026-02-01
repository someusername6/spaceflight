/**
 * Tests for the ejection outcome system.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getEjectionProbabilities,
  rollEjectionOutcome,
} from '../../../src/campaign/ejection.ts';

describe('Ejection Outcomes', () => {
  describe('rollEjectionOutcome', () => {
    it('first ejection never results in KIA', () => {
      // Try many seeds - none should result in KIA for first ejection
      for (let i = 0; i < 100; i++) {
        const outcome = rollEjectionOutcome(12345 + i, 1, 'pilot-1', 0);
        assert.notStrictEqual(
          outcome.type,
          'kia',
          `Seed ${12345 + i} resulted in KIA on first ejection`,
        );
      }
    });

    it('injury duration is 1-3 missions', () => {
      const outcomes = [];
      // Try many seeds to get injury outcomes
      for (let i = 0; i < 1000; i++) {
        const outcome = rollEjectionOutcome(12345 + i, 1, 'pilot-1', 1);
        if (outcome.type === 'injured') {
          outcomes.push(outcome.missions);
        }
      }
      assert.ok(outcomes.length > 0, 'Should have some injuries');
      assert.ok(
        outcomes.every((m) => m >= 1 && m <= 3),
        `All injury durations should be 1-3, got: ${[...new Set(outcomes)].join(', ')}`,
      );
      // Check we get variety (1, 2, and 3)
      assert.ok(outcomes.includes(1), 'Should have some 1-mission injuries');
      assert.ok(outcomes.includes(2), 'Should have some 2-mission injuries');
      assert.ok(outcomes.includes(3), 'Should have some 3-mission injuries');
    });

    it('KIA becomes possible on 2nd ejection', () => {
      let kiaFound = false;
      for (let i = 0; i < 1000; i++) {
        const outcome = rollEjectionOutcome(12345 + i, 1, 'pilot-1', 1);
        if (outcome.type === 'kia') {
          kiaFound = true;
          break;
        }
      }
      assert.ok(kiaFound, 'KIA should be possible on 2nd ejection');
    });

    it('KIA probability increases with ejection count', () => {
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
      const trials = 10000;

      for (let ejCount = 1; ejCount <= 4; ejCount++) {
        for (let i = 0; i < trials; i++) {
          const outcome = rollEjectionOutcome(i, 1, 'pilot-1', ejCount);
          if (outcome.type === 'kia') counts[ejCount]++;
        }
      }

      // Higher ejection count should have more KIAs
      assert.ok(
        counts[2] < counts[3],
        `More KIAs at 3rd than 2nd ejection: ${counts[2]} vs ${counts[3]}`,
      );
      assert.ok(
        counts[3] < counts[4],
        `More KIAs at 4th than 3rd ejection: ${counts[3]} vs ${counts[4]}`,
      );
    });

    it('outcomes are deterministic for same seed', () => {
      const outcome1 = rollEjectionOutcome(12345, 5, 'pilot-1', 2);
      const outcome2 = rollEjectionOutcome(12345, 5, 'pilot-1', 2);
      assert.deepStrictEqual(outcome1, outcome2);
    });

    it('different pilots get different outcomes', () => {
      // With the same seed but different pilot IDs, outcomes should differ
      let differentFound = false;
      for (let seed = 0; seed < 100; seed++) {
        const outcome1 = rollEjectionOutcome(seed, 1, 'pilot-1', 2);
        const outcome2 = rollEjectionOutcome(seed, 1, 'pilot-2', 2);
        if (outcome1.type !== outcome2.type) {
          differentFound = true;
          break;
        }
      }
      assert.ok(
        differentFound,
        'Different pilots should get different outcomes',
      );
    });

    it('safe outcome has no missions property', () => {
      // Find a safe outcome
      let safeOutcome = null;
      for (let i = 0; i < 1000; i++) {
        const outcome = rollEjectionOutcome(i, 1, 'pilot-1', 0);
        if (outcome.type === 'safe') {
          safeOutcome = outcome;
          break;
        }
      }
      assert.ok(safeOutcome, 'Should find a safe outcome');
      assert.strictEqual(safeOutcome.type, 'safe');
      assert.strictEqual('missions' in safeOutcome, false);
    });
  });

  describe('getEjectionProbabilities', () => {
    it('returns correct probabilities for first ejection', () => {
      const probs = getEjectionProbabilities(0);
      assert.strictEqual(probs.safe, 85);
      assert.strictEqual(probs.injured, 15);
      assert.strictEqual(probs.kia, 0);
    });

    it('returns correct probabilities for second ejection', () => {
      const probs = getEjectionProbabilities(1);
      assert.strictEqual(probs.safe, 70);
      assert.strictEqual(probs.injured, 25);
      assert.strictEqual(probs.kia, 5);
    });

    it('probabilities sum to 100', () => {
      for (let i = 0; i < 10; i++) {
        const probs = getEjectionProbabilities(i);
        const total = probs.safe + probs.injured + probs.kia;
        assert.strictEqual(
          total,
          100,
          `Probabilities for ejection ${i} sum to ${total}`,
        );
      }
    });

    it('caps at 5th+ ejection probabilities', () => {
      const probs4 = getEjectionProbabilities(4);
      const probs5 = getEjectionProbabilities(5);
      const probs10 = getEjectionProbabilities(10);

      assert.deepStrictEqual(probs4, probs5);
      assert.deepStrictEqual(probs5, probs10);
    });
  });
});
