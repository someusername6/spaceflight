/**
 * Buffer Bounds Validation Tests
 *
 * Tests for protocol security - buffer overflow prevention,
 * string length limits, and JSON parsing safety.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createReadBuffer,
  createWriteBuffer,
  decodeJson,
  MAX_MESSAGE_SIZE,
  MAX_STRING_LENGTH,
  ProtocolError,
  readBool,
  readByte,
  readFloat64,
  readString,
  readUint16,
  readUint32,
  stringSize,
  writeByte,
  writeString,
  writeUint32,
} from '../../../../src/multiplayer/protocol/buffer-utils.ts';
import {
  decodeMessage,
  encodeMessage,
  GameMessageType,
} from '../../../../src/multiplayer/protocol/index.ts';

describe('Buffer Bounds Validation', () => {
  describe('readString overflow protection', () => {
    it('throws ProtocolError when length exceeds buffer', () => {
      // Create buffer claiming 1000 bytes but only containing 10
      const wb = createWriteBuffer(14);
      writeUint32(wb, 1000); // Write length = 1000
      // Only write 10 actual bytes of content
      for (let i = 0; i < 10; i++) {
        writeByte(wb, 0x41); // 'A'
      }

      const rb = createReadBuffer(wb.buffer);
      assert.throws(
        () => readString(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('Buffer overflow'));
          return true;
        },
      );
    });

    it('throws ProtocolError on excessive length (DoS prevention)', () => {
      // Create buffer with length = 0xFFFFFFFF (max uint32)
      const wb = createWriteBuffer(4);
      writeUint32(wb, 0xffffffff);

      const rb = createReadBuffer(wb.buffer);
      assert.throws(
        () => readString(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('exceeds maximum'));
          return true;
        },
      );
    });

    it('throws ProtocolError when length exceeds MAX_STRING_LENGTH', () => {
      const wb = createWriteBuffer(4);
      writeUint32(wb, MAX_STRING_LENGTH + 1);

      const rb = createReadBuffer(wb.buffer);
      assert.throws(
        () => readString(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(
            err.message.includes(`${MAX_STRING_LENGTH + 1}`),
            'Error should contain the attempted length',
          );
          assert.ok(
            err.message.includes(`${MAX_STRING_LENGTH}`),
            'Error should contain the maximum',
          );
          return true;
        },
      );
    });
  });

  describe('writeString overflow protection', () => {
    it('throws ProtocolError when string exceeds MAX_STRING_LENGTH', () => {
      const hugeString = 'x'.repeat(MAX_STRING_LENGTH + 1);
      const wb = createWriteBuffer(stringSize(hugeString) + 100);
      assert.throws(
        () => writeString(wb, hugeString),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('exceeds maximum'));
          return true;
        },
      );
    });

    it('allows string at exactly MAX_STRING_LENGTH', () => {
      const maxString = 'x'.repeat(MAX_STRING_LENGTH);
      const wb = createWriteBuffer(stringSize(maxString) + 100);
      // Should not throw
      writeString(wb, maxString);
      assert.strictEqual(wb.offset, 4 + MAX_STRING_LENGTH);
    });
  });

  describe('readByte overflow protection', () => {
    it('throws ProtocolError on empty buffer', () => {
      const rb = createReadBuffer(new Uint8Array(0));
      assert.throws(
        () => readByte(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('Buffer overflow'));
          assert.ok(err.message.includes('need 1 bytes'));
          return true;
        },
      );
    });

    it('throws ProtocolError when reading past end', () => {
      const rb = createReadBuffer(new Uint8Array([0x42]));
      readByte(rb); // Consumes the only byte
      assert.throws(
        () => readByte(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('only 0 available'));
          return true;
        },
      );
    });
  });

  describe('readBool overflow protection', () => {
    it('throws ProtocolError on empty buffer', () => {
      const rb = createReadBuffer(new Uint8Array(0));
      assert.throws(
        () => readBool(rb),
        (err) => err instanceof ProtocolError,
      );
    });
  });

  describe('readUint16 overflow protection', () => {
    it('throws ProtocolError when only 1 byte available', () => {
      const rb = createReadBuffer(new Uint8Array([0x42]));
      assert.throws(
        () => readUint16(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('need 2 bytes'));
          return true;
        },
      );
    });

    it('throws ProtocolError on empty buffer', () => {
      const rb = createReadBuffer(new Uint8Array(0));
      assert.throws(
        () => readUint16(rb),
        (err) => err instanceof ProtocolError,
      );
    });
  });

  describe('readUint32 overflow protection', () => {
    it('throws ProtocolError when only 3 bytes available', () => {
      const rb = createReadBuffer(new Uint8Array([0x42, 0x42, 0x42]));
      assert.throws(
        () => readUint32(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('need 4 bytes'));
          return true;
        },
      );
    });
  });

  describe('readFloat64 overflow protection', () => {
    it('throws ProtocolError when only 7 bytes available', () => {
      const rb = createReadBuffer(new Uint8Array([1, 2, 3, 4, 5, 6, 7]));
      assert.throws(
        () => readFloat64(rb),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('need 8 bytes'));
          return true;
        },
      );
    });
  });

  describe('decodeJson safety', () => {
    it('throws ProtocolError on invalid JSON', () => {
      assert.throws(
        () => decodeJson('{invalid json}'),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('Invalid JSON'));
          return true;
        },
      );
    });

    it('throws ProtocolError on truncated JSON', () => {
      assert.throws(
        () => decodeJson('{"foo": "bar"'),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          return true;
        },
      );
    });

    it('parses valid JSON correctly', () => {
      const result = decodeJson('{"foo": "bar", "num": 42}');
      assert.deepStrictEqual(result, { foo: 'bar', num: 42 });
    });
  });

  describe('Message size limits', () => {
    it('decodeMessage throws on oversized message', () => {
      // Create a buffer larger than MAX_MESSAGE_SIZE
      const oversizedBuffer = new Uint8Array(MAX_MESSAGE_SIZE + 1);
      oversizedBuffer[0] = GameMessageType.ChatMessage;

      assert.throws(
        () => decodeMessage(oversizedBuffer),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('exceeds maximum'));
          return true;
        },
      );
    });

    it('encodeMessage throws on oversized campaign sync', () => {
      // Create a CampaignSync message with massive data
      const hugeData = 'x'.repeat(MAX_MESSAGE_SIZE + 1000);
      const msg = {
        type: GameMessageType.CampaignSync,
        campaignState: {
          seed: 12345,
          credits: 10000,
          scrap: 0,
          sector: 1,
          currentContracts: [],
          completedContracts: [],
          availableContracts: [],
          roster: [],
          storage: [],
          difficulty: 'normal',
          startedAt: 0,
          commanderShipId: 'ship-1',
          commanderCallsign: 'Alpha',
          flagshipId: null,
          spentCredits: 0,
          earnedCredits: 0,
          missionsCompleted: 0,
          missionsFailed: 0,
          shipsLost: 0,
          enemiesDestroyed: 0,
          largeData: hugeData,
        },
      };

      assert.throws(
        () => encodeMessage(msg),
        (err) => {
          assert.ok(err instanceof ProtocolError);
          assert.ok(err.message.includes('exceeds maximum'));
          return true;
        },
      );
    });
  });

  describe('Valid operations still work', () => {
    it('normal string round-trip works', () => {
      const testString = 'Hello, World!';
      const wb = createWriteBuffer(100);
      writeString(wb, testString);

      const rb = createReadBuffer(wb.buffer.slice(0, wb.offset));
      const result = readString(rb);
      assert.strictEqual(result, testString);
    });

    it('Unicode string round-trip works', () => {
      const testString = 'Hello \u{1F680} Rocket!';
      const wb = createWriteBuffer(100);
      writeString(wb, testString);

      const rb = createReadBuffer(wb.buffer.slice(0, wb.offset));
      const result = readString(rb);
      assert.strictEqual(result, testString);
    });

    it('ChatMessage round-trip works', () => {
      const msg = {
        type: GameMessageType.ChatMessage,
        fromPlayerId: 'peer-1',
        text: 'Test message',
        timestamp: 1234567890,
      };

      const encoded = encodeMessage(msg);
      const decoded = decodeMessage(encoded);

      assert.strictEqual(decoded.type, GameMessageType.ChatMessage);
      assert.strictEqual(decoded.fromPlayerId, 'peer-1');
      assert.strictEqual(decoded.text, 'Test message');
    });

    it('multiple sequential reads work correctly', () => {
      const wb = createWriteBuffer(100);
      writeByte(wb, 0x42);
      writeUint32(wb, 12345);
      writeString(wb, 'test');

      const rb = createReadBuffer(wb.buffer.slice(0, wb.offset));
      assert.strictEqual(readByte(rb), 0x42);
      assert.strictEqual(readUint32(rb), 12345);
      assert.strictEqual(readString(rb), 'test');
    });
  });

  describe('ProtocolError class', () => {
    it('has correct name property', () => {
      const err = new ProtocolError('test message');
      assert.strictEqual(err.name, 'ProtocolError');
    });

    it('is instanceof Error', () => {
      const err = new ProtocolError('test message');
      assert.ok(err instanceof Error);
    });

    it('preserves message', () => {
      const err = new ProtocolError('specific error message');
      assert.strictEqual(err.message, 'specific error message');
    });
  });
});
