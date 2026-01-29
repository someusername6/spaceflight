/**
 * CallsignUpdate Encoding Tests
 *
 * Tests for CallsignUpdate message encoding and decoding.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createCallsignUpdateMessage } from '../../../../src/multiplayer/lobby-message-creators.ts';
import {
  decodeMessage,
  encodeMessage,
  GameMessageType,
} from '../../../../src/multiplayer/protocol/index.ts';

describe('CallsignUpdate Encoding', () => {
  describe('encodeMessage / decodeMessage', () => {
    it('should round-trip encode/decode CallsignUpdate message', () => {
      const msg = {
        type: GameMessageType.CallsignUpdate,
        playerId: 'peer-123',
        callsign: 'NewCallsign',
      };

      const encoded = encodeMessage(msg);
      assert.ok(encoded instanceof Uint8Array, 'Encoded should be Uint8Array');
      assert.strictEqual(
        encoded[0],
        0x92,
        'First byte should be CallsignUpdate type',
      );

      const decoded = decodeMessage(encoded);
      assert.strictEqual(decoded.type, GameMessageType.CallsignUpdate);
      assert.strictEqual(decoded.playerId, 'peer-123');
      assert.strictEqual(decoded.callsign, 'NewCallsign');
    });

    it('should handle Unicode callsigns', () => {
      const msg = {
        type: GameMessageType.CallsignUpdate,
        playerId: 'peer-1',
        callsign: 'Ace Pilot',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.callsign, 'Ace Pilot');
    });

    it('should handle short callsigns', () => {
      const msg = {
        type: GameMessageType.CallsignUpdate,
        playerId: 'peer-1',
        callsign: 'AB',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.callsign, 'AB');
    });

    it('should handle max length callsigns', () => {
      const msg = {
        type: GameMessageType.CallsignUpdate,
        playerId: 'peer-1',
        callsign: '1234567890123456', // 16 chars
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.callsign, '1234567890123456');
    });

    it('should handle callsigns with spaces', () => {
      const msg = {
        type: GameMessageType.CallsignUpdate,
        playerId: 'peer-1',
        callsign: 'Top Gun',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.callsign, 'Top Gun');
    });
  });

  describe('createCallsignUpdateMessage', () => {
    it('should create a valid CallsignUpdate message', () => {
      const msg = createCallsignUpdateMessage('peer-abc', 'Maverick');

      assert.strictEqual(msg.type, GameMessageType.CallsignUpdate);
      assert.strictEqual(msg.playerId, 'peer-abc');
      assert.strictEqual(msg.callsign, 'Maverick');
    });

    it('should create message that encodes/decodes correctly', () => {
      const msg = createCallsignUpdateMessage('peer-xyz', 'Goose');
      const encoded = encodeMessage(msg);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.CallsignUpdate);
      assert.strictEqual(decoded.playerId, 'peer-xyz');
      assert.strictEqual(decoded.callsign, 'Goose');
    });
  });
});
