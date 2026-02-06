# AI Systems Review

## Overview

The AI layer spans approximately 4,700 lines across 25 files and implements a finite-state-machine (FSM) architecture for ship combat behavior. The system covers six states (Idle, Pursue, Engage, Evade, Regroup, Reposition), eleven behavior modes for mission-specific targeting, a sophisticated weapon/missile selection pipeline, and a playstyle system that modulates skill expression per-ship-role.

Overall health: **Good**. The architecture is well-decomposed, the state machine is clear, and the playstyle system shows exceptional design maturity. There are a few correctness concerns, some performance opportunities, and a handful of maintainability issues, but no critical bugs that would affect gameplay at scale.

---

## Issues Found

### Bug: Shared `_returnPosition` vector used by both `getStationPosition` and `getEnemyStationPosition`
**File**: `src/systems/ai/ai-utils.ts:14,165,268`
**Severity**: Medium

Both `getStationPosition()` (line 165) and `getEnemyStationPosition()` (line 268) write into the same module-level `_returnPosition` vector. If both functions are called in the same frame, the second call silently overwrites the first result. Currently this is safe because `getEnemyStationPosition` is not called from `aiSystem` (only `getStationPosition` is cached at line 56 of `ai.ts`), but this is a latent bug waiting for the next mission type that needs both positions in the same tick. The comment "Return a copy to avoid mutation issues" is misleading since both functions return the same object.

**Recommendation**: Either give each function its own static vector, or document the mutual exclusion constraint prominently.

### Bug: `convoy-guard-defensive` inner break only exits the for-loop, not the switch case
**File**: `src/systems/ai/ai-idle.ts:155`
**Severity**: Low

At line 155, `break` exits the `for` loop over convoy ships when a threat is found. This is actually correct behavior (it then falls through to the outer `break` at line 180 which exits the switch case). However, the code structure is confusing because the inner `break` at line 155 and the outer `break` at line 180 serve very different purposes. This is not a bug, but the nested break-from-for-inside-switch pattern is a well-known readability trap and could easily become a bug if refactored.

**Recommendation**: Extract the convoy-damage-scan into a helper function returning `Entity | null` for clarity.

### Bug: `updateEvade` receives `_heat` parameter but never uses it for exit condition
**File**: `src/systems/ai/ai-behaviors.ts:76,83`
**Severity**: Low

`updateEvade` accepts a `heat` parameter (named `_heat` indicating it is intentionally unused) but the evade exit condition at line 107 only checks shields, not heat. Meanwhile, `shouldRegroup` (line 50-59) does check heat as a trigger. This means an AI ship can enter Evade due to shield damage, but if it then overheats during the evade maneuver (from afterburner), it will not transition to Regroup from within Evade -- it can only do so from Pursue/Engage (lines 94-131 in ai.ts). This is likely intentional (evading ships are already disengaging) but the asymmetry is worth documenting.

### Performance: `hasIncomingMissiles` does a full entity scan per AI ship per frame
**File**: `src/systems/weapons/weapons-ai.ts:243-248`
**Severity**: Medium

`hasIncomingMissiles` iterates over all missile entities for every AI ship every frame. With N AI ships and M missiles, this is O(N*M) per frame. The function is called from `handleAIDecoys` which is called every frame for every AI ship with secondary weapons. In a battle with 12 AI ships and 20 missiles, that is 240 iterations per frame.

The decoy cooldown check at line 262 mitigates this somewhat (most calls bail out early), but when multiple AI ships have their cooldown expire simultaneously, the missile scan stacks up.

**Recommendation**: Cache a `Set<Entity>` of entities with incoming missiles once per tick, or add a `hasIncomingMissile` flag to the missile target's component.

### Performance: `countEngagingTarget` iterates all AI entities to count engagers
**File**: `src/systems/ai/ai-utils.ts:17-26`
**Severity**: Low

Called during Pursue-to-Engage transition (line 219 in ai.ts) for player targets. This scans all AI entities to count how many are engaging. With the `maxEngagingPlayer` cap of 3, this fires frequently. The cost is O(A) where A is the number of AI entities per transition check.

In practice, this is mitigated by only triggering when transitioning from Pursue and only for player targets. But if entity counts grow, a maintained counter would be cheaper.

### Performance: Four vector `.clone()` calls in idle state follow-behavior
**File**: `src/systems/ai/ai-idle.ts:241,256,267,281`
**Severity**: Low

The idle state's follow-convoy, follow-station, and approach-convoy behaviors each call `.clone()` on position vectors to compute direction. These allocate new Vector3 objects in the hot path. While only triggered when no target is found (relatively rare), the pattern is inconsistent with the rest of the AI codebase which carefully uses `tempVectors` to avoid allocations.

**Recommendation**: Use a module-level reusable direction vector.

### Design: `maxEngagingPlayer` cap of 3 applies globally, not per-player
**File**: `src/data/ai-profiles.ts:354`
**Severity**: Medium (multiplayer context)

`AI_GLOBAL_SETTINGS.maxEngagingPlayer = 3` means at most 3 AI ships can be in the Engage state targeting the player. In multiplayer, this is checked per-target (line 219 of ai.ts uses `countEngagingTarget(world, ai.target)`), so each player can have up to 3 engagers. This seems correct for multiplayer. However, the constant name "maxEngagingPlayer" is misleading since it also applies to AI-controlled wingmen being targeted.

### Design: Kiting ships in Engage state never break off to Pursue
**File**: `src/systems/ai/ai.ts:260`
**Severity**: Low

Line 260: `if (!isKitingShip(ai) && distance > ai.profile.breakOffRange)` means kiting ships never transition from Engage back to Pursue regardless of how far the target gets. The comment says "Kiting ships: NEVER break off to pursue - they wait at range." This is intentional, but it means if a target flies away from a kiting ship beyond breakOffRange, the kiter stays in Engage indefinitely, decelerating to zero (via `maintainDistanceEngage` which calls `setDecelerateInputs`). The kiter effectively becomes a stationary turret.

If the target permanently disengages, the kiter will never Idle and thus never re-target. The kiter depends on the target being destroyed or the target coming back into range to progress. This could cause kiting ships to stall in missions where targets flee (e.g., convoy ships escaping).

**Recommendation**: Consider adding a maximum idle-in-engage timer for kiting ships, or a distance threshold that returns them to Idle for re-targeting.

### Design: Evade wobble uses `Math.sin(ai.stateTimer * 8)` deterministically
**File**: `src/systems/ai/ai-behaviors.ts:145`
**Severity**: Low

The barrel-roll wobble effect uses `Math.sin` with the state timer as input. This is deterministic (good for replays) but produces identical evasion patterns for all ships that enter evade at the same time. Since `stateTimer` resets to 0 on state entry, two ships entering evade on the same frame will roll in perfect sync. This is visually noticeable but not gameplay-breaking.

**Recommendation**: Seed the wobble with the entity ID for visual variety: `Math.sin((ai.stateTimer + entity * 1.7) * 8)`.

### Design: No aggro switching during combat states
**File**: `src/systems/ai/ai.ts:94-131`
**Severity**: Low

Once an AI enters Pursue or Engage, it commits to that target until the target dies, the AI evades, or the target breaks engagement range. There is no mechanism for target priority re-evaluation during combat. For example, if a convoy-hunter is engaging a player wingman and a convoy ship flies right past it, the hunter will not switch targets.

This is a deliberate simplicity tradeoff (target switching mid-combat creates erratic behavior), but it does mean behavior modes like `convoy-hunter` only affect target selection in the Idle state.

### Design: `scoreWeapon` uses weapon name for Ion bonus
**File**: `src/systems/ai/ai-weapon-selection.ts:112`
**Severity**: Low

The shield-targeting bonus is hardcoded as `weapon.name === 'Ion'`. If another shield-disrupting weapon is added, this check would need manual updating. A weapon property like `isShieldEffective` or a damage-type check would be more maintainable.

### Maintenance: `selectOptimalMissile` has an unused `_targetSpeed` parameter
**File**: `src/systems/ai/ai-missile-selection.ts:81`
**Severity**: Low

The `_targetSpeed` parameter is explicitly marked as reserved for future use. This is fine as documentation, but unused parameters add noise. Consider removing it until the feature is implemented to keep the interface clean.

### Maintenance: Re-export chains add indirection
**File**: `src/systems/ai/ai.ts:48`, `src/systems/ai/ai-utils.ts:342-352`, `src/systems/ai/ai-weapon-selection.ts:30-35`
**Severity**: Low

Multiple files re-export symbols "for backwards compatibility." For example, `ai.ts:48` re-exports `findNearestEnemy`, `setAITarget`, `pursueTarget`. And `ai-utils.ts` re-exports from both `ai-ambush-utils` and `ai-convoy-utils`. While this keeps imports stable for consumers, it creates a web of indirection that makes it harder to trace where functions are defined. As the module structure has stabilized, these re-exports may no longer be necessary.

### Maintenance: `ai-utils.ts` at 352 lines is approaching the 400-line limit
**File**: `src/systems/ai/ai-utils.ts`
**Severity**: Low

At 352 lines, this file is the largest in the AI directory and approaching the project's 400-line limit. It contains target-finding functions, station utilities, and re-exports. The station-related functions (`findStation`, `getStationPosition`, `findNearestThreatToStation`, `isTargetingStation`, `findEnemyStation`, `getEnemyStationPosition`, `findStationAttacker`) could be extracted into a dedicated `ai-station-utils.ts` to create headroom.

---

## Strengths

### Excellent playstyle system with principled skill scaling
The `ai-playstyles.ts` file is outstanding. The insight that "flee earlier makes pilots lose because they fight less" and the careful handling of skill inversions (brave ace, spray-and-pray rookie) shows deep understanding of AI game design. The five playstyles (brawler, escape, kiting, beam, gunboat) each have well-documented rationales for which parameters are skill-scaled vs. held constant. The calibration comments showing exact aim error values at each skill tier are particularly valuable.

### Clean FSM architecture with clear state boundaries
The state machine in `ai.ts` is well-structured. Input is reset at the top of each frame (lines 78-83), emergency transitions are checked before the state switch (lines 94-131), and each state handler is a pure function in its own file. The separation between the orchestrator (`ai.ts`) and individual state implementations (`ai-behaviors.ts`, `ai-pursuit.ts`, `ai-reposition.ts`, `ai-idle.ts`) is clean.

### Thorough per-frame caching of expensive lookups
The main `aiSystem` function caches `convoyCentroid`, `stationPosition`, and `enemyConvoyCentroid` once per tick (lines 53-59) and passes them to state handlers. This avoids redundant entity scans for every AI ship.

### Allocation-conscious hot path code
The use of `tempVectors` (module-level reusable THREE.js objects) throughout the movement code avoids per-frame garbage collection. The `_centroid` and `_returnCentroid` pattern in convoy/ambush utils follows the same principle. The code comments explicitly call out when allocations are acceptable vs. avoided.

### Sophisticated weapon selection scoring
The `scoreWeapon` function in `ai-weapon-selection.ts` balances multiple factors: range match, heat efficiency, ammo conservation, shield targeting, and weapon category. The linked-fire decision (lines 211-219) correctly checks projectile speed compatibility to avoid split lead points. The `getMinSafeDistance` functions for both primary and secondary weapons prevent self-damage from flak/nukes.

### Mission-specific behavior modes are extensible
The eleven behavior modes in `ai-idle.ts` cover a wide range of mission scenarios. The `findStationAttacker` function (ai-utils.ts:276-338) shows particularly good design with its single-pass defender-count and priority scoring system.

### Comprehensive test coverage
The 11 test files in `scripts/tests/ai/` cover weapon selection, missile locks, aim error, behavior modes, convoy interception, station defense, and speed compatibility. This suggests the AI system is well-validated.

### Well-calibrated AI profiles
The progression from Green through Elite in `ai-profiles.ts` shows careful tuning. The profiles are meaningfully differentiated: a rookie fires at 45-degree angles and panics at 31% shields, while an ace is selective at 14 degrees and stays calm until 12% shields. The numeric ranges feel playtested.

---

## Recommendations

1. **Extract station utilities from `ai-utils.ts`** (Maintenance) -- Move the seven station-related functions into `ai-station-utils.ts`. This brings `ai-utils.ts` well under the 400-line limit and creates a focused module for station AI behavior.

2. **Fix the shared `_returnPosition` vector** (Bug) -- Give `getStationPosition` and `getEnemyStationPosition` their own static vectors, or consolidate into a single function with a faction parameter. This is low-risk but prevents a subtle future bug.

3. **Cache incoming-missile targets once per tick** (Performance) -- Replace the per-entity `hasIncomingMissiles` scan with a per-tick `Set<Entity>` computed once and shared across all AI. This is straightforward and eliminates the O(N*M) cost.

4. **Add a maximum engage-distance for kiting ships** (Design) -- Consider allowing kiting ships to return to Idle if their target exceeds some large threshold (e.g., 2x preferredCombatRange), so they can re-target in missions where targets flee permanently.

5. **Eliminate `.clone()` calls in idle follow behaviors** (Performance) -- Replace the four vector allocations in `ai-idle.ts:241-281` with a reusable direction vector, consistent with the rest of the codebase.

6. **Seed evade wobble per-entity** (Design, cosmetic) -- Add entity ID to the wobble calculation to break visual synchronization when multiple ships evade simultaneously.

7. **Replace hardcoded Ion weapon name check** (Maintenance) -- Add a weapon property for shield effectiveness rather than checking `weapon.name === 'Ion'`.

8. **Clean up re-export chains** (Maintenance, low priority) -- Audit consumers of the backwards-compatibility re-exports and update imports to point directly to source modules where practical.
