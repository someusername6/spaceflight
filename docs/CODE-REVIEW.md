# Code Review - Spaceflight

**Review Date:** 2026-01-11
**Codebase Size:** ~38,457 lines of TypeScript
**Test Files:** 81 test scripts

---

## Executive Summary

The codebase demonstrates **production-quality architecture** with excellent adherence to ECS principles, consistent patterns, and proper memory management. One **critical serialization bug** was discovered that will cause crashes when loading saved games.

### Priority Matrix

| Priority | Issue | Location | Impact |
|----------|-------|----------|--------|
| **CRITICAL** | SlotArray serialization bug | `slot-array.ts` | Saved games crash on load |
| Medium | Missing TypeScript strict mode | `tsconfig.json` | Reduced type safety |
| Low | Inconsistent test organization | `scripts/` | Developer friction |

---

## 1. Critical Issues

### 1.1 SlotArray WeakMap Serialization Bug

**Location:** `src/campaign/slot-array.ts:41`

**Problem:** The `SlotArray` type uses a WeakMap to store slot metadata, but WeakMaps cannot survive JSON serialization. When a game is saved and loaded:

1. `JSON.stringify()` serializes the array but loses WeakMap data
2. `slotArrayFromJSON()` exists at line 49 but is **never called** in save-system.ts
3. Accessing weapon slots on a loaded game will crash

**Evidence:**
```typescript
// slot-array.ts:14-16
const slotArrayMeta = new WeakMap<SlotArray<unknown>, SlotArrayMeta>();

// save-system.ts - slotArrayFromJSON() is NOT called during load
```

**Fix Required:**
1. In `save-system.ts`, call `slotArrayFromJSON()` when deserializing ships
2. Ensure all SlotArray fields are properly reconstituted after load

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

### 4.2 Type Safety ⚠️ COULD IMPROVE

**Current:** TypeScript strict mode is not fully enabled

**Recommendation:** Consider enabling in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

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

### 5.1 Test Organization ⚠️ INCONSISTENT

**Location:** `scripts/`

- 81 test files present
- Some tests are standalone scripts, others use test framework
- No unified test runner configuration found

**Recommendation:** Standardize on a single test pattern

### 5.2 Test Types Observed

- Unit tests for pure functions
- Integration tests for systems
- Manual verification scripts for rendering

---

## 6. Dependencies

### 6.1 Core Dependencies ✅ MINIMAL

- `three` - 3D rendering
- `biome` - formatting/linting
- `vite` - build tooling

No unnecessary dependencies observed.

---

## 7. Recommendations

### Immediate (Critical)

1. **Fix SlotArray serialization** - Add `slotArrayFromJSON()` calls in save-system.ts load path

### Short-term

2. **Enable strict TypeScript** - Incremental migration to catch null issues
3. **Standardize test runner** - Pick one pattern for all tests

### Long-term

4. **Add integration test for save/load cycle** - Would have caught the SlotArray bug
5. **Document system execution order** - Currently implicit in game-loop.ts

---

## 8. Conclusion

This is a well-architected game with professional-quality code. The ECS implementation is exemplary, memory management is careful, and UI patterns are consistent. The critical SlotArray bug should be fixed immediately, but otherwise the codebase is in excellent shape for continued development.
