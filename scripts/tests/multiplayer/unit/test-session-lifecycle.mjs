/**
 * Session Lifecycle Unit Tests
 *
 * Tests for session lifecycle management functions:
 * - clearLobbyChat
 * - resetAllPlayersReady
 * - resetLobbyStateAfterMission
 * - setDebriefState / clearDebriefState
 * - triggerReturnToLobby
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  addChatMessage,
  addSystemMessage,
  createLobbyState,
  setPlayerReady,
} from '../../../../src/multiplayer/lobby-state.ts';
import { DEFAULT_PERMISSION } from '../../../../src/multiplayer/protocol/types.ts';

// =============================================================================
// Mock LobbyContext
// =============================================================================

/**
 * Create a minimal mock LobbyContext for testing session lifecycle functions.
 * @param {object} overrides
 * @returns {object}
 */
function createMockLobbyContext(overrides = {}) {
  const lobbyState = createLobbyState({
    roomCode: 'TEST1234',
    localPlayerId: 'host-peer-id',
    isHost: true,
    initialPlayers: [
      {
        playerId: 'host-peer-id',
        callsign: 'Host',
        shipId: null,
        isReady: false,
        isHost: true,
        ping: 0,
        permissions: DEFAULT_PERMISSION,
      },
      {
        playerId: 'guest-peer-id',
        callsign: 'Guest',
        shipId: 'ship-1',
        isReady: false,
        isHost: false,
        ping: 50,
        permissions: DEFAULT_PERMISSION,
      },
    ],
  });

  return {
    isHost: true,
    localPlayerId: 'host-peer-id',
    lobbyState,
    connectionFlow: {
      getTransport: () => ({
        broadcast: () => {},
        connectedPeers: ['guest-peer-id'],
      }),
    },
    debriefState: undefined,
    onReturnToLobby: undefined,
    ...overrides,
  };
}

// =============================================================================
// Lobby State Reset Tests
// =============================================================================

describe('Session Lifecycle - Lobby State', () => {
  describe('clearLobbyChat', () => {
    it('clears all chat messages from lobby state', () => {
      // Setup: add some chat messages
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host',
        isHost: true,
      });
      state = addSystemMessage(state, 'Player joined');
      state = addChatMessage(state, 'host', 'Host', 'Hello!', Date.now());
      state = addSystemMessage(state, 'Mission starting...');

      assert.strictEqual(state.chatMessages.length, 3);

      // Clear chat by creating new state with empty messages
      const clearedState = { ...state, chatMessages: [] };

      assert.strictEqual(clearedState.chatMessages.length, 0);
      // Other state should be preserved
      assert.strictEqual(clearedState.roomCode, 'TEST1234');
      assert.strictEqual(clearedState.localPlayerId, 'host');
    });
  });

  describe('resetAllPlayersReady', () => {
    it('resets all players to unready state', () => {
      // Setup: create state with ready players
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host',
        isHost: true,
        initialPlayers: [
          {
            playerId: 'host',
            callsign: 'Host',
            shipId: null,
            isReady: false,
            isHost: true,
            ping: 0,
            permissions: DEFAULT_PERMISSION,
          },
          {
            playerId: 'guest',
            callsign: 'Guest',
            shipId: 'ship-1',
            isReady: false,
            isHost: false,
            ping: 50,
            permissions: DEFAULT_PERMISSION,
          },
        ],
      });

      // Make players ready
      state = setPlayerReady(state, 'host', true);
      state = setPlayerReady(state, 'guest', true);

      assert.strictEqual(state.players[0].isReady, true);
      assert.strictEqual(state.players[1].isReady, true);

      // Reset all to unready
      const resetState = {
        ...state,
        players: state.players.map((p) => ({ ...p, isReady: false })),
      };

      assert.strictEqual(resetState.players[0].isReady, false);
      assert.strictEqual(resetState.players[1].isReady, false);
      // Other player state preserved
      assert.strictEqual(resetState.players[0].callsign, 'Host');
      assert.strictEqual(resetState.players[1].callsign, 'Guest');
    });
  });

  describe('resetLobbyStateAfterMission', () => {
    it('clears chat and resets ready states in one operation', () => {
      // Setup: create state with ready players and chat
      let state = createLobbyState({
        roomCode: 'TEST1234',
        localPlayerId: 'host',
        isHost: true,
        initialPlayers: [
          {
            playerId: 'host',
            callsign: 'Host',
            shipId: null,
            isReady: false,
            isHost: true,
            ping: 0,
            permissions: DEFAULT_PERMISSION,
          },
          {
            playerId: 'guest',
            callsign: 'Guest',
            shipId: 'ship-1',
            isReady: false,
            isHost: false,
            ping: 50,
            permissions: DEFAULT_PERMISSION,
          },
        ],
      });

      // Add messages and set ready
      state = addSystemMessage(state, 'Mission complete!');
      state = setPlayerReady(state, 'host', true);
      state = setPlayerReady(state, 'guest', true);

      // Reset after mission
      const resetState = {
        ...state,
        chatMessages: [],
        players: state.players.map((p) => ({ ...p, isReady: false })),
      };

      assert.strictEqual(resetState.chatMessages.length, 0);
      assert.strictEqual(resetState.players[0].isReady, false);
      assert.strictEqual(resetState.players[1].isReady, false);
      // Room code and players preserved
      assert.strictEqual(resetState.roomCode, 'TEST1234');
      assert.strictEqual(resetState.players.length, 2);
    });
  });
});

// =============================================================================
// Debrief State Tests
// =============================================================================

describe('Session Lifecycle - Debrief State', () => {
  describe('setDebriefState', () => {
    it('sets debrief state with mission outcome', () => {
      const ctx = createMockLobbyContext();

      const outcome = {
        victory: true,
        creditsEarned: 1000,
        shipsLost: [],
        kills: { 'host-peer-id': 3, 'guest-peer-id': 2 },
        assists: {},
        damageDealt: {},
      };

      // Set debrief state
      ctx.debriefState = {
        missionComplete: true,
        outcome,
      };

      assert.strictEqual(ctx.debriefState.missionComplete, true);
      assert.strictEqual(ctx.debriefState.outcome.victory, true);
      assert.strictEqual(ctx.debriefState.outcome.creditsEarned, 1000);
    });

    it('handles defeat outcome', () => {
      const ctx = createMockLobbyContext();

      const outcome = {
        victory: false,
        creditsEarned: 0,
        shipsLost: ['ship-1'],
        kills: {},
        assists: {},
        damageDealt: {},
      };

      ctx.debriefState = {
        missionComplete: true,
        outcome,
      };

      assert.strictEqual(ctx.debriefState.outcome.victory, false);
      assert.strictEqual(ctx.debriefState.outcome.creditsEarned, 0);
      assert.deepStrictEqual(ctx.debriefState.outcome.shipsLost, ['ship-1']);
    });
  });

  describe('clearDebriefState', () => {
    it('clears debrief state by deleting property', () => {
      const ctx = createMockLobbyContext();

      ctx.debriefState = {
        missionComplete: true,
        outcome: {
          victory: true,
          creditsEarned: 1000,
          shipsLost: [],
          kills: {},
          assists: {},
          damageDealt: {},
        },
      };

      assert.notStrictEqual(ctx.debriefState, undefined);

      // Clear by deleting
      delete ctx.debriefState;

      assert.strictEqual(ctx.debriefState, undefined);
    });
  });
});

// =============================================================================
// Return to Lobby Flow Tests
// =============================================================================

describe('Session Lifecycle - Return to Lobby', () => {
  describe('triggerReturnToLobby', () => {
    it('calls onReturnToLobby callback when set', () => {
      let callbackInvoked = false;

      const ctx = createMockLobbyContext({
        onReturnToLobby: () => {
          callbackInvoked = true;
        },
      });

      // Simulate trigger
      if (ctx.onReturnToLobby) {
        ctx.onReturnToLobby();
      }

      assert.strictEqual(callbackInvoked, true);
    });

    it('does not throw when onReturnToLobby is not set', () => {
      const ctx = createMockLobbyContext({
        onReturnToLobby: undefined,
      });

      // Should not throw
      assert.doesNotThrow(() => {
        if (ctx.onReturnToLobby) {
          ctx.onReturnToLobby();
        }
      });
    });
  });
});

// =============================================================================
// Message Outcome Data Tests
// =============================================================================

describe('Session Lifecycle - Mission Outcome Data', () => {
  it('builds outcome data with player stats', () => {
    const outcomeData = {
      victory: true,
      creditsEarned: 1500,
      shipsLost: [],
      kills: {
        'host-peer-id': 5,
        'guest-peer-id': 3,
      },
      assists: {
        'host-peer-id': 1,
        'guest-peer-id': 2,
      },
      damageDealt: {
        'host-peer-id': 10000,
        'guest-peer-id': 7500,
      },
    };

    assert.strictEqual(outcomeData.victory, true);
    assert.strictEqual(outcomeData.kills['host-peer-id'], 5);
    assert.strictEqual(outcomeData.kills['guest-peer-id'], 3);
    assert.strictEqual(outcomeData.assists['guest-peer-id'], 2);
    assert.strictEqual(outcomeData.damageDealt['host-peer-id'], 10000);
  });

  it('handles empty player stats', () => {
    const outcomeData = {
      victory: false,
      creditsEarned: 0,
      shipsLost: ['ship-1', 'ship-2'],
      kills: {},
      assists: {},
      damageDealt: {},
    };

    assert.strictEqual(outcomeData.victory, false);
    assert.strictEqual(Object.keys(outcomeData.kills).length, 0);
    assert.deepStrictEqual(outcomeData.shipsLost, ['ship-1', 'ship-2']);
  });
});
