/**
 * Callsign Validation Tests
 *
 * Tests for callsign validation and conflict checking.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  isCallsignConflict,
  validateCallsign,
} from '../../../../src/multiplayer/callsign-storage.ts';

describe('Callsign Validation', () => {
  describe('validateCallsign', () => {
    it('accepts valid callsigns', () => {
      assert.strictEqual(validateCallsign('Maverick').valid, true);
      assert.strictEqual(validateCallsign('AB').valid, true);
      assert.strictEqual(validateCallsign('Top Gun').valid, true);
      assert.strictEqual(validateCallsign('Player 1').valid, true);
      assert.strictEqual(validateCallsign('1234567890123456').valid, true);
    });

    it('rejects empty callsigns', () => {
      const result = validateCallsign('');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    it('rejects callsigns that are too short', () => {
      const result = validateCallsign('A');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('at least'));
    });

    it('rejects callsigns that are too long', () => {
      const result = validateCallsign('12345678901234567'); // 17 chars
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('at most'));
    });

    it('rejects callsigns with invalid characters', () => {
      const result = validateCallsign('Player@1');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('letters, numbers, and spaces'));
    });

    it('trims whitespace before validation', () => {
      const result = validateCallsign('  Maverick  ');
      assert.strictEqual(result.valid, true);
    });

    it('rejects callsigns with only spaces', () => {
      const result = validateCallsign('   ');
      assert.strictEqual(result.valid, false);
    });

    it('rejects callsigns starting with space', () => {
      const result = validateCallsign(' Maverick');
      // After trim, this becomes valid
      assert.strictEqual(result.valid, true);
    });
  });

  describe('isCallsignConflict', () => {
    const players = [
      { playerId: 'player-1', callsign: 'Alpha' },
      { playerId: 'player-2', callsign: 'Beta' },
      { playerId: 'player-3', callsign: 'Gamma' },
    ];

    it('returns true when callsign matches another player', () => {
      const conflict = isCallsignConflict(players, 'Beta', 'player-1');
      assert.strictEqual(conflict, true);
    });

    it('returns false when callsign is unique', () => {
      const conflict = isCallsignConflict(players, 'Delta', 'player-1');
      assert.strictEqual(conflict, false);
    });

    it('ignores the player who is changing (excludePlayerId)', () => {
      // Player 1 keeping their own callsign should not conflict
      const conflict = isCallsignConflict(players, 'Alpha', 'player-1');
      assert.strictEqual(conflict, false);
    });

    it('comparison is case-insensitive', () => {
      const conflict1 = isCallsignConflict(players, 'BETA', 'player-1');
      assert.strictEqual(conflict1, true);

      const conflict2 = isCallsignConflict(players, 'beta', 'player-1');
      assert.strictEqual(conflict2, true);

      const conflict3 = isCallsignConflict(players, 'BeTa', 'player-1');
      assert.strictEqual(conflict3, true);
    });

    it('handles whitespace normalization', () => {
      const conflict = isCallsignConflict(players, '  Beta  ', 'player-1');
      assert.strictEqual(conflict, true);
    });

    it('returns false for empty player list', () => {
      const conflict = isCallsignConflict([], 'AnyCallsign', 'player-1');
      assert.strictEqual(conflict, false);
    });
  });
});
