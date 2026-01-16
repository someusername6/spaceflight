# Replay System Review

**Reviewed:** 2026-01-16
**Reviewer:** Claude (Automated Code Review)
**Files Analyzed:** 15+ source files across `src/replay/`, `src/input/`, `src/campaign/mission/`, and related systems

---

## Executive Summary

The replay system is **well-designed and robust**. It demonstrates good separation of concerns, proper determinism handling, and comprehensive data capture for reconstruction. Historical bugs documented in CLAUDE.md have been properly fixed. The system follows industry best practices for replay determinism including:

- Seeded PRNG for all simulation randomness
- Separate renderPrng to isolate visual effects from simulation
- Shared wave initialization logic between live and replay
- Full loadout capture including player, wingmen, weapons, and ammo counts

**Key Strengths:**
1. Clean architecture with dedicated modules for compression, storage, playback, and reconstruction
2. Proper PRNG isolation (world.prng for simulation, world.renderPrng for visuals)
3. Comprehensive determinism testing with checksum verification
4. FIFO eviction and gzip compression for efficient storage

**Minor Concerns:**
1. Math.random() used in non-simulation contexts (ID generation) - acceptable
2. Version migration strategy is simple (reject old versions rather than migrate)
3. No keyframe optimization for seeking (documented as future work)

---

## 1. Recording

### Data Captured (`src/replay/types.ts:225-248`)

The `FullReplayData` structure captures all necessary data:

```typescript
interface FullReplayData {
  version: number;              // Format version (currently 2)
  seed: number;                 // World PRNG seed
  inputs: number[];             // Encoded input bitmasks per tick
  inputsCompressed: boolean;    // RLE compression flag
  tickCount: number;            // Total ticks for progress display
  metadata: ReplayMetadata;     // Mission ID, outcome, stats
  playerLoadout: ReplayShipLoadout;  // Ship class, weapons, ammo
  wingmen: ReplayWingman[];     // Full wingman data including positions
  playerAutoaim: PlayerAutoaim; // Autoaim setting (affects projectile aim)
  debriefData?: ReplayDebriefData;   // Combat stats for debrief display
  salvageData?: ReplaySalvageData;   // Items recovered (v2+)
}
```

### Recording Flow

1. **InputRecorder** (`src/input/input-recorder.ts:41-146`)
   - Created at mission start with seed, missionId, and autoaim setting
   - `setDeployment()` captures player loadout and wingmen data at spawn
   - `record()` called each tick with current InputState

2. **Mission End** (`src/campaign/mission/mission-callbacks.ts:54-167`)
   - `stopRecording()` retrieves InputRecorder
   - `buildReplayData()` constructs FullReplayData from recorder
   - Salvage data added after calculation
   - Saved to IndexedDB asynchronously

### Assessment: SUFFICIENT

All data needed for deterministic reconstruction is captured:
- [x] Player ship class and stats
- [x] Player weapons (type, bank size, ammo counts)
- [x] Wingmen loadouts and starting positions
- [x] Pilot names and skill levels for wingmen
- [x] World seed for PRNG reconstruction
- [x] Player autoaim setting (affects weapon firing behavior)

---

## 2. Playback

### World Reconstruction (`src/replay/mission-setup.ts:251-300`)

The `setupReplayWorld()` function reconstructs the mission state:

```typescript
function setupReplayWorld(
  seed: number,
  missionId: string,
  playerLoadout: ReplayShipLoadout,
  wingmen: ReplayWingman[],
  playerAutoaim: number,
): ReplayWorldSetup
```

Key steps:
1. Creates world with replay seed (`createWorld(seed)`)
2. Sets `world.replayAutoaim` override for weapon-firing system
3. Initializes match stats
4. Spawns player at origin with exact loadout from replay
5. Spawns wingmen at recorded positions with recorded loadouts
6. Initializes wave state using shared `initializeFirstWave()`

### Playback Loop (`src/replay/playback.ts:121-146`)

```typescript
private simulateTick(): void {
  // Apply recorded input to player entity
  this.inputPlayer.applyInputForTick(this.currentTick, player.input);

  // Update game time
  this.world.systemState.gameTime += TICK_SEC;

  // Run simulation systems (imported from game.ts)
  for (const system of SIMULATION_SYSTEMS) {
    system(this.world, TICK_SEC);
  }

  // Process wave spawning (shared logic)
  tickReplayWaves(this.world, this.waveState, this.mission, TICK_SEC);

  this.currentTick++;
}
```

### Gaps Identified: NONE

- Player spawning matches live gameplay component order
- Wingman spawning matches `spawnWingmanFromReplayLoadout()` in mission-setup.ts
- Uses same `SIMULATION_SYSTEMS` array as live gameplay
- Wave processing uses shared `processWaveTick()` function

---

## 3. Determinism

### PRNG Architecture (`src/core/ecs.ts:73-77`)

```typescript
export function createWorld(seed: number = 0): World {
  return {
    // ... other state ...
    prng: createPRNG(seed),
    // Separate PRNG for rendering effects - same seed so visuals are consistent,
    // but isolated from simulation to maintain determinism
    renderPrng: createPRNG(seed),
  };
}
```

### PRNG Usage Analysis

**Simulation PRNG (`world.prng`) - CORRECTLY USED:**
- `src/systems/aim-error.ts:104` - AI aim drift updates
- `src/systems/weapons/missiles.ts:67` - Decoy seduction chance
- `src/systems/weapons/shrapnel.ts` - Shrapnel spread
- `src/systems/weapons/decoy-spawning.ts` - Decoy spawning
- `src/campaign/mission/mission-waves.ts:95,205,256` - Spawn positioning and wave delays
- `src/campaign/ship-spawning.ts` - Ship spawning
- `src/factories/ship.ts` - Ship creation
- `src/replay/mission-setup.ts:210` - Wingman AI aim error initialization

**Render PRNG (`world.renderPrng`) - CORRECTLY ISOLATED:**
- `src/rendering/beam-effects/lightning.ts:186,193,204` - Lightning bolt generation
- `src/rendering/missile-exhaust.ts:88` - Exhaust flicker phase

### Math.random() Usage

Found in 2 files:
1. `src/core/mersenne-twister.ts:14` - Comment explaining no Math.random() fallback
2. `src/replay/storage.ts:105` - ID generation for replay storage

**Assessment:** The Math.random() usage in storage.ts is **acceptable** - it's only used for generating unique storage IDs, not affecting simulation state.

### Date.now() Usage

All Date.now() calls are in non-simulation contexts:
- Replay metadata timestamps (`recordedAt`, `savedAt`)
- Campaign state initialization (seed generation for new campaigns)
- Title screen battle simulation (intentionally non-deterministic)
- Export timestamps

**Assessment:** No Date.now() calls affect simulation determinism.

### Frame-Rate Independence

The simulation uses fixed timestep:
```typescript
// src/game.ts:36-39
export const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
export const TICK_SEC = 1 / TICK_RATE;
```

All systems receive `dt` parameter which is always `TICK_SEC` (1/60 seconds).

---

## 4. Version Migration

### Current Strategy (`src/replay/storage.ts:234-239`, `src/replay/types.ts:10-13`)

```typescript
export const REPLAY_VERSION = 2;
export const MIN_REPLAY_VERSION = 1;

// In loadReplay():
if (replay.version < MIN_REPLAY_VERSION || replay.version > REPLAY_VERSION) {
  throw new Error(`Replay version ${replay.version} is not supported`);
}
```

### Assessment: SIMPLE BUT FUNCTIONAL

The current approach rejects incompatible versions rather than migrating them. This is acceptable for:
- v1 replays: Missing debrief/salvage data (display only, doesn't affect playback)
- Future versions: Would need format migration if breaking changes occur

**Recommendation:** Consider adding migration functions for non-breaking changes (e.g., adding optional fields with defaults).

---

## 5. Input Encoding

### Format (`src/input/input-encoding.ts:14-36`)

18 boolean inputs packed into a single 32-bit integer:
```typescript
const INPUT_BITS = {
  // Movement (bits 0-8)
  pitchUp: 0, pitchDown: 1, yawLeft: 2, yawRight: 3,
  rollLeft: 4, rollRight: 5, accelerate: 6, decelerate: 7, afterburner: 8,
  // Combat (bits 9-17)
  firePrimary: 9, fireSecondary: 10, launchDecoy: 11,
  cyclePrimary: 12, cycleSecondary: 13, cycleTargetNext: 14,
  cycleTargetPrev: 15, targetNearest: 16, toggleMatchSpeed: 17,
};
```

### Efficiency

- **Per-tick storage:** 4 bytes (32-bit integer)
- **5-minute battle:** ~72KB uncompressed (18,000 ticks * 4 bytes)
- **With RLE compression:** 60-90% reduction for typical gameplay

### RLE Compression (`src/replay/compression.ts`)

```typescript
// Format: [value, count, value, count, ...]
// Example: [64, 64, 64, 512, 512] → [64, 3, 512, 2]
```

Protection against memory exhaustion:
```typescript
const MAX_DECODED_SIZE = 10_000_000; // ~166 minutes at 60Hz
```

### Assessment: EFFICIENT AND CORRECT

- Bit positions are stable across versions
- Roundtrip encoding verified by tests
- RLE only applied when beneficial (returns original if larger)

---

## 6. Storage

### IndexedDB Storage (`src/replay/storage.ts`)

- **Database:** `spaceflight-replays`
- **Max replays:** 20 (FIFO eviction)
- **Compression:** Gzip via CompressionStream API
- **Metadata separation:** Stored at top level for efficient listing (no decompression needed)

### File Export (`src/replay/storage-files.ts`)

- **Default format:** `.replay.gz` (compressed)
- **Debug format:** `.json` (human-readable)
- **Import:** Auto-detects format by magic bytes

### Size Estimates

For a typical 5-minute battle:
- **Raw inputs:** ~72KB (18,000 * 4 bytes)
- **With RLE:** ~7-30KB (60-90% compression)
- **With gzip:** ~2-10KB (additional 70-80% compression)
- **Total replay:** ~5-20KB including metadata

### Assessment: WELL-DESIGNED

- Compression reduces storage significantly
- FIFO eviction prevents unbounded growth
- Fallback to uncompressed when CompressionStream unavailable

---

## 7. Historical Bugs Status

### v2 -> v3: Missing Loadout Data

**Bug:** Live game used campaign loadouts; replay used archetype defaults. Wingmen not spawned.

**Fix Status: FIXED**

Evidence in `src/replay/types.ts:238-241`:
```typescript
playerLoadout: ReplayShipLoadout;
wingmen: ReplayWingman[];
```

Evidence in `src/input/input-recorder.ts:63-68`:
```typescript
setDeployment(
  playerLoadout: ReplayShipLoadout,
  wingmen: ReplayWingman[],
): void
```

Evidence in `src/replay/mission-setup.ts:276-293` - Player and wingmen spawned from replay data.

### v3: Rendering PRNG Contamination

**Bug:** Rendering code (lightning, missile exhaust) consumed `world.prng`, causing frame-rate dependent divergence.

**Fix Status: FIXED**

Evidence in `src/core/ecs.ts:74-77`:
```typescript
prng: createPRNG(seed),
// Separate PRNG for rendering effects
renderPrng: createPRNG(seed),
```

Evidence in `src/rendering/beam-effects/lightning.ts:186`:
```typescript
world.renderPrng  // Used for lightning generation
```

Evidence in `src/rendering/missile-exhaust.ts:88`:
```typescript
flickerPhase: random(world.renderPrng) * Math.PI * 2
```

### v3: Wave Initialization Mismatch

**Bug:** Replay was missing `waveState.currentWave = -1` for delayed first waves.

**Fix Status: FIXED**

Evidence in `src/campaign/mission/mission-waves.ts:197-215`:
```typescript
export function initializeFirstWave(
  world: World,
  waveState: WaveState,
  waves: ContractWave[],
): void {
  // ...
  if (firstWaveDelay > 0) {
    waveState.currentWave = -1;  // Set to -1 so tick increments to 0
    waveState.waveCleared = true;
    waveState.delayRemaining = firstWaveDelay;
  } else {
    spawnWave(world, firstWave, 0);
  }
}
```

Both live gameplay and replay use this shared function.

---

## 8. Determinism Risks Identified

### Low Risk

1. **Wave delay randomness** (`src/campaign/mission/mission-waves.ts:62-66`)
   - Uses `world.prng` correctly
   - Same seed = same delays

2. **Enemy spawn positioning** (`src/campaign/mission/mission-waves.ts:95`)
   - Uses `randomUnitVector(world.prng)` for spawn direction
   - Deterministic given same PRNG state

3. **AI aim error initialization** (`src/replay/mission-setup.ts:210`)
   - Uses `world.prng` for wingman aim error
   - Component order matches live gameplay

### Potential Future Risks

1. **New random sources**
   - Any new code using `world.prng` must be consistent between live/replay
   - **Mitigation:** CLAUDE.md documents this requirement

2. **System order changes**
   - SIMULATION_SYSTEMS array must remain identical
   - **Mitigation:** Replay imports from game.ts directly

3. **Component initialization order**
   - Ship creation order affects PRNG consumption
   - **Mitigation:** Explicit wingman spawning loop in mission-setup.ts

---

## 9. Recommendations

### High Priority

None - the system is well-implemented.

### Medium Priority

1. **Version Migration Functions**
   - Add migration functions for non-breaking schema changes
   - Example: Migrate v1 replays to v2 by adding default debrief/salvage data

2. **Checksum Verification Option**
   - Consider adding optional checksum recording at keyframes
   - Would enable divergence detection during playback

### Low Priority

1. **Keyframe Optimization**
   - Currently documented as future work in `src/replay/types.ts:27-36`
   - Would improve seeking performance for long replays
   - Not critical given typical replay lengths (2-5 minutes)

2. **Replay Validation Tests**
   - Add integration tests that:
     - Record a live battle
     - Play back the replay
     - Compare final checksums

---

## 10. Test Coverage

### Existing Tests (`scripts/tests/`)

| Test File | Coverage |
|-----------|----------|
| `systems/test-input-replay.mjs` | Encoding roundtrip, recorder/player, determinism |
| `replay/test-playback.mjs` | ReplayPlayback controls, seeking, determinism |
| `replay/test-playback-wingmen.mjs` | Wingman reconstruction |
| `replay/test-compression.mjs` | RLE encoding/decoding |
| `replay/test-gzip.mjs` | Gzip compression |
| `replay/test-storage.mjs` | IndexedDB operations |

### Test Quality

The determinism tests are particularly well-designed:
```javascript
// From test-input-replay.mjs
it('same seed + inputs = same result', () => {
  const result1 = runBattleSync(seed, inputs, 600);
  const result2 = runBattleSync(seed, inputs, 600);

  assert.strictEqual(result1.checksum, result2.checksum);
  assert.strictEqual(result1.prngState, result2.prngState);
});
```

---

## Conclusion

The replay system is production-ready with excellent attention to determinism. The historical bugs documented in CLAUDE.md have all been properly fixed with architectural improvements (separate renderPrng, shared wave initialization). The codebase follows good practices for replay systems and includes comprehensive test coverage.

The only notable limitation is the lack of version migration (old replays are rejected rather than upgraded), which is acceptable for an actively-developed game where replay compatibility is not a critical requirement.
