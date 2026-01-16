# Rendering System Review

**Date:** 2026-01-16
**Reviewer:** Claude Code
**Files Reviewed:** 45 files in `/Users/telmo/project/spaceflight/src/rendering/`

---

## Executive Summary

The rendering system is **well-architected** with proper separation of concerns, good use of object pooling, and correct PRNG handling for replay determinism. The codebase demonstrates professional Three.js practices with consistent patterns across effect renderers.

**Overall Assessment: GOOD**

**Strengths:**
- Comprehensive object pooling for transient effects (explosions, muzzle flashes, projectile hits)
- Proper separation of simulation PRNG vs render PRNG
- Consistent dispose patterns preventing memory leaks
- Efficient geometry sharing with lazy initialization
- Interpolation for smooth rendering between physics ticks

**Areas for Improvement:**
- Lightning renderer recreates all line geometries every frame (performance concern)
- Some geometry cloning could be avoided with material-only changes
- Missile exhaust clones geometry per-missile instead of pooling

---

## Detailed Findings

### 1. Three.js Usage

**Rating: GOOD**

The codebase uses Three.js efficiently with several best practices:

**Positives:**
- **Reusable vectors at module scope** - Avoids per-frame allocations
  - `renderer.ts:46-50` - Module-level reusable `Vector3` and `Quaternion` objects
  - `beam-lines.ts:144-146` - Reusable `seenBeams` Set and interpolation vectors
  - `reticles.ts:49-57` - Pool-based target info objects

- **Proper material configuration** - Additive blending, depth write disabled for effects
  - `explosion-visual.ts:31-38` - Correct additive blending setup
  - `trails.ts:128-134` - Proper transparent material configuration

- **Hermite interpolation for smooth motion**
  - `renderer.ts:61-83` - Sophisticated position interpolation preserves visual velocity continuity

- **Efficient scene traversal** - Uses ECS queries rather than scene graph traversal for updates

**Minor Issues:**
- `torch.ts:170` - Creates `new THREE.Vector3(0, 0, 1)` inside update loop. Should use module-level reusable vector.
  ```typescript
  // Current (line 170):
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  // Should be:
  const forwardVec = new THREE.Vector3(0, 0, 1); // at module level
  ```

### 2. Object Pooling

**Rating: EXCELLENT**

Object pooling is implemented comprehensively for all transient visual effects:

| Renderer | Pooling | Reference |
|----------|---------|-----------|
| Explosions | Yes - separate pools for standard/nuke | `explosions.ts:31-33`, `55-95` |
| Projectile Bolts | Yes - full pool with reinitialize | `trails.ts:47-51`, `69-90` |
| Muzzle Flashes | Yes - pool with hide/reinitialize | `muzzle-flash.ts:66-67`, `106-133` |
| Projectile Hits | Yes - pool with particle reuse | `projectile-hits.ts:63-64`, `101-171` |
| Beam Glows | Yes - hide/show pattern | `beam-glow.ts:127-132`, `136-141` |

**Notable Implementation:**
- `explosion-visual.ts:307-308` - Regenerates particle velocities in-place avoiding Float32Array allocation
- `projectile-hits.ts:161-165` - Reuses particle velocity arrays through `fillParticleVelocities`

**Missing Pooling:**
- **Lightning renderer** (`lightning.ts:262-276`) - Disposes and recreates all Line2 objects every frame. This is the primary performance concern in the rendering system.
  ```typescript
  // Current pattern (line 262-275):
  for (const line of renderer.mainLines) {
    scene.remove(line.glow);
    scene.remove(line.core);
    disposeRenderedLine(line);  // Disposes geometry and material every frame!
  }
  renderer.mainLines = [];
  ```

- **Missile exhaust** (`missile-exhaust.ts:78`) - Clones cone geometry per-missile instead of sharing
  ```typescript
  const cone = new THREE.Mesh(renderer.coneGeometry.clone(), material);
  ```

### 3. Draw Calls & Batching

**Rating: GOOD**

The system makes reasonable batching decisions:

**Efficient Patterns:**
- **Shared geometries** - Ship geometries cached in `shipGeometries` Map (`mesh-factory.ts:12`, `22-56`)
- **Dust particles** - Single Points object with dynamic setDrawRange (`dust.ts:110`, `190`)
- **Explosion particles** - Single Points object per explosion with BufferAttribute updates

**Not Batched (Acceptable):**
- Individual meshes per ship/missile - Necessary for per-entity transforms
- Individual beam lines - Required for per-beam colors and fade states
- Projectile bolts - Each is a separate mesh (could theoretically be instanced but count is manageable)

**Potential Optimization:**
- Projectile bolts could use THREE.InstancedMesh for high projectile counts, but current approach is adequate for typical gameplay scenarios.

### 4. Memory Management

**Rating: GOOD**

**Proper Dispose Patterns:**

All renderers implement full dispose functions:

| Renderer | Dispose Function | Disposes Shared Geo | Disposes Materials |
|----------|------------------|--------------------|--------------------|
| Explosions | `disposeExplosionRenderer` | Yes (line 210-211) | Yes (line 192-206) |
| Bolts | `disposeBoltRenderer` | Yes (line 300-302) | Yes (line 264, 288-296) |
| Exhaust | `disposeExhaustRenderer` | Yes (line 194) | Yes (line 192) |
| Shield Effects | `disposeShieldEffectRenderer` | Yes (line 165) | Yes (line 162) |
| Muzzle Flash | `disposeMuzzleFlashRenderer` | Yes (line 334-335) | Yes (line 318-329) |
| Lightning | `disposeLightningRenderer` | Delegates to reset | Yes (via reset) |
| Nuclear Lance | `disposeNuclearLanceRenderer` | Yes (line 184-185) | Yes (via reset) |
| Torch | `disposeTorchRenderer` | N/A (per-mesh) | Yes (line 243-244) |
| Projectile Hits | `disposeProjectileHitRenderer` | Yes (line 396) | Yes (line 376-394) |
| Target Camera | `disposeTargetCamera` | N/A | N/A (render target: line 223) |
| Skybox | N/A (texture returned) | Yes (line 174-176) | Yes (line 173) |

**Cleanup on Entity Removal:**

All renderers properly clean up when entities are destroyed:
- `renderer.ts:270-277` - Removes meshes and clears interpolated position/rotation caches
- `explosions.ts:163-168` - Returns visuals to pool
- `trails.ts:211-217` - Returns bolts to pool

**Reset Functions for Replay Seeking:**

All renderers implement reset functions for replay seeking without full disposal:
- `resetExplosionRenderer` - Returns visuals to pool, clears tracking
- `resetBoltRenderer` - Returns bolts to pool
- `resetMuzzleFlashRenderer` - Returns flashes to pool, hides beam glows
- `resetLightningRenderer` - Disposes lines, clears bolt map
- etc.

**Potential Memory Leak (Minor):**
- `lightning-bolt.ts:70` - `tempVec.clone()` inside loop allocates new Vector3. This occurs during bolt generation (event-driven, not per-frame) so impact is minimal.

### 5. Visual Effects Performance

**Rating: GOOD (with one concern)**

**Efficient Effects:**

| Effect | Implementation | Performance Notes |
|--------|---------------|-------------------|
| Dust | Single Points, shader-based distance fade | Excellent - `dust.ts:41-73` custom shader |
| Explosions | Pooled spheres + points | Good - particle positions updated in-place |
| Projectile Trails | Pooled bolts, shared geometries | Good |
| Beam Lines | Line2 for cross-platform width | Good - proper fade handling |
| Shield Hits | Short-lived pooled spheres | Good |
| Muzzle Flashes | Pooled spheres | Good |
| Projectile Hits | Pooled flash + particles | Good |

**Concern: Lightning Renderer**

`lightning.ts:256-325` - The `renderBolts` function:
1. Removes all existing lines from scene
2. Disposes all geometries and materials
3. Recreates everything from scratch

This happens every frame when lightning is active. While lightning bolts are short-lived, this is wasteful. Recommendation: Pool Line2 objects similar to other renderers.

**Particle Counts (Reasonable):**
- Explosion: 24 particles standard, 64 for nuke (`explosion-visual.ts:11-12`)
- Projectile hits: 12 particles (`projectile-hits.ts:24`)
- Nuclear lance impact: 48 particles (`nuclear-lance-types.ts:29`)

### 6. Camera System

**Rating: GOOD**

**Main Camera:**
- `renderer.ts:91-96` - Standard perspective setup (60 FOV, 0.1-10000 near/far)
- `renderer.ts:291-315` - `followEntity` uses interpolated positions to prevent camera-mesh desync
- Camera inherits ship orientation for accurate aiming

**Target Camera (Picture-in-Picture):**
- `target-camera.ts:40-83` - Separate camera with render-to-texture
- `target-camera.ts:129-162` - Clever light management: disables scene lights, adds directional light for target visibility
- Proper cleanup of render target (`target-camera.ts:222-228`)

**Dust Layer Exclusion:**
- `dust.ts:19` - `DUST_LAYER = 1`
- `renderer.ts:97` - Main camera enables dust layer
- Target camera does not enable dust layer (no dust in PIP view)

### 7. PRNG Handling

**Rating: EXCELLENT**

The rendering system correctly uses `world.renderPrng` for visual-only randomness, preventing simulation PRNG contamination:

| File | Line | Usage |
|------|------|-------|
| `missile-exhaust.ts` | 88 | Flicker phase initialization |
| `lightning.ts` | 185, 194, 203 | Bolt path generation |

**Deterministic Effects:**
- `explosion-visual.ts:69` - Uses `createPRNG(entitySeed * 31337)` for particle velocities
- `nuclear-lance.ts:81` - Seeds particle velocities from entity + fire time
- `projectile-hits.ts:86-98` - Uses seeded PRNG for particle directions

This addresses the historical bug documented in `CLAUDE.md` about rendering PRNG contamination causing replay desync.

---

## Performance Concerns

### High Priority

1. **Lightning Renderer Recreation** (`lightning.ts:262-275`)
   - Every frame creates new LineGeometry, LineMaterial, and Line2 objects
   - Should pool Line2 objects like other effect renderers
   - Impact: GPU resource churn during lightning weapon usage

### Medium Priority

2. **Missile Exhaust Geometry Cloning** (`missile-exhaust.ts:78`)
   - Each missile clones the cone geometry
   - Should share geometry and only vary material/transform
   - Impact: More geometries than necessary

3. **Vector Allocation in Lightning Bolt Generation** (`lightning-bolt.ts:70, 75, 126, 133, etc.`)
   - Multiple `.clone()` calls during bolt generation
   - Event-driven so not per-frame, but could be optimized
   - Impact: Minor GC pressure during bolt creation

### Low Priority

4. **Torch Renderer Vector Creation** (`torch.ts:170`)
   - Creates `new THREE.Vector3(0, 0, 1)` in update loop
   - Should use module-level constant
   - Impact: Minimal (one allocation per active torch per frame)

---

## Memory Management Issues

### Confirmed Good

- All shared geometries properly disposed
- All materials properly disposed
- Render target disposed in target camera
- Pooled objects hidden rather than removed/re-added to scene
- Reset functions clear state without disposing shared resources

### No Major Issues Found

The codebase shows consistent, defensive memory management patterns. Each renderer has:
1. A `create*Renderer` function that initializes shared resources
2. An `update*Renderer` function that manages per-frame state
3. A `reset*Renderer` function for replay seeking
4. A `dispose*Renderer` function for full cleanup

---

## Recommendations

### Immediate (Before Next Major Feature)

1. **Pool Lightning Line2 Objects**
   - Modify `lightning.ts` to maintain a pool of RenderedLine objects
   - Reuse and update rather than dispose/recreate
   - Estimated impact: Significant GPU resource savings during lightning usage

### Future Improvement

2. **Share Missile Exhaust Geometry**
   - Remove `.clone()` from `missile-exhaust.ts:78`
   - Each exhaust only needs its own material instance

3. **Optimize Lightning Bolt Vector Allocation**
   - Refactor `lightning-bolt.ts` to reuse vectors
   - Use a local pool of Vector3 objects

4. **Consider Instanced Rendering for Projectiles**
   - If projectile counts become very high, switch to InstancedMesh
   - Current approach is fine for typical gameplay

---

## Test Coverage Recommendations

The rendering system would benefit from:

1. **Memory leak regression tests**
   - Create/destroy many entities, verify GPU memory stable

2. **Performance benchmarks**
   - Measure frame time with various effect counts
   - Catch regressions in pooling effectiveness

3. **PRNG contamination tests**
   - Verify rendering code only uses `renderPrng`
   - Replay determinism depends on this

---

## Conclusion

The rendering system is well-designed with proper Three.js patterns, comprehensive object pooling, and correct PRNG handling for replay determinism. The primary concern is the lightning renderer's per-frame object recreation, which should be addressed before any features that increase lightning usage frequency.

The codebase demonstrates mature engineering practices with consistent patterns, proper cleanup, and thoughtful performance considerations. Memory management is thorough with no evidence of leaks.
