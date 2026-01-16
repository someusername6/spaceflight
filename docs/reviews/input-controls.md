# Input and Controls System Review

**Date:** 2026-01-16
**Reviewer:** Code Quality Assessment
**Status:** Comprehensive Review

---

## Executive Summary

The input and controls system in Spaceflight is well-architected with clear separation of concerns. The system handles live keyboard input, replay recording/playback, and configurable key bindings with persistence. Recent fixes (commit cc44a00) addressed critical issues with form control interactions.

**Overall Assessment: Good with Minor Issues**

### Key Findings

| Category | Status | Notes |
|----------|--------|-------|
| Input System Architecture | Excellent | Clean separation of live/recording/playback modes |
| Key Bindings | Good | Persistence works, conflict detection present |
| Form Control Handling | Good | Recently fixed, but missing SELECT element |
| Input Recording | Excellent | Compact bitmask encoding, deterministic |
| Settings UI | Good | Functional key rebinding with swap on conflict |
| Browser Compatibility | Good | Uses standard APIs (KeyboardEvent.code) |

---

## Detailed Findings

### 1. Input System (`src/systems/input.ts`)

**Architecture:** The input system supports three distinct modes:
1. **Live input** - reads from keyboard (default)
2. **Recording** - reads from keyboard and records each tick
3. **Playback** - reads from recorded data (for replays)

**Strengths:**
- Clean mode switching via `startRecording()`, `startPlayback()` functions (lines 96-127)
- Module-level state avoids globals while maintaining proper cleanup (lines 17-35)
- Blur handler properly clears all pressed keys (lines 62-64)
- Event handler references stored for proper cleanup (lines 21-25, 72-86)

**Form Control Handling (lines 40-55):**
```typescript
const isFormControl =
  target.tagName === 'INPUT' ||
  target.tagName === 'TEXTAREA' ||
  target.tagName === 'BUTTON' ||
  target.isContentEditable;
if (isFormControl) return;
```

**Issue Found: Missing SELECT Element**
- **File:** `src/systems/input.ts:43-47`
- **Severity:** Minor
- **Description:** The form control check does not include `SELECT` elements. If a SELECT element is focused and the user presses a bound key (e.g., arrow keys for navigation), the game may interfere.
- **Current Impact:** Low - the UI doesn't appear to have SELECT elements that would conflict with game keys.
- **Recommendation:** Add `target.tagName === 'SELECT'` to the isFormControl check for completeness.

**Potential Issue: Blur Handler Only Catches Window Blur**
- **File:** `src/systems/input.ts:62-64, 68`
- **Description:** The blur handler is attached to `window`, which fires when the entire browser window loses focus. However, if a user clicks into a text input within the same window while holding a game key, that key might remain "stuck" in `pressedKeys` because:
  1. The keydown was tracked (before focus moved to input)
  2. The keyup occurs while input is focused (and is ignored due to isFormControl check)
- **Severity:** Minor
- **Recommendation:** Consider also listening for `focusin` events on form controls to clear pressed keys, or clearing keys when detecting form control focus.

### 2. Key Bindings (`src/input/key-bindings.ts`)

**Strengths:**
- All 20 game actions are bindable (lines 10-30)
- Human-readable display names for all keys (lines 228-288)
- Persistence to localStorage with validation (lines 195-221)
- Merges stored bindings with defaults to handle new actions (lines 111-112)
- Conflict detection with `findKeyConflict()` (lines 173-183)

**Observations:**
- Uses `KeyboardEvent.code` (physical key position) rather than `key` (character) - correct for games
- Returns copies from `getKeyBindings()` to prevent external mutation (line 123)
- Graceful fallback on storage errors (lines 217-220)

**Minor Issue: No Validation of Key Code Format**
- **File:** `src/input/key-bindings.ts:188-190`
- **Description:** `isValidKeyCode()` only checks for non-empty string. Invalid key codes like "INVALID" would be accepted.
- **Impact:** Very low - only affects users who manually edit localStorage.

### 3. Input Recording (`src/input/input-recorder.ts`)

**Strengths:**
- Compact bitmask encoding (18 boolean flags in one 32-bit integer)
- Documented storage estimate (~72KB for 5-minute battle at 60Hz)
- Supports both structured `InputState` and raw bitmask recording (lines 96-105)
- Stores deployment data for replay reconstruction (lines 63-90)

**Encoding Correctness (`src/input/input-encoding.ts`):**
- Bit positions are well-documented (lines 14-36)
- Uses 18 bits (0-17), well within 32-bit safe integer range
- Includes `verifyEncodingRoundtrip()` for testing (lines 138-142)
- All InputState fields are covered and match (verified against `src/core/types.ts:223-244`)

**Test Coverage:**
- Comprehensive tests in `scripts/tests/systems/test-input-replay.mjs`
- Tests encoding/decoding roundtrip, recorder/player, and determinism
- Uses LCG for deterministic "random" test cases

### 4. Replay Bindings (`src/input/replay-bindings.ts`)

**Strengths:**
- Separate binding system for replay viewer (doesn't conflict with game bindings)
- YouTube-style controls (J-K-L for seek/play)
- Percentage seeking (0-9 keys)
- Same robust persistence pattern as game bindings

**Minor Issue: Shared Key Codes with Different Meanings**
- **File:** `src/input/replay-bindings.ts:64-67`
- **Description:** `frameNext` and `speedUp` both use `Period` key (differentiated by Shift modifier). Same for `framePrev`/`speedDown` with `Comma`. This is intentional but could confuse users.
- **Impact:** Low - this is a valid UX pattern (YouTube uses similar).

### 5. Settings UI (`src/ui/screens/settings/`)

**Key Rebinding Flow:**

1. User clicks binding button -> `startListening()` (key-listener.ts:66-72)
2. Capture-phase listener intercepts next keydown (key-listener.ts:28-63)
3. Escape cancels (line 39-43)
4. On conflict, keys are swapped (lines 46-51)
5. New binding saved to localStorage (line 55)

**Strengths:**
- Capture-phase listener ensures key is caught before game input (line 62)
- Proper cleanup on unmount (lines 75-80)
- Visual feedback ("Press a key...") in controls.ts
- Individual key reset buttons appear for non-default bindings

**Issue: ESC Handler Ordering**
- **File:** `src/ui/screens/settings/key-listener.ts:82-104`
- **Description:** The settings screen sets up its own ESC handler (`setupSettingsEscapeHandler`) to close settings. When in rebinding mode, this handler is not added (line 90). This is correct. However, if the user is rebinding and presses ESC:
  1. The rebinding handler intercepts it (line 39)
  2. Rebinding is cancelled
  3. But settings remain open (correct behavior)
- **Assessment:** Working as intended, but the code flow could be clearer with comments.

### 6. Pause Handler (`src/campaign/handlers/pause-handler.ts`)

**Strengths:**
- Prevents re-opening pause menu while already open (lines 58-61)
- Properly pauses game during mission (lines 66-68)
- Clean handler cleanup on quit (line 161)

**Observation:**
- The pause handler uses bubble phase (`addEventListener` without `true`), while settings uses capture phase. This is intentional - settings needs to intercept before pause handler during rebinding.

---

## Browser Compatibility

### Standards Used

| Feature | Standard | Browser Support |
|---------|----------|-----------------|
| `KeyboardEvent.code` | DOM Level 3 | All modern browsers (IE excluded) |
| `addEventListener` capture | DOM Level 2 | Universal |
| `localStorage` | Web Storage | Universal |
| `document.fonts.load()` | CSS Font Loading | All modern (not IE) |
| `closest()` | DOM Level 4 | All modern browsers |

### Potential Compatibility Issues

1. **Mobile/Touch:** No touch input support. Game is keyboard-only.
2. **Non-QWERTY Keyboards:** Using `code` (physical position) is correct - "KeyW" is always the physical W position regardless of layout.
3. **IME Input:** CJK input methods may not fire keydown events in expected ways. Not a concern for this game (no text input in gameplay).

---

## Bugs and Issues Summary

### Confirmed Issues

| ID | Severity | File:Line | Description |
|----|----------|-----------|-------------|
| I1 | Minor | `input.ts:43-47` | Missing SELECT element in form control check |
| I2 | Minor | `input.ts:40-68` | Keys may stick if keydown tracked before focus moves to input |

### Non-Issues (Verified Working)

- Spacebar in text inputs: Fixed in cc44a00
- Button activation via keyboard: Fixed in cc44a00
- Key binding conflicts: Handled with swap logic
- Replay determinism: Verified by tests

---

## Recommendations

### Short-term (Low Effort)

1. **Add SELECT to form control check** (`src/systems/input.ts:43-47`)
   ```typescript
   const isFormControl =
     target.tagName === 'INPUT' ||
     target.tagName === 'TEXTAREA' ||
     target.tagName === 'SELECT' ||
     target.tagName === 'BUTTON' ||
     target.isContentEditable;
   ```

2. **Consider clearing keys on focusin** to prevent stuck keys when focus changes mid-keypress.

### Medium-term (Consider for Future)

1. **Visibility change handling for input:** When tab becomes hidden (visibilitychange), clear all pressed keys. Currently only handled for autosave, not input state.

2. **Key binding validation:** Add basic format validation (e.g., must start with "Key", "Digit", etc.) to reject obviously invalid codes.

3. **Input source abstraction:** If gamepad support is ever added, the input system architecture is ready - just add a new input source alongside keyboard.

### Documentation Improvements

1. Add JSDoc explaining why capture phase is used in key-listener.ts
2. Document the relationship between game bindings and replay bindings
3. Add inline comment explaining the SELECT omission rationale (or fix it)

---

## Test Coverage Assessment

| Area | Test File | Coverage |
|------|-----------|----------|
| Input encoding | `test-input-replay.mjs` | Excellent |
| Recorder/Player | `test-input-replay.mjs` | Good |
| Determinism | `test-input-replay.mjs` | Excellent |
| Key bindings | None found | Missing |
| Settings UI | None found | Missing |

**Recommendation:** Add unit tests for:
- `findKeyConflict()` function
- Key display name formatting
- Binding persistence (with localStorage mock)

---

## Conclusion

The input system is well-designed with proper separation of concerns, good error handling, and comprehensive replay support. The recent fix for form control handling addressed the most critical usability issue. The remaining issues are minor and unlikely to affect typical gameplay.

The bitmask encoding for replay recording is particularly well-implemented, providing compact storage while maintaining perfect fidelity for deterministic replay.

**Priority Fixes:**
1. Add SELECT to form control check (trivial)
2. Consider focus-change key clearing (minor complexity)

**No Critical Issues Found.**
