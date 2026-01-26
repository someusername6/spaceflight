/**
 * Lobby Message Encoding Tests
 *
 * Tests binary encoding/decoding of lobby protocol messages.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { decodeMessage } from '../../../src/multiplayer/protocol/decode.ts';
import { encodeMessage } from '../../../src/multiplayer/protocol/encode.ts';
import { GameMessageType } from '../../../src/multiplayer/protocol/types.ts';

describe('Lobby Message Encoding', () => {
  describe('ReadyState encoding', () => {
    it('round-trips encoding correctly', () => {
      const original = {
        type: GameMessageType.ReadyState,
        playerId: 'player-123',
        ready: true,
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.ReadyState);
      assert.strictEqual(decoded.playerId, original.playerId);
      assert.strictEqual(decoded.ready, original.ready);
    });

    it('encodes ready=false correctly', () => {
      const original = {
        type: GameMessageType.ReadyState,
        playerId: 'test-player',
        ready: false,
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.ready, false);
    });
  });

  describe('ChatMessage encoding', () => {
    it('round-trips encoding correctly', () => {
      const timestamp = Date.now();
      const original = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'player-123',
        text: 'Hello world!',
        timestamp,
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.ChatMessage);
      assert.strictEqual(decoded.fromPlayerId, original.fromPlayerId);
      assert.strictEqual(decoded.text, original.text);
      assert.strictEqual(decoded.timestamp, original.timestamp);
    });

    it('handles unicode text', () => {
      const original = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'player-1',
        text: 'Hello! \u{1F680} rockets!',
        timestamp: 123456789,
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.text, original.text);
    });
  });

  describe('PlayerJoinedExt encoding', () => {
    it('round-trips encoding correctly', () => {
      const original = {
        type: GameMessageType.PlayerJoinedExt,
        player: {
          playerId: 'guest-456',
          callsign: 'GuestPlayer',
          shipId: null,
          ready: false,
          permissions: {
            shipEdit: 'own',
            canBuy: true,
            canSell: true,
            canConvertScrap: true,
          },
        },
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.PlayerJoinedExt);
      assert.strictEqual(decoded.player.playerId, original.player.playerId);
      assert.strictEqual(decoded.player.callsign, original.player.callsign);
      assert.strictEqual(decoded.player.shipId, original.player.shipId);
      assert.strictEqual(decoded.player.ready, original.player.ready);
    });
  });

  describe('PlayerLeftExt encoding', () => {
    it('round-trips encoding correctly', () => {
      const original = {
        type: GameMessageType.PlayerLeftExt,
        playerId: 'player-123',
        reason: 'disconnected',
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.PlayerLeftExt);
      assert.strictEqual(decoded.playerId, original.playerId);
      assert.strictEqual(decoded.reason, original.reason);
    });

    it('handles kicked reason', () => {
      const original = {
        type: GameMessageType.PlayerLeftExt,
        playerId: 'player-456',
        reason: 'kicked',
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.reason, 'kicked');
    });
  });

  describe('Welcome encoding', () => {
    it('round-trips encoding correctly', () => {
      const original = {
        type: GameMessageType.Welcome,
        playerId: 'guest-1',
        campaignState: { credits: 1000, sector: 1 },
        players: [
          {
            playerId: 'host-1',
            callsign: 'Host',
            shipId: null,
            ready: true,
            permissions: {
              shipEdit: 'any',
              canBuy: true,
              canSell: true,
              canConvertScrap: true,
            },
          },
        ],
      };

      const encoded = encodeMessage(original);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.Welcome);
      assert.strictEqual(decoded.playerId, original.playerId);
      assert.strictEqual(decoded.players.length, 1);
      assert.strictEqual(decoded.players[0].callsign, 'Host');
    });
  });
});
