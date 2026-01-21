/**
 * Tests for AI strafing behavior based on missile range.
 *
 * Short-range missiles (< 1000m) should rush in at full speed.
 * Long-range missiles (>= 1000m) should use controlled strafing approach.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getStationApproachSpeed,
  STATION_SAFE_DISTANCE,
  STRAFING_MIN_RANGE,
  shouldReposition,
} from '../../../src/systems/ai/ai-reposition.ts';

describe('AI Strafing Range', () => {
  describe('STRAFING_MIN_RANGE threshold', () => {
    it('is 1000m', () => {
      assert.strictEqual(STRAFING_MIN_RANGE, 1000);
    });
  });

  describe('getStationApproachSpeed', () => {
    const maxSpeed = 100;
    const lockSpeed = 0.5; // 2 seconds to lock
    const lockProgress = 0;
    const distance = 1000;

    it('returns maxSpeed for short-range missiles (< 1000m)', () => {
      const shortRanges = [600, 800, 999];
      for (const range of shortRanges) {
        const speed = getStationApproachSpeed(
          distance,
          lockProgress,
          lockSpeed,
          maxSpeed,
          range,
        );
        assert.strictEqual(
          speed,
          maxSpeed,
          `range ${range} should return maxSpeed`,
        );
      }
    });

    it('returns controlled speed for long-range missiles (>= 1000m)', () => {
      // Use a closer distance where controlled speed < maxSpeed
      // At distance 600, distanceToSafe = 100, lockTime = 2s, speed = 50
      const closeDistance = 600;
      const speed = getStationApproachSpeed(
        closeDistance,
        lockProgress,
        lockSpeed,
        maxSpeed,
        2000, // Long-range missile
      );
      assert.ok(
        speed < maxSpeed,
        'long-range missile should use controlled speed when close',
      );
      assert.strictEqual(speed, 50); // (600 - 500) / 2 = 50
    });

    it('returns maxSpeed when lock is complete', () => {
      const speed = getStationApproachSpeed(
        distance,
        1.0, // Lock complete
        lockSpeed,
        maxSpeed,
        2000,
      );
      assert.strictEqual(speed, maxSpeed);
    });

    it('returns 0 when already inside safe distance', () => {
      const speed = getStationApproachSpeed(
        STATION_SAFE_DISTANCE - 100, // Inside safe distance
        lockProgress,
        lockSpeed,
        maxSpeed,
        2000,
      );
      assert.strictEqual(speed, 0);
    });
  });

  describe('shouldReposition', () => {
    const mockAI = {
      profile: {
        engageRange: 500,
        burstDuration: 3,
        maxRepositionTime: 5,
      },
      stateTimer: 0,
    };

    it('returns false for short-range missiles attacking stations', () => {
      const shortRanges = [0, 600, 800, 999];
      for (const range of shortRanges) {
        const result = shouldReposition(
          mockAI,
          STATION_SAFE_DISTANCE - 100, // Inside safe distance
          true, // targetIsStation
          0, // lockProgress
          range,
        );
        assert.strictEqual(
          result,
          false,
          `range ${range} should not trigger reposition`,
        );
      }
    });

    it('returns true for long-range missiles when inside safe distance and not locking', () => {
      const result = shouldReposition(
        mockAI,
        STATION_SAFE_DISTANCE - 100, // Inside safe distance
        true, // targetIsStation
        0, // lockProgress = 0 (not locking)
        2000, // Long-range
      );
      assert.strictEqual(result, true);
    });

    it('returns false for long-range missiles while lock is building', () => {
      const result = shouldReposition(
        mockAI,
        STATION_SAFE_DISTANCE - 100, // Inside safe distance
        true, // targetIsStation
        0.5, // lockProgress > 0 (locking)
        2000, // Long-range
      );
      assert.strictEqual(result, false);
    });

    it('defaults missileRange to 0 (short-range behavior)', () => {
      // Calling without missileRange parameter should behave like short-range
      const result = shouldReposition(
        mockAI,
        STATION_SAFE_DISTANCE - 100,
        true,
        0,
        // missileRange omitted - should default to 0
      );
      assert.strictEqual(result, false);
    });
  });
});
