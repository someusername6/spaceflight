/**
 * Protocol Router Tests
 *
 * Tests for MessageRouter message dispatch and send helpers.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  encodeMessage,
  GameMessageType,
} from '../../../../src/multiplayer/protocol/index.ts';
import { createMessageRouter } from '../../../../src/multiplayer/protocol/router-factory.ts';
import {
  createMockTransport,
  createTestCampaignState,
} from './protocol-helpers.mjs';

describe('MessageRouter', () => {
  describe('dispatch', () => {
    it('should return false for non-game messages', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const nonGameMessage = new Uint8Array([0x01, 0x02, 0x03]);
      const result = router.dispatch(nonGameMessage, 'peer-1');
      assert.strictEqual(result, false);
    });

    it('should return true for game messages', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'hello',
        timestamp: 123,
      };
      const encoded = encodeMessage(msg);
      const result = router.dispatch(encoded, 'peer-1');
      assert.strictEqual(result, true);
    });

    it('should call registered handler for message type', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      let receivedMsg = null;
      let receivedFromPeerId = null;
      router.onChatMessage((msg, fromPeerId) => {
        receivedMsg = msg;
        receivedFromPeerId = fromPeerId;
      });

      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'hello',
        timestamp: 123,
      };
      const encoded = encodeMessage(msg);
      router.dispatch(encoded, 'peer-1');

      assert.strictEqual(receivedMsg.text, 'hello');
      assert.strictEqual(receivedFromPeerId, 'peer-1');
    });

    it('should reject host-only messages from non-host peers', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      let unauthorizedCalled = false;
      router.onUnauthorizedMessage = (_msg, fromPeerId) => {
        unauthorizedCalled = true;
        assert.strictEqual(fromPeerId, 'fake-host');
      };

      const msg = {
        type: GameMessageType.CampaignSync,
        campaignState: createTestCampaignState(),
      };
      const encoded = encodeMessage(msg);

      router.dispatch(encoded, 'fake-host');
      assert.strictEqual(unauthorizedCalled, true);
    });

    it('should accept host-only messages from host peer', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      let handlerCalled = false;
      router.onCampaignSync(() => {
        handlerCalled = true;
      });

      const msg = {
        type: GameMessageType.CampaignSync,
        campaignState: createTestCampaignState(),
      };
      const encoded = encodeMessage(msg);

      router.dispatch(encoded, 'host-peer');
      assert.strictEqual(handlerCalled, true);
    });

    it('should call onError for malformed messages', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      let errorCalled = false;
      router.onError = (error) => {
        errorCalled = true;
        assert.ok(error instanceof Error);
      };

      const malformed = new Uint8Array([0x80]);
      router.dispatch(malformed, 'peer-1');
      assert.strictEqual(errorCalled, true);
    });
  });

  describe('send helpers', () => {
    it('sendToHost should send to host peer', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const msg = {
        type: GameMessageType.ReadyState,
        playerId: 'peer-1',
        ready: true,
      };
      router.sendToHost(msg);

      const sent = transport.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].peerId, 'host-peer');
    });

    it('sendToHost should be no-op if local peer is host', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const msg = {
        type: GameMessageType.ReadyState,
        playerId: 'peer-1',
        ready: true,
      };
      router.sendToHost(msg);

      const sent = transport.getSentMessages();
      assert.strictEqual(sent.length, 0);
    });

    it('sendToPeer should send to specific peer', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const msg = {
        type: GameMessageType.ActionResponse,
        requestId: 42,
        success: true,
      };
      router.sendToPeer('peer-2', msg);

      const sent = transport.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].peerId, 'peer-2');
    });

    it('broadcast should send to all peers', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const msg = {
        type: GameMessageType.CampaignSync,
        campaignState: createTestCampaignState(),
      };
      router.broadcast(msg);

      const broadcasts = transport.getBroadcastMessages();
      assert.strictEqual(broadcasts.length, 1);
    });

    it('broadcastExcept should send to all peers except one', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: true,
      });

      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'hello',
        timestamp: 123,
      };
      router.broadcastExcept(msg, 'peer-1');

      const sent = transport.getSentMessages();
      assert.strictEqual(sent.length, 2);
      assert.ok(sent.every((s) => s.peerId !== 'peer-1'));
    });
  });

  describe('handler registration', () => {
    it('should support fluent chaining', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      const result = router
        .onWelcome(() => {})
        .onPlayerJoined(() => {})
        .onChatMessage(() => {});

      assert.strictEqual(result, router);
    });
  });

  describe('dispose', () => {
    it('should clear all handlers', () => {
      const transport = createMockTransport();
      const router = createMessageRouter({
        transport,
        hostPeerId: 'host-peer',
        isHost: false,
      });

      let handlerCalled = false;
      router.onChatMessage(() => {
        handlerCalled = true;
      });

      router.dispose();

      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'hello',
        timestamp: 123,
      };
      router.dispatch(encodeMessage(msg), 'peer-1');

      assert.strictEqual(handlerCalled, false);
    });
  });
});
