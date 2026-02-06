# AI Systems Review

## Overview

The AI layer spans approximately 3,400 lines across 16 files (15 in `src/systems/ai/` plus `src/systems/weapons/weapons-ai.ts`) and implements a finite-state-machine (FSM) architecture for ship combat behavior. The system covers six states (Idle, Pursue, Engage, Evade, Regroup, Reposition), twelve behavior modes for mission-specific targeting, a sophisticated weapon/missile selection pipeline, and a playstyle system that modulates skill expression per-ship-role. Supporting data lives in `src/data/ai-profiles.ts` (357 lines) and `src/data/ai-playstyles.ts` (219 lines).

Overall health: **Good**. The previous review identified 14 issues. Seven have been fully addressed: station utilities were extracted to a dedicated file, shared return vectors were split, idle follow behaviors use a reusable vector, kiting ships now return to Idle at 3x engage range, evade wobble is seeded per-entity, the Ion weapon check uses `weapon.ionize === true`, and the unused `_targetSpeed` parameter was removed. The remaining issues are either documented-by-convention or low-severity design tradeoffs. A few new issues have been identified, mostly minor.

---

## Previous Issues: Verification

### FIXED: Shared `_returnPosition` vector in `ai-utils.ts`
**Previous**: `getStationPosition()` and `getEnemyStationPosition()` shared a single module-level `_returnPosition` vector.
**Current**: Station utilities were extracted to `src/systems/ai/ai-station-utils.ts`. The file declares two separate vectors at lines 15-16: `_stationPosition` and `_enemyStationPosition`. `getStationPosition` writes to `_stationPosition` (line 51) and `getEnemyStationPosition` writes to `_enemyStationPosition` (line 154). The two functions can now safely be called in the same frame.

### FIXED: Station utilities extracted to `ai-station-utils.ts`
**Previous**: `ai-utils.ts` was 352 lines and approaching the 400-line limit, with seven station functions mixed in.
**Current**: `ai-station-utils.ts` exists (225 lines) with all station-related functions: `findStation`, `getStationPosition`, `findNearestThreatToStation`, `isTargetingStation`, `findEnemyStation`, `getEnemyStationPosition`, `findStationAttacker`. The original `ai-utils.ts` is now 149 lines with clean re-exports at lines 141-149. No file in the AI directory exceeds 334 lines.

### FIXED: Vector `.clone()` calls in idle follow behaviors
**Previous**: Four `.clone()` calls in `ai-idle.ts:241-281` allocated new Vector3 objects in the hot path.
**Current**: A module-level `_tempDirection` vector is declared at line 36 of `ai-idle.ts`. All three follow behaviors (defensive convoy at line 244, station-defense at lines 259/270, convoy-interceptor at line 284) reuse `_tempDirection` instead of cloning. Zero allocations in the idle path.

### FIXED: Kiting ships never break off in Engage
**Previous**: Kiting ships stayed in Engage indefinitely if their target flew away, becoming stationary turrets.
**Current**: `ai.ts:267-271` adds a distance check: `if (isKitingShip(ai) && distance > ai.profile.engageRange * 3)` transitions kiting ships to Idle. This allows them to re-target when a target permanently disengages. The 3x multiplier is generous enough to avoid premature disengagement during normal combat.

### FIXED: Evade wobble synchronization
**Previous**: `Math.sin(ai.stateTimer * 8)` produced identical patterns for all ships entering evade on the same frame.
**Current**: `ai-behaviors.ts:146` now reads `Math.sin((ai.stateTimer + entity * 1.7) * 8)`. The entity ID offset breaks visual synchronization while remaining deterministic for replay.

### FIXED: Ion weapon name hardcoded in `scoreWeapon`
**Previous**: Shield bonus checked `weapon.name === 'Ion'`.
**Current**: `ai-weapon-selection.ts:112` now checks `weapon.ionize === true`, and `ai-weapon-helpers.ts:68` uses `w?.ionize === true`. Both use the data-driven property rather than a hardcoded name.

### FIXED: Unused `_targetSpeed` parameter in `selectOptimalMissile`
**Previous**: `selectOptimalMissile` had an unused `_targetSpeed` parameter.
**Current**: `ai-missile-selection.ts:78-82` shows the function signature is `selectOptimalMissile(weapons, distance, isLocked)` -- the parameter has been removed.

### FIXED: `hasIncomingMissiles` O(N*M) scan
**Previous**: Every AI ship scanned all missiles every frame to check for incoming threats.
**Current**: `weapons-ai.ts:42-53` implements `buildMissileTargetSet()` which builds a `Set<Entity>` once per tick. It is called from `weapons.ts:35` at the start of the weapon system. `hasIncomingMissiles` at line 251 is now a simple `_missileTargetSet.has(entity)` -- O(1) per AI ship.

### DOCUMENTED: `convoy-guard-defensive` nested break
**Previous**: Inner `break` exits for-loop, outer `break` exits switch case -- a readability trap.
**Current**: Still present at `ai-idle.ts:179-184`. Now documented with a comment at line 179: "Break exits the for-loop (not the switch); outer break at line 184 exits switch case". The structure has not been refactored into a helper function, but the comment mitigates the readability concern.

### DOCUMENTED: `updateEvade` unused `_heat` parameter
**Previous**: The `_heat` parameter was unused, and the evade-to-regroup transition asymmetry was undocumented.
**Current**: `ai-behaviors.ts:82-83` now has a comment: "Evade uses shield-based exit, not heat. Heat triggers Regroup from Pursue/Engage instead." The parameter name `_heat` with the leading underscore follows the project convention for intentionally unused parameters. The design rationale is clear.

---

## New Issues Found

### Bug: `findStation` has no faction check despite doc claiming "Player faction"
**File**: `src/systems/ai/ai-station-utils.ts:23-37`
**Severity**: Low

The JSDoc at line 23 states "Stations are Player faction structures with structureType 'station'", but the implementation at lines 25-37 does not check the faction component. It returns the first living entity with `structure.structureType === 'station'` regardless of faction. By contrast, `findEnemyStation` (lines 121-140) explicitly filters for `Faction.Enemy`.

In current usage this is safe: `findStation` is called by `station-hunter` enemies (in station-defense missions where only a Player station exists) and by `getStationPosition` (cached once per tick in `ai.ts:56`). Attack-station missions use `findEnemyStation` instead. However, the misleading comment could cause a bug if `findStation` is reused in a mission type where both Player and Enemy stations coexist.

**Recommendation**: Either add a `Faction.Player` check to match the documentation, or update the comment to say "returns the first living station regardless of faction."

### Performance: `findStationAttacker` allocates Map and Array per call
**File**: `src/systems/ai/ai-station-utils.ts:174-175`
**Severity**: Low

`findStationAttacker` creates `new Map<Entity, number>()` and `new Array<...>()` on every invocation (lines 174-175). This function is called from `ai-idle.ts:214` for every `station-defender` AI ship in the Idle state. In attack-station missions with multiple enemy defenders, this creates per-frame allocations for each defender seeking a target.

The impact is mitigated by the fact that ships transition out of Idle quickly (typically within one frame), so the allocation rate is low during sustained combat. However, it is inconsistent with the otherwise allocation-conscious patterns in the AI codebase.

**Recommendation**: Hoist the `Map` and `candidates` array to module scope and `.clear()` / `.length = 0` at the start of each call.

### Performance: `countEngagingTarget` iterates all AI entities
**File**: `src/systems/ai/ai-utils.ts:13-22`
**Severity**: Low

Called during the Pursue-to-Engage transition (`ai.ts:219`) for player targets. Scans all AI entities to count how many are in the Engage state targeting a specific entity. The cost is O(A) where A is the total number of AI entities.

In practice, this is mitigated by only triggering when transitioning from Pursue and only for player targets. With typical battle sizes of 8-16 AI ships, the overhead is negligible. If entity counts scale significantly, a maintained counter would be cheaper.

### Design: `maxEngagingPlayer` name is misleading
**File**: `src/data/ai-profiles.ts:354`
**Severity**: Low

`AI_GLOBAL_SETTINGS.maxEngagingPlayer = 3` caps how many AI ships can simultaneously be in the Engage state targeting any single entity. Despite the name, this applies to any target (including AI wingmen), not just the player. The name is misleading but the behavior is correct -- in multiplayer, each player gets up to 3 engagers (checked per-target at `ai.ts:219`).

**Recommendation**: Rename to `maxEngagingTarget` for clarity.

### Design: No aggro switching during combat states
**File**: `src/systems/ai/ai.ts:94-131`
**Severity**: Low

Once an AI enters Pursue or Engage, it commits to that target until the target dies, the AI evades, or the target breaks engagement range. There is no mechanism for target priority re-evaluation during combat. For example, a `convoy-hunter` engaging a player wingman will not switch to a convoy ship that flies past.

This is a deliberate simplicity tradeoff. Target switching mid-combat creates erratic, unfun behavior. The design accepts that behavior modes only affect target selection in the Idle state. Defensive and station-defense modes handle this via disengage-distance checks that force ships back to Idle when they stray too far from their objective (lines 96-115 in `ai.ts`).

### Design: Dumbfire missile aim error result requires `.clone()`
**File**: `src/systems/weapons/weapons-ai.ts:217`
**Severity**: Low

When firing dumbfire missiles with aim error, the code calls `applyAimError(tempAimDir, aimError).clone()`. The `.clone()` is necessary because `applyAimError` returns a module-level `tempResult` vector (in `aim-error.ts:176`) that would be overwritten by subsequent calls. While correct, this allocates a new `Vector3` in the hot path. The allocation only occurs when an AI with aim error fires a dumbfire missile, which is infrequent enough to be negligible.

### Maintenance: Re-export chains add indirection
**File**: `src/systems/ai/ai.ts:48`, `src/systems/ai/ai-utils.ts:128-149`, `src/systems/ai/ai-weapon-selection.ts:30-35`
**Severity**: Low

Multiple files re-export symbols "for backwards compatibility." Examples:
- `ai.ts:48` re-exports `findNearestEnemy`, `setAITarget`, `pursueTarget`
- `ai-utils.ts:128-149` re-exports from `ai-ambush-utils`, `ai-convoy-utils`, and `ai-station-utils`
- `ai-weapon-selection.ts:30-35` re-exports from `ai-weapon-categories`

While this keeps imports stable for consumers, it creates a web of indirection. The module structure has stabilized after the station-utils extraction, so these re-exports may no longer be necessary.

### Maintenance: `ai.ts` at 334 lines is the largest AI file
**File**: `src/systems/ai/ai.ts`
**Severity**: Low

At 334 lines, `ai.ts` is the largest file in the AI directory. It is well under the 400-line limit and the structure is clean (one main loop + two state handlers). No action needed, but adding a new state would push it toward the limit. The `updatePursue` and `updateEngage` functions (lines 176-334) are the candidates for extraction if the file grows.

---

## Strengths

### Excellent playstyle system with principled skill scaling
The `ai-playstyles.ts` file is outstanding. The insight that "flee earlier makes pilots lose because they fight less" and the careful handling of skill inversions (brave ace, spray-and-pray rookie) shows deep understanding of AI game design. The five playstyles (brawler, escape, kiting, beam, gunboat) each have well-documented rationales for which parameters are skill-scaled vs. held constant. The calibration comments showing exact aim error values at each skill tier are particularly valuable.

### Clean FSM architecture with clear state boundaries
The state machine in `ai.ts` is well-structured. Input is reset at the top of each frame (lines 78-83), emergency transitions are checked before the state switch (lines 94-131), and each state handler is a pure function in its own file. The separation between the orchestrator (`ai.ts`) and individual state implementations (`ai-behaviors.ts`, `ai-pursuit.ts`, `ai-reposition.ts`, `ai-idle.ts`) is clean.

### Thorough per-frame caching of expensive lookups
The main `aiSystem` function caches `convoyCentroid`, `stationPosition`, and `enemyConvoyCentroid` once per tick (lines 53-59 of `ai.ts`) and passes them to state handlers. This avoids redundant entity scans for every AI ship. The `buildMissileTargetSet` pre-computation in `weapons-ai.ts:45-53` follows the same pattern for missile threat detection.

### Allocation-conscious hot path code
The use of `tempVectors` (module-level reusable THREE.js objects) throughout the movement code avoids per-frame garbage collection. The `_centroid`/`_returnCentroid` pattern in convoy/ambush utils, the `_stationPosition`/`_enemyStationPosition` split in station utils, and the `_tempDirection` vector in idle behavior all follow the same discipline. The codebase is consistent in this regard.

### Sophisticated weapon selection scoring
The `scoreWeapon` function in `ai-weapon-selection.ts:67-130` balances multiple factors: range match, heat efficiency, ammo conservation, shield targeting (via `ionize` property), and weapon category. The linked-fire decision (lines 211-219) correctly checks projectile speed compatibility to avoid split lead points. The `getMinSafeDistance` functions for both primary (`ai-weapon-selection.ts:51-61`) and secondary (`ai-missile-selection.ts:35-40`) weapons prevent self-damage from flak/nukes.

### Well-decomposed module structure
The extraction of utilities into focused modules is mature:
- `ai-station-utils.ts` (225 lines) -- all station-related AI helpers
- `ai-convoy-utils.ts` (138 lines) -- convoy escort utilities
- `ai-ambush-utils.ts` (147 lines) -- ambush mission interceptor utilities
- `ai-dps-utils.ts` (71 lines) -- DPS calculation for station assault role assignment
- `ai-weapon-helpers.ts` (127 lines) -- low-level weapon utility functions
- `ai-weapon-categories.ts` (91 lines) -- range classification

No file exceeds 357 lines (including data files). The module boundaries are logical and minimize coupling.

### Mission-specific behavior modes are extensible
The twelve behavior modes in `ai-idle.ts` cover all five mission types. The `findStationAttacker` function in `ai-station-utils.ts:162-225` shows particularly good design: a single-pass algorithm that simultaneously counts defender allocations and identifies enemy candidates, then scores by priority. The `convoy-guard-defensive` mode (lines 144-185 of `ai-idle.ts`) uses damage tracking for reactive-only engagement, creating distinct escort personalities.

### Well-calibrated AI profiles
The progression from Green through Elite in `ai-profiles.ts` shows careful tuning. The profiles are meaningfully differentiated: a rookie fires at 45-degree angles and panics at 31% shields, while an ace is selective at 14 degrees and stays calm until 12% shields. The six tiers (green, rookie, regular, veteran, ace, elite) plus a player placeholder provide good granularity for campaign difficulty scaling.

---

## Recommendations

1. **Fix `findStation` faction check or comment** (Bug, low risk) -- Either add a `Faction.Player` check to `ai-station-utils.ts:25-37` to match the JSDoc, or update the comment to reflect that it returns any faction's station. This prevents a subtle bug if the function is reused in mixed-station scenarios.

2. **Hoist `findStationAttacker` allocations** (Performance, low priority) -- Move the `Map` and `candidates` array in `ai-station-utils.ts:174-175` to module scope and clear them per call. Follows the existing allocation-avoidance discipline.

3. **Rename `maxEngagingPlayer` to `maxEngagingTarget`** (Maintenance, cosmetic) -- The constant in `ai-profiles.ts:354` applies to any target, not just the player. Renaming clarifies the semantics.

4. **Clean up re-export chains** (Maintenance, low priority) -- Audit consumers of the backwards-compatibility re-exports in `ai.ts:48`, `ai-utils.ts:128-149`, and `ai-weapon-selection.ts:30-35`. Update imports to point directly to source modules where practical.

5. **Extract `updatePursue`/`updateEngage` if `ai.ts` grows** (Preventive) -- At 334 lines, `ai.ts` has headroom, but the two inline state handlers (lines 176-334) are the natural extraction candidates if a seventh AI state is added.
