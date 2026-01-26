/**
 * Protocol Encoding Tests
 *
 * Tests for game protocol message encoding and decoding.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  decodeMessage,
  encodeMessage,
  GameMessageType,
} from '../../../src/multiplayer/protocol/index.ts';
import {
  createTestCampaignState,
  createTestPlayerInfo,
} from './protocol-test-helpers.mjs';

describe('Protocol Encoding', () => {
  describe('Welcome message', () => {
    it('should round-trip encode/decode Welcome message', () => {
      const campaignState = createTestCampaignState();
      const players = [
        createTestPlayerInfo('peer-1', 'Host'),
        createTestPlayerInfo('peer-2', 'Guest'),
      ];

      const msg = {
        type: GameMessageType.Welcome,
        playerId: 'peer-2',
        campaignState,
        players,
      };

      const encoded = encodeMessage(msg);
      assert.ok(encoded instanceof Uint8Array, 'Encoded should be Uint8Array');
      assert.strictEqual(encoded[0], 0x80, 'First byte should be Welcome type');

      const decoded = decodeMessage(encoded);
      assert.strictEqual(decoded.type, GameMessageType.Welcome);
      assert.strictEqual(decoded.playerId, 'peer-2');
      assert.strictEqual(decoded.campaignState.credits, 10000);
      assert.strictEqual(decoded.players.length, 2);
      assert.strictEqual(decoded.players[0].callsign, 'Host');
    });
  });

  describe('PlayerJoinedExt message', () => {
    it('should round-trip encode/decode PlayerJoinedExt message', () => {
      const msg = {
        type: GameMessageType.PlayerJoinedExt,
        player: createTestPlayerInfo('peer-3', 'NewPlayer', 'ship-1'),
      };

      const encoded = encodeMessage(msg);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.PlayerJoinedExt);
      assert.strictEqual(decoded.player.playerId, 'peer-3');
      assert.strictEqual(decoded.player.callsign, 'NewPlayer');
      assert.strictEqual(decoded.player.shipId, 'ship-1');
    });
  });

  describe('PlayerLeftExt message', () => {
    it('should round-trip encode/decode with reason disconnected', () => {
      const msg = {
        type: GameMessageType.PlayerLeftExt,
        playerId: 'peer-2',
        reason: 'disconnected',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.playerId, 'peer-2');
      assert.strictEqual(decoded.reason, 'disconnected');
    });

    it('should round-trip encode/decode with reason kicked', () => {
      const msg = {
        type: GameMessageType.PlayerLeftExt,
        playerId: 'peer-2',
        reason: 'kicked',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.reason, 'kicked');
    });
  });

  describe('ChatMessage message', () => {
    it('should round-trip encode/decode ChatMessage', () => {
      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'Hello, world!',
        timestamp: 1234567890123,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.fromPlayerId, 'peer-1');
      assert.strictEqual(decoded.text, 'Hello, world!');
      assert.strictEqual(decoded.timestamp, 1234567890123);
    });

    it('should handle Unicode characters', () => {
      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'Hello \u{1F680} Rocket!',
        timestamp: 1234567890123,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.text, 'Hello \u{1F680} Rocket!');
    });
  });

  describe('ReadyState message', () => {
    it('should round-trip encode/decode ReadyState', () => {
      const msg = {
        type: GameMessageType.ReadyState,
        playerId: 'peer-2',
        ready: true,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.playerId, 'peer-2');
      assert.strictEqual(decoded.ready, true);
    });
  });

  describe('PermissionUpdate message', () => {
    it('should round-trip encode/decode PermissionUpdate', () => {
      const msg = {
        type: GameMessageType.PermissionUpdate,
        playerId: 'peer-2',
        permissions: {
          shipEdit: 'none',
          canBuy: false,
          canSell: true,
          canConvertScrap: false,
        },
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.playerId, 'peer-2');
      assert.strictEqual(decoded.permissions.shipEdit, 'none');
      assert.strictEqual(decoded.permissions.canBuy, false);
      assert.strictEqual(decoded.permissions.canSell, true);
    });
  });

  describe('ShipAssignment message', () => {
    it('should round-trip encode/decode with ship assigned', () => {
      const msg = {
        type: GameMessageType.ShipAssignment,
        playerId: 'peer-2',
        shipId: 'ship-5',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.playerId, 'peer-2');
      assert.strictEqual(decoded.shipId, 'ship-5');
    });

    it('should round-trip encode/decode with null ship', () => {
      const msg = {
        type: GameMessageType.ShipAssignment,
        playerId: 'peer-2',
        shipId: null,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.shipId, null);
    });
  });

  describe('CampaignSync message', () => {
    it('should round-trip encode/decode CampaignSync', () => {
      const campaignState = createTestCampaignState();
      campaignState.credits = 99999;

      const msg = {
        type: GameMessageType.CampaignSync,
        campaignState,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.campaignState.credits, 99999);
      assert.strictEqual(decoded.campaignState.seed, 12345);
    });
  });

  describe('ActionRequest message', () => {
    it('should round-trip encode/decode buy action', () => {
      const msg = {
        type: GameMessageType.ActionRequest,
        requestId: 42,
        action: {
          type: 'buy',
          itemType: 'ship',
          itemId: 'interceptor',
          quantity: 1,
        },
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.requestId, 42);
      assert.strictEqual(decoded.action.type, 'buy');
      assert.strictEqual(decoded.action.itemId, 'interceptor');
    });

    it('should round-trip encode/decode equip action', () => {
      const msg = {
        type: GameMessageType.ActionRequest,
        requestId: 100,
        action: {
          type: 'equip',
          shipId: 'ship-1',
          slotIndex: 0,
          storageIndex: 5,
          bankSize: 2,
          category: 'primary',
        },
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.action.type, 'equip');
      assert.strictEqual(decoded.action.shipId, 'ship-1');
      assert.strictEqual(decoded.action.storageIndex, 5);
      assert.strictEqual(decoded.action.bankSize, 2);
    });
  });

  describe('ActionResponse message', () => {
    it('should round-trip encode/decode success response', () => {
      const msg = {
        type: GameMessageType.ActionResponse,
        requestId: 42,
        success: true,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.requestId, 42);
      assert.strictEqual(decoded.success, true);
      assert.strictEqual(decoded.error, undefined);
    });

    it('should round-trip encode/decode failure response', () => {
      const msg = {
        type: GameMessageType.ActionResponse,
        requestId: 42,
        success: false,
        error: 'Insufficient credits',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.success, false);
      assert.strictEqual(decoded.error, 'Insufficient credits');
    });
  });

  describe('ContractAccepted message', () => {
    it('should round-trip encode/decode ContractAccepted', () => {
      const msg = {
        type: GameMessageType.ContractAccepted,
        contractId: 'sector1-mission3',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.contractId, 'sector1-mission3');
    });
  });

  describe('LaunchCountdown message', () => {
    it('should round-trip encode/decode LaunchCountdown', () => {
      const msg = {
        type: GameMessageType.LaunchCountdown,
        secondsRemaining: 5,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.secondsRemaining, 5);
    });
  });

  describe('LaunchAborted message', () => {
    it('should round-trip encode/decode LaunchAborted', () => {
      const msg = {
        type: GameMessageType.LaunchAborted,
        reason: 'Player not ready',
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.reason, 'Player not ready');
    });
  });

  describe('MissionStarted message', () => {
    it('should round-trip encode/decode MissionStarted', () => {
      const msg = {
        type: GameMessageType.MissionStarted,
        contractId: 'sector1-mission3',
        seed: 987654321,
      };

      const decoded = decodeMessage(encodeMessage(msg));
      assert.strictEqual(decoded.contractId, 'sector1-mission3');
      assert.strictEqual(decoded.seed, 987654321);
    });
  });
});
