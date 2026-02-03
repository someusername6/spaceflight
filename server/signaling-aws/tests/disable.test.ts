/**
 * Unit tests for auto-disable Lambda handler.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock AWS SDK before importing the handler
const mockSend = vi.fn();
const commandCalls: unknown[] = [];
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class {
    send = mockSend;
  },
  PutFunctionConcurrencyCommand: class {
    input: unknown;
    constructor(params: unknown) {
      this.input = params;
      commandCalls.push(params);
    }
  },
}));

import { type AlarmEvent, handler } from '../src/disable';

describe('Disable Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commandCalls.length = 0;
    mockSend.mockResolvedValue({});
  });

  describe('handler', () => {
    it('sets concurrency to 0 for target function', async () => {
      const event: AlarmEvent = {
        source: 'aws.cloudwatch',
        'detail-type': 'CloudWatch Alarm State Change',
        detail: {
          alarmName: 'spaceflight-signaling-invocation-limit',
          state: {
            value: 'ALARM',
            reason: 'Threshold exceeded',
          },
        },
      };

      await handler(event);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(commandCalls[0]).toEqual({
        FunctionName: 'spaceflight-signaling',
        ReservedConcurrentExecutions: 0,
      });
    });

    it('handles events without detail gracefully', async () => {
      const event: AlarmEvent = {};

      await handler(event);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(commandCalls[0]).toEqual({
        FunctionName: 'spaceflight-signaling',
        ReservedConcurrentExecutions: 0,
      });
    });

    it('throws on failure to trigger DLQ', async () => {
      const error = new Error('Lambda API error');
      mockSend.mockRejectedValue(error);

      const event: AlarmEvent = {
        source: 'aws.cloudwatch',
        'detail-type': 'CloudWatch Alarm State Change',
        detail: {
          alarmName: 'spaceflight-signaling-invocation-limit',
          state: {
            value: 'ALARM',
          },
        },
      };

      await expect(handler(event)).rejects.toThrow('Lambda API error');
    });

    it('logs event details for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const event: AlarmEvent = {
        source: 'aws.cloudwatch',
        detail: {
          alarmName: 'test-alarm',
          state: {
            value: 'ALARM',
            reason: 'Test reason',
          },
        },
      };

      await handler(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Auto-disable triggered. Event:',
        JSON.stringify(event),
      );
      expect(consoleSpy).toHaveBeenCalledWith('Alarm name:', 'test-alarm');
      expect(consoleSpy).toHaveBeenCalledWith('Alarm state:', 'ALARM');
      expect(consoleSpy).toHaveBeenCalledWith('Reason:', 'Test reason');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Successfully disabled spaceflight-signaling',
      );
    });

    it('logs error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');
      mockSend.mockRejectedValue(error);

      await expect(handler({})).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to disable Lambda:',
        error,
      );
    });
  });

  describe('environment configuration', () => {
    it('uses default function name when env var not set', async () => {
      // Default is already tested above ('spaceflight-signaling')
      await handler({});

      expect(commandCalls[0]).toEqual(
        expect.objectContaining({
          FunctionName: 'spaceflight-signaling',
        }),
      );
    });
  });
});
