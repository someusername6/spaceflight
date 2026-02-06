# Rendering & Visual Systems - Code Review

**Last updated:** February 2026
**Scope:** `src/rendering/` and all subdirectories
**Files reviewed:** ~55 files across 7 subdirectories

## Overview

The rendering system is built on Three.js and covers 3D scene management, visual effects (projectiles, beams, explosions, shields), a 2D canvas HUD overlay (radar, reticles, weapon display), and a procedural skybox. The architecture is consistent: each subsystem follows a create/update/reset/dispose lifecycle, entity state is synced from the ECS, and Hermite interpolation smooths rendering between fixed-timestep physics ticks.

Overall code quality is high. Since the previous review, many of the identified issues have been fixed: per-frame allocations have been hoisted to module-level reusable objects, geometry cloning has been eliminated for shared meshes, beam line functions have been merged, and missing resource disposal has been added. The remaining issues are a smaller set of allocation patterns that escaped cleanup, a scene graph traversal on every target camera frame, and files approaching the 400-line limit.

---

## Previous Issues - Verification Status

### FIXED: B1. GPU memory leak on entity destruction
**Status:** Fixed
**Evidence:** `renderer.ts:280-281` now disposes materials when removing entity meshes:
```ts
if (mesh instanceof THREE.Mesh) {
  if (mesh.material instanceof THREE.Material) mesh.material.dispose();
}
```
Geometry is correctly NOT disposed here since it is now shared (see P8 fix below). The fix is correct.

---

### FIXED: P1. Per-frame Set allocations
**Status:** Fixed
All four locations now use module-level Sets with `.clear()`:
- `torch.ts:56` - `const seenTorches = new Set<string>()` at module level, cleared at line 69
- `beam-glow.ts:26` - `const seenGlows = new Set<string>()` at module level, cleared at line 67
- `radar.ts:265` - `const threatMissiles = new Set<Entity>()` at module level, cleared at line 279
- `reticles.ts:53` - `const threatMissiles = new Set<Entity>()` at module level, cleared at line 149
- `beam-lines.ts:106` - `const seenBeams = new Set<string>()` at module level, cleared at line 120

---

### FIXED: P2. Per-frame Vector3 allocations in beam effects
**Status:** Fixed
- `torch.ts:49-53` - All reusable vectors hoisted to module level: `direction`, `quaternion`, `interpOrigin`, `interpHitPoint`, `FORWARD`
- `nuclear-lance-beam.ts:21-22` - Module-level `_tempMidpoint` and `UP` vectors
- `nuclear-lance-impact.ts:27` - Module-level `FORWARD_Z` vector
- `nuclear-lance-types.ts:77-79` - Shared `direction`, `quaternion`, `tempColor` exports

---

### FIXED: P3. `getNukeColor()` scratch color
**Status:** Fixed
`nuke-colors.ts:8` declares `const _scratchColor = new THREE.Color()` at module level, and line 34 uses `_scratchColor.lerpColors(c1, c2, frac)`. The JSDoc at line 21 correctly warns: "use immediately, do not store."

---

### FIXED: P4. `getMissilesTargetingPlayer()` cached per frame
**Status:** Fixed
`missile-warning.ts:83-109` implements per-tick caching with `_cachedWorld`, `_cachedTick`, and a reusable `_cachedMissiles` array. The cache is invalidated when the world instance or `gameTime` changes.

---

### FIXED: P7. Beam color hex round-trip
**Status:** Fixed
`beam-lines.ts:88` now uses `entry.material.color.copy(beam.color)` instead of the previous `setHex(getHex())` round-trip. The duplicate interpolated variant function has been merged (see D1).

---

### FIXED: P8. Geometry cloning removed in mesh-factory
**Status:** Fixed
`mesh-factory.ts:99-100` now uses `const geometry = getShipGeometry(mappedClass)` directly (no `.clone()`), and line 219 similarly uses `const geometry = getShipGeometry(meshClass)` without cloning for structures.

---

### FIXED: B2. jump-effect.ts Uint16 index check
**Status:** Fixed
`jump-effect.ts:93-97` now checks vertex count and selects the appropriate index buffer:
```ts
const vertexCount = geometryData.positions.length / 3;
const IndexBuffer = vertexCount > 65535
  ? THREE.Uint32BufferAttribute
  : THREE.Uint16BufferAttribute;
```

---

### FIXED: D1. Beam line functions merged
**Status:** Fixed
`beam-lines.ts` now has a single `updateBeamLine` function (line 63) that accepts optional `origin` and `hitPoint` parameters. The previous duplicate `updateBeamLineInterpolated` function has been eliminated. The merged `updateAllBeamLines` function (line 112) handles interpolation and passes the appropriate parameters.

---

### FIXED: D2. Torch coreMaterial removed
**Status:** Fixed
`torch.ts` no longer contains an unused `coreMaterial`. The `TorchRenderer` interface (line 27) only has `outerMaterial`, and `createTorchRenderer` (line 32) only creates the outer material.

---

### FIXED: M1 (partial). projectile-hits.ts split
**Status:** Fixed
`projectile-hit-config.ts` exists and contains all effect configuration constants (45 lines). `projectile-hits.ts` is now at 379 lines (down from 398), providing some headroom.

---

### FIXED: M2. Missile exhaust geometry cloning
**Status:** Fixed
`missile-exhaust.ts:80` now uses `new THREE.Mesh(renderer.coneGeometry, material)` directly without `.clone()`. The shared geometry is used since each mesh has its own transform and scale.

---

### NOT FIXED: P5. lightning-bolt.ts vector cloning in subdivision loop
**Status:** Partially remaining
`lightning-bolt.ts:70` still calls `tempVec.clone()` and `midpoint.clone()` inside the subdivision loop. Line 75 clones the midpoint per iteration, and line 70 clones `tempVec` for a second perpendicular direction. For a bolt with 5 subdivisions and 2 initial points, this creates ~62+ temporary `Vector3` objects per bolt regeneration. However, since bolts regenerate only on pulse (not every frame), the practical impact is low.

Additionally, `generateBranches` at line 126 calls `toEnd.clone().normalize()` and `generateOffTargetEnd` at lines 167-168 calls `origin.clone()` and `direction.clone()`. These all allocate inside called-on-pulse functions.

---

### NOT FIXED: P6. target-camera.ts scene traversal
**Status:** Partially fixed
- ImageData reuse: **FIXED**. `target-camera.ts:42` has `let cachedImageData: ImageData | null = null` at module level, and lines 181-186 reuse it.
- Pixel buffer: **FIXED**. `target-camera.ts:77` creates the `Uint8Array` buffer once in `createTargetCamera`.
- Scene light traversal: **NOT FIXED**. `target-camera.ts:149-153` still traverses the entire scene graph every frame with `scene.traverse()` to find lights. The `sceneLights` array at line 148 is also re-allocated per frame.

---

### NOT FIXED: B3. beam-glow.ts fragile color-matching
**Status:** Partially improved
`beam-glow.ts:96-106` now checks weapon name first (`'Lightning'`, `'Torch'`), which handles the most important special cases reliably. However, the fallback at lines 101-105 still uses color-component heuristics for standard beams (`beam.color.r > 0.5` for Red, etc.), which remains fragile if new beam colors are added.

---

### NOT FIXED: D3. shield-effects.ts geometry cloning
**Status:** Not fixed
`shield-effects.ts:63` still calls `renderer.geometry.clone()` for each shield hit flash. There is a shared `renderer.geometry` but each hit clones it. Unlike ships where geometry can be shared across meshes with different transforms, here the geometry is simple enough that the clone is small. However, the pattern is inconsistent with the rest of the codebase. Each clone is properly disposed when the hit expires (line 127), so there is no leak.

---

## New Issues Found

### Performance

#### P1. Scene graph traversal every frame in target camera
**Severity:** Medium
**Category:** Performance

`src/rendering/hud/target-camera.ts:148-153` creates a fresh `sceneLights` array and calls `scene.traverse()` every frame to toggle light visibility for the PiP render. This traverses the entire scene graph (ships, effects, particles, all meshes) just to find the 2-3 scene lights.

```ts
const sceneLights: { light: THREE.Light; intensity: number }[] = [];
scene.traverse((obj) => {
  if (obj !== targetCamera.dirLight && obj instanceof THREE.Light) {
    sceneLights.push({ light: obj, intensity: obj.intensity });
    obj.intensity = 0;
  }
});
```

**Recommendation:** Cache the scene light references on first discovery (or on scene creation). Lights are added during `createRenderer` and rarely change. Store them in the `TargetCamera` state and reuse each frame.

---

#### P2. Per-frame array allocation for scene lights in target camera
**Severity:** Low
**Category:** Performance

`src/rendering/hud/target-camera.ts:148` creates `const sceneLights: ...[] = []` every frame. Even if the traversal is cached (per P1 above), this allocation should be hoisted to module level.

---

#### P3. `lightning-bolt.ts` allocates vectors in pulse functions
**Severity:** Low
**Category:** Performance

Several functions in `lightning-bolt.ts` allocate temporary `Vector3` objects inside functions called per-pulse:
- Line 70: `tempVec.clone().cross(perpendicular).normalize()` - inside inner subdivision loop
- Line 75: `midpoint.clone()` - inside inner subdivision loop
- Line 126: `toEnd.clone().normalize()` - in `generateBranches`
- Line 132-135: `branchStart.clone()` - branch endpoint calculation
- Lines 167-168, 180-181: Multiple `.clone()` calls in `generateOffTargetEnd`

Since lightning pulses only occur a few times per second (not every frame), the practical impact is low. But in battles with many lightning weapons active simultaneously, this could become measurable.

---

#### P4. `beam-glow.ts` clones geometry for each new glow
**Severity:** Low
**Category:** Performance

`src/rendering/effects/beam-glow.ts:48` calls `glowGeometry.clone()` each time a new beam glow visual is created:
```ts
const mesh = new THREE.Mesh(glowGeometry.clone(), material);
```
Since the geometry is a simple `SphereGeometry` and each mesh has its own transform/scale, the geometry could be shared directly. Glow visuals are hidden (not disposed) when inactive (line 133-136), so there is no per-frame churn here, but the initial clone is unnecessary.

---

#### P5. `nuclear-lance-impact.ts` clones shared geometries per shot
**Severity:** Low
**Category:** Performance

`src/rendering/beam-effects/nuclear-lance-impact.ts:44` and `:59` both clone shared geometries from the renderer:
```ts
const flash = new THREE.Mesh(renderer.sphereGeometry.clone(), flashMaterial);
// ...
const ring = new THREE.Mesh(renderer.ringGeometry.clone(), ringMaterial);
```
Similarly `nuclear-lance-origin.ts:32`:
```ts
const flash = new THREE.Mesh(renderer.sphereGeometry.clone(), flashMaterial);
```
And `explosion-visual.ts:98`, `:138`, `:153` all clone shared geometries per explosion.

These are all cloned per effect instance (not per frame), and the effects are relatively infrequent (nuclear lance fires rarely, explosions happen at ship death). The geometries are properly disposed when effects complete. However, since each mesh has its own `scale` and `position`, the underlying geometry could be shared.

**Recommendation:** Low priority. The current pattern works correctly and effects are infrequent. If nuclear lance or explosions ever become more common (e.g., cluster weapons), consider sharing geometry.

---

### Bugs

#### B1. `getMissileThreatState` allocates a new object per frame when threats exist
**Severity:** Low
**Category:** Bug/Performance

`src/rendering/hud/missile-warning.ts:71-79` correctly returns the cached `NO_THREAT` object when there are no threats, but allocates a new object literal at line 75 whenever any threat is present:
```ts
return {
  incomingCount,
  hasEnemyLock,
  maxEnemyLockProgress,
};
```
This creates GC pressure every frame during active combat (when missiles are most frequently targeting the player).

**Recommendation:** Use a module-level mutable result object that is populated and returned, similar to the `NO_THREAT` pattern.

---

#### B2. `beam-glow.ts` color detection logic can assign multiple colors
**Severity:** Low
**Category:** Bug

`src/rendering/effects/beam-glow.ts:101-105` iterates over all entries in `BEAM_GLOW_COLORS` and overrides `glowColor` for each matching channel. For a beam with color `(1.0, 0.6, 0.0)` (orange), this would match `Red` (r > 0.5) and potentially `Green` (g > 0.5), setting the glow to green last. The iteration order of `Object.entries()` determines which color wins, which is not guaranteed to be stable.

```ts
for (const [colorName, color] of Object.entries(BEAM_GLOW_COLORS)) {
  if (beam.color.r > 0.5 && colorName === 'Red') glowColor = color;
  if (beam.color.g > 0.5 && colorName === 'Green') glowColor = color;
  if (beam.color.b > 0.5 && colorName === 'Blue') glowColor = color;
}
```

**Recommendation:** Use the beam's dominant color channel or check exclusivity (e.g., `r > 0.5 && r > g && r > b`). Better yet, pass beam type/name explicitly.

---

### Design

#### D1. Module-level mutable timing state in `lead-indicators.ts`
**Severity:** Low
**Category:** Design

`src/rendering/reticle/lead-indicators.ts:44-45` uses module-level `lastFrameTime` and `cachedDt` to compute frame delta time via `performance.now()`. This wall-clock dependency means:
1. The smoothing rate depends on real wall-clock time, not game time. During slow-motion or fast-forward scenarios, smoothing would behave differently.
2. The module state is shared globally and would cause issues if used from multiple rendering contexts.

The `getDeltaTime()` function at line 50 is called from `drawLinkModeLeadIndicators` (line 173) and `drawMissileLeadIndicator` (line 300).

**Recommendation:** Pass `dt` as a parameter from the caller rather than computing it from wall-clock time. The render loop already has access to frame timing.

---

#### D2. Inconsistent disposal patterns in `disposeRenderer`
**Severity:** Low
**Category:** Design

`src/rendering/renderer.ts:360-378` disposes beam lines and the WebGL renderer, but does not dispose entity mesh materials. The `entityMeshes` map is simply cleared at line 377 without disposing materials. This is only called on full cleanup (game exit), so the browser will reclaim resources anyway, but it is inconsistent with the disposal discipline shown in `syncScene` at lines 280-281.

---

### Maintenance

#### M1. Files approaching 400-line limit
**Severity:** Low
**Category:** Maintenance

Several files are approaching the project's 400-line maximum:

| File | Lines | Status |
|------|-------|--------|
| `src/rendering/hud/hud.ts` | 389 | Near limit |
| `src/rendering/reticle/reticle-drawing.ts` | 385 | Near limit |
| `src/rendering/hud/target-stats.ts` | 383 | Near limit |
| `src/rendering/effects/projectile-hits.ts` | 379 | Approaching |
| `src/rendering/renderer.ts` | 378 | Approaching |
| `src/rendering/reticle/reticles.ts` | 374 | Approaching |
| `src/rendering/hud/radar.ts` | 371 | Approaching |
| `src/rendering/effects/explosion-visual.ts` | 365 | Approaching |
| `src/rendering/reticle/lead-indicators.ts` | 351 | Approaching |

**Recommendation:** `hud.ts` (389), `reticle-drawing.ts` (385), and `target-stats.ts` (383) are the most at risk. For `hud.ts`, the `updatePlayerStatus` function (lines 270-350) could be extracted. For `reticle-drawing.ts`, off-screen arrow drawing (lines 298-385) is a self-contained candidate for extraction. For `target-stats.ts`, CSS styles (lines 297-383) could move to a separate styles file.

---

#### M2. `new THREE.Color()` allocations on missile mesh creation
**Severity:** Low
**Category:** Maintenance

`src/rendering/mesh-factory.ts:128` allocates a `new THREE.Color(visual.emissive)` inside `createMissileMesh`:
```ts
bodyMat.color.lerp(new THREE.Color(visual.emissive), 0.3);
```
This is called once per missile entity creation, not per frame, so the impact is minimal. However, it violates the codebase's general pattern of avoiding allocations where module-level objects can be reused.

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
- `reticle-helpers.ts` - Object pool for `TargetInfo` structs

### Module-Level Reusable Objects
Most files pre-allocate scratch vectors, quaternions, and matrices at module scope to avoid per-frame garbage:
- `renderer.ts:47-51` - `cameraOffset`, `seenEntities`, `interpPos`, `interpRot`
- `nuclear-lance-types.ts:77-79` - Shared `direction`, `quaternion`, `tempColor`
- `beam-lines.ts:106-109` - `seenBeams`, `interpOrigin`, `interpHitPoint`
- `torch.ts:49-56` - `direction`, `quaternion`, `interpOrigin`, `interpHitPoint`, `FORWARD`, `seenTorches`
- `nuke-colors.ts:8` - `_scratchColor` with documented usage constraints
- `skybox-stars.ts:33` - Reused `Vector3` for 100k star positions
- `reticle-helpers.ts:10-13` - Shared `tempVec3`, `tempBox3`, `boxCorners`
- `lead-indicators.ts:123` - Reusable `uniqueSpeeds` Map with object pool for values

### Hermite Interpolation
The renderer uses cubic Hermite interpolation (not just linear) for smooth position transitions between physics ticks (`renderer.ts:57-79`). Previous position, current position, and velocity-derived tangents produce natural-looking motion without the lag of pure lerp.

### Well-Split File Structure
Large subsystems are decomposed into focused modules:
- Nuclear lance: 6 files (types, main orchestrator, beam, impact, origin, shared)
- Weapon display: 4 files (main, secondary, utils, styles)
- HUD: 11 files covering radar, reticles, target info, missile warning, allied/station/convoy/spectator displays
- Skybox: 5 files (main, params, stars, constants, shaders)
- Reticles: 4 files (main, drawing, helpers, lead-indicators)
- Lightning: 3 files (main, bolt generation, line rendering)
- Projectile hits: 2 files (main renderer, configuration)

### Deterministic Visual Effects
Visual randomness uses the seeded `renderPrng` (e.g., `missile-exhaust.ts:90`, `lightning.ts:122-131`), ensuring visual effects do not affect simulation determinism -- critical for the replay system.

### Smart Rendering Techniques
- `dust.ts` - Infinite tiled dust field using cube-hashing with per-face distance fade shader
- `skybox.ts` - One-time procedural cubemap generation with 4D Perlin noise, then disposed
- `radar.ts` - Logarithmic distance scaling with 6DOF ship-relative orientation
- `weapon-display.ts` - Change-detection caching via signature strings to avoid unnecessary DOM updates
- `trail-config.ts` - Per-weapon-type visual configuration (geometry, color, trail length)
- `missile-warning.ts:82-109` - Per-tick result caching with world-instance invalidation
- `lead-indicators.ts:65-83` - Exponential smoothing with frame-rate independence

### Proper Resource Cleanup
The reset/dispose lifecycle is consistently implemented across all renderers, with correct distinction between:
- **Reset** (replay seeking): Hides/pools active visuals, keeps shared resources
- **Dispose** (full cleanup): Disposes all GPU resources including shared geometries

---

## Recommendations

### Priority 1 (High Impact)
1. **Cache scene light references in target camera** (P1, P2). The per-frame `scene.traverse()` at `target-camera.ts:149` is the single most expensive remaining per-frame operation. Cache the light references on first use and reuse the array.

### Priority 2 (Medium Impact)
2. **Use mutable result object for `getMissileThreatState`** (B1). During combat when the player is being targeted by missiles, this allocates every frame. Use a module-level mutable object.

3. **Fix beam glow color detection** (B2). The current logic can assign the wrong color for beams with mixed color channels. Use dominant channel comparison or pass beam type explicitly.

4. **Monitor files approaching 400 lines** (M1). `hud.ts` at 389 lines needs attention before any additions. Extract `updatePlayerStatus` or CSS-generating functions as needed.

### Priority 3 (Low Impact)
5. **Share geometry in beam-glow.ts** (P4) - remove the `.clone()` at line 48.
6. **Share geometry in shield-effects.ts** (D3) - remove the `.clone()` at line 63.
7. **Pass dt parameter to lead indicators** (D1) - eliminate wall-clock dependency.
8. **Dispose entity mesh materials in disposeRenderer** (D2) - for completeness.
9. **Use module-level Color in mesh-factory.ts:128** (M2) - minor allocation cleanup.
