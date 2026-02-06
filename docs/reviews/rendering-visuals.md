# Rendering & Visual Systems - Code Review

**Last updated:** February 2026
**Scope:** `src/rendering/` and all subdirectories
**Files reviewed:** ~55 files across 7 subdirectories

## Overview

The rendering system is built on Three.js and covers 3D scene management, visual effects (projectiles, beams, explosions, shields), a 2D canvas HUD overlay (radar, reticles, weapon display), and a procedural skybox. The architecture is consistent: each subsystem follows a create/update/reset/dispose lifecycle, entity state is synced from the ECS, and Hermite interpolation smooths rendering between fixed-timestep physics ticks.

Overall code quality is high. The remaining issues are a small set of allocation patterns in infrequently-called code paths, a few unnecessary geometry clones, and minor design inconsistencies.

---

## Issues

### 1. `lightning-bolt.ts` allocates vectors in pulse functions
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

### 2. `beam-glow.ts` clones geometry for each new glow
**Severity:** Low
**Category:** Performance

`src/rendering/effects/beam-glow.ts:48` calls `glowGeometry.clone()` each time a new beam glow visual is created:
```ts
const mesh = new THREE.Mesh(glowGeometry.clone(), material);
```
Since the geometry is a simple `SphereGeometry` and each mesh has its own transform/scale, the geometry could be shared directly. Glow visuals are hidden (not disposed) when inactive (line 133-136), so there is no per-frame churn here, but the initial clone is unnecessary.

---

### 3. `nuclear-lance-impact.ts` clones shared geometries per shot
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

### 4. `shield-effects.ts` geometry cloning
**Severity:** Low
**Category:** Performance

`shield-effects.ts:63` calls `renderer.geometry.clone()` for each shield hit flash. There is a shared `renderer.geometry` but each hit clones it. The geometry is simple enough that the clone is small, but the pattern is inconsistent with the rest of the codebase. Each clone is properly disposed when the hit expires (line 127), so there is no leak.

---

### 5. Module-level mutable timing state in `lead-indicators.ts`
**Severity:** Low
**Category:** Design

`src/rendering/reticle/lead-indicators.ts:44-45` uses module-level `lastFrameTime` and `cachedDt` to compute frame delta time via `performance.now()`. This wall-clock dependency means:
1. The smoothing rate depends on real wall-clock time, not game time. During slow-motion or fast-forward scenarios, smoothing would behave differently.
2. The module state is shared globally and would cause issues if used from multiple rendering contexts.

The `getDeltaTime()` function at line 50 is called from `drawLinkModeLeadIndicators` (line 173) and `drawMissileLeadIndicator` (line 300).

**Recommendation:** Pass `dt` as a parameter from the caller rather than computing it from wall-clock time. The render loop already has access to frame timing.

---

### 6. Inconsistent disposal patterns in `disposeRenderer`
**Severity:** Low
**Category:** Design

`src/rendering/renderer.ts:360-378` disposes beam lines and the WebGL renderer, but does not dispose entity mesh materials. The `entityMeshes` map is simply cleared at line 377 without disposing materials. This is only called on full cleanup (game exit), so the browser will reclaim resources anyway, but it is inconsistent with the disposal discipline shown in `syncScene` at lines 280-281.

---

### 7. `new THREE.Color()` allocation on missile mesh creation
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
- `target-camera.ts` - Cached scene lights and reusable intensity array
- `missile-warning.ts` - Module-level `_activeThreat` result object and per-tick missile cache

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

1. **Share geometry in beam-glow.ts** (Issue 2) - remove the `.clone()` at line 48.
2. **Share geometry in shield-effects.ts** (Issue 4) - remove the `.clone()` at line 63.
3. **Pass dt parameter to lead indicators** (Issue 5) - eliminate wall-clock dependency.
4. **Dispose entity mesh materials in disposeRenderer** (Issue 6) - for completeness.
5. **Use module-level Color in mesh-factory.ts:128** (Issue 7) - minor allocation cleanup.
