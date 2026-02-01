/**
 * Unit tests for Lambda handler.
 * Tests request parsing and response formatting.
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the route function to isolate handler testing
vi.mock('../src/router', () => ({
  route: vi.fn(),
}));

// Mock storage and rate limiter creation
vi.mock('../src/storage/dynamodb-storage', () => ({
  createStorage: vi.fn(() => ({})),
}));

vi.mock('../src/rate-limiter/dynamodb-rate-limiter', () => ({
  createRateLimiter: vi.fn(() => ({})),
}));

import { handler } from '../src/index';
import { route } from '../src/router';

const mockRoute = vi.mocked(route);

function createEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/health',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'example.com',
      domainPrefix: 'example',
      http: {
        method: 'GET',
        path: '/health',
        protocol: 'HTTP/1.1',
        sourceIp: '192.168.1.1',
        userAgent: 'test-agent',
      },
      requestId: 'request-id',
      routeKey: '$default',
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    isBase64Encoded: false,
    ...overrides,
  };
}

describe('Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request parsing', () => {
    it('extracts method from event', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          http: {
            ...createEvent().requestContext.http,
            method: 'POST',
          },
        },
      });

      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('extracts path from event', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({ rawPath: '/rooms/TESTROOM/join' });
      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/rooms/TESTROOM/join' }),
      );
    });

    it('extracts IP from event', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          http: {
            ...createEvent().requestContext.http,
            sourceIp: '10.0.0.1',
          },
        },
      });

      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ clientIp: '10.0.0.1' }),
      );
    });

    it('extracts authorization header', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({
        headers: { authorization: 'Bearer test-token' },
      });

      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ authorization: 'Bearer test-token' }),
      );
    });

    it('parses JSON body correctly', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({
        body: JSON.stringify({ gameVersion: '1.0.0' }),
      });

      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ body: { gameVersion: '1.0.0' } }),
      );
    });

    it('returns 400 for invalid JSON', async () => {
      const event = createEvent({
        body: 'not valid json {',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'bad_request',
        message: 'Invalid JSON body',
      });
      expect(mockRoute).not.toHaveBeenCalled();
    });

    it('handles missing body gracefully', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({ body: undefined });
      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ body: undefined }),
      );
    });

    it('parses query parameters', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({
        queryStringParameters: { since: '1234567890' },
      });

      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ query: { since: '1234567890' } }),
      );
    });

    it('handles missing query parameters', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent({
        queryStringParameters: undefined,
      });

      await handler(event);

      expect(mockRoute).toHaveBeenCalledWith(
        expect.objectContaining({ query: {} }),
      );
    });
  });

  describe('Response formatting', () => {
    it('returns correct status code', async () => {
      mockRoute.mockResolvedValue({ status: 201, body: {} });

      const event = createEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
    });

    it('sets Content-Type header', async () => {
      mockRoute.mockResolvedValue({ status: 200, body: {} });

      const event = createEvent();
      const result = await handler(event);

      expect(result.headers).toEqual(
        expect.objectContaining({ 'Content-Type': 'application/json' }),
      );
    });

    it('stringifies body as JSON', async () => {
      mockRoute.mockResolvedValue({
        status: 200,
        body: { roomCode: 'TESTROOM', hostId: 'peer-123' },
      });

      const event = createEvent();
      const result = await handler(event);

      expect(JSON.parse(result.body)).toEqual({
        roomCode: 'TESTROOM',
        hostId: 'peer-123',
      });
    });
  });
});
