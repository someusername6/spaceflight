# Replay System Review

**Date:** 2026-01-16
**Reviewer:** Claude Code (Automated)
**Scope:** Replay recording, playback, storage, determinism

---

## Executive Summary

The replay system is **robust and well-designed** with proper determinism handling throughout. Historical bugs (documented in CLAUDE.md) have been properly fixed. The system demonstrates industry best practices including seeded PRNG, separate render PRNG for visual effects, and comprehensive data capture for reconstruction.

**Overall Assessment: Excellent** - Clean architecture with thorough determinism testing.

---

## 1. Recording

### Rating: Excellent

**Data captured (`src/replay/types.ts:225-248`):**
```typescript
interface FullReplayData {
  version: number;              // Format version
  seed: number;                 // World PRNG seed
  inputs: number[];             // Encoded input bitmasks per tick
  inputsCompressed: boolean;    // RLE compression flag
  tickCount: number;            // Total ticks for progress
  metadata: ReplayMetadata;     // Mission ID, outcome, stats
  playerLoadout: ReplayShipLoadout;  // Ship, weapons, ammo
  wingmen: ReplayWingman[];     // Full wingman data
  playerAutoaim: PlayerAutoaim; // Autoaim setting
  debriefData?: ReplayDebriefData;   // Combat stats
  salvageData?: ReplaySalvageData;   // Items recovered
}
```

**Input recording:**
- `src/input/input-recorder.ts` - Captures input bitmasks per tick
- Compact encoding (single number per tick)
- RLE compression for common patterns

---

## 2. Playback

### Rating: Excellent

**Reconstruction:**
- `src/replay/mission-setup.ts` - Recreates world state
- Same entity IDs, positions, loadouts
- PRNG seeded identically

**Determinism verified:**
- Same inputs + same seed = same outcome
- Checksum verification in tests
- Historical bug fixes documented and tested

---

## 3. PRNG Separation

### Rating: Excellent

**Dual PRNG architecture:**
- `world.prng` - Simulation (affects gameplay)
- `world.renderPrng` - Visual effects only

**Usage verified:**
- Simulation code uses `world.prng` exclusively
- Rendering effects (lightning, missile exhaust) use `world.renderPrng`
- Prevents frame-rate dependent PRNG contamination

**Historical bug fix (v3):**
- Rendering code was consuming `world.prng`
- PRNG state diverged based on frame rate
- Fix: Added `world.renderPrng` for visual-only randomness

---

## 4. Wave Initialization

### Rating: Excellent

**Shared logic:**
- `src/campaign/mission/mission-waves.ts` - `initializeFirstWave()`
- `processWaveTick()` - Shared between live and replay
- Handles delayed first waves correctly

**Historical bug fix (v3):**
- Replay was missing `waveState.currentWave = -1` for delayed waves
- Fix: Created shared functions used by both paths

---

## 5. Version Management

### Rating: Good

**Implementation:**
- `src/replay/types.ts` - `REPLAY_VERSION` constant
- `src/replay/storage.ts` - Version checking on load

**Strategy:**
- Old versions rejected rather than migrated
- Simple but effective for current needs

---

## 6. Storage

### Rating: Excellent

**Implementation:**
- `src/replay/storage.ts` - IndexedDB storage
- Gzip compression for efficiency
- FIFO eviction when storage full

**Metadata:**
- Mission ID, outcome, player ship
- Timestamps for sorting
- Combat statistics for display

---

## 7. Testing

### Rating: Excellent

**Determinism tests:**
- `scripts/tests/replay/test-replay-determinism.mjs`
- Runs same replay multiple times
- Compares checksums for exact match

**Coverage:**
- Recording/playback round-trip
- Compression/decompression
- Version validation
- Storage operations

---

## Strengths

1. **Dual PRNG architecture** - Clean separation of simulation and rendering
2. **Comprehensive data capture** - All state needed for reconstruction
3. **Shared wave logic** - Prevents live/replay divergence
4. **Checksum verification** - Tests prove determinism
5. **Documented bug fixes** - Historical issues well-documented
6. **Efficient storage** - Gzip compression, FIFO eviction

---

## Issues

**None critical.** System is robust.

---

## Recommendations

| Priority | Area | Recommendation |
|----------|------|----------------|
| Low | Seeking | Keyframe optimization for faster seeking (documented as future work) |

---

## Files Reviewed

- `src/replay/types.ts` (data structures)
- `src/replay/storage.ts` (IndexedDB storage)
- `src/replay/mission-setup.ts` (world reconstruction)
- `src/input/input-recorder.ts` (input capture)
- `src/campaign/mission/mission-waves.ts` (shared wave logic)
- `scripts/tests/replay/` (determinism tests)
