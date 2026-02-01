# Multiplayer Architecture Review

**Date:** 2026-02-01
**Scope:** Commits `ca1bbe..0ca6602` (33 commits)
**Reviewer:** Claude Opus 4.5

---

## Executive Summary

The Spaceflight multiplayer system implements deterministic lockstep networking with rollback using the `rollback-netcode` library over WebRTC peer-to-peer connections. The architecture spans 16 development phases and includes comprehensive security hardening, reconnection resilience, and race condition fixes.

**Status:** Production-ready for small groups (2-4 players).

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Campaign Controller                          │
│                    (lobby-handlers.ts, lobby-context.ts)            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   LobbyState            MessageRouter          CampaignSyncManager
   (lobby-state.ts)      (router.ts)            (campaign-sync.ts)
        │                      │                      │
        │              ┌───────┴───────┐              │
        │              ▼               ▼              │
        │         Encode/Decode   Host-Only          │
        │         (encode.ts)     Validation         │
        │              │                              │
        └──────────────┼──────────────────────────────┘
                       ▼
              WebRTCTransport (TransportAdapter)
                       │
              ┌────────┴────────┐
              ▼                 ▼
         WebRTCMesh      SignalingClient
         (P2P mesh)      (HTTP polling)
              │                 │
              ▼                 ▼
        RTCPeerConnection   Signaling Server
        (data channels)     (room management)
```

---

## 1. Protocol Layer

**Location:** `src/multiplayer/protocol/`

### Message Types (24 total)

Messages use byte range `0x80-0x97` to distinguish from rollback-netcode internal messages (`0x00-0x7F`).

| Category | Messages | Purpose |
|----------|----------|---------|
| Lobby & Connection | Welcome, PlayerJoinedExt, PlayerLeftExt, CallsignAnnounce, CallsignUpdate | Session membership |
| Player State | ReadyState, PermissionUpdate, ShipAssignment | Pre-mission configuration |
| Campaign Sync | CampaignSync, ActionRequest, ActionResponse | State synchronization |
| Mission Lifecycle | ContractAccepted, LaunchCountdown, LaunchAborted, MissionStarted, MissionEnded, ReturnToLobby | Mission flow |
| Session Control | SessionEnded, KickNotification | Session management |
| Pause System | PauseRequest, PauseReadyState, PlayerDropped, GuestQuitRequest | In-mission pause |
| Chat | ChatMessage | Player communication |

### Binary Encoding

- **Primitives:** DataView with big-endian byte order
- **Strings:** Length-prefixed UTF-8 (uint32 length + bytes)
- **Complex Objects:** JSON serialization for CampaignState, MissionOutcomeData

### Security Measures

| Protection | Implementation |
|------------|----------------|
| Buffer bounds | `ensureBytes()` before every read operation |
| Size limits | `MAX_STRING_LENGTH=64KB`, `MAX_MESSAGE_SIZE=1MB` |
| Type validation | Message type byte range check (`0x80-0x97`) |
| Host authorization | 16 message types restricted to host sender |
| JSON safety | Try-catch wrapper with ProtocolError |
| Error tracking | Default error handler with count tracking |

### Message Router

The `MessageRouter` class provides:
- Type-safe handler registration via builder pattern
- Automatic host-only message validation
- Error counting for diagnostics (`getErrorCount()`, `resetErrorCount()`)
- Transport integration via `wireToTransport()`

---

## 2. Networking Layer

**Location:** `src/multiplayer/networking/`

### Connection Flow

**Host:**
1. POST `/rooms` → receive roomCode, hostId, hostToken
2. Initialize WebRTCMesh as non-initiator (waits for offers)
3. Poll for signals and events

**Guest:**
1. POST `/rooms/{code}/join` → receive guestId, guestToken, hostId, existingPeers
2. Initialize WebRTCMesh as initiator (sends offers to all peers)
3. Wait for mesh completion (all peers connected)
4. Poll for signals

### WebRTC Mesh Topology

Every player maintains direct connections to every other player:
- Two data channels per connection: `reliable` (ordered) and `unreliable` (fire-and-forget)
- Currently only reliable channel is used
- Mesh completion detected when all expected peers are connected
- 30-second mesh formation timeout

### Reconnection Logic

**ReconnectionManager** implements exponential backoff with jitter:
```
delay = min(500ms × 2^attempts, 16000ms) + random(0, 50%)
maxAttempts = 5
```

**Tie-breaker:** Lower peer ID becomes initiator to prevent dual-offer deadlock.

**Events:**
- `onPeerReconnecting` - Starting reconnection attempt
- `onPeerReconnectionAttempt` - Attempting after delay
- `onPeerReconnectionFailed` - Gave up after max retries

### Signal Queue

Outgoing WebRTC signals (offers, answers, ICE candidates) are queued with retry:
- `MAX_SIGNAL_RETRIES = 10`
- Exponential backoff: `min(100ms × 2^retryCount, 5000ms)`
- Signals dropped after max retries

---

## 3. Signaling Server

**Location:** `server/signaling/src/`

### Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/rooms` | Create room | None |
| POST | `/rooms/:code/join` | Join room | None |
| POST | `/rooms/:code/signals` | Post SDP/ICE | Bearer |
| GET | `/rooms/:code/signals` | Get pending signals | Bearer |
| GET | `/rooms/:code/events` | Get room events | Bearer |
| POST | `/rooms/:code/leave` | Leave room | Bearer |
| POST | `/rooms/:code/kick` | Kick player (host) | Bearer |
| POST | `/rooms/:code/state` | Set room state (host) | Bearer |

### Rate Limiting

| Limit | Scope | Value |
|-------|-------|-------|
| Room creation | Per IP/minute | 10 (prod), 60 (dev) |
| Room join | Per IP/second | 5 (prod), 10 (dev) |
| Signals | Per peer/second | 20 |

### Token Generation

Uses `crypto.randomBytes()` for cryptographically secure tokens:
- Auth tokens: 32 bytes → 64 hex characters
- Peer IDs: 16 bytes with `peer-` prefix

### Room Lifecycle

- Rooms expire after 1 hour of inactivity
- Signals and events expire after 60 seconds
- Cleanup runs every 60 seconds
- Kicked callsigns tracked to prevent re-entry

---

## 4. Lobby State Management

**Location:** `src/multiplayer/lobby-state.ts`, `src/multiplayer/lobby-messages.ts`

### State Structure

```typescript
LobbyState {
  roomCode: string
  localPlayerId: string
  isHost: boolean
  players: LobbyPlayer[]
  chatMessages: ChatEntry[]
  errorMessage: string | null
}

LobbyPlayer {
  playerId: string
  callsign: string
  shipId: string | null  // null = spectator
  isReady: boolean
  isHost: boolean
  ping: number
  permissions: Permission
}
```

### Permission System

```typescript
Permission {
  shipEdit: 'none' | 'own' | 'any'
  canBuy: boolean
  canSell: boolean
  canConvertScrap: boolean
}
```

Host has full permissions. Guests default to `shipEdit: 'own'` with all actions enabled.

### Ship Assignment

**Race Condition Prevention:**
- `stateVersion` field in CampaignState for optimistic concurrency control
- `expectedVersion` in ShipAssignmentMessage rejects stale requests
- `ship_occupied` error for simultaneous claims
- Campaign state is single source of truth (not lobby state)

### Callsign Management

- Validation: 2-16 alphanumeric characters with spaces
- Collision detection: Case-insensitive comparison
- Resolution: Automatic numeric suffix (e.g., "Pilot" → "Pilot 2")

### Permission Resync

When a peer reconnects, host automatically resends their permissions via `PermissionUpdateMessage`.

---

## 5. Game Adapter

**Location:** `src/multiplayer/game-adapter.ts`

### rollback-netcode Integration

`SpaceflightGameAdapter` implements the `Game<Uint8Array>` interface:

| Method | Purpose |
|--------|---------|
| `step(inputs)` | Advance simulation by one tick with player inputs |
| `serialize()` | Capture full world state for snapshots |
| `deserialize(data)` | Restore world state for rollback |
| `hash()` | Compute deterministic hash for desync detection |

Optional debug logging available via constructor parameter.

### Input Format

Inputs are 4 bytes (32-bit bitmask) encoding 18 boolean actions:
- Movement: pitch, yaw, roll, accelerate, decelerate, afterburner
- Combat: fire primary/secondary, launch decoy, cycle weapons/targets
- Other: toggle match speed

### World Hashing

FNV-1a algorithm produces 32-bit deterministic hash:
- Entities sorted by ID before hashing
- System state (gameTime, weapons, targeting) included
- Only simulation-critical fields (skips visual state)

---

## 6. Mission Integration

**Location:** `src/campaign/mission/mission-launcher.ts`

### Launch Flow

1. Create game with deterministic seed
2. Spawn player and wingmen ships
3. Build player entity map (playerId → entity)
4. Create MultiplayerSession with GameAdapter
5. Enable input recording for replay
6. Wire callbacks (onTick, onMissionEnd)
7. Start multiplayer game loop

### Game Loop

Fixed timestep (60 ticks/second):
1. Capture local input
2. Call `session.tick()` (rollback-netcode manages remote inputs)
3. Check mission end condition
4. Render with interpolation alpha

### Pause System

**PauseCoordinator** manages:
- Pause reasons: player-request, disconnect, lag-detected
- Per-player ready state for resume
- Player drop with AI skill selection
- 5-second countdown when all ready
- LaunchAborted broadcast when countdown fails

---

## 7. Replay System

**Location:** `src/replay/multiplayer-replay.ts`

### MultiplayerInputRecorder

Records per-player inputs with:
- Join/leave tick tracking
- RLE compression for input streams
- Wingmen state for reconstruction

### Replay Data

- Player info: callsign, shipId, join/leave ticks, isHost
- Kill/damage statistics across all players
- PRNG seed for deterministic reconstruction

---

## 8. UI Components

**Location:** `src/ui/screens/lobby/`, `src/ui/screens/multiplayer-pause.ts`

### Lobby Screen

Two-column layout:
- Left: Player list with status indicators (ready, ping, ship)
- Right: Chat panel with timestamps

Host features:
- Room code header with copy button
- Permission popover on guest hover (tracked by player ID)
- Kick functionality

### Pause Modal

- Pause reason display
- Player status (connected, disconnected, dropped)
- Ready-to-resume toggle
- AI skill selection for dropped players
- Chat during pause

---

## 9. Test Coverage

### Test Categories

| Category | Files | Focus |
|----------|-------|-------|
| Unit | 42 | Protocol, state, permissions, encoding |
| Integration | 3 | Multi-player sessions, determinism |
| E2E | 60+ | Full application flow with Playwright |
| Networking | 6 | WebRTC mesh, signal retry, HTTP retry |
| Signaling | 6 | Server endpoints, rate limiting |

### Key Test Patterns

- **WebRTC Mocking:** Synthetic RTCPeerConnection/RTCDataChannel
- **Deterministic Simulation:** Same seed produces identical hash checkpoints
- **Protocol Round-trip:** Encode → decode → verify equality

---

## 10. Development Phases

| Commit | Phase | Description |
|--------|-------|-------------|
| `96d3bb9` | 2 | Rollback engine integration |
| `c3da23d` | 3 | Signaling server |
| `30dcb8e` | 4 | WebRTC mesh networking |
| `933f8e0` | 5 | Game protocol layer |
| `a9444f8` | 6 | Join game flow |
| `768cd1c` | 7 | Lobby tab |
| `70c89f6` | 8 | Permissions & ship assignment |
| `4c2ffca` | 9 | Launch flow, mission sync |
| `3976ef5` | 10 | Mission runtime |
| `05e7821` | 11 | Pause system |
| `1a8dd78` | 12 | Debrief and session management |
| `6e1cccf` | 13 | Polish and edge cases |
| `38e1cf6` | 14 | Replay system |
| `f85d355` | - | Protocol security (buffer bounds, rate limiting) |
| `fc857d7` | - | Connection resilience (reconnection, backoff) |
| `cb45c8d` | - | Ship assignment race condition fixes |
| `599c937` | - | State management fixes |
| `0ca6602` | - | Medium priority fixes |

---

## Key Files Reference

| Area | Primary Files |
|------|---------------|
| Protocol | `protocol/messages.ts`, `protocol/encode.ts`, `protocol/decode.ts`, `protocol/router.ts`, `protocol/router-send.ts` |
| Networking | `networking/connection-flow.ts`, `networking/webrtc-mesh.ts`, `networking/reconnection.ts`, `networking/signal-queue.ts` |
| State | `lobby-state.ts`, `lobby-messages.ts`, `ship-assignment.ts`, `permissions.ts` |
| Game | `game-adapter.ts`, `input-format.ts`, `multiplayer-session.ts` |
| Mission | `campaign/mission/mission-launcher.ts`, `multiplayer-game-loop.ts` |
| Server | `server/signaling/src/index.ts`, `server/signaling/src/handlers/` |
| UI | `ui/screens/lobby/lobby.ts`, `ui/screens/lobby/host-popover.ts`, `ui/screens/multiplayer-pause.ts` |
