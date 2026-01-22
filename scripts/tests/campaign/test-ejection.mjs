/**
 * Tests for the ejection system - probability-based retirement.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getRetirementChance,
  rollForRetirement,
} from '../../../src/campaign/ejection.ts';

describe('Ejection System', () => {
  describe('getRetirementChance', () => {
    it('returns 0% for first ejection (count=0)', () => {
      assert.strictEqual(getRetirementChance(0), 0);
    });

    it('returns 15% for second ejection (count=1)', () => {
      assert.strictEqual(getRetirementChance(1), 0.15);
    });

    it('returns 30% for third ejection (count=2)', () => {
      assert.strictEqual(getRetirementChance(2), 0.3);
    });

    it('returns 45% for fourth ejection (count=3)', () => {
      // Use approximate comparison due to floating point: 0.15 * 3 = 0.44999...
      const chance = getRetirementChance(3);
      assert.ok(
        Math.abs(chance - 0.45) < 0.0001,
        `Expected ~0.45, got ${chance}`,
      );
    });

    it('caps at 50% for fifth+ ejection (count>=4)', () => {
      assert.strictEqual(getRetirementChance(4), 0.5);
      assert.strictEqual(getRetirementChance(5), 0.5);
      assert.strictEqual(getRetirementChance(10), 0.5);
      assert.strictEqual(getRetirementChance(100), 0.5);
    });

    it('handles negative counts as 0%', () => {
      assert.strictEqual(getRetirementChance(-1), 0);
      assert.strictEqual(getRetirementChance(-100), 0);
    });
  });

  describe('rollForRetirement', () => {
    it('never retires on first ejection (count=0)', () => {
      // Test with many different seeds/pilots - should always be false
      for (let seed = 0; seed < 100; seed++) {
        const result = rollForRetirement(seed, 0, 'pilot-1', 0);
        assert.strictEqual(result, false, `Seed ${seed} should not retire`);
      }
    });

    it('is deterministic - same inputs give same result', () => {
      const seed = 12345;
      const missionCount = 5;
      const pilotId = 'pilot-abc';
      const ejectionCount = 2;

      const result1 = rollForRetirement(
        seed,
        missionCount,
        pilotId,
        ejectionCount,
      );
      const result2 = rollForRetirement(
        seed,
        missionCount,
        pilotId,
        ejectionCount,
      );
      const result3 = rollForRetirement(
        seed,
        missionCount,
        pilotId,
        ejectionCount,
      );

      assert.strictEqual(result1, result2);
      assert.strictEqual(result2, result3);
    });

    it('different pilots in same mission get different results', () => {
      const seed = 99999;
      const missionCount = 10;
      const ejectionCount = 3; // 45% chance

      // With 45% chance and different pilot IDs, we should see variation
      // Run enough samples to statistically expect both outcomes
      const results = new Set();
      for (let i = 0; i < 50; i++) {
        const result = rollForRetirement(
          seed,
          missionCount,
          `pilot-${i}`,
          ejectionCount,
        );
        results.add(result);
        if (results.size === 2) break; // Found both outcomes
      }

      assert.strictEqual(
        results.size,
        2,
        'Expected both true and false outcomes for different pilots',
      );
    });

    it('different missions give different results for same pilot', () => {
      const seed = 77777;
      const pilotId = 'pilot-xyz';
      const ejectionCount = 2; // 30% chance

      // With 30% chance across different missions, we should see variation
      const results = new Set();
      for (let mission = 0; mission < 50; mission++) {
        const result = rollForRetirement(seed, mission, pilotId, ejectionCount);
        results.add(result);
        if (results.size === 2) break;
      }

      assert.strictEqual(
        results.size,
        2,
        'Expected both outcomes across different missions',
      );
    });

    it('retirement rate roughly matches expected probability', () => {
      // Run many trials and check that retirement rate is close to expected
      const ejectionCount = 2; // 30% expected
      const expectedRate = 0.3;
      const trials = 1000;
      let retirements = 0;

      for (let i = 0; i < trials; i++) {
        // Use different seeds and pilot IDs to get independent samples
        if (rollForRetirement(i, i % 100, `pilot-${i}`, ejectionCount)) {
          retirements++;
        }
      }

      const actualRate = retirements / trials;
      const tolerance = 0.05; // Allow 5% deviation

      assert.ok(
        Math.abs(actualRate - expectedRate) < tolerance,
        `Expected ~${expectedRate * 100}% retirement rate, got ${(actualRate * 100).toFixed(1)}%`,
      );
    });
  });
});
