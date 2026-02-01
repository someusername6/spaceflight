# Phase 03: Rate Limiter

## Objective

Implement the DynamoDB-backed rate limiter for stateless Lambda rate limiting.

## Prerequisites

- Phase 01 complete (config, types exist)

## Files to Create

```
server/signaling-aws/
├── src/
│   └── rate-limiter/
│       └── dynamodb-rate-limiter.ts
└── tests/
    └── test-dynamodb-rate-limiter.ts
```

## Tasks

### 1. Create src/rate-limiter/dynamodb-rate-limiter.ts

**Interface:**

```typescript
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RateLimiter {
  checkJoin(ip: string): Promise<RateLimitResult>;
  checkCreate(ip: string): Promise<RateLimitResult>;
  checkSignal(roomCode: string, peerId: string): Promise<RateLimitResult>;
}
```

**Rate limit types:**

| Method | Key Pattern | Limit | Window |
|--------|-------------|-------|--------|
| `checkJoin` | `RATELIMIT#{ip}#join` | 5/sec | 1 second |
| `checkCreate` | `RATELIMIT#{ip}#create` | 10/min | 60 seconds |
| `checkSignal` | `RATELIMIT#{roomCode}:{peerId}#signal` | 20/sec | 1 second |

**Algorithm:**

Uses sliding window with atomic DynamoDB UpdateItem:

1. Calculate window start: `Math.floor(now / windowSeconds) * windowSeconds`
2. Atomic increment with condition check:
   - If `windowStart` matches → increment counter
   - If `windowStart` differs → reset counter to 1
3. Return `allowed: count <= limit`

**DynamoDB item structure:**

```
PK: RATELIMIT#{key}#{type}
SK: #
count: number
windowStart: number (Unix seconds)
expiresAt: windowStart + windowSeconds + 60  (TTL buffer)
```

**Handling window transitions:**

```typescript
try {
  // Atomic increment with window check
  const result = await client.send(new UpdateCommand({
    UpdateExpression: `
      SET #count = if_not_exists(#count, :zero) + :one,
          #window = if_not_exists(#window, :windowStart),
          #expires = :expiresAt
    `,
    ConditionExpression: 'attribute_not_exists(#window) OR #window = :windowStart',
    // ...
  }));
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    // Window changed, reset counter
    await resetCounter();
  }
}
```

### 2. Create tests/test-dynamodb-rate-limiter.ts

**Test cases:**

Basic functionality:
- [ ] First request in window is allowed
- [ ] Requests within limit are allowed
- [ ] Request exceeding limit is rejected
- [ ] `remaining` count decrements correctly

Window transitions:
- [ ] Counter resets when window changes
- [ ] Requests allowed again in new window

Concurrent access:
- [ ] Multiple simultaneous requests don't exceed limit (atomic)

Edge cases:
- [ ] Different keys don't interfere
- [ ] Different types (join vs create) are independent

## Implementation Notes

**Why DynamoDB for rate limiting:**
- Lambda is stateless — no in-memory counters
- Need atomic operations for concurrent invocations
- TTL auto-cleans expired entries
- Same table as signaling data (no additional resources)

**TTL buffer:**
Rate limit items expire `windowSeconds + 60` after window start. The 60-second buffer ensures items don't expire mid-window due to DynamoDB TTL timing (up to 48 hours delay, but usually faster).

## Acceptance Criteria

- [ ] All three rate limit methods implemented
- [ ] Atomic increment prevents race conditions
- [ ] Window transitions work correctly
- [ ] Unit tests pass
- [ ] TTL calculated correctly

## Commit Message

```
Implement DynamoDB rate limiter for AWS signaling

- Per-IP limits for join and create operations
- Per-peer limits for signal operations
- Atomic counters with sliding window
- Auto-cleanup via TTL
```
