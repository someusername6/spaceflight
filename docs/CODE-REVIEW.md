# Code Review - Spaceflight

**Review Date:** 2026-01-11
**Codebase Size:** ~38,457 lines of TypeScript
**Test Files:** 81 test scripts

---

## Executive Summary

The codebase demonstrates **production-quality architecture** with excellent adherence to ECS principles, consistent patterns, and proper memory management. A critical serialization bug was discovered and fixed (see 1.1).

### Priority Matrix

| Priority | Issue | Location | Status |
|----------|-------|----------|--------|
| ~~CRITICAL~~ | ~~SlotArray serialization bug~~ | `slot-array.ts` | ✅ Fixed |
| ~~Medium~~ | ~~Missing TypeScript strict mode~~ | `tsconfig.json` | ✅ Already enabled |
| ~~Low~~ | ~~Inconsistent test organization~~ | `scripts/` | ✅ Fixed |

---

## 1. Critical Issues

### 1.1 SlotArray WeakMap Serialization Bug - ✅ FIXED

**Location:** `src/campaign/slot-array.ts`, `src/campaign/save-system.ts`

**Problem:** The `SlotArray` type used WeakMap storage that didn't survive JSON serialization.

**Fix (commit 61a5e8b):**
1. Added `toJSON()` method to SlotArray for automatic serialization
2. Added `reconstituteSave()` function in save-system.ts to recreate SlotArrays on load
3. Added v3→v4 migration to handle any corrupted saves from before the fix
4. SAVE_VERSION incremented to 4

---

## 2. Architecture Review

### 2.1 ECS Implementation ✅ EXCELLENT

**Location:** `src/core/ecs.ts`

The ECS implementation is textbook-correct:

- **Components are pure data interfaces** - no methods, no classes
- **Systems are pure functions** - `(world: World, dt: number) => void`
- **Entity IDs are simple numbers** - no object overhead
- **Component storage uses Map<Entity, Component>** - O(1) access
- **Query results are cached** - prevents re-iteration

**Strengths:**
- `queryEntities()` returns cached iterables for component combinations
- `addComponent()`/`removeComponent()` properly invalidate query caches
- No inheritance hierarchies - pure composition

### 2.2 Game Loop & Timing ✅ EXCELLENT

**Location:** `src/core/game-loop.ts`

- Fixed timestep with accumulator pattern
- Deterministic update order
- No `Date.now()` in game logic
- Seeded PRNG for reproducibility (`src/utils/random.ts`)

### 2.3 Memory Management ✅ EXCELLENT

**Patterns observed:**

1. **Object Pooling** - Projectiles, particles, and vectors are pooled
   - `src/systems/projectile-system.ts` - projectile recycling
   - `src/rendering/particles/` - particle pool management

2. **Reusable Vectors** - Module-level vectors prevent per-frame allocations
   - `src/rendering/hud/target-stats.ts:38-40` - `relVel`, `bearing`, `decoyVelocity`
   - `src/rendering/hud/allied-hud.ts:84` - `allies` array reused

3. **Event Delegation** - UI framework uses single listeners per event type
   - `src/ui/framework/screen.ts` - `api.on()` delegates to root

---

## 3. UI Framework Review

### 3.1 Screen Framework ✅ WELL-DESIGNED

**Location:** `src/ui/framework/screen.ts`

**Architecture:**
- Declarative `render()` returns HTML string
- `bind()` attaches event handlers after each render
- Automatic cleanup prevents memory leaks
- State updates trigger re-render cycle

**Memory Safety:**
- `destroy()` removes all listeners
- Global listeners tracked and auto-removed
- No orphaned event handlers observed

### 3.2 Modal System ✅ CORRECT

**Location:** `src/ui/framework/screen.ts` (showModal)

- Promise-based API for async modal results
- Proper cleanup on close
- Overlay prevents interaction with background

### 3.3 Popover System ✅ CORRECT

**Location:** `src/ui/screens/popover/`

- Submenu pattern with proper parent-child relationships
- Click-outside detection correctly scoped
- Z-index management prevents overlap issues

---

## 4. Code Quality

### 4.1 File Size Compliance ✅ ALL PASSING

All files are under the 400-line limit:

| File | Lines | Status |
|------|-------|--------|
| `src/ui/screens/title.ts` | 399 | ✅ Just under limit |
| `src/systems/ai-combat-system.ts` | 387 | ✅ |
| `src/campaign/save-system.ts` | 342 | ✅ |

### 4.2 Type Safety ✅ EXCELLENT

**Status:** Full TypeScript strict mode enabled with zero errors.

**Active Options:**
- `strict: true` (enables strictNullChecks, noImplicitAny, and all strict flags)
- `noUncheckedIndexedAccess: true` (extra strict - array/object index access returns `T | undefined`)
- `exactOptionalPropertyTypes: true` (extra strict - distinguishes `undefined` from missing)
- `noUnusedLocals: true`, `noUnusedParameters: true`

### 4.3 Error Handling ✅ CONSISTENT

Three patterns are used correctly:

1. **I/O Operations** - try/catch with user feedback
   - `save-system.ts` - localStorage operations

2. **Programmer Errors** - throw immediately
   - `ecs.ts` - invalid entity/component access

3. **Not-Found** - return null/undefined
   - `state.ts` - entity lookups

---

## 5. Test Coverage

### 5.1 Test Organization ✅ STANDARDIZED

**Location:** `scripts/tests/`

All tests now use Node.js built-in test runner (`node:test`) with `node:assert`:
- 60+ test files migrated to consistent `describe`/`it` pattern
- Shared utilities in `scripts/tests/shared/test-utils.mjs`
- Test runner categorizes quick vs balance tests

**Pattern:**
```javascript
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('Feature', () => {
  it('does something', () => {
    assert.strictEqual(actual, expected);
  });
});
```

### 5.2 Test Types Observed

- Unit tests for pure functions
- Integration tests for systems
- Balance/simulation tests for gameplay tuning

---

## 6. Dependencies

### 6.1 Core Dependencies ✅ MINIMAL

- `three` - 3D rendering
- `biome` - formatting/linting
- `vite` - build tooling

No unnecessary dependencies observed.

---

## 7. Recommendations

### Short-term

1. **Enable strict TypeScript** - Incremental migration to catch null issues

### Long-term

2. **Add integration test for save/load cycle** - Would have caught the SlotArray bug earlier
3. **Document system execution order** - Currently implicit in game-loop.ts

---

## 8. Conclusion

This is a well-architected game with professional-quality code. The ECS implementation is exemplary, memory management is careful, and UI patterns are consistent. All critical issues have been addressed - the codebase is in excellent shape for continued development.
