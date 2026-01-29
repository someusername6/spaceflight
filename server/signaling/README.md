# Spaceflight Signaling Server

WebRTC signaling server for Spaceflight multiplayer. Handles room management and SDP/ICE relay for peer-to-peer connection establishment.

## Quick Start

```bash
# Install dependencies
cd server/signaling
npm install

# Start development server
npm run dev
# Server runs on http://localhost:3001

# Run tests (from project root, requires server running)
cd ../..

# Start server with high rate limits for fast tests
JOIN_RATE_LIMIT_PER_SECOND=1000 CREATE_RATE_LIMIT_PER_MINUTE=1000 npm run signaling:dev &
npm run test:signaling

# Run cleanup/expiry tests (requires short expiry times)
pkill -f "tsx.*signaling"
ROOM_EXPIRY_MS=1000 SIGNAL_EXPIRY_MS=500 EVENT_EXPIRY_MS=500 npm run signaling:dev &
npm run test:signaling:cleanup
```

## API Endpoints

### Room Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rooms` | Create a new room |
| DELETE | `/rooms/:code` | Delete a room (host only) |
| POST | `/rooms/:code/join` | Join a room |
| POST | `/rooms/:code/leave` | Leave a room |

### WebRTC Signaling

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rooms/:code/signals` | Post SDP/ICE to a peer |
| GET | `/rooms/:code/signals` | Get pending signals |

### Events & Host Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms/:code/events` | Get room events |
| POST | `/rooms/:code/kick` | Kick a player (host only) |
| POST | `/rooms/:code/state` | Set room state (host only) |
| POST | `/debug/cleanup` | Trigger cleanup (dev only) |

## What the Server Tracks

The signaling server tracks minimal state for room management:

| Data | Purpose | Storage |
|------|---------|---------|
| Room metadata | Code, host, version, state (`lobby`/`playing`) | Per-room |
| Peers in room | Capacity limits, event notifications | Per-room |
| Pending signals | WebRTC SDP/ICE relay | TTL-based cleanup |
| Room events | Join/leave/kick notifications | TTL-based cleanup |

**Not tracked by the server:**
- Player callsigns (exchanged via WebRTC after mesh forms)
- Game state beyond lobby/playing
- Player permissions or assignments

## Authentication

All endpoints except `POST /rooms` and `GET /health` require a bearer token:

```
Authorization: Bearer <token>
```

Tokens are returned when creating or joining a room.

## Example Flow

### 1. Host Creates Room

```bash
curl -X POST http://localhost:3001/rooms \
  -H "Content-Type: application/json" \
  -d '{"gameVersion": "0.2.11"}'

# Response:
# { "roomCode": "ABCD1234", "hostId": "...", "hostToken": "..." }
```

### 2. Guest Joins Room

```bash
curl -X POST http://localhost:3001/rooms/ABCD1234/join \
  -H "Content-Type: application/json" \
  -d '{"gameVersion": "0.2.11"}'

# Response:
# { "guestId": "...", "guestToken": "...", "hostId": "...", "existingPeers": [{ "peerId": "..." }] }
```

### 3. Exchange Signals

Guest sends offer to host:
```bash
curl -X POST http://localhost:3001/rooms/ABCD1234/signals \
  -H "Authorization: Bearer <guestToken>" \
  -H "Content-Type: application/json" \
  -d '{"targetPeerId": "<hostId>", "type": "offer", "data": "<SDP>"}'
```

Host retrieves signals:
```bash
curl http://localhost:3001/rooms/ABCD1234/signals \
  -H "Authorization: Bearer <hostToken>"
```

### 4. Start Game

Host sets room to playing state:
```bash
curl -X POST http://localhost:3001/rooms/ABCD1234/state \
  -H "Authorization: Bearer <hostToken>" \
  -H "Content-Type: application/json" \
  -d '{"state": "playing"}'
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_room` | 404 | Room not found |
| `room_full` | 409 | Room at capacity |
| `game_in_progress` | 409 | Cannot join mid-game |
| `version_mismatch` | 409 | Game version mismatch |
| `unauthorized` | 401 | Missing or invalid token |
| `forbidden` | 403 | Action not allowed |
| `rate_limited` | 429 | Too many requests |
| `bad_request` | 400 | Invalid request |

## Architecture

```
src/
  index.ts              # Express app entry point
  routes.ts             # Route definitions
  config.ts             # Configuration
  types.ts              # TypeScript types
  logger.ts             # Logging utility
  room-code.ts          # Room code generation
  auth.ts               # Token generation
  rate-limiter.ts       # Rate limiting
  handlers/             # Request handlers
    create-room.ts
    delete-room.ts
    join-room.ts
    leave-room.ts
    post-signal.ts
    get-signals.ts
    get-events.ts
    kick.ts
    set-state.ts
  storage/
    types.ts            # Storage interface
    memory-storage.ts   # In-memory storage (dev)
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `MAX_PEERS_PER_ROOM` | 4 | Maximum players per room |
| `ROOM_EXPIRY_MS` | 3600000 | Room TTL (1 hour) |
| `SIGNAL_EXPIRY_MS` | 60000 | Signal TTL (60s) |
| `EVENT_EXPIRY_MS` | 60000 | Event TTL (60s) |

## Production Deployment

See `cloudformation/template.yaml` for AWS deployment (Lambda + DynamoDB + API Gateway).
