# Rendering & Visual Systems - Code Review

**Last updated:** February 2026
**Scope:** `src/rendering/` and all subdirectories
**Files reviewed:** ~55 files across 7 subdirectories

## Overview

The rendering system is built on Three.js and covers 3D scene management, visual effects (projectiles, beams, explosions, shields), a 2D canvas HUD overlay (radar, reticles, weapon display), and a procedural skybox. The architecture is consistent: each subsystem follows a create/update/reset/dispose lifecycle, entity state is synced from the ECS, and Hermite interpolation smooths rendering between fixed-timestep physics ticks.

Overall code quality is high. The remaining issues are a small set of allocation patterns in infrequently-called code paths and a minor design inconsistency.

---

## Issues

### 1. `lightning-bolt.ts` allocates vectors in generation functions
**Severity:** Low
**Category:** Performance

Several functions in `lightning-bolt.ts` allocate temporary `Vector3` objects inside generation functions:
- Line 70: `tempVec.clone().cross(perpendicular).normalize()` - inside inner subdivision loop
- Line 75: `midpoint.clone()` - inside inner subdivision loop
- Line 126: `toEnd.clone().normalize()` - in `generateBranches`
- Line 132-135: `branchStart.clone()` - branch endpoint calculation
- Lines 167-168, 180-181: Multiple `.clone()` calls in `generateOffTargetEnd`

These are called per lightning effect creation (a few times per second), not every frame. In battles with many lightning weapons active simultaneously, this could become measurable, but practical impact is low.

---

### 2. Geometry cloning in nuclear lance and explosion effects
**Severity:** Low
**Category:** Performance

Several effect files clone shared geometries per effect instance:

- `src/rendering/beam-effects/nuclear-lance-impact.ts:44, :59` - clones `sphereGeometry` and `ringGeometry`
- `src/rendering/beam-effects/nuclear-lance-origin.ts:32` - clones `sphereGeometry`
- `src/rendering/effects/explosion-visual.ts:98, :138, :153` - clones `sphereGeometry` and `nukeRingGeometry`

These are all cloned per effect instance (not per frame), and the effects are relatively infrequent (nuclear lance fires rarely, explosions happen at ship death). The geometries are properly disposed when effects complete. Since each mesh has its own `scale` and `position`, the underlying geometry could be shared.

**Recommendation:** Low priority. The current pattern works correctly and effects are infrequent. If nuclear lance or explosions ever become more common (e.g., cluster weapons), consider sharing geometry.

---

### 3. Module-level mutable timing state in `lead-indicators.ts`
**Severity:** Low
**Category:** Design

`src/rendering/reticle/lead-indicators.ts:37-41` uses module-level mutable state for smoothed lead indicator positions. The smoothing uses frame-rate-independent exponential smoothing, which is correct. The module state is shared globally and would cause issues if used from multiple rendering contexts.

**Recommendation:** Pass `dt` as a parameter from the caller rather than computing it from wall-clock time. The render loop already has access to frame timing.

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
- `mesh-factory.ts:14` - Reusable `_scratchColor` for missile mesh creation

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
- **Dispose** (full cleanup): Disposes all GPU resources including shared geometries, entity mesh materials, and the WebGL renderer. Canvas is removed from DOM.

### Consistent geometry sharing
Beam glow and shield effect renderers share geometry directly without cloning, demonstrating the correct pattern for effects that use per-mesh transforms.

---

## Recommendations

1. **Share geometry in nuclear lance and explosion effects** (Issue 2) - remove the `.clone()` calls where meshes use independent transforms.
2. **Pass dt parameter to lead indicators** (Issue 3) - eliminate wall-clock dependency.
