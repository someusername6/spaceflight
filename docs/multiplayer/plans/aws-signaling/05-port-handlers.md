# Phase 05: Port Handlers

## Objective

Port all API handlers from the local signaling server to the AWS Lambda format.

## Prerequisites

- Phase 01 complete (types, config)
- Phase 02 complete (storage)
- Phase 03 complete (rate limiter)
- Phase 04 complete (router)

## Files to Create

```
server/signaling-aws/src/handlers/
├── index.ts
├── health.ts
├── create-room.ts
├── join-room.ts
├── leave-room.ts
├── delete-room.ts
├── post-signal.ts
├── get-signals.ts
├── get-events.ts
├── kick.ts
└── set-state.ts
```

## Tasks

### 1. Create src/handlers/index.ts

```typescript
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

### 2. Handler Migration Checklist

Each handler needs these modifications from local server:

| Change | Local | AWS |
|--------|-------|-----|
| Timestamps | `Date.now()` (ms) | `Math.floor(Date.now() / 1000)` (s) |
| Rate limiter | `if (!rateLimiter.check())` | `if (!(await rateLimiter.check()).allowed)` |
| Request body | `req.body` | `ctx.body` |
| Query params | `req.query.since` | `ctx.query.since` |
| Response | `res.json({ ... })` | `return { status, body }` |
| IP address | `req.ip` | `ctx.clientIp` |
| Auth header | `req.headers.authorization` | `ctx.authorization` |

### 3. Implement handlers

#### health.ts
Simple health check, no changes needed from local.

#### create-room.ts
**Key changes:**
- Add retry logic for room code collision (max 3 attempts)
- Catch `ConditionalCheckFailedException` and retry with new code
- Rate limit via `rateLimiter.checkCreate(ctx.clientIp)`
- Catch DynamoDB throttling → 503

```typescript
const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  const roomCode = generateRoomCode();
  try {
    await ctx.storage.createRoom({ code: roomCode, ... });
    return { status: 200, body: { roomCode, hostId, hostToken } };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') continue;
    if (isDynamoDBThrottled(error)) {
      return { status: 503, body: { error: 'service_unavailable' } };
    }
    throw error;
  }
}
return { status: 503, body: { error: 'service_unavailable', message: 'Unable to create room' } };
```

#### join-room.ts
**Key changes:**
- Rate limit via `rateLimiter.checkJoin(ctx.clientIp)`
- Check `kickedCallsigns` array for blocked callsign
- All timestamps in Unix seconds

#### leave-room.ts
**Key changes:**
- Extract token from `ctx.authorization` (Bearer prefix)
- Validate peer belongs to room

#### delete-room.ts
**Key changes:**
- Host-only: validate host token
- Storage handles batch deletion

#### post-signal.ts
**Key changes:**
- Rate limit via `rateLimiter.checkSignal(roomCode, peerId)`
- Validate peer token

#### get-signals.ts
**Key changes:**
- Parse `since` from `ctx.query.since`
- Convert to Unix seconds if client sends milliseconds

#### get-events.ts
**Key changes:**
- Parse `since` from `ctx.query.since`
- Host-only endpoint

#### kick.ts
**Key changes:**
- Host-only: validate host token
- Use `storage.kickPeer()` for atomic operation

#### set-state.ts
**Key changes:**
- Host-only: validate host token
- Update room state field

### 4. Create shared utilities

**src/handlers/utils.ts:**

```typescript
// Token extraction
export function extractToken(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7);
}

// DynamoDB throttling check
export function isDynamoDBThrottled(error: unknown): boolean {
  const name = (error as { name?: string }).name;
  return name === 'ProvisionedThroughputExceededException' ||
         name === 'ThrottlingException';
}

// Standard error response
export function throttledResponse(): HandlerResult {
  return { status: 503, body: { error: 'service_unavailable', message: 'Server busy, please retry' } };
}
```

### 5. Unit tests for handlers

Create `tests/handlers/` with tests for each handler:

**Test categories per handler:**

- Happy path (success case)
- Authentication failures (invalid/missing token)
- Authorization failures (non-host trying host action)
- Rate limiting (429 response)
- Not found (room/peer doesn't exist)
- DynamoDB throttling (503 response)

## API Compatibility

Verify each endpoint matches local server behavior:

| Endpoint | Method | Auth | Body | Response |
|----------|--------|------|------|----------|
| `/health` | GET | None | None | `{ status: 'ok' }` |
| `/rooms` | POST | None | `{ gameVersion }` | `{ roomCode, hostId, hostToken }` |
| `/rooms/:code` | DELETE | Host token | None | `{ success: true }` |
| `/rooms/:code/join` | POST | None | `{ callsign }` | `{ guestId, guestToken, hostId, existingPeers }` |
| `/rooms/:code/leave` | POST | Peer token | None | `{ success: true }` |
| `/rooms/:code/signals` | POST | Peer token | `{ toPeerId, type, data }` | `{ success: true }` |
| `/rooms/:code/signals` | GET | Peer token | None | `{ signals: [...] }` |
| `/rooms/:code/events` | GET | Host token | None | `{ events: [...] }` |
| `/rooms/:code/kick` | POST | Host token | `{ peerId }` | `{ success: true }` |
| `/rooms/:code/state` | POST | Host token | `{ state }` | `{ success: true }` |

## Acceptance Criteria

- [ ] All 10 handlers implemented
- [ ] All handlers use Unix seconds for timestamps
- [ ] Rate limiting integrated in create, join, signal
- [ ] DynamoDB throttling handled with 503
- [ ] Token validation works correctly
- [ ] Handler unit tests pass
- [ ] API responses match local server format

## Commit Message

```
Port signaling handlers to AWS Lambda format

- All 10 API handlers ported from local server
- Unix timestamps for DynamoDB compatibility
- Async rate limiting integration
- DynamoDB throttling → 503 responses
- Room code collision retry in create-room
```
