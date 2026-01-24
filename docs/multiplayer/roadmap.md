# Multiplayer Roadmap

## Implementation Phases

### Phase 1: Network Foundation

1. **Transport Layer** - WebRTC DataChannel connections between players
2. **Lobby/Connection** - Host creates game, others join via code/link
3. **Input Broadcast** - Send local inputs, receive remote inputs with tick numbers

### Phase 2: Rollback Netcode

1. **State Snapshots** - Save/restore full world state efficiently
2. **Input Prediction** - Predict remote inputs (repeat last input)
3. **Rollback & Resimulate** - Detect mispredictions, rollback, fast-forward with correct inputs
4. **Render Smoothing** - Interpolate over corrections to hide small pops

### Phase 3: Game State Sync

1. **Determinism Verification** - Periodic state hashing, compare across clients
2. **Desync Recovery** - Full state serialization if hashes diverge
3. **Pause/Resume** - Handle disconnects, allow host to drop players

### Phase 4: Multiple Players

1. **Multi-Player Entities** - Each player controls own ship, shared wingmen/enemies
2. **Per-Client Rendering** - Same simulation, different camera/HUD per player
3. **Target Selection** - Independent per client (rendering-only state)

### Phase 5: Campaign Integration

1. **Campaign State Sync** - Host owns campaign, syncs state to others
2. **Mission Flow** - Host selects contracts, all players deploy together

## Testing Strategy

### Determinism Testing

- Run identical inputs on two worlds
- Compare state hashes after N ticks
- Existing `test-input-replay.mjs` provides foundation

### Network Testing

- Artificial latency injection (simulate intercontinental RTT)
- Packet loss simulation
- Jitter testing (variable latency)

### Desync Testing

- Force desync by modifying one client's state
- Verify detection (hash mismatch)
- Verify recovery (state push restores sync)

### Integration Testing

- Full 4-player sessions with real network conditions
- Stress test: rapid input changes to trigger frequent rollbacks
- Edge cases: disconnect during mission, rejoin, host migration (if supported)
