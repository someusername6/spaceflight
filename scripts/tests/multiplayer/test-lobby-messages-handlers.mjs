/**
 * Lobby Message Handler Tests
 *
 * Tests message handlers and state updates.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  handleChatMessage,
  handlePlayerJoined,
  handlePlayerLeft,
  handleReadyState,
  handleWelcome,
  processLobbyMessage,
} from '../../../src/multiplayer/lobby-messages.ts';
import { createLobbyState } from '../../../src/multiplayer/lobby-state.ts';
import { GameMessageType } from '../../../src/multiplayer/protocol/types.ts';

describe('Lobby Message Handlers', () => {
  describe('handleReadyState', () => {
    it('updates player ready status', () => {
      const player = {
        playerId: 'player-1',
        callsign: 'TestPlayer',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player-1',
        isHost: false,
        initialPlayers: [player],
      });

      const msg = {
        type: GameMessageType.ReadyState,
        playerId: 'player-1',
        ready: true,
      };

      const result = handleReadyState(state, msg);

      assert.strictEqual(result.state.players[0].isReady, true);
      assert.ok(result.systemMessage);
      assert.ok(result.systemMessage.includes('is ready'));
    });
  });

  describe('handleChatMessage', () => {
    it('adds message to log', () => {
      const player = {
        playerId: 'player-1',
        callsign: 'TestPlayer',
        shipId: null,
        isReady: false,
        isHost: false,
        ping: 0,
      };

      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player-1',
        isHost: false,
        initialPlayers: [player],
      });

      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'player-1',
        text: 'Hello!',
        timestamp: Date.now(),
      };

      const result = handleChatMessage(state, msg);

      assert.strictEqual(result.state.chatMessages.length, 1);
      assert.strictEqual(result.state.chatMessages[0].type, 'chat');
      assert.strictEqual(result.state.chatMessages[0].text, 'Hello!');
    });
  });

  describe('handlePlayerJoined', () => {
    it('adds player and system message', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host-1',
        isHost: true,
        initialPlayers: [
          {
            playerId: 'host-1',
            callsign: 'Host',
            shipId: null,
            isReady: false,
            isHost: true,
            ping: 0,
          },
        ],
      });

      const msg = {
        type: GameMessageType.PlayerJoinedExt,
        player: {
          playerId: 'guest-1',
          callsign: 'NewGuest',
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

      const result = handlePlayerJoined(state, msg);

      assert.strictEqual(result.state.players.length, 2);
      assert.strictEqual(result.state.players[1].callsign, 'NewGuest');
      assert.ok(result.systemMessage);
      assert.ok(result.systemMessage.includes('joined'));
    });
  });

  describe('handlePlayerLeft', () => {
    it('removes player and shows system message', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host-1',
        isHost: true,
        initialPlayers: [
          {
            playerId: 'host-1',
            callsign: 'Host',
            shipId: null,
            isReady: false,
            isHost: true,
            ping: 0,
          },
          {
            playerId: 'guest-1',
            callsign: 'LeavingGuest',
            shipId: null,
            isReady: false,
            isHost: false,
            ping: 50,
          },
        ],
      });

      const msg = {
        type: GameMessageType.PlayerLeftExt,
        playerId: 'guest-1',
        reason: 'left',
      };

      const result = handlePlayerLeft(state, msg);

      assert.strictEqual(result.state.players.length, 1);
      assert.strictEqual(result.state.players[0].playerId, 'host-1');
      assert.ok(result.systemMessage);
      assert.ok(result.systemMessage.includes('left'));
    });
  });

  describe('handleWelcome', () => {
    it('initializes player list from message', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'guest-1',
        isHost: false,
        initialPlayers: [],
      });

      const msg = {
        type: GameMessageType.Welcome,
        playerId: 'guest-1',
        campaignState: {},
        players: [
          {
            playerId: 'host-1',
            callsign: 'HostPlayer',
            shipId: null,
            ready: true,
            permissions: {
              shipEdit: 'any',
              canBuy: true,
              canSell: true,
              canConvertScrap: true,
            },
          },
          {
            playerId: 'guest-1',
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
        ],
      };

      const result = handleWelcome(state, msg, 'host-1');

      assert.strictEqual(result.state.players.length, 2);
      assert.strictEqual(result.state.players[0].callsign, 'HostPlayer');
      assert.strictEqual(result.state.players[0].isHost, true);
      assert.strictEqual(result.state.players[1].callsign, 'GuestPlayer');
      assert.strictEqual(result.state.players[1].isHost, false);
    });
  });

  describe('processLobbyMessage', () => {
    it('processes ReadyState message', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player-1',
        isHost: false,
        initialPlayers: [
          {
            playerId: 'player-1',
            callsign: 'Player',
            shipId: null,
            isReady: false,
            isHost: false,
            ping: 0,
          },
        ],
      });

      const msg = {
        type: GameMessageType.ReadyState,
        playerId: 'player-1',
        ready: true,
      };

      const result = processLobbyMessage(state, msg, 'host-1');

      assert.ok(result);
      assert.strictEqual(result.state.players[0].isReady, true);
    });

    it('processes ChatMessage message', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player-1',
        isHost: false,
        initialPlayers: [
          {
            playerId: 'player-1',
            callsign: 'Player',
            shipId: null,
            isReady: false,
            isHost: false,
            ping: 0,
          },
        ],
      });

      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'player-1',
        text: 'Hello!',
        timestamp: Date.now(),
      };

      const result = processLobbyMessage(state, msg, 'host-1');

      assert.ok(result);
      assert.strictEqual(result.state.chatMessages.length, 1);
    });

    it('returns null for non-lobby messages', () => {
      const state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'player-1',
        isHost: false,
        initialPlayers: [],
      });

      const msg = {
        type: GameMessageType.ContractAccepted,
        contractId: 'contract-1',
      };

      const result = processLobbyMessage(state, msg, 'host-1');

      assert.strictEqual(result, null);
    });
  });
});
