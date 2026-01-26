/**
 * Lobby Message Tests - Type Guards, Creators, Conversions
 *
 * Tests message type guards, creator functions, and conversion helpers.
 * See also:
 * - test-lobby-messages-encoding.mjs - Binary encoding/decoding
 * - test-lobby-messages-handlers.mjs - Message handlers
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createChatMessageMessage,
  createReadyStateMessage,
  gamePlayerToLobbyPlayer,
  isChatMessageMessage,
  isPlayerJoinedExtMessage,
  isPlayerLeftExtMessage,
  isReadyStateMessage,
  isWelcomeMessage,
} from '../../../src/multiplayer/lobby-messages.ts';
import { GameMessageType } from '../../../src/multiplayer/protocol/types.ts';

describe('Lobby Messages', () => {
  describe('Message type guards', () => {
    it('isWelcomeMessage identifies Welcome messages', () => {
      const welcomeMsg = { type: GameMessageType.Welcome };
      const otherMsg = { type: GameMessageType.ReadyState };

      assert.strictEqual(isWelcomeMessage(welcomeMsg), true);
      assert.strictEqual(isWelcomeMessage(otherMsg), false);
    });

    it('isReadyStateMessage identifies ReadyState messages', () => {
      const readyMsg = { type: GameMessageType.ReadyState };
      const otherMsg = { type: GameMessageType.ChatMessage };

      assert.strictEqual(isReadyStateMessage(readyMsg), true);
      assert.strictEqual(isReadyStateMessage(otherMsg), false);
    });

    it('isChatMessageMessage identifies ChatMessage messages', () => {
      const chatMsg = { type: GameMessageType.ChatMessage };
      const otherMsg = { type: GameMessageType.ReadyState };

      assert.strictEqual(isChatMessageMessage(chatMsg), true);
      assert.strictEqual(isChatMessageMessage(otherMsg), false);
    });

    it('isPlayerJoinedExtMessage identifies PlayerJoinedExt messages', () => {
      const joinMsg = { type: GameMessageType.PlayerJoinedExt };
      const otherMsg = { type: GameMessageType.PlayerLeftExt };

      assert.strictEqual(isPlayerJoinedExtMessage(joinMsg), true);
      assert.strictEqual(isPlayerJoinedExtMessage(otherMsg), false);
    });

    it('isPlayerLeftExtMessage identifies PlayerLeftExt messages', () => {
      const leftMsg = { type: GameMessageType.PlayerLeftExt };
      const otherMsg = { type: GameMessageType.PlayerJoinedExt };

      assert.strictEqual(isPlayerLeftExtMessage(leftMsg), true);
      assert.strictEqual(isPlayerLeftExtMessage(otherMsg), false);
    });
  });

  describe('Message creators', () => {
    it('createReadyStateMessage creates correct message', () => {
      const msg = createReadyStateMessage('player-1', true);

      assert.strictEqual(msg.type, GameMessageType.ReadyState);
      assert.strictEqual(msg.playerId, 'player-1');
      assert.strictEqual(msg.ready, true);
    });

    it('createChatMessageMessage creates correct message', () => {
      const before = Date.now();
      const msg = createChatMessageMessage('player-1', 'Hello!');
      const after = Date.now();

      assert.strictEqual(msg.type, GameMessageType.ChatMessage);
      assert.strictEqual(msg.fromPlayerId, 'player-1');
      assert.strictEqual(msg.text, 'Hello!');
      assert.ok(msg.timestamp >= before && msg.timestamp <= after);
    });
  });

  describe('Conversion helpers', () => {
    it('gamePlayerToLobbyPlayer converts correctly for host', () => {
      const gamePlayer = {
        playerId: 'host-1',
        callsign: 'HostPlayer',
        shipId: '5',
        ready: true,
        permissions: {
          shipEdit: 'any',
          canBuy: true,
          canSell: true,
          canConvertScrap: true,
        },
      };

      const lobbyPlayer = gamePlayerToLobbyPlayer(gamePlayer, true);

      assert.strictEqual(lobbyPlayer.playerId, 'host-1');
      assert.strictEqual(lobbyPlayer.callsign, 'HostPlayer');
      assert.strictEqual(lobbyPlayer.shipId, 5);
      assert.strictEqual(lobbyPlayer.isReady, true);
      assert.strictEqual(lobbyPlayer.isHost, true);
      assert.strictEqual(lobbyPlayer.ping, 0);
    });

    it('gamePlayerToLobbyPlayer converts null shipId correctly', () => {
      const gamePlayer = {
        playerId: 'guest-1',
        callsign: 'Guest',
        shipId: null,
        ready: false,
        permissions: {
          shipEdit: 'own',
          canBuy: true,
          canSell: true,
          canConvertScrap: true,
        },
      };

      const lobbyPlayer = gamePlayerToLobbyPlayer(gamePlayer, false);

      assert.strictEqual(lobbyPlayer.shipId, null);
      assert.strictEqual(lobbyPlayer.isHost, false);
    });
  });
});
