/**
 * DynamoDB-backed rate limiter for AWS signaling server.
 * Uses atomic counters with sliding windows for stateless Lambda rate limiting.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Config } from '../config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export interface RateLimiter {
  checkJoin(ip: string): Promise<RateLimitResult>;
  checkCreate(ip: string): Promise<RateLimitResult>;
  checkSignal(roomCode: string, peerId: string): Promise<RateLimitResult>;
}

export class DynamoDBRateLimiter implements RateLimiter {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private config: Config;

  constructor(config: Config, client?: DynamoDBDocumentClient) {
    this.client = client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName = config.tableName;
    this.config = config;
  }

  /** Check join rate limit (per-second, per-IP) */
  async checkJoin(ip: string): Promise<RateLimitResult> {
    return this.checkLimit(ip, 'join', this.config.joinRateLimitPerSecond, 1);
  }

  /** Check create rate limit (per-minute, per-IP) */
  async checkCreate(ip: string): Promise<RateLimitResult> {
    return this.checkLimit(
      ip,
      'create',
      this.config.createRateLimitPerMinute,
      60,
    );
  }

  /** Check signal rate limit (per-second, per-peer) */
  async checkSignal(
    roomCode: string,
    peerId: string,
  ): Promise<RateLimitResult> {
    const key = `${roomCode}:${peerId}`;
    return this.checkLimit(
      key,
      'signal',
      this.config.signalRateLimitPerSecond,
      1,
    );
  }

  /**
   * Check and increment rate limit counter.
   * Uses atomic UpdateItem to prevent race conditions.
   */
  private async checkLimit(
    key: string,
    type: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const pk = `RATELIMIT#${key}#${type}`;
    const expiresAt = windowStart + windowSeconds + 60; // Buffer for TTL

    try {
      // Atomic increment with window check
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: pk, SK: '#' },
          UpdateExpression: `
            SET #count = if_not_exists(#count, :zero) + :one,
                #window = if_not_exists(#window, :windowStart),
                #expires = :expiresAt
          `,
          ConditionExpression:
            'attribute_not_exists(#window) OR #window = :windowStart',
          ExpressionAttributeNames: {
            '#count': 'count',
            '#window': 'windowStart',
            '#expires': 'expiresAt',
          },
          ExpressionAttributeValues: {
            ':zero': 0,
            ':one': 1,
            ':windowStart': windowStart,
            ':expiresAt': expiresAt,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      const count = (result.Attributes?.count as number) ?? 1;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
      };
    } catch (error: unknown) {
      if (
        (error as { name?: string }).name === 'ConditionalCheckFailedException'
      ) {
        // Window changed, reset counter
        await this.client.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { PK: pk, SK: '#' },
            UpdateExpression:
              'SET #count = :one, #window = :windowStart, #expires = :expiresAt',
            ExpressionAttributeNames: {
              '#count': 'count',
              '#window': 'windowStart',
              '#expires': 'expiresAt',
            },
            ExpressionAttributeValues: {
              ':one': 1,
              ':windowStart': windowStart,
              ':expiresAt': expiresAt,
            },
          }),
        );
        return { allowed: true, remaining: limit - 1 };
      }
      throw error;
    }
  }
}

export function createRateLimiter(
  config: Config,
  client?: DynamoDBDocumentClient,
): RateLimiter {
  return new DynamoDBRateLimiter(config, client);
}
