/**
 * Replay Summary Tests
 *
 * Verifies toReplaySummary correctly converts metadata to summary format.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { toReplaySummary } from '../../../src/replay/types.ts';

describe('toReplaySummary', () => {
  it('converts metadata to summary with all fields', () => {
    const metadata = {
      id: 'test-123',
      missionId: 's1-mission',
      missionName: 'Test Mission',
      sector: 2,
      shipType: 'interceptor',
      wingmenShips: ['fighter', 'striker'],
      outcome: 'victory',
      durationTicks: 3600,
      recordedAt: 1700000000000,
      gameVersion: '0.2.0',
      stats: { kills: 5, damageDealt: 200, damageTaken: 50 },
    };

    const summary = toReplaySummary(metadata);

    assert.strictEqual(summary.id, 'test-123', 'id should match');
    assert.strictEqual(
      summary.missionName,
      'Test Mission',
      'missionName should match',
    );
    assert.strictEqual(summary.sector, 2, 'sector should match');
    assert.strictEqual(summary.outcome, 'victory', 'outcome should match');
    assert.strictEqual(
      summary.durationSeconds,
      60,
      'durationSeconds should be ticks/60',
    );
    assert.strictEqual(
      summary.recordedAt,
      1700000000000,
      'recordedAt should match',
    );
    assert.strictEqual(
      summary.shipType,
      'interceptor',
      'shipType should match',
    );
    assert.deepStrictEqual(
      summary.wingmenShips,
      ['fighter', 'striker'],
      'wingmenShips should match',
    );
  });

  it('handles missing wingmenShips', () => {
    const metadata = {
      id: 'test-456',
      missionId: 's1-mission',
      missionName: 'Solo Mission',
      sector: 1,
      shipType: 'fighter',
      outcome: 'defeat',
      durationTicks: 1800,
      recordedAt: 1700000000000,
      gameVersion: '0.2.0',
      stats: { kills: 2, damageDealt: 100, damageTaken: 150 },
    };

    const summary = toReplaySummary(metadata);

    assert.strictEqual(summary.id, 'test-456', 'id should match');
    assert.strictEqual(summary.shipType, 'fighter', 'shipType should match');
    assert.strictEqual(
      summary.wingmenShips,
      undefined,
      'wingmenShips should be undefined',
    );
  });

  it('copies empty wingmenShips array (truthy value)', () => {
    // Empty arrays are truthy in JS, so they get copied.
    // In practice, mission-callbacks.ts only sets wingmenShips if length > 0,
    // but toReplaySummary handles this edge case correctly.
    const metadata = {
      id: 'test-789',
      missionId: 's1-mission',
      missionName: 'Test',
      sector: 1,
      shipType: 'fighter',
      wingmenShips: [],
      outcome: 'victory',
      durationTicks: 600,
      recordedAt: 1700000000000,
      gameVersion: '0.2.0',
      stats: { kills: 1, damageDealt: 50, damageTaken: 0 },
    };

    const summary = toReplaySummary(metadata);

    assert.deepStrictEqual(
      summary.wingmenShips,
      [],
      'empty array is preserved',
    );
  });
});
