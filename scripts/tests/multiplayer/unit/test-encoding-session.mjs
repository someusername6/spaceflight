/**
 * Protocol Encoding Tests - Part 2
 *
 * Tests for game protocol message encoding and decoding (session & callsign messages).
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  decodeMessage,
  encodeMessage,
  GameMessageType,
} from '../../../../src/multiplayer/protocol/index.ts';

describe('Protocol Encoding - Session Messages', () => {
  describe('MissionEnded message', () => {
    it('should round-trip encode/decode MissionEnded', () => {
      const msg = {
        type: GameMessageType.MissionEnded,
        outcome: {
          victory: true,
          creditsEarned: 5000,
          shipsLost: ['ship-2'],
          kills: { 'peer-1': 5, 'peer-2': 3 },
          assists: { 'peer-1': 2 },
          damageDealt: { 'peer-1': 15000 },
        },
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.outcome.victory, true);
      assert.strictEqual(decoded.outcome.creditsEarned, 5000);
      assert.deepStrictEqual(decoded.outcome.shipsLost, ['ship-2']);
      assert.strictEqual(decoded.outcome.kills['peer-1'], 5);
    });
  });

  describe('SessionEnded message', () => {
    it('should round-trip encode/decode SessionEnded', () => {
      const msg = {
        type: GameMessageType.SessionEnded,
        reason: 'Host left',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.reason, 'Host left');
    });
  });

  describe('KickNotification message', () => {
    it('should round-trip encode/decode with reason', () => {
      const msg = {
        type: GameMessageType.KickNotification,
        reason: 'AFK',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.reason, 'AFK');
    });

    it('should round-trip encode/decode without reason', () => {
      const msg = {
        type: GameMessageType.KickNotification,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.reason, undefined);
    });
  });

  describe('CallsignAnnounce message', () => {
    it('should round-trip encode/decode CallsignAnnounce', () => {
      const msg = {
        type: GameMessageType.CallsignAnnounce,
        callsign: 'Maverick',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.callsign, 'Maverick');
    });
  });
});
