/**
 * Permission Integration Tests
 *
 * Tests for permission updates with signaling server.
 * Server is automatically started/stopped by the test framework.
 */

import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';

import {
  createChatMessage,
  createPermissionUpdateMessage,
  createShipAssignmentMessage,
  handlePermissionUpdate,
  handleShipAssignment,
  processLobbyMessage,
} from '../../../../src/multiplayer/lobby-messages.ts';
import { createLobbyState } from '../../../../src/multiplayer/lobby-state.ts';
import {
  DEFAULT_GUEST_PERMISSIONS,
  HOST_PERMISSIONS,
} from '../../../../src/multiplayer/permissions.ts';
import { GameMessageType } from '../../../../src/multiplayer/protocol/types.ts';
import {
  DEFAULT_PORT,
  startSignalingServer,
  stopSignalingServer,
  waitForServerReady,
} from './signaling-utils.mjs';

// =============================================================================
// Test Fixtures
// =============================================================================

function createHostPlayer(playerId = 'host-peer-id') {
  return {
    playerId,
    callsign: 'HostPlayer',
    shipId: null,
    isReady: false,
    isHost: true,
    ping: 0,
    permissions: HOST_PERMISSIONS,
  };
}

function createGuestPlayer(
  playerId = 'guest-peer-id',
  callsign = 'GuestPlayer',
) {
  return {
    playerId,
    callsign,
    shipId: null,
    isReady: false,
    isHost: false,
    ping: 0,
    permissions: DEFAULT_GUEST_PERMISSIONS,
  };
}

function createTestLobbyState(
  hostId = 'host-peer-id',
  localPlayerId = 'host-peer-id',
) {
  const hostPlayer = createHostPlayer(hostId);
  const guestPlayer = createGuestPlayer('guest-peer-id');

  return createLobbyState({
    roomCode: 'TESTROOM',
    localPlayerId,
    isHost: localPlayerId === hostId,
    initialPlayers: [hostPlayer, guestPlayer],
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('Permission Integration', () => {
  let serverProcess;

  before(async () => {
    serverProcess = await startSignalingServer(DEFAULT_PORT);
    await waitForServerReady(DEFAULT_PORT, 5000);
  });

  after(async () => {
    await stopSignalingServer(serverProcess);
  });

  describe('Permission Message Creation', () => {
    it('creates valid PermissionUpdate message', () => {
      const permissions = {
        shipEdit: 'none',
        canBuy: false,
        canSell: true,
        canConvertScrap: false,
      };

      const msg = createPermissionUpdateMessage('guest-id', permissions);

      assert.strictEqual(msg.type, GameMessageType.PermissionUpdate);
      assert.strictEqual(msg.playerId, 'guest-id');
      assert.strictEqual(msg.permissions.shipEdit, 'none');
      assert.strictEqual(msg.permissions.canBuy, false);
      assert.strictEqual(msg.permissions.canSell, true);
    });

    it('creates valid ShipAssignment message', () => {
      const msg = createShipAssignmentMessage('player-id', 'ship-123');

      assert.strictEqual(msg.type, GameMessageType.ShipAssignment);
      assert.strictEqual(msg.playerId, 'player-id');
      assert.strictEqual(msg.shipId, 'ship-123');
    });

    it('creates ShipAssignment message with null for unassign', () => {
      const msg = createShipAssignmentMessage('player-id', null);

      assert.strictEqual(msg.shipId, null);
    });
  });

  describe('Permission Update Handling', () => {
    it('updates guest permissions', () => {
      const state = createTestLobbyState();
      const newPermissions = {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      };

      const msg = createPermissionUpdateMessage(
        'guest-peer-id',
        newPermissions,
      );
      const result = handlePermissionUpdate(state, msg);

      const updatedGuest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );

      assert.strictEqual(updatedGuest.permissions.shipEdit, 'none');
      assert.strictEqual(updatedGuest.permissions.canBuy, false);
      assert.strictEqual(updatedGuest.permissions.canSell, false);
      assert.strictEqual(updatedGuest.permissions.canConvertScrap, false);
    });

    it('generates system message on permission change', () => {
      const state = createTestLobbyState();
      const newPermissions = {
        shipEdit: 'any',
        canBuy: true,
        canSell: true,
        canConvertScrap: true,
      };

      const msg = createPermissionUpdateMessage(
        'guest-peer-id',
        newPermissions,
      );
      const result = handlePermissionUpdate(state, msg);

      assert.ok(result.systemMessage);
      assert.ok(result.systemMessage.includes('GuestPlayer'));
      assert.ok(result.systemMessage.includes('permissions'));
    });

    it('does not update host permissions', () => {
      const state = createTestLobbyState();
      const newPermissions = {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      };

      const msg = createPermissionUpdateMessage('host-peer-id', newPermissions);
      const result = handlePermissionUpdate(state, msg);

      const host = result.state.players.find(
        (p) => p.playerId === 'host-peer-id',
      );

      // Host permissions should remain unchanged
      assert.strictEqual(host.permissions.shipEdit, 'any');
      assert.strictEqual(host.permissions.canBuy, true);
    });

    it('returns unchanged state for unknown player', () => {
      const state = createTestLobbyState();
      const newPermissions = {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      };

      const msg = createPermissionUpdateMessage('unknown-id', newPermissions);
      const result = handlePermissionUpdate(state, msg);

      assert.strictEqual(result.state, state);
    });
  });

  describe('Ship Assignment Handling', () => {
    it('assigns player to ship', () => {
      const state = createTestLobbyState();

      const msg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      const result = handleShipAssignment(state, msg);

      const guest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );

      assert.strictEqual(guest.shipId, 'ship-1');
    });

    it('unassigns player from ship', () => {
      // Start with player already assigned
      let state = createTestLobbyState();
      const assignMsg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      state = handleShipAssignment(state, assignMsg).state;

      // Unassign
      const unassignMsg = createShipAssignmentMessage('guest-peer-id', null);
      const result = handleShipAssignment(state, unassignMsg);

      const guest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );

      assert.strictEqual(guest.shipId, null);
    });

    it('generates system message for assignment', () => {
      const state = createTestLobbyState();
      const getShipName = (shipId) => `Ship ${shipId}`;

      const msg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      const result = handleShipAssignment(state, msg, getShipName);

      assert.ok(result.systemMessage);
      assert.ok(result.systemMessage.includes('GuestPlayer'));
      assert.ok(result.systemMessage.includes('Ship ship-1'));
    });

    it('generates system message for unassignment', () => {
      let state = createTestLobbyState();
      const assignMsg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      state = handleShipAssignment(state, assignMsg).state;

      const unassignMsg = createShipAssignmentMessage('guest-peer-id', null);
      const result = handleShipAssignment(state, unassignMsg);

      assert.ok(result.systemMessage);
      assert.ok(result.systemMessage.includes('GuestPlayer'));
      assert.ok(result.systemMessage.includes('unassigned'));
    });

    it('swaps ship when assigning to already-assigned ship', () => {
      let state = createTestLobbyState();

      // Add another guest
      state = {
        ...state,
        players: [...state.players, createGuestPlayer('guest-2', 'Guest2')],
      };

      // Assign first guest to ship
      const assignMsg1 = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      state = handleShipAssignment(state, assignMsg1).state;

      // Assign second guest to same ship - should unassign first guest
      const assignMsg2 = createShipAssignmentMessage('guest-2', 'ship-1');
      const result = handleShipAssignment(state, assignMsg2);

      const guest1 = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );
      const guest2 = result.state.players.find((p) => p.playerId === 'guest-2');

      assert.strictEqual(guest1.shipId, null);
      assert.strictEqual(guest2.shipId, 'ship-1');
    });
  });

  describe('Process Lobby Message', () => {
    it('routes PermissionUpdate to correct handler', () => {
      const state = createTestLobbyState();
      const newPermissions = {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      };

      const msg = createPermissionUpdateMessage(
        'guest-peer-id',
        newPermissions,
      );
      const result = processLobbyMessage(state, msg, 'host-peer-id');

      assert.ok(result);
      const guest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );
      assert.strictEqual(guest.permissions.canBuy, false);
    });

    it('routes ShipAssignment to correct handler', () => {
      const state = createTestLobbyState();

      const msg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      const result = processLobbyMessage(state, msg, 'host-peer-id');

      assert.ok(result);
      const guest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );
      assert.strictEqual(guest.shipId, 'ship-1');
    });

    it('passes options to handlers', () => {
      const state = createTestLobbyState();
      const getShipName = (shipId) => `Custom Ship ${shipId}`;

      const msg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      const result = processLobbyMessage(state, msg, 'host-peer-id', {
        getShipName,
      });

      assert.ok(result.systemMessage.includes('Custom Ship ship-1'));
    });
  });

  describe('Permission Change Integration', () => {
    it('permission change preserves other player data', () => {
      let state = createTestLobbyState();

      // Add some messages to chat
      const chatMsg = createChatMessage('guest-peer-id', 'Hello!');
      const chatResult = processLobbyMessage(state, chatMsg, 'host-peer-id');
      state = chatResult.state;

      // Now change permissions
      const permMsg = createPermissionUpdateMessage('guest-peer-id', {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      });
      const result = processLobbyMessage(state, permMsg, 'host-peer-id');

      // Chat messages should still be there
      assert.ok(result.state.chatMessages.length > 0);

      // Guest callsign should be preserved
      const guest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );
      assert.strictEqual(guest.callsign, 'GuestPlayer');
    });

    it('ship assignment preserves permissions', () => {
      let state = createTestLobbyState();

      // Change guest permissions first
      const permMsg = createPermissionUpdateMessage('guest-peer-id', {
        shipEdit: 'none',
        canBuy: false,
        canSell: false,
        canConvertScrap: false,
      });
      state = processLobbyMessage(state, permMsg, 'host-peer-id').state;

      // Now assign ship
      const shipMsg = createShipAssignmentMessage('guest-peer-id', 'ship-1');
      const result = processLobbyMessage(state, shipMsg, 'host-peer-id');

      const guest = result.state.players.find(
        (p) => p.playerId === 'guest-peer-id',
      );

      // Ship should be assigned
      assert.strictEqual(guest.shipId, 'ship-1');

      // Permissions should be preserved
      assert.strictEqual(guest.permissions.canBuy, false);
      assert.strictEqual(guest.permissions.shipEdit, 'none');
    });
  });
});
