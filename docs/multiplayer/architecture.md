# Multiplayer Architecture

## Client Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Network Layer                      │  │
│  │   Send: local input    Recv: remote inputs + sync     │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │              Deterministic Simulation                 │  │
│  │  - ECS World (eventually consistent across clients)  │  │
│  │  - Fixed timestep (60 ticks/sec)                     │  │
│  │  - Seeded PRNG for determinism                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │              Rollback State Manager                   │  │
│  │  - Ring buffer of recent state snapshots             │  │
│  │  - Detect mispredictions, restore, resimulate        │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │                  Rendering Layer                      │  │
│  │  - Renderer instance with interpolation caches       │  │
│  │  - Camera follows local player's ship                │  │
│  │  - HUD shows local player's status                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Current Codebase State

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

| Item | Location | Why It's OK |
|------|----------|-------------|
| IndexedDB cache | `src/campaign/storage/` | Per-browser, not shared across network |
| Keyboard state | `src/systems/input.ts` | One keyboard per browser |
| Object pools | `src/systems/targeting.ts` | Values overwritten before use each frame |
| Floating-point math | `src/systems/damage.ts` | IEEE 754 deterministic; see file for mitigation if needed |
