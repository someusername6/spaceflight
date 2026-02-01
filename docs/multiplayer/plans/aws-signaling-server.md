# AWS Production Signaling Server Plan

## Overview

Production signaling server using AWS Lambda Function URLs + DynamoDB, designed to:
- Stay within AWS free tier for normal usage
- Auto-disable on abnormal usage to prevent cost overruns
- Maintain API compatibility with the local development server

**Target Region:** `us-east-1` (lowest Lambda pricing, most services available)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Cloud (us-east-1)                       │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Lambda Function │───▶│    DynamoDB      │                   │
│  │  (Function URL)  │    │  (Provisioned)   │                   │
│  └────────▲─────────┘    └──────────────────┘                   │
│           │                                                      │
│  ┌────────┴─────────┐    ┌──────────────────┐                   │
│  │ CloudWatch Alarm │───▶│ Disable Lambda   │                   │
│  │ (invocations)    │    │ (set concurrency │                   │
│  └──────────────────┘    │  to 0)           │                   │
│           ▲              └──────────────────┘                   │
│           │                                                      │
│  ┌────────┴─────────┐                                           │
│  │   EventBridge    │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
            ▲
            │ HTTPS
            │
      ┌─────┴─────┐
      │  Browser  │
      └───────────┘
```

## Cost Analysis

### AWS Free Tier (Perpetual)

| Service | Free Tier Limit | Notes |
|---------|-----------------|-------|
| Lambda invocations | 1M/month | ~33k-50k sessions depending on polling |
| Lambda compute | 400k GB-seconds/month | |
| DynamoDB (provisioned) | 25 RCU + 25 WCU | Hard rate limit, not usage cap |
| Lambda Function URLs | Unlimited | Bypasses API Gateway |

### Projected Costs

| Scenario | Monthly Cost |
|----------|--------------|
| Normal indie usage (<10k sessions) | $0 |
| Heavy usage (50k sessions) | $0 (within free tier) |
| Sustained DDoS (auto-disabled at 30k/hour) | $0 |

**Note:** Cost estimates assume efficient DynamoDB queries. Inefficient queries (fetching all signals then filtering) would consume more RCU and approach limits faster.

### Why Lambda Function URLs

API Gateway free tier expires after 12 months. Lambda Function URLs are free forever and provide the same HTTPS endpoint functionality for this use case.

---

## Component 1: DynamoDB Table

### Single-Table Design

```
Table: spaceflight-signaling
Partition Key: PK (String)
Sort Key: SK (String)
TTL Attribute: expiresAt

Provisioned: 25 RCU, 25 WCU (free tier)
```

### Item Patterns

| Item Type | PK | SK | Attributes | TTL |
|-----------|----|----|------------|-----|
| Room | `ROOM#{code}` | `#META` | hostId, gameVersion, state, createdAt, lastActivity, kickedCallsigns[] | now + 3600s |
| Peer | `ROOM#{code}` | `PEER#{peerId}` | token, joinedAt, callsign | now + 3600s |
| Signal | `ROOM#{code}` | `SIG#{toPeerId}#{timestamp}#{uuid}` | fromPeerId, type, data, createdAt | now + 60s |
| Event | `ROOM#{code}` | `EVT#{timestamp}#{uuid}` | type, data, createdAt | now + 60s |
| Token Index | `TOKEN#{token}` | `#` | roomCode, peerId | now + 3600s |
| Rate Limit | `RATELIMIT#{key}#{type}` | `#` | count, windowStart | now + 120s |

**Note:** Signal and Event items include a `createdAt` attribute (Unix seconds) for FilterExpression queries. The timestamp in SK is for sorting; `createdAt` enables efficient "since" filtering.

**Key design decisions:**

1. **Signal SK includes `toPeerId`** — Enables efficient query for signals addressed to a specific peer without post-filtering
2. **Timestamp format** — All timestamps are Unix seconds: `Math.floor(Date.now() / 1000)`. This ensures proper string sorting in DynamoDB.
3. **Rate limit items** — DynamoDB-backed rate limiting for stateless Lambda. Key is either IP address or `roomCode:peerId` depending on limit type.
4. **TTL per item type** — Rooms/peers expire in 1 hour, signals/events in 60 seconds, rate limits in 120 seconds (one window + buffer).

### Access Patterns

| Operation | DynamoDB Call |
|-----------|---------------|
| Get room | `GetItem(PK=ROOM#{code}, SK=#META)` |
| List peers | `Query(PK=ROOM#{code}, SK begins_with PEER#)` |
| Get signals for peer since T | `Query(PK=ROOM#{code}, SK begins_with SIG#{peerId}#)` with `FilterExpression: createdAt > :since` |
| Get events since T | `Query(PK=ROOM#{code}, SK begins_with EVT#)` with `FilterExpression: createdAt > :since` |
| Token lookup | `GetItem(PK=TOKEN#{token}, SK=#, ConsistentRead=true)` |
| Check rate limit | `UpdateItem(PK=RATELIMIT#{key}#{type}, SK=#)` with atomic increment |

**Note on signal/event queries:** The `begins_with` approach fetches all signals for a peer, then filters in application code for those with timestamp > T. With 60-second TTL and max ~20 signals/sec, this is at most ~1200 items to filter — acceptable for the use case.

### Atomic Operations

To prevent race conditions in concurrent Lambda invocations:

| Operation | DynamoDB Pattern |
|-----------|------------------|
| Create room | `PutItem` with `ConditionExpression: 'attribute_not_exists(PK)'` |
| Add peer | `TransactWriteItems` for peer + token index + event |
| Leave room | `TransactWriteItems` for delete peer + delete token index + add event |
| Kick peer | `TransactWriteItems` for update room kickedCallsigns + delete peer + delete token + add event |
| Update rate limit | `UpdateItem` with atomic counter increment and conditional window check |

### Item Size Management

DynamoDB item limit is 400KB. To prevent oversized rooms:

- **Signals** are stored as separate items (not embedded in room), with 60s TTL
- **Events** are stored as separate items, with 60s TTL
- **kickedCallsigns** array could grow; implement max size (e.g., 100 entries) and reject kicks beyond that

---

## Component 2: Signaling Lambda

### Directory Structure

```
server/signaling-aws/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Lambda handler + request routing
│   ├── router.ts             # Path matching and parameter extraction
│   ├── config.ts             # Environment config
│   ├── storage/
│   │   ├── types.ts          # Re-export from local server
│   │   └── dynamodb-storage.ts
│   ├── rate-limiter/
│   │   └── dynamodb-rate-limiter.ts
│   ├── handlers/             # Port from local server (minimal changes)
│   │   ├── index.ts
│   │   ├── health.ts
│   │   ├── create-room.ts
│   │   ├── join-room.ts
│   │   ├── leave-room.ts
│   │   ├── delete-room.ts
│   │   ├── post-signal.ts
│   │   ├── get-signals.ts
│   │   ├── get-events.ts
│   │   ├── kick.ts
│   │   └── set-state.ts
│   ├── room-code.ts          # Re-use from local server
│   ├── auth.ts               # Re-use from local server
│   └── types.ts              # Re-use from local server
├── src/disable.ts            # Auto-disable Lambda
└── infra/
    └── template.yaml         # SAM/CloudFormation template
```

### Package Dependencies

```json
{
  "name": "spaceflight-signaling-aws",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "sam build",
    "deploy": "sam deploy",
    "test": "vitest"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "@aws-sdk/client-lambda": "^3.600.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.140",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "esbuild": "^0.21.0"
  }
}
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Lambda Handler and Routing

The Lambda handler must parse Function URL events and route to handlers:

```typescript
// src/index.ts
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { route } from './router';
import { createStorage } from './storage/dynamodb-storage';
import { createRateLimiter } from './rate-limiter/dynamodb-rate-limiter';
import { getConfig } from './config';
import * as handlers from './handlers';

const config = getConfig();
const storage = createStorage(config);
const rateLimiter = createRateLimiter(config);

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const clientIp = event.requestContext.http.sourceIp;
  const authorization = event.headers.authorization;
  const query = event.queryStringParameters ?? {};

  // Parse body with error handling
  let body: unknown;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'bad_request', message: 'Invalid JSON body' }),
      };
    }
  }

  // Route to appropriate handler
  const result = await route({
    method,
    path,
    clientIp,
    authorization,
    body,
    query,
    storage,
    rateLimiter,
    config,
  });

  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body),
  };
}
```

```typescript
// src/router.ts
import type { SignalingStorage } from './storage/types';
import type { RateLimiter } from './rate-limiter/dynamodb-rate-limiter';
import type { Config } from './config';
import * as handlers from './handlers';

interface RouteContext {
  method: string;
  path: string;
  clientIp: string;
  authorization?: string;
  body?: unknown;
  query: Record<string, string | undefined>;
  storage: SignalingStorage;
  rateLimiter: RateLimiter;
  config: Config;
}

interface HandlerResult {
  status: number;
  body: unknown;
}

type HandlerFn = (ctx: RouteContext, roomCode?: string) => Promise<HandlerResult>;

// Export types for use in handlers
export type { RouteContext, HandlerResult };

// Case-insensitive patterns for room codes
const routes: Array<{ method: string; pattern: RegExp; handler: HandlerFn }> = [
  { method: 'GET',    pattern: /^\/health$/i,                      handler: handlers.health },
  { method: 'POST',   pattern: /^\/rooms$/i,                       handler: handlers.createRoom },
  { method: 'DELETE', pattern: /^\/rooms\/([A-Za-z0-9]{8})$/i,     handler: handlers.deleteRoom },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/join$/i, handler: handlers.joinRoom },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/leave$/i, handler: handlers.leaveRoom },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/signals$/i, handler: handlers.postSignal },
  { method: 'GET',    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/signals$/i, handler: handlers.getSignals },
  { method: 'GET',    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/events$/i, handler: handlers.getEvents },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/kick$/i, handler: handlers.kick },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/state$/i, handler: handlers.setState },
];

export async function route(ctx: RouteContext): Promise<HandlerResult> {
  for (const route of routes) {
    if (ctx.method !== route.method) continue;
    const match = ctx.path.match(route.pattern);
    if (!match) continue;

    // Normalize room code to uppercase (if present)
    const roomCode = match[1]?.toUpperCase();
    return route.handler(ctx, roomCode);
  }

  return { status: 404, body: { error: 'not_found', message: 'Route not found' } };
}
```

### Configuration

```typescript
// src/config.ts
export interface Config {
  tableName: string;
  maxPeersPerRoom: number;
  roomExpirySeconds: number;
  signalExpirySeconds: number;
  joinRateLimitPerSecond: number;
  createRateLimitPerMinute: number;
  signalRateLimitPerSecond: number;
}

export function getConfig(): Config {
  return {
    tableName: process.env.TABLE_NAME ?? 'spaceflight-signaling',
    maxPeersPerRoom: parseInt(process.env.MAX_PEERS_PER_ROOM ?? '4', 10),
    roomExpirySeconds: parseInt(process.env.ROOM_EXPIRY_SECONDS ?? '3600', 10),
    signalExpirySeconds: parseInt(process.env.SIGNAL_EXPIRY_SECONDS ?? '60', 10),
    joinRateLimitPerSecond: parseInt(process.env.JOIN_RATE_LIMIT_PER_SECOND ?? '5', 10),
    createRateLimitPerMinute: parseInt(process.env.CREATE_RATE_LIMIT_PER_MINUTE ?? '10', 10),
    signalRateLimitPerSecond: parseInt(process.env.SIGNAL_RATE_LIMIT_PER_SECOND ?? '20', 10),
  };
}
```

### Handlers Index

```typescript
// src/handlers/index.ts
export { health } from './health';
export { createRoom } from './create-room';
export { joinRoom } from './join-room';
export { leaveRoom } from './leave-room';
export { deleteRoom } from './delete-room';
export { postSignal } from './post-signal';
export { getSignals } from './get-signals';
export { getEvents } from './get-events';
export { kick } from './kick';
export { setState } from './set-state';
```

### Health Handler

```typescript
// src/handlers/health.ts
import type { RouteContext, HandlerResult } from '../router';

export async function health(_ctx: RouteContext): Promise<HandlerResult> {
  return { status: 200, body: { status: 'ok' } };
}
```

### DynamoDB Rate Limiter

```typescript
// src/rate-limiter/dynamodb-rate-limiter.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Config } from '../config';

interface RateLimitResult {
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

  constructor(tableName: string, config: Config) {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName = tableName;
    this.config = config;
  }

  /** Check join rate limit (per-second, per-IP) */
  async checkJoin(ip: string): Promise<RateLimitResult> {
    return this.checkLimit(ip, 'join', this.config.joinRateLimitPerSecond, 1);
  }

  /** Check create rate limit (per-minute, per-IP) */
  async checkCreate(ip: string): Promise<RateLimitResult> {
    return this.checkLimit(ip, 'create', this.config.createRateLimitPerMinute, 60);
  }

  /** Check signal rate limit (per-second, per-peer) */
  async checkSignal(roomCode: string, peerId: string): Promise<RateLimitResult> {
    const key = `${roomCode}:${peerId}`;
    return this.checkLimit(key, 'signal', this.config.signalRateLimitPerSecond, 1);
  }

  /**
   * Check and increment rate limit counter.
   * Uses atomic UpdateItem to prevent race conditions.
   */
  private async checkLimit(
    key: string,
    type: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const pk = `RATELIMIT#${key}#${type}`;
    const expiresAt = windowStart + windowSeconds + 60; // Buffer for TTL

    try {
      // Atomic increment with window check
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: '#' },
        UpdateExpression: `
          SET #count = if_not_exists(#count, :zero) + :one,
              #window = if_not_exists(#window, :windowStart),
              #expires = :expiresAt
        `,
        ConditionExpression: 'attribute_not_exists(#window) OR #window = :windowStart',
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
      }));

      const count = result.Attributes?.count ?? 1;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
      };
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
        // Window changed, reset counter
        await this.client.send(new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: pk, SK: '#' },
          UpdateExpression: 'SET #count = :one, #window = :windowStart, #expires = :expiresAt',
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
        }));
        return { allowed: true, remaining: limit - 1 };
      }
      throw error;
    }
  }
}

export function createRateLimiter(config: Config): RateLimiter {
  return new DynamoDBRateLimiter(config.tableName, config);
}
```

### Storage Types

```typescript
// src/storage/types.ts
export interface Room {
  code: string;
  hostId: string;
  gameVersion: string;
  state: string;
  createdAt: number;
  lastActivity: number;
  kickedCallsigns: string[];
}

export interface Peer {
  id: string;
  token: string;
  callsign: string;
  joinedAt: number;
}

export interface Signal {
  fromPeerId: string;
  toPeerId: string;
  type: string;
  data: unknown;
}

export interface RoomEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface SignalingStorage {
  createRoom(room: Room): Promise<void>;
  getRoom(code: string): Promise<Room | null>;
  updateRoom(code: string, updates: Partial<Room>): Promise<void>;
  deleteRoom(code: string): Promise<void>;

  addPeer(code: string, peer: Peer): Promise<void>;
  getPeer(code: string, peerId: string): Promise<Peer | null>;
  getPeerByToken(code: string, token: string): Promise<Peer | null>;
  removePeer(code: string, peerId: string): Promise<void>;
  listPeers(code: string): Promise<Peer[]>;

  kickPeer(code: string, peerId: string, callsign: string): Promise<void>;

  addSignal(code: string, signal: Signal): Promise<void>;
  getSignals(code: string, peerId: string, since: number): Promise<Signal[]>;

  addEvent(code: string, event: RoomEvent): Promise<void>;
  getEvents(code: string, since: number): Promise<RoomEvent[]>;
}
```

### DynamoDB Storage Adapter

```typescript
// src/storage/dynamodb-storage.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Config } from '../config';
import type { SignalingStorage, Room, Peer, Signal, RoomEvent } from './types';
import { generateId, generateToken } from '../auth';

export class DynamoDBStorage implements SignalingStorage {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private config: Config;

  constructor(config: Config) {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName = config.tableName;
    this.config = config;
  }

  async createRoom(room: Room): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `ROOM#${room.code}`,
        SK: '#META',
        ...room,
        expiresAt: now + this.config.roomExpirySeconds,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
  }

  async getRoom(code: string): Promise<Room | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `ROOM#${code}`, SK: '#META' },
    }));
    return result.Item ? this.toRoom(result.Item) : null;
  }

  async updateRoom(code: string, updates: Partial<Room>): Promise<void> {
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], i) => {
      expressions.push(`#k${i} = :v${i}`);
      names[`#k${i}`] = key;
      values[`:v${i}`] = value;
    });

    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { PK: `ROOM#${code}`, SK: '#META' },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }));
  }

  async deleteRoom(code: string): Promise<void> {
    // Query all items for this room, then batch delete them
    // Note: signals/events have short TTL (60s), so they'll self-clean
    // But we should clean up peers and token indices immediately
    const items = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `ROOM#${code}` },
      ProjectionExpression: 'PK, SK',
    }));

    if (!items.Items?.length) return;

    // Collect token indices to delete (from peer items)
    const peers = await this.listPeers(code);
    const tokenDeletes = peers.map((peer) => ({
      DeleteRequest: { Key: { PK: `TOKEN#${peer.token}`, SK: '#' } },
    }));

    // DynamoDB BatchWriteItem limit is 25 items
    const roomDeletes = items.Items.map((item) => ({
      DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
    }));

    const allDeletes = [...roomDeletes, ...tokenDeletes];
    const batches = [];
    for (let i = 0; i < allDeletes.length; i += 25) {
      batches.push(allDeletes.slice(i, i + 25));
    }

    for (const batch of batches) {
      await this.client.send(new BatchWriteCommand({
        RequestItems: { [this.tableName]: batch },
      }));
    }
  }

  async addPeer(code: string, peer: Peer): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.roomExpirySeconds;

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.tableName,
            Item: {
              PK: `ROOM#${code}`,
              SK: `PEER#${peer.id}`,
              ...peer,
              expiresAt,
            },
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: {
              PK: `TOKEN#${peer.token}`,
              SK: '#',
              roomCode: code,
              peerId: peer.id,
              expiresAt,
            },
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: {
              PK: `ROOM#${code}`,
              SK: `EVT#${now}#${generateId()}`,
              type: 'peer_joined',
              data: { peerId: peer.id, callsign: peer.callsign },
              createdAt: now,
              expiresAt: now + this.config.signalExpirySeconds,
            },
          },
        },
      ],
    }));
  }

  async getPeer(code: string, peerId: string): Promise<Peer | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `ROOM#${code}`, SK: `PEER#${peerId}` },
    }));
    return result.Item ? this.toPeer(result.Item) : null;
  }

  async getPeerByToken(code: string, token: string): Promise<Peer | null> {
    // Use strongly consistent read to avoid race conditions
    const tokenResult = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `TOKEN#${token}`, SK: '#' },
      ConsistentRead: true,
    }));
    if (!tokenResult.Item || tokenResult.Item.roomCode !== code) {
      return null;
    }
    return this.getPeer(code, tokenResult.Item.peerId as string);
  }

  async removePeer(code: string, peerId: string): Promise<void> {
    const peer = await this.getPeer(code, peerId);
    if (!peer) return;

    const now = Math.floor(Date.now() / 1000);
    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: this.tableName,
            Key: { PK: `ROOM#${code}`, SK: `PEER#${peerId}` },
          },
        },
        {
          Delete: {
            TableName: this.tableName,
            Key: { PK: `TOKEN#${peer.token}`, SK: '#' },
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: {
              PK: `ROOM#${code}`,
              SK: `EVT#${now}#${generateId()}`,
              type: 'peer_left',
              data: { peerId },
              createdAt: now,
              expiresAt: now + this.config.signalExpirySeconds,
            },
          },
        },
      ],
    }));
  }

  async listPeers(code: string): Promise<Peer[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `ROOM#${code}`,
        ':prefix': 'PEER#',
      },
    }));
    return (result.Items ?? []).map(this.toPeer);
  }

  async kickPeer(code: string, peerId: string, callsign: string): Promise<void> {
    const peer = await this.getPeer(code, peerId);
    if (!peer) return;

    const now = Math.floor(Date.now() / 1000);
    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        // Update room's kickedCallsigns array
        {
          Update: {
            TableName: this.tableName,
            Key: { PK: `ROOM#${code}`, SK: '#META' },
            UpdateExpression: 'SET kickedCallsigns = list_append(if_not_exists(kickedCallsigns, :empty), :callsign)',
            ExpressionAttributeValues: {
              ':empty': [],
              ':callsign': [callsign],
            },
          },
        },
        // Delete peer
        {
          Delete: {
            TableName: this.tableName,
            Key: { PK: `ROOM#${code}`, SK: `PEER#${peerId}` },
          },
        },
        // Delete token index
        {
          Delete: {
            TableName: this.tableName,
            Key: { PK: `TOKEN#${peer.token}`, SK: '#' },
          },
        },
        // Add kick event
        {
          Put: {
            TableName: this.tableName,
            Item: {
              PK: `ROOM#${code}`,
              SK: `EVT#${now}#${generateId()}`,
              type: 'peer_kicked',
              data: { peerId, callsign },
              createdAt: now,
              expiresAt: now + this.config.signalExpirySeconds,
            },
          },
        },
      ],
    }));
  }

  async addSignal(code: string, signal: Signal): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `ROOM#${code}`,
        SK: `SIG#${signal.toPeerId}#${now}#${generateId()}`,
        fromPeerId: signal.fromPeerId,
        toPeerId: signal.toPeerId,
        type: signal.type,
        data: signal.data,
        createdAt: now,
        expiresAt: now + this.config.signalExpirySeconds,
      },
    }));
  }

  async getSignals(code: string, peerId: string, since: number): Promise<Signal[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'createdAt > :since',
      ExpressionAttributeValues: {
        ':pk': `ROOM#${code}`,
        ':prefix': `SIG#${peerId}#`,
        ':since': since,
      },
    }));
    return (result.Items ?? []).map(this.toSignal);
  }

  async addEvent(code: string, event: RoomEvent): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `ROOM#${code}`,
        SK: `EVT#${now}#${generateId()}`,
        type: event.type,
        data: event.data,
        createdAt: now,
        expiresAt: now + this.config.signalExpirySeconds,
      },
    }));
  }

  async getEvents(code: string, since: number): Promise<RoomEvent[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'createdAt > :since',
      ExpressionAttributeValues: {
        ':pk': `ROOM#${code}`,
        ':prefix': 'EVT#',
        ':since': since,
      },
    }));
    return (result.Items ?? []).map(this.toEvent);
  }

  // Helper methods to convert DynamoDB items to domain types
  private toRoom(item: Record<string, unknown>): Room {
    return {
      code: item.code as string,
      hostId: item.hostId as string,
      gameVersion: item.gameVersion as string,
      state: item.state as string,
      createdAt: item.createdAt as number,
      lastActivity: item.lastActivity as number,
      kickedCallsigns: (item.kickedCallsigns as string[]) ?? [],
    };
  }

  private toPeer(item: Record<string, unknown>): Peer {
    return {
      id: item.id as string,
      token: item.token as string,
      callsign: item.callsign as string,
      joinedAt: item.joinedAt as number,
    };
  }

  private toSignal(item: Record<string, unknown>): Signal {
    return {
      fromPeerId: item.fromPeerId as string,
      toPeerId: item.toPeerId as string,
      type: item.type as string,
      data: item.data as unknown,
    };
  }

  private toEvent(item: Record<string, unknown>): RoomEvent {
    return {
      type: item.type as string,
      data: item.data as Record<string, unknown>,
    };
  }
}

export function createStorage(config: Config): SignalingStorage {
  return new DynamoDBStorage(config);
}
```

### Auth Utilities

```typescript
// src/auth.ts
import { randomBytes } from 'node:crypto';

/**
 * Generate a random peer ID (e.g., "peer-a1b2c3d4")
 */
export function generateId(): string {
  return `peer-${randomBytes(4).toString('hex')}`;
}

/**
 * Generate a random auth token (32 hex characters)
 */
export function generateToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a random room code (8 uppercase alphanumeric characters)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
```

### Handler Modifications

Handlers from local server need these changes:

**1. Timestamp conversion (milliseconds → seconds):**

Local handlers use `Date.now()` (milliseconds). AWS handlers must convert to Unix seconds for DynamoDB TTL and SK sorting:

```typescript
// Local (milliseconds)
const now = Date.now();

// AWS (Unix seconds)
const now = Math.floor(Date.now() / 1000);
```

All handlers that pass timestamps to storage must be updated: `create-room`, `join-room`, `post-signal`, `get-signals`, `get-events`, `kick`, `set-state`, `leave-room`.

**2. Room code collision handling (create-room only):**

The `createRoom` storage method uses `ConditionExpression: 'attribute_not_exists(PK)'` which throws if the room code already exists. The handler must retry with a new code:

```typescript
// create-room.ts (retry logic)
const MAX_RETRIES = 3;

for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  const roomCode = generateRoomCode();
  try {
    await storage.createRoom({ code: roomCode, ... });
    return { status: 200, body: { roomCode, hostId, hostToken } };
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
      // Room code collision, retry with new code
      continue;
    }
    throw error;
  }
}
return { status: 503, body: { error: 'service_unavailable', message: 'Unable to create room' } };
```

**3. Rate limiter interface change (sync → async, boolean → object):**

Local handlers call rate limiter synchronously and expect boolean:
```typescript
// Local
if (!rateLimiter.checkJoin(clientIp)) {
  return { status: 429, body: { error: 'rate_limited', message: '...' } };
}
```

AWS handlers must await and check the `allowed` field:
```typescript
// AWS
const limit = await rateLimiter.checkJoin(clientIp);
if (!limit.allowed) {
  return { status: 429, body: { error: 'rate_limited', message: '...' } };
}
```

Affected handlers: `create-room` (checkCreate), `join-room` (checkJoin), `post-signal` (checkSignal).

**4. Storage interface unchanged:** Same `SignalingStorage` interface works.

**5. IP extraction:** Passed from Lambda handler via `ctx.clientIp`, not extracted from Express `req`.

**6. Query parameters:** Accessed via `ctx.query.since` instead of `req.query.since`. Parse with `parseInt(ctx.query.since, 10)`.

**7. Request/response context:** Handlers receive `RouteContext` object instead of Express `(req, res)`. Return `{ status, body }` object instead of calling `res.json()`.

**8. DynamoDB throttling errors:**

With provisioned capacity (25 RCU/WCU), DynamoDB may throttle requests during traffic spikes. All handlers should catch `ProvisionedThroughputExceededException` and return 503:

```typescript
// Utility function for all handlers
function isDynamoDBThrottled(error: unknown): boolean {
  const name = (error as { name?: string }).name;
  return name === 'ProvisionedThroughputExceededException' ||
         name === 'ThrottlingException';
}

// In each handler's catch block
try {
  // ... storage calls
} catch (error) {
  if (isDynamoDBThrottled(error)) {
    return { status: 503, body: { error: 'service_unavailable', message: 'Server busy, please retry' } };
  }
  throw error;
}
```

This is acceptable because: (1) provisioned mode is intentionally rate-limited for cost control, (2) clients already handle retries, and (3) brief throttling self-resolves as traffic normalizes.

### API Endpoints

Same as local server (full compatibility):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/rooms` | Create room |
| DELETE | `/rooms/:code` | Delete room |
| POST | `/rooms/:code/join` | Join room |
| POST | `/rooms/:code/leave` | Leave room |
| POST | `/rooms/:code/signals` | Post signal |
| GET | `/rooms/:code/signals` | Poll signals |
| GET | `/rooms/:code/events` | Poll events |
| POST | `/rooms/:code/kick` | Kick peer |
| POST | `/rooms/:code/state` | Set room state |

---

## Component 3: Auto-Disable Mechanism

### Purpose

Automatically disable the signaling Lambda if usage approaches free tier limits, preventing unexpected costs from DDoS or viral traffic.

### CloudWatch Alarm

- **Metric:** `AWS/Lambda` → `Invocations`
- **Function:** `spaceflight-signaling`
- **Threshold:** 30,000 invocations per hour (~720k/month pace, 72% of free tier)
- **Period:** Sum over 1 hour, evaluated hourly

**Note:** The threshold is set per-hour, not per-month, because CloudWatch alarms evaluate on fixed periods. 30k/hour sustained = 720k/month, leaving 280k buffer.

### EventBridge Rule

- **Trigger:** CloudWatch alarm state → ALARM
- **Target:** Disable Lambda function

### Disable Lambda

```typescript
// src/disable.ts
import {
  LambdaClient,
  PutFunctionConcurrencyCommand,
} from '@aws-sdk/client-lambda';

const FUNCTION_NAME = process.env.TARGET_FUNCTION_NAME ?? 'spaceflight-signaling';

export async function handler(event: unknown): Promise<void> {
  const lambda = new LambdaClient({});

  console.log('Auto-disable triggered. Event:', JSON.stringify(event));

  try {
    // Disable the signaling Lambda
    await lambda.send(new PutFunctionConcurrencyCommand({
      FunctionName: FUNCTION_NAME,
      ReservedConcurrentExecutions: 0,
    }));
    console.log(`Successfully disabled ${FUNCTION_NAME}`);
  } catch (error) {
    console.error('Failed to disable Lambda:', error);
    // Re-throw to trigger DLQ
    throw error;
  }
}
```

### Re-enabling

Manual process via AWS Console or CLI. This is intentional — investigate before re-enabling:

```bash
aws lambda put-function-concurrency \
  --function-name spaceflight-signaling \
  --reserved-concurrent-executions 50
```

---

## Component 4: Infrastructure (SAM Template)

```yaml
# infra/template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  AllowedOrigin:
    Type: String
    Description: Single allowed CORS origin (e.g., https://html-classic.itch.zone)
    Default: '*'
    # Note: SAM FunctionUrlConfig only supports a single origin or '*'.
    # itch.io serves games from *.itch.zone domains (not the itch.io page URL).
    # For production, either use '*' or implement dynamic CORS in Lambda code.

Resources:
  # DynamoDB Table
  SignalingTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: spaceflight-signaling
      BillingMode: PROVISIONED
      ProvisionedThroughput:
        ReadCapacityUnits: 25
        WriteCapacityUnits: 25
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      TimeToLiveSpecification:
        AttributeName: expiresAt
        Enabled: true

  # Signaling Lambda
  SignalingFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2022
        EntryPoints:
          - src/index.ts
    Properties:
      FunctionName: spaceflight-signaling
      Handler: index.handler
      Runtime: nodejs20.x
      Timeout: 30
      MemorySize: 256
      ReservedConcurrentExecutions: 50
      FunctionUrlConfig:
        AuthType: NONE
        Cors:
          AllowOrigins:
            - !Ref AllowedOrigin
          AllowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS']
          AllowHeaders: ['Content-Type', 'Authorization']
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:GetItem
                - dynamodb:PutItem
                - dynamodb:UpdateItem
                - dynamodb:DeleteItem
                - dynamodb:Query
              Resource:
                - !GetAtt SignalingTable.Arn
            - Effect: Allow
              Action:
                - dynamodb:TransactWriteItems
              Resource:
                - !GetAtt SignalingTable.Arn
      Environment:
        Variables:
          TABLE_NAME: !Ref SignalingTable
          MAX_PEERS_PER_ROOM: '4'
          ROOM_EXPIRY_SECONDS: '3600'
          SIGNAL_EXPIRY_SECONDS: '60'
          JOIN_RATE_LIMIT_PER_SECOND: '5'
          CREATE_RATE_LIMIT_PER_MINUTE: '10'
          SIGNAL_RATE_LIMIT_PER_SECOND: '20'

  # CloudWatch Log Groups (with retention to control costs)
  SignalingLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/lambda/spaceflight-signaling
      RetentionInDays: 7

  DisableLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/lambda/spaceflight-signaling-disable
      RetentionInDays: 30

  # Disable Lambda
  DisableFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2022
        EntryPoints:
          - src/disable.ts
    Properties:
      FunctionName: spaceflight-signaling-disable
      Handler: disable.handler
      Runtime: nodejs20.x
      Timeout: 30
      MemorySize: 128
      DeadLetterQueue:
        Type: SQS
        TargetArn: !GetAtt DisableDLQ.Arn
      Environment:
        Variables:
          TARGET_FUNCTION_NAME: spaceflight-signaling
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action: lambda:PutFunctionConcurrency
              Resource: !GetAtt SignalingFunction.Arn

  # DLQ for disable function failures
  DisableDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: spaceflight-signaling-disable-dlq
      MessageRetentionPeriod: 1209600  # 14 days

  # CloudWatch Alarm
  InvocationAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: spaceflight-signaling-invocation-limit
      AlarmDescription: Triggers when Lambda invocations exceed 30k/hour (72% of free tier pace)
      MetricName: Invocations
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: spaceflight-signaling
      Statistic: Sum
      Period: 3600  # 1 hour
      EvaluationPeriods: 1
      Threshold: 30000  # 30k/hour = 720k/month pace
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching

  # EventBridge Rule
  DisableRule:
    Type: AWS::Events::Rule
    Properties:
      Name: spaceflight-signaling-auto-disable
      Description: Auto-disable signaling Lambda when alarm fires
      EventPattern:
        source:
          - aws.cloudwatch
        detail-type:
          - CloudWatch Alarm State Change
        detail:
          alarmName:
            - spaceflight-signaling-invocation-limit
          state:
            value:
              - ALARM
      Targets:
        - Id: DisableLambda
          Arn: !GetAtt DisableFunction.Arn

  # Permission for EventBridge to invoke disable Lambda
  DisableFunctionPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref DisableFunction
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt DisableRule.Arn

  # Alarm for DLQ messages (monitor disable failures)
  DLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: spaceflight-signaling-disable-dlq-messages
      AlarmDescription: Alert when disable function failures accumulate
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Dimensions:
        - Name: QueueName
          Value: !GetAtt DisableDLQ.QueueName
      Statistic: Sum
      Period: 300  # 5 minutes
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching

Outputs:
  SignalingUrl:
    Description: Signaling server Function URL
    # SAM auto-creates {FunctionLogicalId}Url resource from FunctionUrlConfig
    Value: !GetAtt SignalingFunctionUrl.FunctionUrl
  TableName:
    Description: DynamoDB table name
    Value: !Ref SignalingTable
```

---

## Deployment

### Prerequisites

```bash
# Install AWS SAM CLI
brew install aws-sam-cli  # macOS
# or: pip install aws-sam-cli

# Configure AWS credentials
aws configure
# Use region: us-east-1
```

### Build and Deploy

```bash
cd server/signaling-aws

# Build
sam build

# Deploy (first time - interactive)
sam deploy --guided \
  --parameter-overrides AllowedOrigin=https://yourgame.com

# Deploy (subsequent)
sam deploy --parameter-overrides AllowedOrigin=https://yourgame.com
```

### Verify Deployment

```bash
# 1. Get Function URL
SIGNALING_URL=$(aws lambda get-function-url-config \
  --function-name spaceflight-signaling \
  --query 'FunctionUrl' --output text)
echo "Signaling URL: $SIGNALING_URL"

# 2. Test health endpoint
curl "${SIGNALING_URL}health"
# Expected: {"status":"ok"}

# 3. Verify DynamoDB table exists with TTL enabled
aws dynamodb describe-table \
  --table-name spaceflight-signaling \
  --query 'Table.TimeToLiveDescription'
# Expected: {"TimeToLiveStatus":"ENABLED","AttributeName":"expiresAt"}

# 4. Verify CloudWatch alarm exists
aws cloudwatch describe-alarms \
  --alarm-names spaceflight-signaling-invocation-limit \
  --query 'MetricAlarms[0].AlarmName'
# Expected: "spaceflight-signaling-invocation-limit"

# 5. Verify EventBridge rule exists
aws events describe-rule \
  --name spaceflight-signaling-auto-disable \
  --query 'Name'
# Expected: "spaceflight-signaling-auto-disable"

# 6. Test create room flow
curl -X POST "${SIGNALING_URL}rooms" \
  -H "Content-Type: application/json" \
  -d '{"gameVersion":"1.0.0"}'
# Expected: {"roomCode":"XXXXXXXX","hostId":"peer-xxx","hostToken":"xxx"}
```

### Production Checklist

- [ ] Set `AllowedOrigin` to production domain (not `*`)
- [ ] Verify health endpoint responds
- [ ] Verify TTL is enabled on DynamoDB table
- [ ] Test room create/join/leave flow
- [ ] Verify CloudWatch alarm exists with correct threshold
- [ ] Verify EventBridge rule is enabled
- [ ] Set up CloudWatch dashboard for monitoring
- [ ] Document the Function URL in deployment notes
- [ ] Subscribe to DLQ alarm for disable failures

---

## Client Integration

No client code changes required. Configure the server URL via environment:

```typescript
// Development
const client = new SignalingClient({
  serverUrl: 'http://localhost:3001',
  gameVersion: '1.0.0'
});

// Production
const client = new SignalingClient({
  serverUrl: import.meta.env.VITE_SIGNALING_URL,
  gameVersion: '1.0.0'
});
```

Build configuration:
```bash
VITE_SIGNALING_URL=https://xxx.lambda-url.us-east-1.on.aws npm run build
```

---

## Testing Requirements

### Unit Tests (New)

| Test File | Coverage |
|-----------|----------|
| `test-dynamodb-storage.ts` | DynamoDB storage adapter CRUD operations |
| `test-dynamodb-rate-limiter.ts` | Rate limiter with DynamoDB backend |
| `test-router.ts` | Path matching, parameter extraction, case insensitivity |
| `test-lambda-handler.ts` | Event parsing, JSON error handling, response formatting |

### Integration Tests (Adapt Existing)

The existing tests in `scripts/tests/signaling/` can be run against the Lambda Function URL by setting `SIGNALING_URL` environment variable:

```bash
SIGNALING_URL=https://xxx.lambda-url.us-east-1.on.aws \
  npx tsx scripts/tests/signaling/test-room-lifecycle.mjs
```

**Tests that need modification:**
- `test-cleanup.mjs` — Cannot control TTL timing; skip or adapt to wait 60+ seconds
- Rate limiting tests — May need adjustment for DynamoDB timing differences

### Load Tests (New)

Before production:
1. Simulate 10 concurrent rooms with 4 players each
2. Verify no throttling under normal load (should stay well under 25 WCU)
3. Verify auto-disable triggers when sending >30k requests/hour
4. Verify DLQ captures any disable function failures

---

## Deliverables

| # | Item | Description |
|---|------|-------------|
| 1 | `server/signaling-aws/src/index.ts` | Lambda handler with JSON error handling |
| 2 | `server/signaling-aws/src/router.ts` | Path matching with case-insensitive patterns |
| 3 | `server/signaling-aws/src/config.ts` | Environment variable configuration |
| 4 | `server/signaling-aws/src/auth.ts` | ID/token/room code generation utilities |
| 5 | `server/signaling-aws/src/storage/types.ts` | SignalingStorage interface and domain types |
| 6 | `server/signaling-aws/src/storage/dynamodb-storage.ts` | DynamoDB storage adapter (full implementation in plan) |
| 7 | `server/signaling-aws/src/rate-limiter/dynamodb-rate-limiter.ts` | DynamoDB-backed rate limiter with wrapper methods |
| 8 | `server/signaling-aws/src/disable.ts` | Auto-disable Lambda with error handling |
| 9 | `server/signaling-aws/src/handlers/index.ts` | Re-exports for all handler functions |
| 10 | `server/signaling-aws/src/handlers/*.ts` | Ported handlers with timestamp/query/throttle changes |
| 11 | `server/signaling-aws/infra/template.yaml` | SAM template with esbuild, log retention |
| 12 | `server/signaling-aws/package.json` | Dependencies and build scripts |
| 13 | `server/signaling-aws/tsconfig.json` | TypeScript configuration |
| 14 | `server/signaling-aws/README.md` | Deployment and operation guide |
| 15 | Unit tests for new components | DynamoDB storage, rate limiter, router |

---

## Security Considerations

### Cost Protection
- **Reserved concurrency (50):** Limits parallel executions, provides baseline DDoS protection
- **DynamoDB provisioned mode:** Hard rate limit at 25 WCU, requests throttle rather than incur cost
- **Auto-disable at 72% free tier pace:** Prevents cost overrun with margin for legitimate spikes
- **DLQ for disable Lambda:** Ensures failures are captured and can be investigated
- **DLQ alarm:** Notifies if disable mechanism itself is failing

### Data Protection
- **TTL on all items:** Automatic cleanup, no stale data accumulation
- **No API Gateway:** Eliminates the primary cost vector for HTTP APIs
- **CORS restricted:** Only allowed origin can make requests (when configured)

### Access Control
- **Token-based authentication:** All sensitive operations require valid bearer token
- **Host-only operations:** Kick, delete, set-state require host token verification
- **Kicked callsign tracking:** Prevents re-entry by same callsign

### Rate Limiting
- **IP-based limits:** Join (5/sec), Create (10/min)
- **Peer-based limits:** Signals (20/sec per room:peer)
- **DynamoDB-backed:** Works across Lambda invocations with atomic counters

### IAM Least Privilege
- **Signaling Lambda:** Only specific DynamoDB operations (GetItem, PutItem, UpdateItem, DeleteItem, Query, TransactWriteItems)
- **Disable Lambda:** Only PutFunctionConcurrency on specific function ARN

---

## Cleanup Mechanism

DynamoDB TTL handles all cleanup automatically:

| Item Type | TTL | Notes |
|-----------|-----|-------|
| Room metadata | 1 hour after creation | Cleaned up even if not explicitly deleted |
| Peers | 1 hour after join | Removed with room |
| Signals | 60 seconds | Short-lived, polling-based delivery |
| Events | 60 seconds | Short-lived, polling-based delivery |
| Rate limit entries | ~2 minutes | Window duration + 60s buffer |
| Token index | 1 hour | Matches room lifetime |

**No periodic cleanup Lambda needed** — DynamoDB TTL handles everything.

---

## Known Limitations

1. **Signal ordering:** Signals with identical timestamps may be delivered in arbitrary order. WebRTC handles this gracefully.

2. **Rate limit precision:** DynamoDB-based rate limiter has ~1 second granularity. Brief bursts above limit are possible at window boundaries due to race conditions in the reset logic.

3. **Cold start latency:** First request after idle period may take 500-1000ms. Subsequent requests are fast (~50-100ms).

4. **Single CORS origin:** SAM FunctionUrlConfig only supports one origin or `*`. For multiple origins, implement validation in Lambda code and return dynamic `Access-Control-Allow-Origin` header.

5. **Room TTL is from creation, not last activity:** Unlike local server which updates `lastActivity`, the AWS version uses fixed 1-hour TTL from room creation. Long-running games (>1 hour) will have their room metadata expire. This is acceptable because WebRTC connections are already established by then. Late joiners to games approaching 1 hour may fail.

6. **Ghost peers:** If a client crashes without calling leave, the peer entry persists until room TTL expires. This could affect max peers limit, but self-heals when room expires.
