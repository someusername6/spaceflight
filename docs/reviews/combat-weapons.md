# Combat & Weapon Systems Review

## Overview

The combat and weapon systems form the core gameplay loop of Spaceflight. The layer spans approximately 8,800 lines across 40+ files, covering:

- **Data definitions**: Weapon stats (`weapons.ts`), missile stats (`missiles.ts`), ship chassis (`ships.ts`), AI profiles (`ai-profiles.ts`, `ai-playstyles.ts`), combat constants (`combat.ts`)
- **Entity factories**: Ship creation (`ship.ts`, `ship-builder.ts`, `ship-archetypes.ts`), station, convoy, waypoint factories
- **Weapon systems**: Projectile firing, beam weapons (continuous, instant, pulse), missile tracking, shrapnel, decoys
- **Combat systems**: Damage pipeline, shields, heat, collision detection/response, targeting, aim error, explosions
- **AI weapon logic**: Weapon selection scoring, missile selection, firing angle checks

**Overall health**: Good. The codebase shows strong architectural discipline -- files are kept under 400 lines through thoughtful extraction, the ECS pattern is followed consistently, and performance-sensitive code uses object pooling and reusable vectors. The data-driven weapon system with a single source of truth is well-designed and extensible.

That said, there are several issues worth addressing, ranging from a genuine bug to performance concerns in hot paths and some game design observations.

---

## Issues Found

### Bug: `findBeamHit` allocates a new result object despite having a reusable one

**File**: `src/systems/weapons/beam-raycasting.ts:107-111`
**Severity**: Low

The function declares `closestHitResult` as a reusable object (line 45) to "avoid per-frame allocations," but the return statement on lines 107-111 creates a brand-new object literal every call:

```typescript
return {
  hit: closestHitResult.hit,
  entity: closestHitResult.entity,
  distance: closestHitResult.distance,
};
```

This defeats the purpose of the reusable object. The function is called once per beam weapon per frame, so the allocation rate is modest. However, the code comment explicitly says it's trying to avoid allocations, so this is a correctness issue relative to intent. The fix would be to return `closestHitResult` directly (callers only read the result before the next call).

### Bug: `dt` recovery from damage ratio in `applyBeamDamageAndEffects` is fragile

**File**: `src/systems/weapons/beam-helpers.ts:251`
**Severity**: Medium

The heat injection and beam hit stat tracking both "recover" the frame `dt` from `damage / weapon.damage`:

```typescript
const dt = damage / weapon.damage; // Recover dt from damage ratio
injectExternalHeat(targetHeat, weapon.heatInjection * dt);
```

And again at line 285:
```typescript
recordBeamHit(world, owner, weapon.name, damage / weapon.damage); // Recover dt
```

This works for continuous beams (where `damage = baseDamage * dt` or `damage = falloffDamage * dt`), but is incorrect for pulse beams and instant beams where `damage` is not `weapon.damage * dt`. For pulse beams, `damage` equals the per-pulse damage (possibly with falloff), so `damage / weapon.damage` gives a falloff ratio, not `dt`. The code at line 282 gates pulse beams to a separate stat path (`recordShotHit`), but the heat injection at line 246 does NOT have this guard -- meaning if a pulse beam weapon were given `heatInjection`, it would inject the wrong amount of heat. Currently no pulse beam has `heatInjection`, so this is a latent bug that would surface if a heat-injecting pulse beam is ever added. The fix: pass `dt` as an explicit parameter to `applyBeamDamageAndEffects` rather than recovering it.

### Performance: `findAllBeamHits` allocates per call (Nuclear Lance)

**File**: `src/systems/weapons/beam-raycasting.ts:131`
**Severity**: Low

Unlike `findBeamHit` which attempts to reuse objects, `findAllBeamHits` allocates a fresh `hits` array and fresh `{ entity, distance }` objects every call. Additionally, `beam-instant.ts:213` allocates a `new THREE.Vector3()` per hit target:

```typescript
const hitPoint = new THREE.Vector3()
  .copy(rayDirection)
  .multiplyScalar(hit.distance)
  .add(rayOrigin);
```

Nuclear Lance fires infrequently (edge-triggered, limited ammo), so the real-world impact is negligible. However, this breaks the otherwise consistent allocation discipline in the beam system. If similar instant-fire weapons are added, pooling should be considered.

### Performance: Per-frame `toRemove` array allocations in hot-path systems

**File**: `src/systems/weapons/projectiles.ts:45`, `src/systems/weapons/missiles.ts:44`, `src/systems/decoys.ts:25`
**Severity**: Low

Each of these systems allocates a `const toRemove: Entity[] = []` array every frame. With many projectiles in flight (flak shrapnel can spawn 10-80 pieces per detonation), the projectile system processes many entities per frame. While the array itself is small, the pattern is inconsistent with the careful pooling discipline shown elsewhere. A module-level array that gets `.length = 0` each frame would be more consistent.

### Performance: `hasIncomingMissiles` scans all missiles every frame for every AI ship

**File**: `src/systems/weapons/weapons-ai.ts:243-249`
**Severity**: Medium

Every AI ship with secondary weapons calls `hasIncomingMissiles` every frame during `handleAIDecoys`. This function iterates over ALL missile entities to check if any target the current entity:

```typescript
function hasIncomingMissiles(world: World, entity: Entity): boolean {
  for (const missileEntity of queryEntities(world, ['missile'])) {
    const missile = getComponent(world, missileEntity, 'missile');
    if (missile?.target === entity) return true;
  }
  return false;
}
```

With N AI ships and M missiles, this is O(N * M) per frame. In a typical battle with 8 AI ships and 20 missiles, that is 160 query-and-check operations every frame. The decoy cooldown provides some mitigation (the early-return at line 262 skips the check during cooldown), but when multiple AI ships have their cooldown expire simultaneously, all of them scan the full missile list. A reverse lookup (Map from target entity to missile count, updated when missiles spawn/die/retarget) would reduce this to O(1) per AI ship.

### Performance: Beam system queries all entities including friendlies

**File**: `src/systems/weapons/beam-raycasting.ts:73-105`
**Severity**: Low

`findBeamHit` iterates over ALL entities with `['transform', 'collision', 'health']` -- including friendlies. Since beams can damage friendlies (friendly fire is enabled), this is technically correct. However, the function does not check factions at all. This means beams hit friendly ships, which is consistent with projectile behavior but worth noting as a design choice. The performance cost is that beam raycasting checks against convoy ships, structures, and other non-combatants unnecessarily when they share the beam owner's faction.

### Design: Recovering `dt` for beam stats is duplicated and error-prone

**File**: `src/systems/weapons/beam-helpers.ts:251,285`
**Severity**: Medium

The pattern of recovering `dt` from `damage / weapon.damage` appears twice and relies on knowledge of how the caller computed `damage`. This is a coupling issue -- if any caller changes how damage is computed (e.g., adding armor reduction), both recovery sites silently break. The `BeamDamageParams` interface should include `dt` as an explicit field.

### Design: Autoaim code is duplicated across three locations

**File**: `src/systems/weapons/beam-continuous.ts:57-74`, `src/systems/weapons/beam-instant.ts:153-171`, `src/systems/weapons/weapon-spawning.ts:364-373`
**Severity**: Low

The autoaim cone-check logic (calculate direction to target, check angle, snap if within FOV) is implemented three times with slight variations:

1. Continuous beams use `rayDirection.angleTo(targetDirection)` (Three.js built-in)
2. Instant beams use the same `angleTo` approach
3. Projectile spawning uses manual `Math.acos(dot)` and degree conversion

All three work correctly but differ in style. Extracting a shared `applyAutoaimCorrection(direction, targetPos, origin, fovDegrees)` helper would reduce duplication and ensure consistent behavior.

### Design: `DECOY_CONSTANTS` in `missiles.ts` duplicates values from component

**File**: `src/data/missiles.ts:206-211`
**Severity**: Low

`DECOY_CONSTANTS` defines `speed: 50`, `seduceChance: 0.5`, `seduceRange: 200`, but the actual runtime values come from `src/components/decoy.ts` (`DECOY_SPEED`, `DECOY_SEDUCE_CHANCE`, `DECOY_SEDUCE_RANGE`). The data file constants are not imported or used by the game systems. If someone changes `DECOY_CONSTANTS` expecting gameplay impact, nothing would change. These should either be the single source consumed by the component, or be removed to avoid confusion.

### Design: Gyrojet damage at point-blank is very low (33 damage from 200 base)

**File**: `src/data/weapons.ts:186-197`
**Severity**: Low (game balance)

The Gyrojet has `initialSpeed: 200`, `projectileSpeed: 1200` (max), `damage: 200`, and `speedDamageScale: true`. At point-blank range, projectile speed is 200/1200 = 16.7% of max, giving only 33 damage -- less than a single Plasma shot (16 damage at 8 shots/sec). The weapon description says "lower damage up close, full damage at range," which is intentional. However, with `fireRate: 0.25` (4 shots/sec), the point-blank DPS is only 133 vs Plasma's 128. For a finite-ammo ballistic weapon, this creates a narrow viability window where the weapon only excels at medium-long range after acceleration. This may be intentional for niche kiting builds but could feel underwhelming to players who pick it up expecting a heavy hitter.

### Design: Nuclear Lance has only 1 ammo and auto-cycles on empty

**File**: `src/systems/weapons/beam-instant.ts:113-118`
**Severity**: Low (game design observation)

When the Nuclear Lance fires and depletes its 1 ammo, it calls `cycleNextLinkMode(weapons)`, which switches the player's primary weapon group. This is a reasonable quality-of-life feature but could surprise players if the auto-cycle switches to an unexpected weapon group mid-combat. The auto-cycle is specific to instant beams and not documented in the weapon data.

### Design: `checkForEnemiesInRange` has asymmetric faction checking

**File**: `src/systems/weapons/missile-aoe.ts:213-219`
**Severity**: Low

The function checks `if (missileFaction && entityFaction)` before calling `areEnemies`, but unlike `findClosestEnemyDistance` (which skips entities with no faction), this function proceeds to the distance check if EITHER faction is missing (lines 215-219). This means factionless entities could trigger a nuke to detonate. In practice, all combat entities have factions, so this is unlikely to cause issues, but the asymmetry is inconsistent.

### Maintenance: `missiles.ts` is at 396 lines, approaching the 400-line limit

**File**: `src/systems/weapons/missiles.ts`
**Severity**: Medium

At 396 lines, this file is 4 lines from the project's 400-line hard limit. The missile system handles tracking, AoE proximity detonation, shrapnel detonation, expiration, nuke expiration logic, collision with direct damage, collision with AoE, collision with shrapnel, and stats tracking. The next feature addition (e.g., a new missile type or detonation mode) will require splitting this file. The shrapnel detonation logic (lines 167-222) and the direct collision logic (lines 269-389) are natural extraction points.

### Maintenance: `weapon-spawning.ts` is at 392 lines

**File**: `src/systems/weapons/weapon-spawning.ts`
**Severity**: Low

At 392 lines, also approaching the limit. The file handles projectile spawning, aim error application, autoaim correction, bank offset calculation, hardpoint position lookup, muzzle flash queuing, and stats tracking. The `ProjectileWeaponInfo` interface and `buildProjectileOptions` function could be extracted to a shared types/helpers file.

### Maintenance: `ship-archetypes.ts` defines both player and assault variants in one file

**File**: `src/factories/ship-archetypes.ts`
**Severity**: Low

At 324 lines with 20+ archetypes, this file mixes standard player archetypes, variant archetypes (sniper, lancer), and assault archetypes (station-attack loadouts). As new archetypes are added, this will approach the limit. The assault archetypes (lines 244-323) are a natural extraction candidate.

---

## Strengths

### Excellent data-driven design
The `PRIMARY_WEAPONS`, `MISSILES`, and `SHIP_CLASSES` dictionaries serve as single sources of truth with clear interfaces. The `WeaponStats` interface at `src/data/weapons.ts:12-91` is thoroughly documented with JSDoc comments explaining every field. The factory validation system (`archetype-validation.ts`) catches invalid loadouts at ship creation time, preventing silent failures.

### Consistent ECS discipline
Every system follows the `(world: World, dt: number) => void` signature. Components are pure data interfaces. The weapon system correctly separates concerns: `weapons.ts` orchestrates, `weapon-firing.ts` handles link modes, `weapon-spawning.ts` creates entities, and `beam-continuous.ts`/`beam-instant.ts` handle the two beam paradigms.

### Thoughtful allocation patterns
Module-level reusable vectors are used consistently throughout all weapon systems (over 30 instances). The object pooling pattern in `beam-helpers.ts` and `collision.ts` shows awareness of GC pressure. The `fireableWeaponsCollector` array in `weapon-firing.ts:31` is reused across frames.

### Well-engineered AI playstyle system
The `ai-playstyles.ts` system is impressive. Rather than just scaling difficulty linearly, it recognizes that different ship roles express skill differently. The analysis of "brave ace inversion" (where the ace's willingness to stay in combat longer actually hurts in beam duels) shows deep understanding of emergent behavior. The solution of using constant defensive thresholds per playstyle while varying aim error is elegant.

### Robust missile tracking and seduction
The missile system handles edge cases well: decoy seduction uses a per-(missile, decoy) resistance set to prevent re-rolling (`missile.resistedDecoys`), closest-approach detonation uses frame-to-frame distance comparison, and the owner safe-distance check prevents self-hits. The 100m safe distance is well-calibrated for torpedo turn radius.

### Clean damage pipeline
The `dealDamage` function at `src/systems/damage.ts:161-194` provides a single entry point for all weapon damage. Shield-first absorption with proper multiplier handling (shield damage converts back to base units for hull pass-through) is mathematically correct. Victory protection prevents frustrating post-win deaths.

### Swept collision detection
The collision system at `src/systems/collision-check.ts` uses ray-based swept collision for fast projectiles (railgun at 2000 m/s, nuke lance) to prevent tunneling. The threshold check (`distanceTraveled > combinedRadius`) correctly determines when swept detection is needed.

### Comprehensive stats tracking
The combat stats system tracks per-weapon, per-ship statistics including shots fired/hit, beam time on target, shrapnel hits, missile seduction, and damage attribution -- all without polluting the core combat logic. The separation into `stats.ts` and `stats-weapons.ts` keeps recording concerns isolated.

---

## Recommendations

### Priority 1: Fix the `dt` recovery pattern
Extract `dt` as an explicit parameter in `BeamDamageParams` rather than recovering it from `damage / weapon.damage`. This eliminates a class of subtle bugs and makes the code self-documenting. The change is localized to `beam-helpers.ts`, `beam-continuous.ts`, and `beam-instant.ts`.

### Priority 2: Split `missiles.ts` before it hits 400 lines
Extract shrapnel detonation logic (lines 167-222) into `missile-shrapnel-detonation.ts` and/or extract the direct collision handling (lines 269-389) into `missile-collision.ts`. This creates headroom for the next missile feature.

### Priority 3: Add a missile-target reverse index
Replace `hasIncomingMissiles` linear scan with a `Map<Entity, number>` maintained by the missile system. Increment when a missile targets an entity, decrement when the missile is destroyed/retargets. This eliminates the O(N*M) decoy check.

### Priority 4: Extract shared autoaim helper
Create `applyAutoaimCorrection(direction: Vector3, targetPos: Vector3, origin: Vector3, fovDegrees: number): Vector3` to deduplicate the three implementations.

### Priority 5: Return reusable object from `findBeamHit`
Change the return statement to return `closestHitResult` directly, matching the stated intent of the reusable object pattern.

### Priority 6: Remove or wire up `DECOY_CONSTANTS`
Either make `DECOY_CONSTANTS` the source consumed by `src/components/decoy.ts`, or remove it from `missiles.ts` to prevent confusion.

### Priority 7: Move `toRemove` arrays to module scope
For `projectiles.ts`, `missiles.ts`, and `decoys.ts`, use module-level arrays cleared with `.length = 0` each frame instead of per-frame allocations.
