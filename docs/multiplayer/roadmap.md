# Multiplayer Roadmap

## Implementation Phases

### Phase 1: Network Foundation

1. **Signaling Server** - Simple server for room codes and WebRTC handshake relay
2. **Transport Layer** - WebRTC DataChannel connections between players
3. **Lobby System** - Host creates room, others join via code
4. **Input Broadcast** - Send local inputs, receive remote inputs with tick numbers

### Phase 2: Rollback Netcode

1. **State Snapshots** - Save/restore full world state efficiently
2. **World Serialization** - Define `SerializedWorld` format for snapshots and desync recovery
3. **Input Prediction** - Predict remote inputs (repeat last input)
4. **Rollback & Resimulate** - Detect mispredictions, rollback, fast-forward with correct inputs
5. **Render Smoothing** - Interpolate over corrections to hide small pops

### Phase 3: Game State Sync

1. **Determinism Verification** - Periodic state hashing, compare across clients
2. **Desync Recovery** - Full state serialization if hashes diverge
3. **Pause/Resume** - Any player can pause; ready-up to resume with countdown
4. **Multiplayer Replay** - Save all players' inputs authoritatively for replay

### Phase 4: Multiple Players

1. **Multi-Player Entities** - Each player controls own ship, shared wingmen/enemies
2. **Per-Client Rendering** - Same simulation, different camera/HUD per player
3. **Target Selection** - Synchronized across clients (part of simulation state)
4. **Spectator Mode** - Tab through ships with replay-like camera controls

### Phase 5: Campaign Integration

1. **Campaign State Sync** - Host owns campaign, syncs state to others
2. **Mission Flow** - Host selects contracts, countdown to launch, all players deploy
3. **Lobby Tab** - New tab with player list, chat, ready states
4. **Permissions System** - Host controls what guests can do
5. **Post-Mission Chat** - Chat footer on debrief screen

### Phase 6: Polish

1. **Chat System** - Rate limiting, message history, system messages for actions
2. **Kick System** - Host can kick players, AI replacement with skill selection
3. **Callsign Tracking** - Stats persistence by callsign, kicked callsign blocking
4. **Multiplayer Pause Menu** - Ready-up system, chat, kick controls

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
- Edge cases: disconnect during mission, rejoin, kick scenarios
- Spectator mode: verify no gameplay impact from spectators

## Items Needing Investigation

| Item | Status | Notes |
|------|--------|-------|
| World Serialization | Needs investigation | Define `SerializedWorld` format, measure snapshot size |
| Multiplayer Pause Menu | Documented | In ux.md |
| Chat Footer (Debrief) | Documented | Layout needs implementation |
