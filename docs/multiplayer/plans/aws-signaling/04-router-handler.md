# Phase 04: Router & Lambda Handler

## Objective

Implement the Lambda entry point and request routing logic.

## Prerequisites

- Phase 01 complete (config, types exist)

## Files to Create

```
server/signaling-aws/
├── src/
│   ├── index.ts          # Lambda handler
│   └── router.ts         # Route matching
└── tests/
    ├── test-router.ts
    └── test-lambda-handler.ts
```

## Tasks

### 1. Create src/router.ts

**Exports:**

```typescript
export interface RouteContext {
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

export interface HandlerResult {
  status: number;
  body: unknown;
}

export type HandlerFn = (ctx: RouteContext, roomCode?: string) => Promise<HandlerResult>;

export async function route(ctx: RouteContext): Promise<HandlerResult>;
```

**Route table:**

```typescript
const routes: Array<{ method: string; pattern: RegExp; handler: HandlerFn }> = [
  { method: 'GET',    pattern: /^\/health$/i,                          handler: handlers.health },
  { method: 'POST',   pattern: /^\/rooms$/i,                           handler: handlers.createRoom },
  { method: 'DELETE', pattern: /^\/rooms\/([A-Za-z0-9]{8})$/i,         handler: handlers.deleteRoom },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/join$/i,   handler: handlers.joinRoom },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/leave$/i,  handler: handlers.leaveRoom },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/signals$/i, handler: handlers.postSignal },
  { method: 'GET',    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/signals$/i, handler: handlers.getSignals },
  { method: 'GET',    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/events$/i,  handler: handlers.getEvents },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/kick$/i,    handler: handlers.kick },
  { method: 'POST',   pattern: /^\/rooms\/([A-Za-z0-9]{8})\/state$/i,   handler: handlers.setState },
];
```

**Key behaviors:**
- Room codes normalized to uppercase: `match[1]?.toUpperCase()`
- Case-insensitive path matching
- 404 for unmatched routes

### 2. Create src/index.ts

**Lambda handler signature:**

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2>
```

**Event parsing:**

```typescript
const method = event.requestContext.http.method;
const path = event.rawPath;
const clientIp = event.requestContext.http.sourceIp;
const authorization = event.headers.authorization;
const query = event.queryStringParameters ?? {};
```

**JSON body parsing with error handling:**

```typescript
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
```

**Response formatting:**

```typescript
return {
  statusCode: result.status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(result.body),
};
```

**Module initialization:**
Storage and rate limiter are initialized at module level (outside handler) for Lambda container reuse:

```typescript
const config = getConfig();
const storage = createStorage(config);
const rateLimiter = createRateLimiter(config);

export async function handler(event) {
  // Use pre-initialized instances
}
```

### 3. Create tests/test-router.ts

**Test cases:**

Route matching:
- [ ] Matches exact paths (GET /health)
- [ ] Matches parameterized paths (POST /rooms/ABCD1234/join)
- [ ] Extracts room code from path
- [ ] Normalizes room code to uppercase
- [ ] Returns 404 for unmatched paths
- [ ] Returns 404 for wrong method on valid path

Case sensitivity:
- [ ] Path matching is case-insensitive (/ROOMS/abc/JOIN works)
- [ ] Room code is normalized to uppercase

### 4. Create tests/test-lambda-handler.ts

**Test cases:**

Request parsing:
- [ ] Extracts method, path, IP from event
- [ ] Parses JSON body correctly
- [ ] Returns 400 for invalid JSON
- [ ] Handles missing body gracefully
- [ ] Parses query parameters

Response formatting:
- [ ] Returns correct status code
- [ ] Sets Content-Type header
- [ ] Stringifies body as JSON

## Implementation Notes

**Why initialize outside handler:**
Lambda containers are reused. Initializing storage/rate limiter connections outside the handler means they persist across invocations, reducing latency.

**Stub handlers for testing:**
During this phase, create stub handlers that return 501 Not Implemented. Real handlers come in Phase 05.

```typescript
// Temporary stubs
export const health = async () => ({ status: 200, body: { status: 'ok' } });
export const createRoom = async () => ({ status: 501, body: { error: 'not_implemented' } });
// ... etc
```

## Acceptance Criteria

- [ ] Router matches all 10 routes correctly
- [ ] Room codes normalized to uppercase
- [ ] Lambda handler parses events correctly
- [ ] Invalid JSON returns 400
- [ ] Unit tests pass
- [ ] TypeScript compiles without errors

## Commit Message

```
Add Lambda handler and router for AWS signaling

- Request routing with parameterized paths
- Case-insensitive matching with uppercase room codes
- JSON parsing with error handling
- Stub handlers for integration
```
