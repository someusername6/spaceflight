# Core Architecture & ECS Review

## Overview

This review covers the foundational infrastructure of the Spaceflight codebase: the ECS framework, deterministic PRNG, component registry, world serialization and hashing, and the game loop with system ordering. The scope is 16 files totaling approximately 2,880 lines across `src/core/` (8 files, 990 lines), `src/serialization/` (7 files, 1,651 lines), and `src/game.ts` (239 lines). All files are well under the 400-line limit, with the largest being `component-hashers.ts` at 368 lines.

Overall health is **good**. The ECS design is clean and principled, determinism concerns are handled carefully, and serialization coverage is comprehensive.

---

## Issues

### 1. Beam hash omits simulation-critical ActiveBeam fields
**File**: `src/serialization/hashing.ts:117-126`
**Severity**: Medium

The beam hashing logic in `hashSystemState` only hashes `active`, `weaponIndex`, `origin`, and `direction` for each `ActiveBeam`. However, several other `ActiveBeam` fields are read by simulation systems and affect game outcomes:

- **`lastInstantFireTime`**: Read at `src/systems/weapons/beam-instant.ts:84` to enforce weapon cooldowns. If this field diverges between clients, one client may allow firing while the other enforces cooldown.
- **`pulseActive`**: Read at `src/systems/weapons/beam-continuous.ts:110,118,127` to control whether pulse beams deal damage in the current interval.
- **`lastPulseTime`**: Read at `src/systems/weapons/beam-continuous.ts:107` to calculate time since last pulse for damage gating.

```typescript
// hashing.ts:117-126 - current beam hash (incomplete)
for (const beam of beams) {
  hash.addBool(beam.active);
  hash.addInt32(beam.weaponIndex);
  hash.addFloat64(beam.origin.x);
  // ... origin and direction only
}
```

**Recommendation**: Add hashing for `lastInstantFireTime`, `pulseActive`, and `lastPulseTime` to the beam hash loop. These are simulation-critical and their divergence would represent a genuine desync that the current hash cannot detect. Fields like `fadeStartTime`, `lanceFireTime`, `isInstantBeam`, `isTorch`, and `beamWidth` are rendering-only or derived from weapon definitions and can remain excluded.

---

### 2. Game loop has no accumulator cap (spiral of death)
**File**: `src/game.ts:170-177`
**Severity**: Medium

The game loop accumulates `delta` time without any upper bound:

```typescript
// game.ts:170-177
game.accumulator += delta;

// Fixed timestep updates (deterministic)
while (game.accumulator >= TICK_MS) {
  tick(game);
  game.accumulator -= TICK_MS;
}
```

If the browser tab is backgrounded and then foregrounded, `requestAnimationFrame` delivers a single large `delta` (potentially seconds or even minutes of accumulated time). With `TICK_MS` at ~16.67ms, a 10-second background period would cause 600 ticks in a single frame.

**Recommendation**: Add a maximum accumulator cap, typically 3-10 ticks worth:
```typescript
const MAX_ACCUMULATOR = TICK_MS * 8; // Cap at 8 ticks (~133ms)
game.accumulator = Math.min(game.accumulator + delta, MAX_ACCUMULATOR);
```

---

### 3. `isShip` relies on negative component checks
**File**: `src/core/ecs.ts:236-242`
**Severity**: Low

```typescript
export function isShip(world: World, entity: Entity): boolean {
  return (
    hasComponent(world, entity, 'collision') &&
    !hasComponent(world, entity, 'projectile') &&
    !hasComponent(world, entity, 'missile')
  );
}
```

A ship is defined as "has collision but is not a projectile or missile". This negative definition is fragile -- if a new entity type is added that has `collision` but is not a ship, it would incorrectly be classified as a ship. Currently safe because structures use `hullCollider` without `collision`, but this is implicit rather than enforced. Used in 12+ files.

**Recommendation**: Consider adding a `ship` tag component as a positive identifier, or document which entity types currently have `collision` and why this negative check remains safe.

---

### 4. `SystemState` is a growing god-object
**File**: `src/core/types.ts:79-218`
**Severity**: Low

`SystemState` aggregates state for many unrelated systems: weapons, targeting, flight assist, beams, mission, ship identity, projectile hits, muzzle flashes, pools, input recorder, combat stats, and match stats. At 140 lines for the interface definition alone, every new system that needs cross-frame state adds fields here, requiring parallel updates in `createWorld`, serialization, and hashing.

**Recommendation**: Manageable at current scale. If the system count continues to grow, consider a Map-based system state registry with typed accessors.

---

### 5. `World` uses `import()` types inline
**File**: `src/core/types.ts:171, 210, 229-231`
**Severity**: Low

The `World` and `SystemState` interfaces use inline `import()` type syntax for `InputRecorder`, `DestroyedShipRecord`, `SalvageableShip`, and `PRNGState`. This avoids circular dependency issues but reduces readability.

**Recommendation**: Use top-level imports where there is no circular dependency risk (e.g., `PRNGState`). The inline approach is justified for cross-boundary imports like `InputRecorder`.

---

### 6. Serialization dispatch uses `as never` casts
**File**: `src/serialization/components.ts:226-278`
**Severity**: Low

The `serializeComponent` function uses `component as never` for every case in the switch statement. This suppresses all type checking. If a component interface changes shape and the serializer signature no longer matches, the error will only surface at runtime.

**Recommendation**: Cast to the specific type (e.g., `component as Transform`) instead of `as never` to preserve structural type checking.

---

### 7. Dead exported functions
**Files**: `src/serialization/world.ts:171`, `src/serialization/primitives.ts:148,162`, `src/core/mersenne-twister.ts:57`
**Severity**: Low

Several exported functions have no consumers outside their own module:
- `estimateWorldSize` (`world.ts:171`) -- exported but never imported anywhere.
- `isSerializedVector3` (`primitives.ts:148`) -- exported but never imported by any consumer.
- `isSerializedQuaternion` (`primitives.ts:162`) -- same.
- `hashcode` (`mersenne-twister.ts:57`) -- exported but only used internally.

**Recommendation**: Either remove the exports or document their intended use case (e.g., debugging/development tooling).

---

### 8. `deserializeWorldFromBytes` uses unvalidated `JSON.parse`
**File**: `src/serialization/world.ts:162-164`
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

### Determinism-first architecture
The separation of `prng` (simulation) and `renderPrng` (visual effects) on the World object shows disciplined thinking about multiplayer determinism. The `SystemState` documentation explicitly categorizes fields as "simulation-critical" vs "transient/local" with detailed comments. The seeded PRNG with its `deriveKey` function provides save-scum-proof randomness for campaign progression.

### Comprehensive and consistent serialization
Every component type (all 26) has co-located `serialize*`/`deserialize*` functions with compact field names using numeric type IDs. The dispatch covers all types exhaustively with error handling for unknown types. The component hashers mirror the same complete coverage. The `WORLD_SERIALIZATION_VERSION` constant and version checking provide forward compatibility.

### Well-ordered system pipeline
The `SYSTEM_ORDER` array in `src/game.ts` with its 19-step rationale comment is exemplary engineering documentation. The separation of `SIMULATION_SYSTEMS` (for replay playback) from the full `SYSTEM_ORDER` (which prepends `inputSystem`) enables the replay system to reuse the exact simulation pipeline without duplication.

### Textbook game loop
The fixed timestep with accumulator and interpolation alpha is correctly implemented. The frame rate capping logic, the pause handling that preserves the alpha at 1.0, and the `lastTime = 0` reset on resume (to avoid accumulator spikes from paused time) all demonstrate careful attention to game loop correctness.

### Good use of pre-allocated vectors
`src/core/lead-calculation.ts` uses module-level reusable vectors with a clear JSDoc warning about the shared return value. This is the correct approach for hot-path game code.

### Clean component registry with numeric IDs
The `ComponentTypeId` mapping provides stable numeric identifiers for binary serialization, completely decoupled from string-based runtime lookups. The 26 registry entries match exactly across the `ComponentRegistry` interface, `ComponentTypeId` constants, serialization dispatch, and component hashers.
