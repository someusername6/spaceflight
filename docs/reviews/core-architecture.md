# Core Architecture & ECS Review

## Overview

The Core Architecture & ECS layer provides the foundational infrastructure for the Spaceflight game: entity-component-system management, deterministic PRNG, component definitions, world serialization/hashing, simulation loop, and system ordering. The overall health is **good** -- the architecture is clean, well-documented, and follows ECS best practices. Components are plain interfaces (no classes), systems are pure functions, the fixed-timestep game loop is textbook-correct, and determinism concerns are handled with care (separate simulation/render PRNGs, seeded randomness throughout).

The review covers approximately 7,100 lines across 40 files. All files comply with the 400-line limit. The most significant findings are a bug in the Mersenne Twister initialization, a performance concern in the hashing hot path, and some architectural patterns worth tightening.

---

## Issues Found

### Bug: Mersenne Twister initialization mask is incorrect
**File**: `src/core/mersenne-twister.ts:22`
**Severity**: Medium

The initialization loop contains:
```typescript
this._state[i] = curr & ((curr << 32) - 1);
```

In JavaScript, bitwise shift operates modulo 32, so `curr << 32` is equivalent to `curr << 0` (a no-op). This means the expression evaluates to `curr & (curr - 1)`, which strips the lowest set bit -- not the intended 32-bit mask `curr & 0xFFFFFFFF`.

The standard MT19937 initialization uses `MT[i] &= 0xFFFFFFFF` to ensure 32-bit values. The comment says this is "exact implementation matching 'rng' npm package", so this may be an intentional reproduction of a bug in that package for compatibility with the procedural generation system (`wwwtyro/space-2d`). If so, this should be documented with a comment explaining the deliberate deviation. If not, it should be fixed to `curr & 0xFFFFFFFF`.

**Recommendation**: Add a comment like `// Intentionally reproduces rng@npm bug for space-2d compatibility` or fix to `this._state[i] = (this._state[i] as number) & 0xFFFFFFFF;`.

---

### Bug: `calculateInterceptPoint` returns shared mutable vector
**File**: `src/core/lead-calculation.ts:79`
**Severity**: Medium

The function returns `interceptResult`, a module-level reusable `Vector3`. The doc comment does not warn callers that the returned reference is ephemeral. While the function comment says nothing about this, a comment in `aim-error.ts:171` for a similar pattern says "returns reusable vector - clone if storing". Any caller that stores the result across frames without cloning will silently get overwritten data.

This function is called from at least 6 locations (AI pursuit, weapon firing, lead indicators). If any two callers run in the same frame (which they do -- AI and weapon systems both run per-tick), they will clobber each other's result. However, since each call site likely consumes the result immediately before the next call, this is likely safe in practice. Still, this is a latent bug waiting to happen.

**Recommendation**: Either (a) add a JSDoc `@returns` warning like the one in `aim-error.ts`, or (b) return a new `Vector3` and accept the allocation cost (this is not a per-entity hot path since it's only called for entities with targets).

---

### Performance: `HashState.addFloat64` allocates `ArrayBuffer` per call
**File**: `src/serialization/hashing.ts:47-54`
**Severity**: Medium

Every call to `addFloat64` creates a new `ArrayBuffer(8)`, `DataView`, and `Uint8Array`. In `computeWorldHash`, this is called hundreds of times per hash computation (once per float field of every component of every entity). For a world with 20 entities averaging 5 components each, with ~8 floats per component, that is ~800 allocations per hash.

```typescript
addFloat64(n: number): void {
  const buffer = new ArrayBuffer(8);         // allocation
  new DataView(buffer).setFloat64(0, n, true); // allocation
  const bytes = new Uint8Array(buffer);      // allocation (view, not copy)
  for (let i = 0; i < 8; i++) {
    this.addByte(bytes[i] as number);
  }
}
```

**Recommendation**: Hoist a single `ArrayBuffer(8)` + `DataView` + `Uint8Array` to module level or as class fields on `HashState`, and reuse them:
```typescript
private static readonly _buf = new ArrayBuffer(8);
private static readonly _view = new DataView(HashState._buf);
private static readonly _bytes = new Uint8Array(HashState._buf);
```
This reduces `addFloat64` from 3 allocations to 0. Since `computeWorldHash` is called in the multiplayer game adapter, this matters for network tick performance.

---

### Performance: Multiple `processRemovals` calls per tick
**File**: `src/systems/cleanup.ts:69`, `src/systems/explosions.ts:47`, `src/systems/hyperspace-jump.ts:35`
**Severity**: Low

`processRemovals` is called in three separate systems within a single tick (cleanup at step 16, explosions at step 17, hyperspace-jump at step 18). Each call iterates `world.toRemove` and does `Set.delete` + `Map.delete` operations. The work is duplicated if entities are only added to `toRemove` by one of these systems. After the first call, the subsequent calls iterate an empty set, which is cheap but unnecessary.

**Recommendation**: Consider consolidating `processRemovals` to a single call at the end of the tick in `game.ts` after all systems run, or at least document why each system needs its own removal pass (e.g., "explosions system needs entities removed by cleanup to be gone before it runs").

---

### Performance: `queryEntities` generator iterates all entities for every query
**File**: `src/core/ecs.ts:190-199`
**Severity**: Low (design-level)

Every `queryEntities` call iterates the full `world.entities` set and checks components via `hasComponents`. With 152 call sites across 58 files, and many systems running per tick, the total per-tick entity iteration count is significant. For a world with 50 entities and 20 system queries, that's 1,000 iterations just for matching.

This is the standard "brute-force ECS" approach and is adequate for the current entity counts (space battles with ~20-40 entities). However, if entity counts grow (e.g., large fleet battles, many projectiles), this will become a bottleneck.

**Recommendation**: No action needed now. If performance profiling shows entity iteration as a hotspot, consider adding archetype-based indexing or per-component entity sets. The current approach is correct and simple.

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

A ship is defined as "has collision but is not a projectile or missile". This negative definition is fragile -- if a new entity type is added that has `collision` but is not a ship (e.g., an asteroid, a space mine, a deployable turret), it would incorrectly be classified as a ship. Structures are already excluded implicitly because they don't seem to have `collision` -- but this is implicit, not enforced.

Used in 12 files with 26 occurrences, this definition is load-bearing. The `structure` component exists but structures appear to use `hullCollider` without `collision`, so they're safe today.

**Recommendation**: Consider adding a `ship` tag component (empty marker) to positively identify ships, or at least add a comment noting which entity types currently have `collision` and why this negative check is safe.

---

### Design: `SystemState` is a growing god-object
**File**: `src/core/types.ts:79-218`
**Severity**: Low

`SystemState` aggregates state for many unrelated systems: weapons, targeting, flight assist, beams, mission, ship identity, projectile hits, muzzle flashes, pools, input recorder, combat stats, and match stats. At 140 lines just for the interface, it is approaching the complexity ceiling.

Every new system that needs cross-frame state adds fields here. The `createWorld` function in `ecs.ts` must initialize all of them. The serialization in `system-state.ts` must handle all of them. This is a maintenance scaling concern.

**Recommendation**: The current approach works fine and avoids indirection overhead. If the number of systems continues to grow, consider grouping related fields into sub-objects with dedicated `create*` functions, or using a Map-based system state registry. Not urgent.

---

### Design: `World` uses `import()` types inline
**File**: `src/core/types.ts:171, 210, 229-231`
**Severity**: Low

The `World` and `SystemState` interfaces use inline `import()` type syntax:
```typescript
inputRecorder: import('../input/input-recorder').InputRecorder | null;
destroyedShips: import('../components/combat-stats').DestroyedShipRecord[];
prng: import('../core/prng').PRNGState;
```

This avoids circular dependency issues but makes the type definitions harder to read at a glance. The `PRNGState` import from `../core/prng` is in the same directory, so there should be no circular dependency risk for that one.

**Recommendation**: Where possible, use top-level imports instead of inline `import()`. The circular dependency risk is real for `InputRecorder` (input depending on core), so the inline approach is justified there.

---

### Design: `worldsEqual` uses hash comparison only
**File**: `src/serialization/hashing.ts:212-214`
**Severity**: Low

```typescript
export function worldsEqual(world1: World, world2: World): boolean {
  return computeWorldHash(world1) === computeWorldHash(world2);
}
```

A 32-bit hash has a collision probability of ~1 in 4 billion per comparison. For desync detection during development this is fine, but the function name `worldsEqual` implies a definitive equality check. A hash collision would silently mask a desync in multiplayer.

**Recommendation**: Rename to `worldHashesMatch` to signal the probabilistic nature, or document the collision risk. For production multiplayer, consider using a 64-bit hash (two independent FNV passes).

---

### Maintenance: Serialization dispatch uses `as never` casts
**File**: `src/serialization/components.ts:226-278`
**Severity**: Low

The `serializeComponent` function uses `component as never` for every case in the switch:
```typescript
case 'transform':
  return serializeTransform(component as never);
```

The comment explains why ("TypeScript doesn't propagate discriminated union narrowing"), but this suppresses all type checking. If a component's interface changes shape and the serializer signature doesn't match, the error will only surface at runtime.

**Recommendation**: Consider casting to the specific type (e.g., `component as Transform`) instead of `as never`. This preserves some type safety -- structural mismatches would still be caught.

---

### Maintenance: Component-hasher `shieldHit` silently skips
**File**: `src/serialization/component-hashers.ts:350-351`
**Severity**: Low

```typescript
case 'shieldHit':
  break; // Visual only
```

`ShieldHit` is intentionally excluded from hashing because it's visual-only, which makes sense. However, if a future developer adds simulation-relevant data to `ShieldHit`, the hasher won't catch desync. Other visual components like `explosion` ARE hashed (age, maxAge, size, variant).

**Recommendation**: Either hash the non-visual fields of `shieldHit` (writeIndex at minimum, for consistency), or add a comment explaining why it differs from `explosion` which IS hashed.

---

### Maintenance: Dual PRNG systems without clear usage boundaries
**File**: `src/core/prng.ts` and `src/core/mersenne-twister.ts`
**Severity**: Low

Two separate PRNG implementations exist:
1. **mulberry32** (`prng.ts`) -- used for all game randomness
2. **Mersenne Twister** (`mersenne-twister.ts`) -- used only for `wwwtyro/space-2d` procedural generation compatibility

Both are legitimate, but a new developer might use the wrong one. The Mersenne Twister file has a comment explaining this, which is good.

**Recommendation**: No change needed. The header comments adequately explain the distinction.

---

## Strengths

### Excellent ECS design
The ECS implementation is clean and principled. Entities are plain numbers, components are data-only interfaces, systems are pure functions, and the world holds all state. The `ComponentRegistry` type mapping provides compile-time safety without runtime overhead -- `getComponent(world, entity, 'transform')` returns `Transform | undefined` with full type inference. This is one of the better TypeScript ECS designs I've seen.

### Determinism-first architecture
The separation of `prng` (simulation) and `renderPrng` (visual effects) on the World object shows disciplined thinking about multiplayer determinism. The `SystemState` documentation explicitly categorizes fields as "simulation-critical" vs "transient/local", which prevents accidental determinism violations.

### Comprehensive serialization
Every component has co-located `serialize*`/`deserialize*` functions with compact field names. The pattern is remarkably consistent across all 26 component types. The `ComponentTypeId` mapping with the stability comment ("never change existing IDs, only add new ones") shows forward thinking about protocol compatibility.

### Well-ordered system pipeline
The `SYSTEM_ORDER` array in `game.ts` with its 19-step rationale comment is exemplary. The separation of `SIMULATION_SYSTEMS` (for replay playback) from the full `SYSTEM_ORDER` (which adds `inputSystem`) shows clean layering. The game loop's fixed timestep with accumulator and interpolation alpha is textbook correct.

### Consistent component patterns
All components follow the same structure: interface extending `ComponentBase`, factory function `create*()`, helper functions, serialization types and functions. The discipline of never using classes for components, using `readonly type` discriminants, and handling optional fields with `exactOptionalPropertyTypes`-safe patterns is commendable.

### Good use of pre-allocated vectors
Files like `lead-calculation.ts` and `aim-error.ts` use module-level reusable vectors to avoid per-frame allocation. This is the right approach for hot-path game code.

### Clean separation of data and behavior
Weapon definitions live in `data/weapons.ts`, weapon *components* live in `components/weapons.ts`, and weapon *systems* live in `systems/weapons/`. The "where to find things" table in CLAUDE.md matches the actual code organization.

---

## Recommendations

Prioritized from most impactful to least:

1. **Fix or document the Mersenne Twister masking** (`mersenne-twister.ts:22`). If the `rng` npm package bug is intentional for compatibility, add a clear comment. If not, fix it.

2. **Hoist `addFloat64` allocations in `HashState`** (`hashing.ts:47-54`). This is a straightforward performance win with no behavior change -- move the `ArrayBuffer`/`DataView`/`Uint8Array` to static class fields.

3. **Document the shared-vector return pattern in `calculateInterceptPoint`** (`lead-calculation.ts:79`). Add a JSDoc warning matching the pattern in `aim-error.ts:171`.

4. **Consider consolidating `processRemovals`** to a single end-of-tick call. This simplifies the mental model of when entities actually disappear.

5. **Add a positive `ship` marker component** (optional, lower priority). Would make `isShip` checks O(1) map lookups instead of negative-check logic, and remove fragility as new entity types are added.

6. **Rename `worldsEqual` to `worldHashesMatch`** to avoid implying definitive equality.
