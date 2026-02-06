# Combat & Weapon Systems Review

## Overview

The combat and weapon systems form the core gameplay loop of Spaceflight. The layer spans approximately 5,500 lines across 21 weapon system files plus supporting data, component, and stats files, covering:

- **Data definitions**: Weapon stats (`data/weapons.ts`, 303 lines), missile stats (`data/missiles.ts`, 203 lines)
- **Component layer**: Primary/secondary weapon components (`components/weapons.ts`, 345 lines), missile in-flight component (`components/missile.ts`, 233 lines)
- **Weapon systems** (`systems/weapons/`): Projectile firing, beam weapons (continuous, instant, pulse), missile tracking, shrapnel, decoys, autoaim, hardpoint positions
- **Support systems**: Decoy system (`systems/decoys.ts`, 72 lines), combat stats (`systems/stats.ts`, 295 lines)

**Overall health**: Good. The remaining issues are low-priority allocation patterns and design observations.

---

## Issues

### Performance: `findAllBeamHits` allocates per call

**File**: `src/systems/weapons/beam-raycasting.ts:127-165`
**Severity**: Low

Unlike `findBeamHit` which returns a reusable object, `findAllBeamHits` allocates a fresh `hits` array and fresh `{ entity, distance }` objects every call. Additionally, `beam-instant.ts:208` allocates a `new THREE.Vector3()` per hit target:

```typescript
const hitPoint = new THREE.Vector3()
  .copy(rayDirection)
  .multiplyScalar(hit.distance)
  .add(rayOrigin);
```

Nuclear Lance fires infrequently (edge-triggered, 1 ammo), so real-world impact is negligible. However, this breaks the otherwise consistent allocation discipline. If similar instant-fire weapons are added in the future, pooling should be considered.

### Performance: `destroyProjectilesInRadius` allocates a local array

**File**: `src/systems/weapons/missile-aoe.ts:243`
**Severity**: Low

The `toDestroy` array inside `destroyProjectilesInRadius` is allocated per call. This only fires on nuke detonation (rare), so impact is negligible. Noted for consistency.

### Design: Nuclear Lance auto-cycles link mode on empty

**File**: `src/systems/weapons/beam-instant.ts:114-117`
**Severity**: Low (game design observation)

When the Nuclear Lance depletes its 1 ammo, it calls `cycleNextLinkMode(weapons)` to switch the player's primary weapon group. This quality-of-life feature is not documented in the weapon data and could surprise players if the auto-cycle switches to an unexpected weapon group mid-combat. This behavior is specific to instant beams and not shared with other finite-ammo weapons (e.g., autocannon does not auto-cycle when empty).

### Maintenance: Continuous beams add heat redundantly

**File**: `src/systems/weapons/beams.ts:189-196` and `src/systems/weapons/beam-continuous.ts:113-119`
**Severity**: Low

For continuous (non-pulse) beams, heat is added in `beams.ts:196` via `addHeat(heat, heatToAdd)` with the combined heat of all beams scaled by dt. This is correct. However, pulse beams add their own per-pulse heat in `beam-continuous.ts:115-116`. The split between "continuous beams add heat in the parent" and "pulse beams add heat in the child" makes the heat accounting difficult to follow. The correctness depends on pulse beams never appearing alongside continuous beams in `beamWeaponsCollector`, which is true but implicit.

### Design: Gyrojet damage at point-blank is very low

**File**: `src/data/weapons.ts:181-197`
**Severity**: Low (game balance)

The Gyrojet's `speedDamageScale` means point-blank damage is only 33 (200 * 200/1200) -- less than a single Plasma shot. With `fireRate: 0.25`, point-blank DPS is ~133 vs Plasma's ~128. For a finite-ammo weapon, this creates a narrow viability window. This may be intentional for niche kiting builds.

### Design: Beam system raycasts against all entities including friendlies

**File**: `src/systems/weapons/beam-raycasting.ts:73-105`
**Severity**: Low

`findBeamHit` iterates ALL entities with `['transform', 'collision', 'health']` including friendlies and non-combatants. Since friendly fire is enabled, this is correct. The performance cost is proportional to total entity count rather than enemy count.

---

## Strengths

### Excellent data-driven design
The `PRIMARY_WEAPONS` and `MISSILES` dictionaries at `src/data/weapons.ts` and `src/data/missiles.ts` serve as single sources of truth with clear interfaces. The `WeaponStats` interface is thoroughly documented with JSDoc comments explaining every field. Each stat flows cleanly from data definition through component creation to system consumption.

### Consistent ECS discipline
Every system follows the `(world: World, dt: number) => void` signature. Components are pure data interfaces. The weapon system correctly separates concerns: `weapons.ts` orchestrates, `weapon-firing.ts` handles link modes, `weapon-spawning.ts` creates entities, and `beam-continuous.ts`/`beam-instant.ts` handle the two beam paradigms.

### Strong allocation discipline
Module-level reusable vectors are used consistently throughout all weapon systems (over 30 instances). The `toRemove` arrays, missile target set, and beam weapon pooling all demonstrate careful attention to GC pressure. The `fireableWeaponsCollector` array in `weapon-firing.ts:31` is reused across frames. The `closestHitResult` in `beam-raycasting.ts:45` correctly avoids allocation. The `getWeaponIndicesForCurrentMode` function uses a module-level pool with `.length = 0` reuse.

### Clean shared autoaim module
The `autoaim.ts` module (35 lines) provides a single `applyAutoaimCorrection` function used by all three weapon firing paths. The implementation is minimal and correct, using a module-level reusable vector for the target direction calculation.

### Robust missile tracking and seduction
The missile system handles edge cases well: decoy seduction uses a per-(missile, decoy) resistance set (`missile.resistedDecoys`) to prevent re-rolling, closest-approach detonation uses frame-to-frame distance comparison, and the owner safe-distance check at `missiles.ts:36` (100m) prevents self-hits with slow-turning torpedoes.

### Well-engineered shrapnel extraction
The `missile-shrapnel.ts` module (62 lines) cleanly encapsulates shrapnel detonation logic with proper stats recording. The `shrapnel.ts` spawning module (80 lines) handles entity creation with configurable damage/speed/range. Both files are focused and small.

### Explicit dt in beam damage pipeline
The `BeamDamageParams` interface includes `dt` as an explicit field, making the beam damage pipeline self-documenting. The three beam modes (continuous, pulse, instant) each pass their appropriate dt value.

### Comprehensive stats tracking
The combat stats system tracks per-weapon, per-ship statistics including shots fired/hit, beam time on target, shrapnel hits, missile seduction, and damage attribution -- all without polluting the core combat logic.

### Robust faction guards in missile AOE
The `checkForEnemiesInRange` function uses proper faction guards (`if (!missileFaction || !entityFaction) continue;`), matching the pattern in `findClosestEnemyDistance` for consistent entity filtering.

### Data-driven beam type detection
Beam type checks use data-driven properties (`weapon.isInstantBeam`, `weapon.heatInjection !== undefined`, `weapon.isPulseBeam`) instead of hardcoded weapon name strings, making them robust against weapon renames.

---

## Recommendations

### Priority 1: Pool `findAllBeamHits` return array
Use a module-level array with `.length = 0` reuse to eliminate per-call allocations. Low urgency since Nuclear Lance fires infrequently.
