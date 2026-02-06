# Core Architecture & ECS Review

## Overview

This review covers the foundational infrastructure of the Spaceflight codebase: the ECS framework, deterministic PRNG, component registry, world serialization and hashing, and the game loop with system ordering. The scope is 16 files totaling approximately 2,880 lines across `src/core/` (8 files, 990 lines), `src/serialization/` (7 files, 1,651 lines), and `src/game.ts` (239 lines). All files are well under the 400-line limit, with the largest being `component-hashers.ts` at 368 lines.

Overall health is **good**. The ECS design is clean and principled, determinism concerns are handled carefully, and serialization coverage is comprehensive. The previous review identified 12 issues; 4 have been resolved. This review identifies 2 new issues (one Medium severity) and retains 6 issues from the previous review that remain relevant.

---

## Issues Found

### Beam hash omits simulation-critical ActiveBeam fields (NEW)
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

```typescript
// beam-instant.ts:84 - simulation reads lastInstantFireTime
const lastFire = beam.lastInstantFireTime ?? 0;
if (gameTime - lastFire < weapon.fireRate) {
  continue; // Still on cooldown, try next
}
```

**Recommendation**: Add hashing for `lastInstantFireTime`, `pulseActive`, and `lastPulseTime` to the beam hash loop. These are simulation-critical and their divergence would represent a genuine desync that the current hash cannot detect. Fields like `fadeStartTime`, `lanceFireTime`, `isInstantBeam`, `isTorch`, and `beamWidth` are rendering-only or derived from weapon definitions and can remain excluded, but adding a brief comment explaining which beam fields are hashed and why would improve maintainability.

---

### Game loop has no accumulator cap (spiral of death) (NEW)
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

If the browser tab is backgrounded and then foregrounded, `requestAnimationFrame` delivers a single large `delta` (potentially seconds or even minutes of accumulated time). With `TICK_MS` at ~16.67ms, a 10-second background period would cause 600 ticks in a single frame. A 60-second background period would cause 3,600 ticks, likely freezing the tab.

**Recommendation**: Add a maximum accumulator cap, typically 3-10 ticks worth:
```typescript
const MAX_ACCUMULATOR = TICK_MS * 8; // Cap at 8 ticks (~133ms)
game.accumulator = Math.min(game.accumulator + delta, MAX_ACCUMULATOR);
```
This means the simulation "drops" time when the system can't keep up, which is the standard approach for fixed-timestep game loops. For a single-player game this causes a brief slowdown instead of a freeze. For multiplayer, the desync detection will catch any resulting divergence.

---

### Design: `isShip` relies on negative component checks
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

A ship is defined as "has collision but is not a projectile or missile". This negative definition is fragile -- if a new entity type is added that has `collision` but is not a ship (e.g., an asteroid, a space mine, a deployable turret), it would incorrectly be classified as a ship. Currently safe because structures use `hullCollider` without `collision`, but this is implicit rather than enforced. Used in 12+ files.

**Recommendation**: Consider adding a `ship` tag component as a positive identifier, or document which entity types currently have `collision` and why this negative check remains safe.

---

### Design: `SystemState` is a growing god-object
**File**: `src/core/types.ts:79-218`
**Severity**: Low

`SystemState` aggregates state for many unrelated systems: weapons, targeting, flight assist, beams, mission, ship identity, projectile hits, muzzle flashes, pools, input recorder, combat stats, and match stats. At 140 lines for the interface definition alone, every new system that needs cross-frame state adds fields here, requiring parallel updates in `createWorld` (`ecs.ts`), serialization (`system-state.ts`), and hashing (`hashing.ts`).

**Recommendation**: Manageable at current scale. If the system count continues to grow, consider a Map-based system state registry with typed accessors to decouple state definitions from the core types.

---

### Design: `World` uses `import()` types inline
**File**: `src/core/types.ts:171, 210, 229-231`
**Severity**: Low

The `World` and `SystemState` interfaces use inline `import()` type syntax for `InputRecorder`, `DestroyedShipRecord`, `SalvageableShip`, and `PRNGState`. This avoids circular dependency issues but reduces readability. The `PRNGState` import from `../core/prng` is in the same directory and has no circular dependency risk.

**Recommendation**: Use top-level imports where there is no circular dependency risk (e.g., `PRNGState`). The inline approach is justified for cross-boundary imports like `InputRecorder`.

---

### Maintenance: Serialization dispatch uses `as never` casts
**File**: `src/serialization/components.ts:226-278`
**Severity**: Low

The `serializeComponent` function uses `component as never` for every case in the switch statement. While the comment explains the TypeScript limitation, this suppresses all type checking. If a component interface changes shape and the serializer signature no longer matches, the error will only surface at runtime.

**Recommendation**: Cast to the specific type (e.g., `component as Transform`) instead of `as never` to preserve structural type checking.

---

### Maintenance: Dead exported functions
**Files**: `src/serialization/world.ts:171`, `src/serialization/primitives.ts:148,162`, `src/core/mersenne-twister.ts:57`
**Severity**: Low

Several exported functions have no consumers outside their own module:
- `estimateWorldSize` (`world.ts:171`) -- exported and re-exported from `index.ts` but never imported anywhere.
- `isSerializedVector3` (`primitives.ts:148`) -- exported and re-exported from `index.ts` but never imported by any consumer.
- `isSerializedQuaternion` (`primitives.ts:162`) -- same as above.
- `hashcode` (`mersenne-twister.ts:57`) -- exported but only used internally by `createMT` in the same file.

**Recommendation**: Either remove the exports (making them module-private or deleting entirely if unused) or document their intended use case. `estimateWorldSize` and the type guards may be intended for debugging/development tooling, in which case a comment noting that would suffice.

---

### Maintenance: `deserializeWorldFromBytes` uses unvalidated `JSON.parse`
**File**: `src/serialization/world.ts:162-164`
**Severity**: Low

```typescript
const json = new TextDecoder().decode(data);
const serialized = JSON.parse(json) as SerializedWorld;
deserializeWorld(serialized, world);
```

The `as SerializedWorld` cast provides no runtime validation. Malformed or corrupted data from the network would produce undefined behavior (likely cryptic property-access errors deep in deserialization). The `deserializeWorld` function does check the `version` field, which provides some protection, but the rest of the structure is trusted implicitly.

**Recommendation**: This is acceptable for a peer-to-peer multiplayer context where both sides run the same code. If the game ever accepts world snapshots from untrusted sources, add schema validation. No action needed now.

---

## Previously Reported Issues -- Now Resolved

### HashState.addFloat64 allocation (FIXED)
**Previous**: `addFloat64` created a new `ArrayBuffer(8)`, `DataView`, and `Uint8Array` on every call.
**Resolution**: Now uses static class fields (`hashing.ts:30-31`):
```typescript
private static readonly _f64Buf = new ArrayBuffer(8);
private static readonly _f64View = new DataView(HashState._f64Buf);
```
This eliminates all per-call allocations. Well done.

### Mersenne Twister mask comment (FIXED)
**Previous**: The `curr & ((curr << 32) - 1)` expression in the MT initialization was undocumented.
**Resolution**: Now has explanatory comments at `mersenne-twister.ts:22-23`:
```typescript
// In JS, (curr << 32) === curr (shift mod 32), so this computes curr & (curr - 1).
// Matches rng@0.2.2 npm package. Do not "fix" or sequences will diverge.
```
This clearly documents the intentional deviation from standard MT19937.

### `calculateInterceptPoint` shared vector warning (FIXED)
**Previous**: The function returned a shared static vector with no JSDoc warning.
**Resolution**: Now has a clear `@returns` annotation at `lead-calculation.ts:23`:
```typescript
* @returns Shared static vector - use immediately or copy. Do not store across frames.
```

### `worldsEqual` renamed to `worldHashesMatch` (FIXED)
**Previous**: The function name `worldsEqual` implied definitive equality.
**Resolution**: Renamed to `worldHashesMatch` at `hashing.ts:219`, accurately reflecting the probabilistic nature of hash comparison. The export in `index.ts:118` is also updated.

### `shieldHit` hash skip comment (FIXED)
**Previous**: The `shieldHit` case in the component hasher had a bare `break` with only `// Visual only`.
**Resolution**: Now has an explanatory comment at `component-hashers.ts:351-352`:
```typescript
case 'shieldHit':
  // shieldHit is visual-only (hit flash effect). Unlike 'explosion' which affects
  // kill timing, shieldHit has zero simulation impact.
  break;
```
This explains the distinction from `explosion` which IS hashed.

---

## Architectural Strengths

### Excellent ECS design
The ECS implementation is clean and principled. Entities are plain numbers, components are data-only interfaces, systems are pure functions, and the world holds all state. The `ComponentRegistry` type mapping at `src/core/component-registry.ts` provides compile-time safety without runtime overhead -- `getComponent(world, entity, 'transform')` returns `Transform | undefined` with full type inference and IDE auto-complete. The `ComponentTypeId` mapping with its stability comment ("never change existing IDs, only add new ones") shows forward thinking about protocol compatibility.

### Determinism-first architecture
The separation of `prng` (simulation) and `renderPrng` (visual effects) on the World object (`src/core/ecs.ts:70-73`) shows disciplined thinking about multiplayer determinism. The `SystemState` documentation in `src/core/types.ts:66-78` explicitly categorizes fields as "simulation-critical" vs "transient/local" with detailed comments, which prevents accidental determinism violations. The seeded PRNG in `src/core/prng.ts` with its `deriveKey` function provides save-scum-proof randomness for campaign progression.

### Comprehensive and consistent serialization
Every component type (all 26) has co-located `serialize*`/`deserialize*` functions with compact field names using numeric type IDs. The dispatch in `src/serialization/components.ts` covers all types exhaustively with error handling for unknown types. The component hashers in `src/serialization/component-hashers.ts` mirror the same complete coverage. The `WORLD_SERIALIZATION_VERSION` constant and version checking in `deserializeWorld` provide forward compatibility.

### Well-ordered system pipeline
The `SYSTEM_ORDER` array in `src/game.ts:96-99` with its 19-step rationale comment is exemplary engineering documentation. The separation of `SIMULATION_SYSTEMS` (for replay playback, exported at line 73) from the full `SYSTEM_ORDER` (which prepends `inputSystem`) enables the replay system to reuse the exact simulation pipeline without duplication.

### Textbook game loop
The fixed timestep with accumulator and interpolation alpha at `src/game.ts:157-193` is correctly implemented. The frame rate capping logic, the pause handling that preserves the alpha at 1.0, and the `lastTime = 0` reset on resume (to avoid accumulator spikes from paused time) all demonstrate careful attention to game loop correctness.

### Good use of pre-allocated vectors
`src/core/lead-calculation.ts` uses module-level reusable vectors (`relPos`, `relVel`, `interceptResult`) to avoid per-frame allocation, now with a clear JSDoc warning about the shared return value. This is the correct approach for hot-path game code.

### Clean component registry with numeric IDs
The `ComponentTypeId` mapping at `src/core/component-registry.ts:101-128` provides stable numeric identifiers for binary serialization, completely decoupled from string-based runtime lookups. The 26 registry entries match exactly across the `ComponentRegistry` interface, `ComponentTypeId` constants, serialization dispatch, and component hashers -- an impressive level of consistency.
