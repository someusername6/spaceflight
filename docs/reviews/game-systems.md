# Game Systems Review

**Date:** 2026-01-16
**Reviewer:** Claude Code
**Scope:** Core game systems in `src/systems/`

## Executive Summary

The game systems are well-architected and follow sound ECS principles. The codebase demonstrates strong adherence to project guidelines, including deterministic design (seeded PRNG, no `Math.random()` or `Date.now()`), memory-efficient patterns (object pooling, reusable vectors), and clear separation of concerns.

**Key Strengths:**
- Fully deterministic simulation supporting replay functionality
- Clean system composition with explicit execution order
- Comprehensive stat tracking for balance analysis
- Defensive programming (null checks, entity existence validation)

**Areas of Concern:**
- O(n^2) collision detection (appropriate for current scale but may need optimization)
- Some edge cases in missile/decoy interactions
- Minor potential floating-point precision issues in physics

**Overall Assessment:** Production-quality code suitable for ship. The architecture supports future expansion while maintaining replay determinism.

---

## 1. Combat System (Weapons, Beams, Projectiles)

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/weapons/weapons.ts` (284 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/weapon-firing.ts` (144 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/weapon-spawning.ts` (394 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/beams.ts` (235 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/beam-raycasting.ts` (184 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/projectiles.ts` (310 lines)

### Assessment: GOOD

**Correctness:**
- Weapon firing uses "all-or-nothing" heat check for linked weapons (prevents partial firing) - `weapon-firing.ts:50-91`
- Lock-on system properly validates target existence and range - `weapons.ts:185-275`
- Beam hit detection uses ray-sphere intersection with proper closest-hit logic - `beam-raycasting.ts:24-45`
- Projectile movement is frame-rate independent using `dt` - `projectiles.ts:137-140`

**Edge Cases Handled:**
- Dead entities cannot fire - `weapons.ts:46-47`, `weapons.ts:106-107`
- Empty ammo weapons are skipped - `weapon-firing.ts:73`
- Lock resets when target changes or weapon changes - `weapons.ts:247-268`
- Projectiles skip collision with owner - `projectiles.ts:211`

**Potential Issues:**

1. **[LOW] Autoaim direction vector aliasing** - `weapon-spawning.ts:366-374`
   ```typescript
   direction = toIntercept; // toIntercept is a reusable vector
   ```
   If the caller stores this reference, it may be overwritten. The code path appears safe as `createProjectileEntity` copies the direction, but this is fragile.

2. **[INFO] Beam weapons have no ammo system** - By design, beams only consume heat. This is intentional but worth noting for balance.

**Performance:**
- Reusable vectors avoid per-frame allocations - `weapon-firing.ts:26`, `projectiles.ts:46-47`
- Beam raycasting iterates all entities with health - O(n) per beam, acceptable for current entity counts

**Determinism:** VERIFIED - No `Math.random()` or `Date.now()` found.

---

## 2. AI System

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/ai/ai.ts` (258 lines)
- `/Users/telmo/project/spaceflight/src/systems/ai/ai-behaviors.ts` (217 lines)
- `/Users/telmo/project/spaceflight/src/systems/ai/ai-movement.ts` (271 lines)
- `/Users/telmo/project/spaceflight/src/systems/ai/ai-pursuit.ts` (173 lines)
- `/Users/telmo/project/spaceflight/src/systems/ai/ai-utils.ts` (158 lines)
- `/Users/telmo/project/spaceflight/src/systems/ai/ai-weapon-selection.ts` (228 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/weapons-ai.ts` (287 lines)

### Assessment: VERY GOOD

**Correctness:**
- State machine with proper transitions - `ai.ts:82-101`
- Emergency transitions (Evade, Regroup) can interrupt combat states - `ai.ts:71-79`
- Wingmen prioritize threats to player - `ai-utils.ts:49-104`
- AI resets inputs each frame preventing stale input bugs - `ai.ts:56-62`

**State Machine Design:**
- States: Idle -> Pursue -> Engage -> (Evade/Regroup/Reposition) -> back to Pursue/Idle
- Kiting ships have special behavior: never close distance, flee when enemies approach - `ai-movement.ts:120-122`
- Max engaging player limit prevents ganking - `ai.ts:177-180`

**Weapon Selection:**
- Smart weapon selection based on range, heat, ammo, target shields - `ai-weapon-selection.ts:67-130`
- Minimum safe distance for shrapnel weapons - `ai-weapon-selection.ts:51-61`
- Beam-only ships skip lead calculation (hitscan) - `ai-pursuit.ts:71`

**Potential Issues:**

1. **[LOW] Angular velocity threshold hardcoded** - `ai-pursuit.ts:82-83`
   ```typescript
   const highAngularVelocity = aimError && aimError.currentAngularVelocity > 0.15;
   ```
   This threshold (0.15 rad/s) might benefit from being in the AI profile for tuning.

2. **[INFO] Kiting ships can get stuck** - If a kiting ship's target is destroyed while fleeing, it transitions to Idle which then finds a new target. This is correct behavior.

**Performance:**
- Target finding iterates all entities - O(n), acceptable
- AI system updates all AI ships - O(n * m) where m is number of targets, but both are small

**Determinism:** VERIFIED - Uses `world.prng` for aim error drift.

---

## 3. Movement System (Physics)

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/physics.ts` (292 lines)

### Assessment: GOOD

**Correctness:**
- Fixed timestep integration using `dt` - `physics.ts:38-278`
- Angular velocity with smooth acceleration/deceleration - `physics.ts:122-142`
- Afterburner with heat lockout hysteresis (prevents oscillation) - `physics.ts:163-176`
- Dead entities coast with current velocity - `physics.ts:54-59`
- Match speed mode calculates closing rate - `physics.ts:211-257`

**Physics Model:**
- Rotation: Input -> Target angular velocity -> Smooth acceleration -> Euler integration
- Translation: Forward vector * currentSpeed -> Position update
- Ships cannot strafe; velocity is always in forward direction

**Potential Issues:**

1. **[LOW] Euler rotation order** - `physics.ts:150`
   ```typescript
   tempEuler.set(pitchDelta, yawDelta, rollDelta, 'YXZ');
   ```
   This is correct for flight sims (yaw-then-pitch avoids gimbal lock in typical use), but rapid combined rotations could theoretically cause issues.

2. **[LOW] Match speed first-frame spike prevention** - `physics.ts:233-235`
   ```typescript
   if (player.prevTargetDistance === 0) {
     player.prevTargetDistance = currentDistance;
   }
   ```
   Good handling, but if `currentDistance` happens to be exactly 0 (target at same position), this could cause division issues. Extremely unlikely in practice.

3. **[INFO] No collision response** - Ships pass through each other, only taking damage. This is a design choice but may feel unnatural.

**Performance:**
- Single pass through physics entities - O(n)
- Reusable vectors and quaternions - minimal allocation

**Determinism:** VERIFIED - Pure math operations, no randomness.

---

## 4. Targeting System

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/targeting.ts` (249 lines)

### Assessment: GOOD

**Correctness:**
- Targets sorted by distance - `targeting.ts:185`
- Only ships and decoys can be targeted (not missiles/projectiles) - `targeting.ts:157-159`
- Dead entities filtered out - `targeting.ts:162-163`
- Auto-select nearest when target lost - `targeting.ts:101-104`
- Edge-triggered input (key press, not hold) - `targeting.ts:118-126`

**Design:**
- Target list updated every frame
- Decoys appear as valid targets (by design - countermeasure effectiveness)
- Target cycling wraps around - `targeting.ts:216-220`

**Potential Issues:**

1. **[INFO] Sorting every frame** - `targeting.ts:185`
   ```typescript
   targetCollector.sort(compareByDistance);
   ```
   For typical entity counts (< 50), this is fine. For larger battles, a spatial data structure could help.

**Performance:**
- Uses object pooling for target info - `targeting.ts:33-47`
- Module-level comparator avoids callback allocation - `targeting.ts:50-55`

**Determinism:** VERIFIED - No randomness, just distance calculations.

---

## 5. Health/Shields System (Damage Application)

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/damage.ts` (178 lines)
- `/Users/telmo/project/spaceflight/src/systems/shields.ts` (20 lines)
- `/Users/telmo/project/spaceflight/src/components/health.ts` (42 lines)
- `/Users/telmo/project/spaceflight/src/components/shields.ts` (95 lines)
- `/Users/telmo/project/spaceflight/src/systems/cleanup.ts` (105 lines)

### Assessment: VERY GOOD

**Correctness:**
- Damage flow: Shields first, then hull - `damage.ts:97-153`
- Victory protection: Allied ships immune after victory - `damage.ts:34-40`, `damage.ts:165-167`
- Shield damage multiplier (Ion weapons) applied correctly - `damage.ts:114-128`
- Hull damage multiplier (Torch weapons) applied correctly - `damage.ts:145-149`
- Shield regeneration delay with ionization doubling - `shields.ts:76-94`
- Ship death delay allows explosion to engulf before removal - `cleanup.ts:33-35`

**Design:**
- Collision damage only from enemies - `damage.ts:78`
- Missiles and decoys skip collision damage (handled separately) - `damage.ts:52-53`
- Shield hit position tracked for visual effects - `damage.ts:131-142`

**Potential Issues:**

1. **[MEDIUM] Shield damage multiplier math** - `damage.ts:124-128`
   ```typescript
   if (remaining > 0) {
     remaining = remaining / shieldDamageMultiplier;
   }
   ```
   This conversion is correct but subtle. When Ion (2x shield damage) hits shields, the "remaining" damage is in multiplied units. Dividing converts back to base damage for hull. Consider adding a comment explaining this.

2. **[INFO] Fractional damage accumulation** - The `applyDamage` function returns `actualDamage` which may be fractional. This is fine for balance but UI should round for display.

**Performance:**
- Simple queries and component access - O(n)
- Death handling creates explosion entities (expected allocation)

**Determinism:** VERIFIED - Pure damage calculations.

---

## 6. Missiles System

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/weapons/missiles.ts` (382 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/missile-helpers.ts` (146 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/missile-aoe.ts` (304 lines)
- `/Users/telmo/project/spaceflight/src/systems/weapons/missile-spawning.ts` (exists, not fully reviewed)
- `/Users/telmo/project/spaceflight/src/systems/decoys.ts` (77 lines)

### Assessment: GOOD

**Correctness:**
- Decoy seduction with chance roll (only once per missile-decoy pair) - `missiles.ts:59-89`
- Tracking with turn rate - `missile-helpers.ts:64-98`
- Closest-approach detonation for AoE - `missiles.ts:119-177`, `missile-helpers.ts:134-145`
- Owner collision safe distance - `missiles.ts:40`, `missiles.ts:290-299`
- Nuke destroys projectiles in blast radius - `missiles.ts:161-168`
- Expired nukes still explode if enemies in range - `missiles.ts:247-280`

**Missile Types Supported:**
- Dumbfire (no tracking)
- Homing (turn rate > 0)
- AoE (proximity detonation)
- Shrapnel/Flak (spawns shrapnel on detonation)
- Nuke (AoE + projectile destruction)

**Potential Issues:**

1. **[MEDIUM] Decoy resistance tracking memory** - `missiles.ts:87`
   ```typescript
   missile.resistedDecoys.add(nearestDecoy);
   ```
   This Set grows unbounded during missile lifetime. For long-range missiles with many decoys deployed, this could grow. In practice, missiles have limited range so this is bounded.

2. **[LOW] Closest-approach detonation on first frame** - `missile-helpers.ts:141-142`
   ```typescript
   const wasWithinRadius = previousDistance !== undefined && previousDistance < radius;
   ```
   Missiles need 2 frames to arm (previousDistance must be set). This is correct but means extremely close spawns won't detonate immediately.

3. **[INFO] Decoys can be targeted by player** - This is intentional (decoys appear as enemies to targeting system) but may confuse players.

**Performance:**
- Decoy search iterates all decoy entities - O(missiles * decoys)
- AoE damage iterates all health entities - O(n) per AoE
- Entity removal uses queued deletion (correct)

**Determinism:** VERIFIED - Uses `world.prng` for decoy seduction chance.

---

## 7. Collision System

### Files Reviewed
- `/Users/telmo/project/spaceflight/src/systems/collision.ts` (129 lines)

### Assessment: GOOD

**Correctness:**
- Sphere-sphere collision detection - `collision.ts:95-98`
- Collisions are symmetric (both entities record) - `collision.ts:100-101`
- Collision list cleared each frame - `collision.ts:63`

**Design:**
- O(n^2) pair checking - appropriate for small entity counts
- Comment acknowledges scaling concern at 100+ entities - `collision.ts:85-89`

**Potential Issues:**

1. **[LOW] Distance calculation precision** - `collision.ts:95`
   ```typescript
   const dist = a.transform.position.distanceTo(b.transform.position);
   ```
   For very large positions, floating-point precision could cause issues. Game likely doesn't have positions large enough to matter.

2. **[INFO] No spatial partitioning** - As noted in comments, this is appropriate for current scale. If battles grow to 100+ entities, consider spatial hash or octree.

**Performance:**
- Uses object pooling for collidable info - `collision.ts:28-48`
- O(n^2) but n is typically 20-40 entities

**Determinism:** VERIFIED - Pure distance calculations.

---

## 8. Supporting Systems

### Aim Error System (`aim-error.ts`)
- **Assessment:** GOOD
- Updates AI aim drift using seeded PRNG
- Angular velocity affects aim difficulty - `aim-error.ts:40-64`
- Beam tracking with smooth interpolation - `components/aim-error.ts:198-228`

### Heat System (`heat.ts`)
- **Assessment:** GOOD
- Simple cooldown system, 20 lines
- Heat lockout hysteresis in physics system prevents oscillation

### Explosion System (`explosions.ts`)
- **Assessment:** GOOD
- Follows source entity during death delay - `explosions.ts:33-45`
- Age-based removal

---

## Determinism Verification

**Grep Results:**
- `Math.random` in `src/systems/`: **0 occurrences**
- `Date.now` in `src/systems/`: **0 occurrences**

All randomness uses `world.prng` (seeded mulberry32 PRNG from `src/core/prng.ts`).

---

## System Execution Order

From `/Users/telmo/project/spaceflight/src/game.ts:68-85`:

```
1. input          - Player input
2. targeting      - Target selection
3. ai             - AI decisions
4. aimError       - Update aim drift
5. weapons        - Handle firing
6. physics        - Movement/rotation
7. beams          - Beam damage (after rotation)
8. projectiles    - Projectile movement
9. missiles       - Missile tracking
10. decoys        - Decoy movement
11. collision     - Detect collisions
12. damage        - Apply damage
13. shields       - Regeneration
14. heat          - Cooldown
15. cleanup       - Remove dead entities
16. explosions    - Update explosions
17. mission       - Win/lose check
```

**Order Analysis:**
- Physics before beams ensures beam direction reflects current frame rotation
- Collision after all movement ensures accurate detection
- Cleanup before explosions ensures explosion entities are processed
- Mission check last ensures all damage is applied before win/lose

---

## Bugs Found

### Confirmed Bugs

*None found during review.*

### Potential Issues (Severity: LOW to MEDIUM)

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | LOW | `weapon-spawning.ts:366-374` | Autoaim direction vector aliasing (safe in current usage) |
| 2 | LOW | `ai-pursuit.ts:82-83` | Hardcoded angular velocity threshold |
| 3 | LOW | `physics.ts:233-235` | Edge case if target at exact same position |
| 4 | MEDIUM | `damage.ts:124-128` | Shield damage multiplier math is correct but non-obvious |
| 5 | MEDIUM | `missiles.ts:87` | Decoy resistance Set grows unbounded (bounded by missile range in practice) |
| 6 | LOW | `missile-helpers.ts:141-142` | 2-frame arming delay for closest-approach detonation |

---

## Recommendations

### High Priority

1. **Add comment to shield damage multiplier logic** (`damage.ts:124-128`)
   - Explain the unit conversion from multiplied damage to base damage

### Medium Priority

2. **Consider making angular velocity threshold configurable** (`ai-pursuit.ts:82-83`)
   - Move `0.15` threshold to AI profile

3. **Add bounds checking for decoy resistance Set** (`missiles.ts:87`)
   - Not critical but good defensive coding

### Low Priority

4. **Document beam-only AI behavior**
   - Beam ships skip lead calculation intentionally; consider adding comment

5. **Consider spatial partitioning API** (`collision.ts`)
   - Prepare interface for future optimization if needed

---

## Conclusion

The game systems are well-implemented with strong attention to determinism, performance, and edge cases. The codebase follows project guidelines consistently and demonstrates professional-quality engineering. The identified issues are minor and unlikely to cause problems in normal gameplay.

**Recommendation:** Approve for production use. Address medium-priority items during normal maintenance cycles.
