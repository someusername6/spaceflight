/**
 * Chat Validation Tests
 *
 * Tests for chat message validation including rate limiting and length checks.
 */

import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import {
  clearAllRateLimits,
  validateChatMessage,
} from '../../../../src/multiplayer/chat-validation.ts';

describe('Chat Validation', () => {
  beforeEach(() => {
    // Reset rate limit state before each test
    clearAllRateLimits();
  });

  describe('validateChatMessage', () => {
    it('accepts valid messages', () => {
      const result = validateChatMessage('player-1', 'Hello world!');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, undefined);
    });

    it('accepts messages at exactly max length', () => {
      const maxLengthMessage = 'a'.repeat(200);
      const result = validateChatMessage('player-1', maxLengthMessage);
      assert.strictEqual(result.valid, true);
    });

    it('rejects messages exceeding max length', () => {
      const tooLongMessage = 'a'.repeat(201);
      const result = validateChatMessage('player-1', tooLongMessage);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('200'));
    });

    it('rejects empty messages', () => {
      const result = validateChatMessage('player-1', '');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('empty'));
    });

    it('rejects whitespace-only messages', () => {
      const result = validateChatMessage('player-1', '   ');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('empty'));
    });

    it('enforces rate limit for same player', async () => {
      // First message should succeed
      const result1 = validateChatMessage('player-1', 'First message');
      assert.strictEqual(result1.valid, true);

      // Immediate second message should fail
      const result2 = validateChatMessage('player-1', 'Second message');
      assert.strictEqual(result2.valid, false);
      assert.ok(result2.error?.includes('wait'));
    });

    it('allows rapid messages from different players', () => {
      const result1 = validateChatMessage('player-1', 'From player 1');
      assert.strictEqual(result1.valid, true);

      const result2 = validateChatMessage('player-2', 'From player 2');
      assert.strictEqual(result2.valid, true);
    });

    it('allows message after rate limit period', async () => {
      const result1 = validateChatMessage('player-1', 'First message');
      assert.strictEqual(result1.valid, true);

      // Wait for rate limit to expire (1000ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result2 = validateChatMessage('player-1', 'Second message');
      assert.strictEqual(result2.valid, true);
    });
  });
});
