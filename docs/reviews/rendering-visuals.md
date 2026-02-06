# Rendering & Visual Systems - Code Review

**Last updated:** February 2026
**Scope:** `src/rendering/` and all subdirectories
**Files reviewed:** ~55 files across 7 subdirectories

## Overview

The rendering system is built on Three.js and covers 3D scene management, visual effects (projectiles, beams, explosions, shields), a 2D canvas HUD overlay (radar, reticles, weapon display), and a procedural skybox. The architecture is consistent: each subsystem follows a create/update/reset/dispose lifecycle, entity state is synced from the ECS, and Hermite interpolation smooths rendering between fixed-timestep physics ticks.

Overall code quality is high. Object pooling is used extensively, module-level reusable vectors avoid most per-frame allocations, and file sizes comply with the 400-line limit. The issues found are primarily per-frame micro-allocations that escaped the otherwise disciplined allocation avoidance, a few missing Three.js dispose calls, and some code duplication that could be refactored.

---

## Issues Found

### Performance

#### P1. Per-frame `Set` allocations in multiple renderers
**Severity:** Medium
**Category:** Performance

Several renderers create a new `Set` every frame to track which entities were seen during the update loop. This generates garbage every frame unnecessarily.

- `src/rendering/beam-effects/torch.ts:77` - `new Set<string>()` created every frame in `updateTorchRenderer`
- `src/rendering/effects/beam-glow.ts:64` - `new Set<string>()` created every frame in `updateBeamGlowRenderer`
- `src/rendering/hud/radar.ts:276` - `new Set()` created every frame for `threatMissiles`
- `src/rendering/reticle/reticles.ts:146` - `new Set()` created every frame for `threatMissiles`

**Recommendation:** Hoist these to module-level reusable Sets and call `.clear()` at the start of each frame, following the pattern already used in `missile-exhaust.ts:28` (`const seenMissiles = new Set<Entity>()`).

---

#### P2. Per-frame `Vector3` allocations in beam effects
**Severity:** Medium
**Category:** Performance

Temporary vectors are created inside functions called every frame or on entity creation, instead of reusing module-level scratch vectors.

- `src/rendering/beam-effects/torch.ts:172` - `new THREE.Vector3(0, 0, 1)` in `updateTorchCone` (called per torch per frame)
- `src/rendering/beam-effects/torch.ts:198` - `new THREE.Vector3(0, 0, 1)` in `updateTorchConeInterpolated` (called per torch per frame)
- `src/rendering/beam-effects/nuclear-lance-beam.ts:33-36` - `new THREE.Vector3()` and `new THREE.Vector3(0, 1, 0)` in `createBeamCylinders`
- `src/rendering/beam-effects/nuclear-lance-impact.ts:60` - `new THREE.Vector3(0, 0, 1)` in `createImpactEffects`

**Recommendation:** Hoist to module-level constants (e.g., `const UP = new THREE.Vector3(0, 1, 0)`) or reusable scratch vectors. The `nuclear-lance-types.ts` file already exports shared `direction` and `quaternion` scratch objects -- extend this pattern.

---

#### P3. `getNukeColor()` allocates a new `THREE.Color` every call
**Severity:** Medium
**Category:** Performance

`src/rendering/beam-effects/nuke-colors.ts:29` creates `new THREE.Color()` on every invocation. This function is called per-frame for each active nuclear lance effect.

```ts
export function getNukeColor(t: number): THREE.Color {
  // ...
  return new THREE.Color().lerpColors(NUKE_WHITE, NUKE_ORANGE, orangeT);
}
```

**Recommendation:** Use a module-level scratch `THREE.Color` and return it (callers must use the value immediately or copy it):

```ts
const _scratchColor = new THREE.Color();
export function getNukeColor(t: number): THREE.Color {
  return _scratchColor.lerpColors(NUKE_WHITE, NUKE_ORANGE, orangeT);
}
```

---

#### P4. `getMissilesTargetingPlayer()` allocates a new array on every call
**Severity:** Medium
**Category:** Performance

`src/rendering/hud/missile-warning.ts:89-99` creates a new array each call. This function is called from multiple consumers per frame (radar at `radar.ts:276` and reticles at `reticles.ts:146`), meaning the same query runs multiple times with fresh allocations each time.

**Recommendation:** Cache the result per frame (e.g., store on a module-level variable keyed by frame count or game time), or compute once in the main render loop and pass the result to both consumers.

---

#### P5. `lightning-bolt.ts` clones vectors inside inner subdivision loop
**Severity:** Low
**Category:** Performance

`src/rendering/beam-effects/lightning-bolt.ts:70` calls `tempVec.clone()` inside the inner loop of bolt subdivision. For a bolt with 3 subdivision levels and 8 initial segments, this creates ~56 temporary `Vector3` objects per bolt regeneration.

**Recommendation:** Use a pre-allocated array of vectors or a flat `Float32Array` for intermediate points.

---

#### P6. `target-camera.ts` per-frame `ImageData` allocation and CPU pixel copy
**Severity:** Medium
**Category:** Performance

`src/rendering/hud/target-camera.ts:178` creates a `new ImageData()` every frame for the target camera PiP display. Lines 184-190 then perform a CPU-side pixel copy loop flipping the Y-axis.

Additionally, line 146 traverses the entire scene graph every frame to toggle light visibility for the PiP render.

**Recommendation:**
- Reuse a module-level `ImageData` and `Uint8Array` buffer.
- Consider rendering the PiP at a lower frequency (e.g., every 2-3 frames) since it is a small viewport element.
- Cache the light references instead of traversing the scene each frame.

---

#### P7. Unnecessary hex round-trip in beam color update
**Severity:** Low
**Category:** Performance

`src/rendering/beam-lines.ts:90` does `color.setHex(beam.color.getHex())` every frame, converting a Color to hex integer and back. This should be `color.copy(beam.color)` instead.

Similarly appears at `beam-lines.ts:121` in the interpolated variant.

---

#### P8. Geometry cloned per ship mesh when shared geometry would suffice
**Severity:** Low
**Category:** Performance

`src/rendering/mesh-factory.ts:99` calls `getShipGeometry(mappedClass).clone()` for every ship mesh created. Since each `THREE.Mesh` has its own transform, material, and scale, the underlying `BufferGeometry` can be shared directly without cloning. The same issue exists at line 219 for structure meshes.

**Recommendation:** Remove `.clone()` and use the cached geometry directly. The geometry is read-only data (positions, normals, indices) and Three.js supports sharing geometry across meshes.

---

### Bugs

#### B1. Missing geometry/material dispose on entity mesh removal
**Severity:** High
**Category:** Bug

`src/rendering/renderer.ts:278-284` removes meshes from the scene when entities are destroyed, but does not dispose their geometry or material. This leaks GPU memory over the course of a mission, especially in battles with many ship destructions.

```ts
// Current code at renderer.ts:278-284
for (const [entity, mesh] of renderer.entityMeshes) {
  if (!seenEntities.has(entity)) {
    renderer.scene.remove(mesh);
    renderer.entityMeshes.delete(entity);
  }
}
```

**Recommendation:** Add geometry and material disposal:

```ts
renderer.scene.remove(mesh);
if (mesh instanceof THREE.Mesh) {
  mesh.geometry.dispose();
  if (mesh.material instanceof THREE.Material) mesh.material.dispose();
}
renderer.entityMeshes.delete(entity);
```

Note: If geometry cloning is removed per P8, only materials need disposing since the geometry is shared.

---

#### B2. `jump-effect.ts` always uses `Uint16BufferAttribute` for indices
**Severity:** Low
**Category:** Bug

`src/rendering/effects/jump-effect.ts:93` unconditionally uses `THREE.Uint16BufferAttribute` for index data. If a ship geometry has more than 65,535 vertices, the indices will overflow silently, producing visual corruption. `mesh-factory.ts:46-49` correctly checks vertex count and uses `Uint32BufferAttribute` when needed.

**Recommendation:** Add the same vertex count check as `mesh-factory.ts`.

---

#### B3. `beam-glow.ts` uses fragile color-matching for beam type detection
**Severity:** Low
**Category:** Bug

`src/rendering/effects/beam-glow.ts:98-101` determines beam type by checking if `beam.color.r < 0.5`. This is fragile -- any future beam color changes or additions could break this heuristic without any compiler warning.

**Recommendation:** Pass beam type information explicitly rather than inferring it from color values.

---

### Design

#### D1. Near-duplicate functions in `beam-lines.ts`
**Severity:** Medium
**Category:** Design

`src/rendering/beam-lines.ts:63-95` (`updateBeamLine`) and `src/rendering/beam-lines.ts:98-129` (`updateBeamLineInterpolated`) are nearly identical functions (~30 lines each), differing only in how position/rotation is obtained (direct vs interpolated). This is a maintenance hazard -- any fix applied to one must be manually replicated in the other.

**Recommendation:** Merge into a single function that takes an optional interpolation source, or extract the shared logic into a helper.

---

#### D2. Unused `coreMaterial` in `torch.ts`
**Severity:** Low
**Category:** Design

`src/rendering/beam-effects/torch.ts` creates a `coreMaterial` at module scope but never uses it for any mesh. The `outerMaterial` is cloned per torch cone, but `coreMaterial` appears to be leftover from a removed feature or an incomplete implementation.

**Recommendation:** Remove the unused material or document why it exists.

---

#### D3. `shield-effects.ts` clones geometry per hit without pooling
**Severity:** Low
**Category:** Design

`src/rendering/effects/shield-effects.ts` clones `SphereGeometry` for each shield hit effect. Other comparable renderers (bolts, explosions, hit particles, muzzle flashes) all use object pooling. Shield hits should follow the same pattern for consistency and to avoid per-hit GPU memory allocation.

---

#### D4. Module-level mutable timing state in `lead-indicators.ts`
**Severity:** Low
**Category:** Design

`src/rendering/reticle/lead-indicators.ts:44-45` uses module-level variables `lastFrameTime` and `cachedDt` to compute frame delta time. This mutable state is shared across all callers and would cause subtle bugs if the module were ever used in multiple rendering contexts (e.g., PiP + main view).

**Recommendation:** Pass `dt` as a parameter from the caller rather than computing it internally from wall-clock time.

---

### Maintenance

#### M1. Files approaching 400-line limit
**Severity:** Low
**Category:** Maintenance

Several files are close to the project's 400-line maximum:

| File | Lines | Status |
|------|-------|--------|
| `src/rendering/effects/projectile-hits.ts` | 398 | At limit |
| `src/rendering/hud/hud.ts` | 390 | Near limit |
| `src/rendering/reticle/reticle-drawing.ts` | 386 | Near limit |
| `src/rendering/hud/target-stats.ts` | 384 | Near limit |
| `src/rendering/renderer.ts` | 376 | Approaching |
| `src/rendering/reticle/reticles.ts` | 370 | Approaching |
| `src/rendering/hud/radar.ts` | 367 | Approaching |
| `src/rendering/effects/explosion-visual.ts` | 366 | Approaching |
| `src/rendering/reticle/lead-indicators.ts` | 352 | Approaching |

**Recommendation:** `projectile-hits.ts` at 398 lines should be preemptively split. Good candidates: extract particle configuration constants into a separate file, or split pool management from visual update logic.

---

#### M2. `missile-exhaust.ts:80` clones shared cone geometry per missile
**Severity:** Low
**Category:** Maintenance

Each missile exhaust creates `renderer.coneGeometry.clone()` at line 80. The clone is then individually disposed when the missile is removed (line 161). This is correct but inconsistent with the pattern in other renderers that share geometry. Since each cone is identically shaped, the shared geometry could be used directly (each `Mesh` has its own transform).

However, if scale varies per missile (line 153 applies per-mesh scale flicker), sharing geometry is fine since `scale` is on the mesh, not the geometry.

**Recommendation:** Use the shared geometry directly without cloning to reduce per-missile allocation. The `scale` property is on the `Mesh` object, not the `BufferGeometry`.

---

## Strengths

### Consistent Architecture
Every visual subsystem follows the same lifecycle pattern: `createXxxRenderer()` / `updateXxxRenderer()` / `resetXxxRenderer()` / `disposeXxxRenderer()`. This makes the codebase predictable and easy to navigate. New effects can be added by following any existing renderer as a template.

### Extensive Object Pooling
Critical renderers use object pooling to avoid per-frame GPU allocations:
- `trails.ts` - Bolt pool with shared geometries per weapon type
- `projectile-hits.ts` - Hit particle pool with configurable max count
- `explosions.ts` - Separate pools for standard and nuclear explosions
- `muzzle-flash.ts` - Flash pool with entity-attached positioning
- `lightning-lines.ts` - Line2 pool for lightning bolt segments

### Module-Level Reusable Objects
Most files pre-allocate scratch vectors, quaternions, and matrices at module scope to avoid per-frame garbage:
- `renderer.ts:29-33` - `interpPos`, `interpRot`, `prevPos`, `prevRot`, `velocity`
- `nuclear-lance-types.ts:72-79` - Shared `direction`, `quaternion`, `tempColor`
- `skybox-stars.ts:33` - Reused `Vector3` for 100k star positions (avoiding 600k allocations)
- `reticle-helpers.ts:11-12` - Shared `_screenPos` and `_halfSize`

### Hermite Interpolation
The renderer uses cubic Hermite interpolation (not just linear) for smooth position transitions between physics ticks (`renderer.ts:189-245`). Previous position, current position, and velocity-derived tangents produce natural-looking motion without the lag of pure lerp.

### Well-Split File Structure
Large subsystems are decomposed into focused modules:
- Nuclear lance: 6 files (types, main orchestrator, beam, impact, origin, shared)
- Weapon display: 4 files (main, secondary, utils, styles)
- HUD: 11 files covering radar, reticles, target info, missile warning, allied/station/convoy/spectator displays
- Skybox: 5 files (main, params, stars, constants, shaders)

### Deterministic Visual Effects
Visual randomness uses the seeded `renderPrng` (e.g., `missile-exhaust.ts:90`, `lightning.ts`), ensuring visual effects do not affect simulation determinism -- critical for the replay system.

### Smart Rendering Techniques
- `dust.ts` - Infinite tiled dust field using cube-hashing with per-face distance fade shader
- `skybox.ts` - One-time procedural cubemap generation with 4D Perlin noise, then disposed
- `radar.ts` - Logarithmic distance scaling with 6DOF ship-relative orientation
- `weapon-display.ts` - Change-detection caching via signature strings to avoid unnecessary DOM updates
- `trail-config.ts` - Per-weapon-type visual configuration (geometry, color, trail length)

---

## Recommendations

### Priority 1 (High Impact)
1. **Fix the GPU memory leak in `renderer.ts:278-284`** (B1). This is the most impactful bug -- geometry and materials leak every time an entity is destroyed. In a long mission with many kills, this could degrade performance or exhaust GPU memory.

2. **Hoist per-frame `Set` and `Vector3` allocations** (P1, P2). These are easy fixes that collectively eliminate dozens of allocations per frame. Follow the existing `seenMissiles` pattern in `missile-exhaust.ts`.

3. **Cache `getMissilesTargetingPlayer()` result per frame** (P4). This query runs the same ECS iteration multiple times per frame from different consumers.

### Priority 2 (Medium Impact)
4. **Merge duplicate beam line functions** (D1). Extract shared logic to eliminate the maintenance hazard of keeping two near-identical functions in sync.

5. **Reuse `ImageData` in target camera** (P6). The PiP camera is a visible per-frame cost that could be reduced with simple buffer reuse and reduced update frequency.

6. **Split `projectile-hits.ts`** (M1). At 398 lines it is at the project limit and will need splitting before any additions.

### Priority 3 (Low Impact)
7. **Remove unused `coreMaterial` in `torch.ts`** (D2).
8. **Add vertex count check in `jump-effect.ts`** (B2).
9. **Replace color-based beam detection with explicit type** (B3).
10. **Pool shield hit geometries** (D3).
11. **Remove geometry cloning in `mesh-factory.ts`** (P8) and `missile-exhaust.ts` (M2).
