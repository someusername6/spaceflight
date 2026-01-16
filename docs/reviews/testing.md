# Test Suite Review

**Date:** 2026-01-16
**Reviewer:** Claude Code
**Test Framework:** Node.js built-in test runner (`node:test`)

---

## Executive Summary

The Spaceflight test suite demonstrates **mature testing practices** with strong coverage in critical areas like determinism, replay systems, and combat balance. The suite is well-organized into two categories (quick ~35 tests, balance ~8 tests) with clear separation of concerns.

**Strengths:**
- Excellent replay/determinism testing with checksum verification
- Comprehensive IndexedDB mocking for browser API tests
- Statistical balance tests that verify game design assumptions
- Well-designed shared utilities for combat simulation

**Critical Gaps:**
- No UI/screen tests whatsoever
- No rendering system tests
- Limited edge case coverage in collision/damage systems
- No automated regression tests for previously fixed bugs

**Overall Assessment:** The test suite is well above average for a game codebase, but has notable blind spots in UI and rendering that could lead to regressions.

---

## Test Organization Assessment

### Directory Structure

```
scripts/tests/
├── run-tests.mjs           # Test runner with quick/balance separation
├── integration/            # ECS and architecture validation
├── systems/               # System-level logic tests
├── weapons/               # Weapon mechanics and behaviors
├── ai/                    # AI decision making and aim error
├── campaign/              # Campaign state, storage, resupply
├── combat/                # Balance and statistical tests
├── replay/                # Replay recording, playback, storage
└── shared/                # Test utilities and helpers
```

**Findings:**
- **Clear categorization** - Tests are organized by domain, making it easy to locate relevant tests
- **Quick vs Balance split** - Practical separation between fast unit tests (~20s) and slow simulation tests
- **Shared utilities** - Well-factored `combat-utils.mjs`, `replay-test-utils.mjs`, and `test-utils.mjs`

**Recommendation:** Add a `rendering/` directory for future rendering tests.

---

## Coverage Analysis by Area

### 1. Core ECS System
**Files:** `integration/test-game.mjs`, `integration/test-architecture.mjs`
**Coverage:** GOOD

Tests cover:
- World creation and entity management
- Component addition and retrieval
- Entity queries
- Player ship component composition
- Architecture rules (no `Math.random()`, no `Date.now()`, file size limits)

**Missing:**
- Entity removal and cascading cleanup
- Component update patterns
- Query performance under load

### 2. Weapon Systems
**Files:** `weapons/test-weapons.mjs`, `test-weapons-flak.mjs`, `test-weapons-nuke.mjs`, `test-weapons-friendly-fire.mjs`, `test-weapons-integration.mjs`, `test-link-modes.mjs`, `test-missile-lock-cone.mjs`, `test-missile-owner-collision.mjs`
**Coverage:** EXCELLENT

Tests cover:
- All 14 weapon type definitions (including Lightning, Nuclear Lance, Gyrojet)
- Weapon categories (energy, ballistic, beam)
- Flak shrapnel mechanics
- Nuke AoE damage
- Missile lock cone geometry
- Friendly fire prevention
- Owner collision avoidance
- Link firing modes

**Missing:**
- Gyrojet tracking and acceleration mechanics
- Beam damage falloff calculations
- Weapon heat generation under sustained fire

### 3. AI Systems
**Files:** `ai/test-ai-lock-system.mjs`, `ai/test-ai-missile-lock.mjs`, `ai/test-ai-weapon-selection.mjs`, `ai/test-ai-speed-compatibility.mjs`, `ai/test-aim-error-angular.mjs`
**Coverage:** GOOD

Tests cover:
- Lock reset on target/weapon change
- Lock accumulation with lockSpeed
- Primary weapon selection (range, heat, shields)
- Distance and weapon range categorization
- Angular velocity calculation
- Aim error scaling by skill level

**Missing:**
- AI behavior state transitions
- Pursuit and evasion logic
- AI missile selection logic
- AI repositioning decisions

### 4. Campaign Systems
**Files:** `campaign/test-campaign-storage.mjs`, `test-save-load.mjs`, `test-campaign-settings.mjs`, `test-checkpoint-storage.mjs`, `test-slot-array.mjs`, `test-resupply-*.mjs`, `test-store-*.mjs`
**Coverage:** EXCELLENT

Tests cover:
- Multi-slot IndexedDB storage with fake-indexeddb polyfill
- Save/load round-trip with SlotArray reconstitution
- Campaign settings persistence
- Checkpoint system for non-ironman mode
- Resupply priority (storage > store)
- Credit and stock limit enforcement
- Ammo capacity calculations

**Notable:** Tests specifically target the historical SlotArray WeakMap bug, demonstrating regression prevention.

**Missing:**
- Campaign state machine transitions
- Mission flow (contract selection -> combat -> results)
- Ship/pilot acquisition and loss

### 5. Replay/Determinism
**Files:** `replay/test-playback.mjs`, `test-playback-wingmen.mjs`, `test-storage.mjs`, `test-compression.mjs`, `test-gzip.mjs`, `test-storage-compression.mjs`, `systems/test-input-replay.mjs`
**Coverage:** EXCELLENT

Tests cover:
- Input encoding/decoding round-trip
- Playback controls (play, pause, seek, speed)
- Determinism verification (same seed + inputs = same checksum)
- Wingman reconstruction
- Replay import validation (comprehensive schema checks)
- Replay export/import round-trip
- RLE compression

**Strength:** The checksum-based determinism test (`computeWorldChecksum`) is particularly well-designed, verifying position, health, speed, and PRNG state.

**Missing:**
- Tests for replay migration between versions
- Tests for long replays (>1 minute)
- Edge case: replay with entity count changes

### 6. Combat Balance
**Files:** `combat/test-skill-scaling.mjs`, `test-ttk-matrix.mjs`, `test-weapon-diversity.mjs`, `test-decoy-missile.mjs`, `test-engagement-patterns.mjs`, `test-skill-vs-brawler.mjs`
**Coverage:** GOOD

Tests cover:
- Skill tier progression (rookie < regular < veteran < ace)
- Time-to-kill matrix across all archetypes
- Weapon diversity effectiveness
- Decoy success rates

**Design:** These tests run statistical simulations (50+ runs per matchup) to verify game balance assumptions. Thresholds are calibrated against observed results.

**Missing:**
- Missile effectiveness tests
- Shield/hull damage distribution
- Heat management effectiveness

### 7. System Logic
**Files:** `systems/test-heat.mjs`, `test-bank-size.mjs`, `test-ship-identity.mjs`, `test-combat-stats.mjs`, `test-weapon-stats.mjs`, `test-kill-attribution.mjs`
**Coverage:** GOOD

Tests cover:
- Heat locking hysteresis
- Afterburner sustain calculations
- Kill/assist attribution
- Posthumous kill tracking
- Ship archetype heat stats

**Missing:**
- Shield regeneration mechanics
- Physics integration (acceleration, turning)
- Targeting system logic

---

## Test Quality Findings

### Positive Patterns

1. **Meaningful assertions** - Tests verify behavior, not just that code runs
   ```javascript
   // Good: Tests specific business logic
   assert.strictEqual(weapons.lockProgress, 0, 'Lock should reset to 0 when target changes');
   ```

2. **Clear test naming** - Test names describe expected behavior
   ```javascript
   it('Weapons stay locked above 95%', () => { ... });
   ```

3. **Test isolation** - `beforeEach`/`afterEach` properly clean up IndexedDB state

4. **Seeded randomness** - Combat simulations use deterministic seeds
   ```javascript
   const seed = run * 1000 + ARCHETYPES.indexOf(archetype) * 100;
   ```

5. **Custom assertions** - `assertApprox` and `assertInRange` for floating-point comparisons

### Concerns

1. **Hardcoded magic numbers** - Some tests use raw bit values instead of constants
   ```javascript
   // Better: use INPUT_BITS constants
   const inputs = [64, 512, 0, 576]; // accelerate, fire, nothing, both
   ```

2. **Jitter function uses Math.random()** - The `jitter()` function in combat-utils breaks determinism
   ```javascript
   export function jitter() {
     return (Math.random() - 0.5) * 20;  // Should use seeded PRNG
   }
   ```
   This could cause flaky balance tests.

3. **Test data duplication** - Replay test data is duplicated across files (`createTestReplayData`, `createValidReplay`)

4. **Missing negative tests** - Few tests verify error handling or invalid inputs

---

## Critical Gaps Identified

### 1. No UI Tests
**Impact:** HIGH
**Files affected:** 90+ UI files in `src/ui/`

The entire UI layer (screens, modals, tooltips, HUD) has zero test coverage. This includes:
- Screen framework (`src/ui/framework/screen.ts`)
- All game screens (contracts, squadron, store, replay viewer)
- Input binding and event handling
- DOM manipulation

**Recommendation:** Add at least:
- Unit tests for Screen framework lifecycle
- Integration tests for key user flows (equip weapon, start mission)

### 2. No Rendering Tests
**Impact:** MEDIUM
**Files affected:** `src/rendering/**/*.ts`

No tests for:
- Ship model loading
- Visual effects (explosions, beams, missiles)
- Camera systems
- Shader compilation

**Recommendation:** Add snapshot tests for critical visual states.

### 3. Limited Collision/Damage Edge Cases
**Impact:** MEDIUM

Missing tests for:
- Simultaneous multi-entity collisions
- Damage overflow (overkill)
- Shield bypass mechanics
- Collision at very high speeds

### 4. No Mission System Tests
**Impact:** MEDIUM
**Files affected:** `src/systems/mission.ts`, `src/campaign/mission/**`

No tests for:
- Wave spawning logic
- Mission objectives completion
- Mission timeout handling
- Victory/defeat detection

### 5. No Controller/Handler Tests
**Impact:** MEDIUM
**Files affected:** `src/campaign/controller.ts`, `src/campaign/handlers/**`

Campaign flow logic is untested:
- State transitions (hub -> briefing -> combat -> results)
- Event handling
- Error recovery

---

## Flaky Test Risk Assessment

### Potential Sources of Flakiness

1. **`jitter()` uses Math.random()** - Balance tests may vary between runs
   - **Severity:** MEDIUM
   - **Fix:** Replace with seeded PRNG from test seed

2. **Timing in combat simulations** - 60-tick max timeout could cause edge cases
   - **Severity:** LOW
   - **Mitigation:** Tests use 60s timeout which is generous

3. **IndexedDB cleanup** - Tests rely on `deleteDatabase()` between runs
   - **Severity:** LOW
   - **Mitigation:** Cleanup is in `afterEach` with proper async handling

### No Observed Order Dependencies

Tests appear to be independent and can run in any order.

---

## Browser API Mocking Completeness

### Well-Mocked APIs

| API | Polyfill | Location |
|-----|----------|----------|
| IndexedDB | `fake-indexeddb` | `test-campaign-storage.mjs` |
| localStorage | In-memory Map | `test-campaign-storage.mjs` |

### Missing Mocks (if tests were added)

| API | Would need for |
|-----|----------------|
| requestAnimationFrame | Rendering tests |
| WebGL context | Shader tests |
| AudioContext | Sound tests |
| Canvas | UI snapshot tests |

---

## Recommendations for Improvement

### High Priority

1. **Fix jitter() determinism**
   ```javascript
   // In combat-utils.mjs
   export function jitter(prng) {
     return (prng.random() - 0.5) * 20;
   }
   ```

2. **Add UI Screen tests**
   - Test Screen framework lifecycle (create, render, bind, destroy)
   - Test event cleanup to prevent memory leaks

3. **Add mission system tests**
   - Wave spawning
   - Objective completion
   - Victory/defeat conditions

### Medium Priority

4. **Extract replay test data factory**
   - Create `replay-test-data.mjs` with shared factory functions
   - Reduce duplication across replay test files

5. **Add collision edge case tests**
   - Multi-entity simultaneous collisions
   - Very high-speed impacts
   - Shield/hull boundary cases

6. **Document test thresholds**
   - Balance test thresholds in `THRESHOLDS` object need comments explaining why
   - Link to game design decisions

### Low Priority

7. **Add performance regression tests**
   - Track simulation time for standard combat scenarios
   - Alert if tests significantly slow down

8. **Add negative input tests**
   - Invalid weapon IDs
   - Corrupted save data
   - Out-of-range values

---

## Test Utilities Assessment

### `shared/test-utils.mjs`
**Quality:** GOOD
- Clean custom assertions
- Useful ship/missile factories
- Re-exports node:test for convenience

### `shared/replay-test-utils.mjs`
**Quality:** EXCELLENT
- Well-documented INPUT_BITS mapping
- Comprehensive checksum function
- Clean battle simulation helper

### `shared/combat-utils.mjs`
**Quality:** GOOD
- Clear system order
- Useful constants (TICK_RATE, TICK_SEC)
- **Issue:** `jitter()` breaks determinism

### `shared/combat-simulation.mjs`
**Quality:** EXCELLENT
- Full team battle simulation
- Detailed stats aggregation
- Good configurability

---

## Summary Statistics

| Category | Test Files | Coverage | Quality |
|----------|------------|----------|---------|
| Integration/Architecture | 2 | GOOD | HIGH |
| Weapons | 8 | EXCELLENT | HIGH |
| AI | 5 | GOOD | HIGH |
| Campaign | 14 | EXCELLENT | HIGH |
| Replay | 6 | EXCELLENT | HIGH |
| Combat Balance | 6 | GOOD | HIGH |
| Systems | 6 | GOOD | HIGH |
| UI | 0 | NONE | N/A |
| Rendering | 0 | NONE | N/A |

**Total Quick Tests:** ~35 files
**Total Balance Tests:** ~8 files
**Estimated Run Time:** Quick: ~20s, All: ~5-10min

---

## Conclusion

The Spaceflight test suite is **above average for a game project**, with particularly strong coverage in:
- Replay/determinism (critical for a roguelike)
- Campaign persistence (IndexedDB mocking is exemplary)
- Combat balance verification (statistical approach is sound)

The main gaps are in **UI and rendering**, which represent significant blind spots. Given that the game has a complex screen framework and multiple UI screens, this is the highest priority area for test expansion.

The `jitter()` function using `Math.random()` should be fixed immediately as it undermines the determinism guarantees of the balance tests.
