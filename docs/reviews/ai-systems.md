# AI Systems Review

## Overview

The AI layer spans approximately 3,400 lines across 16 files (15 in `src/systems/ai/` plus `src/systems/weapons/weapons-ai.ts`) and implements a finite-state-machine (FSM) architecture for ship combat behavior. The system covers six states (Idle, Pursue, Engage, Evade, Regroup, Reposition), twelve behavior modes for mission-specific targeting, a sophisticated weapon/missile selection pipeline, and a playstyle system that modulates skill expression per-ship-role. Supporting data lives in `src/data/ai-profiles.ts` and `src/data/ai-playstyles.ts`.

Overall health: **Good**. The remaining issues are low-severity design observations and minor allocation patterns.

---

## Issues

### 1. `countEngagingTarget` iterates all AI entities
**File**: `src/systems/ai/ai-utils.ts:13-22`
**Severity**: Low

Called during the Pursue-to-Engage transition (`ai.ts`) for player targets. Scans all AI entities to count how many are in the Engage state targeting a specific entity. The cost is O(A) where A is the total number of AI entities.

In practice, this is mitigated by only triggering when transitioning from Pursue and only for player targets. With typical battle sizes of 8-16 AI ships, the overhead is negligible. If entity counts scale significantly, a maintained counter would be cheaper.

---

### 2. No aggro switching during combat states
**File**: `src/systems/ai/ai.ts`
**Severity**: Low (Design)

Once an AI enters Pursue or Engage, it commits to that target until the target dies, the AI evades, or the target breaks engagement range. There is no mechanism for target priority re-evaluation during combat. For example, a `convoy-hunter` engaging a player wingman will not switch to a convoy ship that flies past.

This is a deliberate simplicity tradeoff. Target switching mid-combat creates erratic, unfun behavior. The design accepts that behavior modes only affect target selection in the Idle state. Defensive and station-defense modes handle this via disengage-distance checks that force ships back to Idle when they stray too far from their objective.

---

### 3. Dumbfire missile aim error result requires `.clone()`
**File**: `src/systems/weapons/weapons-ai.ts:217`
**Severity**: Low

When firing dumbfire missiles with aim error, the code calls `applyAimError(tempAimDir, aimError).clone()`. The `.clone()` is necessary because `applyAimError` returns a module-level `tempResult` vector (in `aim-error.ts:176`) that would be overwritten by subsequent calls. While correct, this allocates a new `Vector3` in the hot path. The allocation only occurs when an AI with aim error fires a dumbfire missile, which is infrequent enough to be negligible.

---

## Strengths

### Excellent playstyle system with principled skill scaling
The `ai-playstyles.ts` file is outstanding. The insight that "flee earlier makes pilots lose because they fight less" and the careful handling of skill inversions (brave ace, spray-and-pray rookie) shows deep understanding of AI game design. The five playstyles (brawler, escape, kiting, beam, gunboat) each have well-documented rationales for which parameters are skill-scaled vs. held constant. The calibration comments showing exact aim error values at each skill tier are particularly valuable.

### Clean FSM architecture with clear state boundaries
The state machine in `ai.ts` is well-structured. Input is reset at the top of each frame, emergency transitions are checked before the state switch, and each state handler is a pure function in its own file. The separation between the orchestrator (`ai.ts`) and individual state implementations (`ai-behaviors.ts`, `ai-pursuit.ts`, `ai-reposition.ts`, `ai-idle.ts`) is clean.

### Thorough per-frame caching of expensive lookups
The main `aiSystem` function caches `convoyCentroid`, `stationPosition`, and `enemyConvoyCentroid` once per tick and passes them to state handlers. This avoids redundant entity scans for every AI ship. The `buildMissileTargetSet` pre-computation in `weapons-ai.ts` follows the same pattern for missile threat detection.

### Allocation-conscious hot path code
The use of `tempVectors` (module-level reusable THREE.js objects) throughout the movement code avoids per-frame garbage collection. The `_centroid`/`_returnCentroid` pattern in convoy/ambush utils, the `_stationPosition`/`_enemyStationPosition` split in station utils, and the `_tempDirection` vector in idle behavior all follow the same discipline. The `findStationAttacker` function reuses module-level Map and Array collections. The codebase is consistent in this regard.

### Sophisticated weapon selection scoring
The `scoreWeapon` function in `ai-weapon-selection.ts` balances multiple factors: range match, heat efficiency, ammo conservation, shield targeting (via `ionize` property), and weapon category. The linked-fire decision correctly checks projectile speed compatibility to avoid split lead points. The `getMinSafeDistance` functions for both primary and secondary weapons prevent self-damage from flak/nukes.

### Well-decomposed module structure
The extraction of utilities into focused modules is mature:
- `ai-station-utils.ts` -- all station-related AI helpers
- `ai-convoy-utils.ts` -- convoy escort utilities
- `ai-ambush-utils.ts` -- ambush mission interceptor utilities
- `ai-dps-utils.ts` -- DPS calculation for station assault role assignment
- `ai-weapon-helpers.ts` -- low-level weapon utility functions
- `ai-weapon-categories.ts` -- range classification

Module boundaries are logical and minimize coupling. Imports point directly to source modules without re-export indirection.

### Mission-specific behavior modes are extensible
The twelve behavior modes in `ai-idle.ts` cover all five mission types. The `findStationAttacker` function in `ai-station-utils.ts` shows particularly good design: a single-pass algorithm that simultaneously counts defender allocations and identifies enemy candidates, then scores by priority. The `convoy-guard-defensive` mode uses damage tracking for reactive-only engagement, creating distinct escort personalities.

### Well-calibrated AI profiles
The progression from Green through Elite in `ai-profiles.ts` shows careful tuning. The profiles are meaningfully differentiated: a rookie fires at 45-degree angles and panics at 31% shields, while an ace is selective at 14 degrees and stays calm until 12% shields. The six tiers (green, rookie, regular, veteran, ace, elite) plus a player placeholder provide good granularity for campaign difficulty scaling.

---

## Recommendations

1. **Consider maintained counter for `countEngagingTarget`** (Performance, low priority) -- If battle sizes ever scale beyond 16 ships, replace the O(A) scan with an incrementally maintained counter. At current scale, the overhead is negligible.

2. **Extract `updatePursue`/`updateEngage` if `ai.ts` grows** (Preventive) -- The two inline state handlers in `ai.ts` are the natural extraction candidates if a seventh AI state is added.
