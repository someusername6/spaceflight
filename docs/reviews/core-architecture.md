# Core Architecture & ECS Review

## Overview

This review covers the foundational infrastructure of the Spaceflight codebase: the ECS framework, deterministic PRNG, component registry, world serialization and hashing, and the game loop with system ordering. The scope is 16 files totaling approximately 2,880 lines across `src/core/` (8 files, 990 lines), `src/serialization/` (7 files, 1,651 lines), and `src/game.ts` (239 lines). All files are well under the 400-line limit, with the largest being `component-hashers.ts` at 368 lines.

Overall health is **good**. The ECS design is clean and principled, determinism concerns are handled carefully, and serialization coverage is comprehensive. All remaining issues are low severity.

---

## Issues

### 1. `SystemState` is a growing god-object
**File**: `src/core/types.ts:80-219`
**Severity**: Low

`SystemState` aggregates state for many unrelated systems: weapons, targeting, flight assist, beams, mission, ship identity, projectile hits, muzzle flashes, pools, input recorder, combat stats, and match stats. At 140 lines for the interface definition alone, every new system that needs cross-frame state adds fields here, requiring parallel updates in `createWorld`, serialization, and hashing.

**Recommendation**: Manageable at current scale. If the system count continues to grow, consider a Map-based system state registry with typed accessors.

---

### 2. `World` uses `import()` types inline
**File**: `src/core/types.ts:172, 211-213`
**Severity**: Low

The `World` and `SystemState` interfaces use inline `import()` type syntax for `InputRecorder`, `DestroyedShipRecord`, `SalvageableShip`, and `PRNGState`. This avoids circular dependency issues but reduces readability.

**Recommendation**: Use top-level imports where there is no circular dependency risk (e.g., `PRNGState`). The inline approach is justified for cross-boundary imports like `InputRecorder`.

---

### 3. `deserializeWorldFromBytes` uses unvalidated `JSON.parse`
**File**: `src/serialization/world.ts:158-165`
**Severity**: Low

```typescript
const json = new TextDecoder().decode(data);
const serialized = JSON.parse(json) as SerializedWorld;
deserializeWorld(serialized, world);
```

The `as SerializedWorld` cast provides no runtime validation. Acceptable for a peer-to-peer context where both sides run the same code. If the game ever accepts world snapshots from untrusted sources, add schema validation.

---

## Architectural Strengths

### Excellent ECS design
The ECS implementation is clean and principled. Entities are plain numbers, components are data-only interfaces, systems are pure functions, and the world holds all state. The `ComponentRegistry` type mapping provides compile-time safety without runtime overhead. The `ComponentTypeId` mapping with its stability comment ("never change existing IDs, only add new ones") shows forward thinking about protocol compatibility.

### Positive entity identification with `shipTag`
The `isShip` function uses a positive `shipTag` component check rather than negative exclusion of projectiles and missiles. This is robust against new entity types being added to the game.

### Determinism-first architecture
The separation of `prng` (simulation) and `renderPrng` (visual effects) on the World object shows disciplined thinking about multiplayer determinism. The `SystemState` documentation explicitly categorizes fields as "simulation-critical" vs "transient/local" with detailed comments. The seeded PRNG with its `deriveKey` function provides save-scum-proof randomness for campaign progression.

### Comprehensive and consistent serialization
Every component type (all 26) has co-located `serialize*`/`deserialize*` functions with compact field names using numeric type IDs. The dispatch covers all types exhaustively with specific type casts (e.g., `component as Transform`) preserving structural type checking. The component hashers mirror the same complete coverage. The `WORLD_SERIALIZATION_VERSION` constant and version checking provide forward compatibility.

### Well-ordered system pipeline
The `SYSTEM_ORDER` array in `src/game.ts` with its 19-step rationale comment is exemplary engineering documentation. The separation of `SIMULATION_SYSTEMS` (for replay playback) from the full `SYSTEM_ORDER` (which prepends `inputSystem`) enables the replay system to reuse the exact simulation pipeline without duplication.

### Textbook game loop
The fixed timestep with accumulator and interpolation alpha is correctly implemented. The frame rate capping logic, the pause handling that preserves the alpha at 1.0, and the `lastTime = 0` reset on resume (to avoid accumulator spikes from paused time) all demonstrate careful attention to game loop correctness.

### Good use of pre-allocated vectors
`src/core/lead-calculation.ts` uses module-level reusable vectors with a clear JSDoc warning about the shared return value. This is the correct approach for hot-path game code.

### Clean component registry with numeric IDs
The `ComponentTypeId` mapping provides stable numeric identifiers for binary serialization, completely decoupled from string-based runtime lookups. The 26 registry entries match exactly across the `ComponentRegistry` interface, `ComponentTypeId` constants, serialization dispatch, and component hashers.
