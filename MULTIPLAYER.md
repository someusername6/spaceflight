# Multiplayer Architecture Design

This document outlines the architectural approach for adding 4-player online co-op multiplayer to Spaceflight. Each player connects from their own machine (no local split-screen).

## Overview

Spaceflight uses a fixed-timestep simulation with ECS architecture. The multiplayer approach will use **deterministic lockstep** - all clients simulate the same game state, synchronized via input broadcasts.

## Prerequisites (Completed)

The following architectural changes have been made to prepare for multiplayer:

### 1. Input Source Abstraction

**Location:** `src/input/input-source.ts`

Created an `InputSource` interface that abstracts where input comes from:

```typescript
interface InputSource {
  getSnapshot(): InputSnapshot;
  update?(dt: number): void;
}
```

Implementations:
- `KeyboardInputSource` - Local keyboard/mouse input
- `ReplayInputSource` - Replays recorded input for playback
- `NetworkInputSource` - Receives input from network peers
- `RecordingInputSource` - Wraps another source and records for replays

### 2. Serialization Utilities

**Location:** `src/core/serialization.ts`

Added JSON-serializable representations for Three.js types:

```typescript
interface SerializedVector3 { x: number; y: number; z: number }
interface SerializedQuaternion { x: number; y: number; z: number; w: number }

function serializeVector3(v: Vector3): SerializedVector3
function deserializeVector3(data: SerializedVector3, out?: Vector3): Vector3
function serializeQuaternion(q: Quaternion): SerializedQuaternion
function deserializeQuaternion(data: SerializedQuaternion, out?: Quaternion): Quaternion
```

These are used for network message serialization and state snapshots.

### 3. Parameterized Player Lookups

**Location:** `src/core/player-utils.ts`

Centralized player entity lookup functions:

```typescript
function findLocalPlayer(world: World): Entity | null
function findAllPlayers(world: World): Entity[]
function isPlayerControlled(world: World, entity: Entity): boolean
```

In multiplayer, each client's `findLocalPlayer` returns their own controlled ship.

### 4. Renderer Instance Isolation

Moved interpolation caches from module-level state into the `Renderer` instance:

```typescript
interface Renderer {
  // ...existing fields...
  interpolatedPositions: Map<Entity, Vector3>;
  interpolatedRotations: Map<Entity, Quaternion>;
}
```

All rendering code now passes the `Renderer` instance through to `getInterpolatedPosition` and `getInterpolatedRotation`. This follows best practices by avoiding global state.

## Remaining Work

### Phase 1: Network Foundation

1. **WebRTC/WebSocket Transport Layer**
   - Peer-to-peer connections for low latency
   - Fallback to relay server for NAT traversal
   - Message types: INPUT, STATE_HASH, SYNC_REQUEST, SYNC_RESPONSE

2. **Lobby System**
   - Create/join game rooms
   - Player ready state
   - Host controls (mission selection, start game)

3. **Input Synchronization**
   - Broadcast local input snapshots each tick
   - Buffer remote inputs (2-3 tick delay for network jitter)
   - Input prediction for local player

### Phase 2: Game State Sync

1. **Determinism Verification**
   - Hash game state periodically
   - Compare hashes across clients
   - If mismatch: full state resync from host

2. **State Serialization**
   - Serialize full world state for resync
   - Delta compression for bandwidth optimization
   - Component-specific serializers

3. **PRNG Synchronization**
   - All clients must use same seed
   - Ensure `world.prng` consumed identically
   - `world.renderPrng` remains local-only

### Phase 3: Multiple Players

1. **Multi-Player Entity Management**
   - Each player controls their own ship entity
   - Wingmen shared across all players
   - Enemy AI runs identically on all clients

2. **Per-Client Rendering**
   - Each client has their own `Renderer` instance
   - Each client follows their own ship
   - Same scene state, different camera positions

3. **HUD Per Player**
   - Each client sees their own HUD
   - Target selection independent per client
   - Shared tactical/strategic information (minimap, objectives)

### Phase 4: Campaign Integration

1. **Campaign State Sync**
   - Host manages campaign progression
   - Credits/rewards distributed to all players
   - Ship upgrades visible to all

2. **Mission Completion**
   - All players share victory/defeat
   - Rewards split or shared (TBD)
   - Permadeath: mission fails if any player dies (or commander only)

## Network Protocol

### Input Message

```typescript
interface NetworkInputMessage {
  type: 'INPUT';
  tick: number;
  playerId: number;
  input: InputSnapshot;
}
```

### State Hash Message

```typescript
interface StateHashMessage {
  type: 'STATE_HASH';
  tick: number;
  hash: number;
}
```

### Sync Request/Response

```typescript
interface SyncRequestMessage {
  type: 'SYNC_REQUEST';
  fromTick: number;
}

interface SyncResponseMessage {
  type: 'SYNC_RESPONSE';
  tick: number;
  worldState: SerializedWorld;
}
```

## Testing Strategy

1. **Determinism Tests**
   - Run same inputs on two worlds
   - Compare state hashes after N ticks
   - Already have `test-input-replay.mjs` as foundation

2. **Network Simulation**
   - Artificial latency injection
   - Packet loss simulation
   - Jitter testing

3. **Desync Detection**
   - Force desync by modifying one client
   - Verify detection and recovery

## Files Modified (Prep Work)

| File | Change |
|------|--------|
| `src/input/input-source.ts` | Created (new) |
| `src/core/serialization.ts` | Created (new) |
| `src/core/player-utils.ts` | Created (new) |
| `src/rendering/renderer.ts` | Moved interpolation caches to instance |
| `src/rendering/beam-effects/lightning.ts` | Added renderer parameter |
| `src/rendering/beam-effects/torch.ts` | Added renderer parameter |
| `src/rendering/effects/beam-glow.ts` | Added renderer parameter |
| `src/rendering/effects/explosions.ts` | Added renderer parameter |
| `src/rendering/effects/jump-effect.ts` | Added renderer parameter |
| `src/rendering/effects/muzzle-flash.ts` | Added renderer parameter |
| `src/rendering/missile-exhaust.ts` | Added renderer parameter |
| `src/rendering/beam-lines.ts` | Added renderer parameter |
| `src/rendering/hud/target-camera.ts` | Added renderer parameter |
| `src/rendering/hud/hud.ts` | Changed to take Renderer instead of entityMeshes |
| `src/rendering/reticle/reticles.ts` | Added renderer parameter |
| `src/campaign/mission/mission-renderer.ts` | Updated all effect renderer calls |
| `src/simulation/battle-simulation.ts` | Updated interpolation and effect calls |
| `src/ui/screens/replay/camera-orbit.ts` | Added renderer parameter |
| `src/ui/screens/replay/replay-camera.ts` | Added renderer parameter |
| `src/ui/screens/replay/viewer-camera.ts` | Added renderer parameter |
| `src/ui/screens/replay/viewer-playback.ts` | Updated to pass renderer |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client 1                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Network Layer                      │   │
│  │   Send: local input    Recv: remote inputs + sync     │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │              Deterministic Simulation                 │   │
│  │  - ECS World (identical across all clients)          │   │
│  │  - Fixed timestep (60 ticks/sec)                     │   │
│  │  - Seeded PRNG for determinism                       │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │                  Rendering Layer                      │   │
│  │  - Renderer instance with interpolation caches       │   │
│  │  - Camera follows local player's ship                │   │
│  │  - HUD shows local player's status                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

     ║                    ║                    ║
     ║   WebRTC/WebSocket ║                    ║
     ▼                    ▼                    ▼

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Client 2   │    │  Client 3   │    │  Client 4   │
│  (Same      │    │  (Same      │    │  (Same      │
│   structure)│    │   structure)│    │   structure)│
└─────────────┘    └─────────────┘    └─────────────┘
```

## Open Questions

1. **Latency Handling**: How much input delay is acceptable? (Target: 2-3 ticks = 33-50ms)
2. **Disconnect Handling**: Pause game or continue with AI takeover?
3. **Host Migration**: If host disconnects, can another player take over?
4. **Spectator Mode**: Allow observers who don't control a ship?
5. **Reward Distribution**: Split credits evenly or by contribution?
