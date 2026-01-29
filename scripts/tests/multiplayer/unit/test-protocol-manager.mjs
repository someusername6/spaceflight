/**
 * CampaignSyncManager Tests
 *
 * Tests for campaign state synchronization between host and guests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { CampaignSyncManager } from '../../../../src/multiplayer/campaign-sync.ts';
import {
  decodeMessage,
  encodeMessage,
  GameMessageType,
} from '../../../../src/multiplayer/protocol/index.ts';
import { createMessageRouter } from '../../../../src/multiplayer/protocol/router.ts';
import {
  createMockTransport,
  createTestCampaignState,
  createTestPlayerInfo,
} from './protocol-helpers.mjs';

describe('CampaignSyncManager', () => {
  describe('host mode', () => {
    it('should set and get campaign state', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const manager = new CampaignSyncManager(router, true);
      const state = createTestCampaignState();
      state.credits = 50000;

      manager.setCampaignState(state);
      manager.syncCampaign();

      const broadcasts = transport.getBroadcastMessages();
      assert.strictEqual(broadcasts.length, 1);

      const decoded = decodeMessage(broadcasts[0].data);
      assert.strictEqual(decoded.type, GameMessageType.CampaignSync);
      assert.strictEqual(decoded.campaignState.credits, 50000);
    });

    it('should not broadcast if no campaign state set', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const manager = new CampaignSyncManager(router, true);
      manager.syncCampaign();

      const broadcasts = transport.getBroadcastMessages();
      assert.strictEqual(broadcasts.length, 0);
    });

    it('should manage player info', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const manager = new CampaignSyncManager(router, true);
      const playerInfo = createTestPlayerInfo('peer-1', 'Player1', 'ship-1');

      manager.setPlayerInfo('peer-1', playerInfo);
      manager.removePlayerInfo('peer-1');

      assert.ok(true);
    });
  });

  describe('guest mode', () => {
    it('should get campaign state', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const manager = new CampaignSyncManager(router, false);
      assert.strictEqual(manager.getCampaignState(), null);
    });

    it('should not broadcast in guest mode', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const manager = new CampaignSyncManager(router, false);
      manager.syncCampaign();

      const broadcasts = transport.getBroadcastMessages();
      assert.strictEqual(broadcasts.length, 0);
    });
  });

  describe('onCampaignUpdate callback', () => {
    it('should be called when campaign state is updated (guest)', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const manager = new CampaignSyncManager(router, false);

      // Simulate receiving Welcome first (sets welcomeReceived flag)
      // In real usage, Welcome handler in lobby-protocol-routing.ts calls this
      manager.setCampaignState(createTestCampaignState());

      let updatedState = null;
      manager.onCampaignUpdate = (state) => {
        updatedState = state;
      };

      const syncMsg = {
        type: GameMessageType.CampaignSync,
        campaignState: createTestCampaignState(),
      };
      syncMsg.campaignState.credits = 77777;

      router.dispatch(encodeMessage(syncMsg), 'host-peer');

      assert.ok(updatedState !== null);
      assert.strictEqual(updatedState.credits, 77777);
    });

    it('should ignore CampaignSync before Welcome is received', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const manager = new CampaignSyncManager(router, false);

      let updatedState = null;
      manager.onCampaignUpdate = (state) => {
        updatedState = state;
      };

      // Send CampaignSync WITHOUT calling setCampaignState first (no Welcome)
      const syncMsg = {
        type: GameMessageType.CampaignSync,
        campaignState: createTestCampaignState(),
      };

      router.dispatch(encodeMessage(syncMsg), 'host-peer');

      // Should be ignored - updatedState should remain null
      assert.strictEqual(updatedState, null);
      assert.strictEqual(manager.getCampaignState(), null);
    });

    // Note: Welcome message handling is done externally in lobby-protocol-routing.ts,
    // not in CampaignSyncManager. The manager only handles CampaignSync messages
    // for guests. Welcome handler is registered separately via wireMessageHandlers.
  });

  describe('dispose', () => {
    it('should clear state and callbacks', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const manager = new CampaignSyncManager(router, true);
      manager.setCampaignState(createTestCampaignState());
      manager.onCampaignUpdate = () => {};

      manager.dispose();

      manager.syncCampaign();
      const broadcasts = transport.getBroadcastMessages();
      assert.strictEqual(broadcasts.length, 0);
    });
  });
});
