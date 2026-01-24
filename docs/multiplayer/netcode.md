# Rollback Netcode

## The Problem

At 60 ticks/sec with 100ms+ RTT (São Paulo↔Boston), inputs arrive 6+ ticks late. Pure lockstep (waiting for all inputs before simulating) would add 100ms+ input lag, which is unacceptable for a real-time dogfighting game.

## Solution: Rollback Netcode

All players (including host) run the same rollback netcode. Each simulates optimistically using **predicted inputs** for remote players. When actual inputs arrive:
- If prediction was correct: no action needed
- If prediction was wrong: **rollback** to the tick where inputs diverged, **resimulate** forward with correct inputs

This gives local players zero input lag while handling network latency gracefully.

## Input Prediction

For remote players, predict "same input as last tick" (works well for continuous actions like thrust/turn). Mispredictions occur on input changes (button press/release), causing brief visual corrections.

## Rollback Requirements

The simulation must support:
1. **State snapshots** - Save full world state at each tick
2. **Fast resimulation** - Re-run N ticks quickly when rollback occurs (skip rendering)
3. **Render interpolation** - Smooth over corrections to hide small mispredictions

## State Snapshot Storage

**Suggested approach**: Ring buffer of N full snapshots.

| Parameter | Suggested Value | Rationale |
|-----------|-----------------|-----------|
| Snapshot history | 120 ticks (2 sec) | Covers 2x worst-case RTT for intercontinental play |
| Storage format | Full world state | Simpler than delta; rollback just restores snapshot |
| Memory estimate | ~50KB × 120 = 6MB | Acceptable for modern browsers |

**If rollback needed beyond history**: This indicates severe network issues. Options:
- (A) Request full state from host (SyncRequest)
- (B) Disconnect the lagging client

## Client Synchronization Limits

**Problem**: If one client's network is slow, they fall behind. Others might simulate far ahead speculatively.

**Suggested approach**: Maximum speculation window.

| Parameter | Suggested Value | Rationale |
|-----------|-----------------|-----------|
| Max speculation | 60 ticks (1 sec) | Limits how far ahead any client can simulate beyond confirmed state |
| Pause threshold | 30 ticks (0.5 sec) | If a client falls this far behind confirmed, pause and wait |

**When max speculation reached**: The game pauses automatically. The host can then decide to wait for the slow player to catch up, or manually kick them (their ship becomes AI-controlled).

**Lag detection flow:**
1. Each player tracks lag for each remote player (ticks behind confirmed horizon)
2. When any remote player exceeds pause threshold, local player sends `LagReport` to host
3. Host receives lag reports and correlates them (if everyone reports player B lagging, it's B's problem)
4. Host broadcasts `PauseMessage { reason: 'excessive_lag' }`
5. Host can kick the lagging player or wait for recovery

## Desync Detection and Recovery

1. **Detection**: Every 60 ticks, all clients send `StateHashMessage` to host
2. **Comparison**: Host compares hashes from all clients for the same tick
3. **If mismatch**:
   - Host sends `SyncRequest` to desynced client(s)
   - Client responds with `SyncResponse` (for debugging/logging)
   - Host sends `StatePush` with authoritative state
   - Client restores state and continues from there

## Input Buffering

With fully connected mesh, each player:
- Sends their inputs directly to all other players
- Receives inputs directly from all other players
- Maintains separate input buffers for each remote player

Each client maintains per remote player:

```typescript
interface RemoteInputBuffer {
  // Inputs received from network (may have gaps if out-of-order)
  received: Map<number, number>; // tick -> encoded input

  // Highest tick T where ticks 1..T are all received (contiguous)
  // (0 = no confirmed inputs yet)
  confirmedHorizon: number;

  // What input we actually used when simulating each tick
  // (may be predicted if confirmed wasn't available yet)
  usedInputs: Map<number, number>; // tick -> encoded input
}
```

### Example: inputs arrive as 1, 2, 5, 3, 4, 6

Assume we've simulated up to tick 6 with predictions.

| Event | received | confirmedHorizon | Action |
|-------|----------|------------------|--------|
| Recv 1 | {1} | 1 | Horizon 0→1. Check: used[1] == received[1]? If not, rollback to 1. |
| Recv 2 | {1,2} | 2 | Horizon 1→2. Check tick 2. |
| Recv 5 | {1,2,5} | 2 | Store only. Horizon stuck (gap at 3,4). |
| Recv 3 | {1,2,3,5} | 3 | Horizon 2→3. Check tick 3. |
| Recv 4 | {1,2,3,4,5} | 5 | Horizon 3→5. Check ticks 4,5. Rollback to earliest mismatch. |
| Recv 6 | {1,2,3,4,5,6} | 6 | Horizon 5→6. Check tick 6. |

### Rollback Procedure

When `confirmedHorizon` advances from H to H', for each tick T in (H, H'], compare `received[T]` vs `usedInputs[T]`. If any differ, rollback to the earliest mismatched tick and resimulate forward to current tick.

**Note**: With reliable ordered delivery (TCP/WebRTC reliable mode), out-of-order arrival shouldn't happen. But the design handles it if we later switch to unreliable delivery with custom reliability.

## Host Role

The host is both a player and the authority:
- **As player**: Runs the same rollback simulation as guests, predicting other players' inputs
- **As authority**: When hash mismatches are detected, the host's state is considered authoritative
- **Desync recovery**: Host sends `StatePush` with their world state to desynced clients

All players simulate identically. The host's "authority" only matters for desync recovery - during normal play, all clients reach the same state through deterministic simulation.

## Mission Start Synchronization

All clients must initialize the mission world identically:

1. Host broadcasts `MissionStarted { seed, contractId }`
2. All clients have identical `campaignState` (from `Welcome`/`CampaignSync`)
3. Each client creates world locally using: seed + campaignState + contractId
4. Identical inputs → identical PRNG seed → identical initial state
5. No serialized world state is sent at mission start (too large, unnecessary)
6. **All clients start at tick 0** - First `InputMessage` from each player is for tick 0

## Spectators

Spectators (players without assigned ships) participate in the simulation but don't send gameplay inputs:
- They run the same deterministic simulation as pilots
- They compute and send state hashes for desync detection
- They don't need input prediction (no inputs to predict)
- Their input buffer is empty - they just receive and apply confirmed inputs from pilots

Spectator camera controls (ship selection, camera mode) are local-only and don't affect simulation.
