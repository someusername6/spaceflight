# Multiplayer Architecture Design

This document outlines the architectural approach for adding 4-player online co-op multiplayer to Spaceflight. Each player connects from their own machine (no local split-screen).

## Overview

Spaceflight uses a fixed-timestep simulation with ECS architecture. The multiplayer approach will use **deterministic lockstep** - all clients simulate the same game state, synchronized via input broadcasts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client 1                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Network Layer                      │  │
│  │   Send: local input    Recv: remote inputs + sync     │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │              Deterministic Simulation                 │  │
│  │  - ECS World (identical across all clients)          │  │
│  │  - Fixed timestep (60 ticks/sec)                     │  │
│  │  - Seeded PRNG for determinism                       │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │                  Rendering Layer                      │  │
│  │  - Renderer instance with interpolation caches       │  │
│  │  - Camera follows local player's ship                │  │
│  │  - HUD shows local player's status                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

     ║                    ║                    ║
     ║   WebRTC/WebSocket ║                    ║
     ▼                    ▼                    ▼

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Client 2   │    │  Client 3   │    │  Client 4   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Current State

### Determinism Foundations (Ready)

| Feature | Location | Notes |
|---------|----------|-------|
| Seeded PRNG | `src/core/prng.ts` | `world.prng` for simulation, `world.renderPrng` for visuals |
| Fixed timestep | `src/game.ts` | 60 ticks/sec deterministic updates |
| Explicit system order | `src/game.ts` | 19 systems in defined order |
| Input encoding | `src/input/input-encoding.ts` | Compact 18-bit bitmask |
| Replay system | `src/replay/` | Records seed, inputs, loadouts - validates determinism |
| Determinism tests | `scripts/tests/systems/test-input-replay.mjs` | Verifies replay produces identical state |

### Multiplayer-Ready Architecture (Ready)

| Feature | Location | Notes |
|---------|----------|-------|
| Input source abstraction | `src/input/input-source.ts` | Interface for keyboard, replay, or network input |
| Serialization utilities | `src/core/serialization.ts` | Vector3/Quaternion JSON serialization |
| Player lookup utilities | `src/core/player-utils.ts` | `findLocalPlayer()`, `findAllPlayers()` |
| Per-world system state | `src/core/types.ts` | `world.systemState` isolates simulation state |
| Per-instance rendering | `src/rendering/renderer.ts` | Interpolation caches in Renderer instance |
| Deterministic campaign seeds | `src/campaign/state.ts` | Optional seed parameter for `createNewCampaign()` |

### Known Limitations (Acceptable)

These don't affect gameplay determinism:

| Item | Location | Why It's OK |
|------|----------|-------------|
| IndexedDB cache | `src/campaign/storage/` | Per-browser, not shared across network |
| Keyboard state | `src/systems/input.ts` | One keyboard per browser |
| Object pools | `src/systems/targeting.ts` | Values overwritten before use each frame |
| Floating-point math | `src/systems/damage.ts` | IEEE 754 deterministic; see file for mitigation if needed |

## Remaining Work

### Phase 1: Network Foundation

1. **Transport Layer** - WebRTC peer-to-peer with WebSocket relay fallback
2. **Lobby System** - Create/join rooms, ready state, host controls
3. **Input Synchronization** - Broadcast inputs, buffer for jitter (2-3 tick delay)

### Phase 2: Game State Sync

1. **Determinism Verification** - Periodic state hashing, compare across clients
2. **State Serialization** - Full world serialization for desync recovery
3. **PRNG Sync** - Ensure `world.prng` consumed identically; `world.renderPrng` local-only

### Phase 3: Multiple Players

1. **Multi-Player Entities** - Each player controls own ship, shared wingmen/enemies
2. **Per-Client Rendering** - Same simulation, different camera/HUD per player
3. **Target Selection** - Independent per client

### Phase 4: Campaign Integration

1. **Campaign State Sync** - Host manages progression, credits distributed to all
2. **Mission Completion** - Shared victory/defeat, reward distribution TBD

## Network Protocol

```typescript
// Input broadcast (every tick)
interface InputMessage {
  type: 'INPUT';
  tick: number;
  playerId: number;
  input: number; // 18-bit encoded input
}

// Determinism verification (periodic)
interface StateHashMessage {
  type: 'STATE_HASH';
  tick: number;
  hash: number;
}

// Desync recovery
interface SyncRequest { type: 'SYNC_REQUEST'; fromTick: number; }
interface SyncResponse { type: 'SYNC_RESPONSE'; tick: number; worldState: SerializedWorld; }
```

## Testing Strategy

1. **Determinism** - Run identical inputs on two worlds, compare state hashes
2. **Network Simulation** - Artificial latency, packet loss, jitter
3. **Desync Recovery** - Force desync, verify detection and resync

## Open Questions

1. **Input Delay** - Target 2-3 ticks (33-50ms). Acceptable?
2. **Disconnect Handling** - Pause game or AI takeover?
3. **Host Migration** - If host disconnects, can another player take over?
4. **Spectator Mode** - Allow observers?
5. **Reward Distribution** - Split evenly or by contribution?
