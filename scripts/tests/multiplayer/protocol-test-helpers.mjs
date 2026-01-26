/**
 * Shared Test Helpers for Protocol Tests
 *
 * Common utilities and mock objects used across protocol test files.
 */

import { DEFAULT_PERMISSION } from '../../../src/multiplayer/protocol/index.ts';

// =============================================================================
// Campaign State Helpers
// =============================================================================

/** Create a minimal campaign state for testing */
export function createTestCampaignState() {
  return {
    settings: {
      commanderName: 'TestCommander',
      ironmanMode: false,
      autoaimDegrees: 2.5,
    },
    seed: 12345,
    nextId: 100,
    credits: 10000,
    commanderId: 'pilot-1',
    ships: [],
    pilots: [],
    storedShips: [],
    storedWeapons: [],
    storedAmmo: [],
    storedScrap: {},
    storeStock: {
      ships: {},
      primaries: {},
      secondaries: {},
      ammo: {},
    },
    availableRecruits: [],
    currentSector: 1,
    sectorMissionsCompleted: 0,
    completedContracts: [],
    attemptedContracts: [],
    contractRefreshCount: 0,
    missionCount: 0,
  };
}

// =============================================================================
// Player Info Helpers
// =============================================================================

/** Create a test player info */
export function createTestPlayerInfo(playerId, callsign, shipId = null) {
  return {
    playerId,
    callsign,
    shipId,
    ready: false,
    permissions: { ...DEFAULT_PERMISSION },
  };
}

// =============================================================================
// Mock Transport Adapter
// =============================================================================

/** Create a mock transport adapter for testing */
export function createMockTransport() {
  const sentMessages = [];
  const broadcastMessages = [];
  return {
    connectedPeers: new Set(['peer-1', 'peer-2', 'peer-3']),
    onMessage: null,
    onConnect: null,
    onDisconnect: null,
    send(peerId, data, _reliable) {
      sentMessages.push({ peerId, data });
    },
    broadcast(data, _reliable) {
      broadcastMessages.push({ data });
    },
    // Test helpers
    getSentMessages() {
      return sentMessages;
    },
    getBroadcastMessages() {
      return broadcastMessages;
    },
    clearMessages() {
      sentMessages.length = 0;
      broadcastMessages.length = 0;
    },
  };
}
