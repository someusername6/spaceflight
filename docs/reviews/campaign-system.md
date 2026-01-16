# Campaign System Review

**Date:** 2026-01-16
**Reviewer:** Claude Code
**Files Reviewed:** 40+ files in `src/campaign/` and related modules

## Executive Summary

The campaign system is **well-architected** with a clean separation of concerns, proper immutable state management, and comprehensive test coverage. The codebase demonstrates mature patterns including:

- Immutable state updates with spread operators
- Seeded PRNG for determinism
- Checkpoint system for non-ironman defeat recovery
- Multi-slot save system with IndexedDB
- Emergency localStorage backup for browser crashes

**Overall Quality: High**

Key strengths:
- Clean immutable state pattern throughout
- Robust error handling in storage layer
- Good test coverage for storage operations
- Deterministic PRNG usage prevents save scumming

Areas for improvement:
- Some missing validation on state restoration
- Potential race conditions in auto-save system
- Emergency save validation could be more thorough

---

## Detailed Findings

### 1. State Management

**Location:** `src/campaign/state.ts`, `src/campaign/types.ts`

#### Strengths

1. **Immutable updates throughout** (state.ts:209-273)
   - `applyMissionResults()` creates new state objects with spread operator
   - Never mutates existing state references
   - SlotArray abstraction enforces immutability

2. **Comprehensive state structure** (types.ts:149-175)
   - All campaign data in one `CampaignState` interface
   - Settings locked at creation (`CampaignSettings`)
   - Clear separation: ships, pilots, storage, store stock

3. **Deterministic ID generation** (id-generator.ts)
   - Sequential IDs with prefixes (`pilot_1`, `ship_2`)
   - `nextId` counter persisted in state

4. **Seeded PRNG** (state.ts:81)
   - Master seed from `Date.now()` at campaign creation
   - Derived PRNGs for specific subsystems (salvage, recruits)
   - Prevents save scumming by tying randomness to mission count

#### Potential Issues

1. **WaveState mutation in tick callback** (mission-waves.ts:248-276)
   - `waveState.delayRemaining -= dt` mutates state directly
   - Acceptable for ephemeral mission state, but differs from campaign pattern
   - **Severity: Low** - Isolated to mission scope, not persisted

2. **SlotArray storage uses WeakMap** (slot-array.ts:43)
   - Storage is garbage collected when SlotArray object is GC'd
   - Potential issue if same SlotArray reference used after reconstitution
   - **Severity: Low** - Reconstitution creates fresh instances

---

### 2. Storage System

**Location:** `src/campaign/storage/`

#### Strengths

1. **Multi-slot design** (campaign-db.ts)
   - 3 save slots for parallel campaigns
   - Metadata stored separately for fast title screen rendering
   - Active slot tracked in localStorage

2. **Compression support** (campaign-db.ts:114-131)
   - Gzip compression when available
   - Graceful fallback to uncompressed storage
   - Significant space savings for large campaigns

3. **Version checking on load** (campaign-db.ts:191-196)
   ```typescript
   if (stored.version !== CAMPAIGN_STORAGE_VERSION) {
     logError(`Campaign version ${stored.version} not supported`);
     return null;
   }
   ```
   - Prevents loading incompatible save formats

4. **SlotArray reconstitution** (campaign-utils.ts:18-31)
   - Automatically rebuilds SlotArray wrappers after JSON parse
   - Ensures weapon slot operations work correctly after load

5. **Database connection management** (db-connection.ts:58-164)
   - Timeout handling for hung IndexedDB operations
   - `onversionchange` handler for multi-tab scenarios
   - `onblocked` handler with user notification

#### Potential Issues

1. **Missing validation on state reconstitution** (campaign-utils.ts:18-31)
   - Assumes ship.primaryWeapons and ship.secondaryWeapons exist
   - Corrupted save could cause runtime errors
   - **Severity: Medium** - Could crash on malformed saves

   **Recommendation:** Add defensive checks:
   ```typescript
   ships: state.ships.map((ship) => ({
     ...ship,
     primaryWeapons: ship.primaryWeapons
       ? slotArrayFromJSON<EquippedPrimary>(ship.primaryWeapons)
       : emptySlotArray<EquippedPrimary>(0),
     // ...
   })),
   ```

2. **Emergency save validation is partial** (campaign-autosave.ts:170-180)
   - Validates `settings`, `ships`, `pilots` arrays exist
   - Missing validation for: `credits`, `commanderId`, `currentSector`
   - **Severity: Low** - Emergency save is last resort

3. **Version mismatch returns null without migration** (campaign-db.ts:191-196)
   - Players lose saves on version bump
   - **Severity: Medium** - Need migration system for future versions

   **Recommendation:** Add migration handlers like replay system:
   ```typescript
   if (stored.version === 0) {
     stored = migrateV0ToV1(stored);
   }
   ```

4. **campaignCreatedAtMap is module-level** (campaign-db.ts:55)
   - Memory leak if many slots are loaded without page refresh
   - **Severity: Very Low** - Maximum 3 slots

---

### 3. Auto-Save System

**Location:** `src/campaign/storage/campaign-autosave.ts`

#### Strengths

1. **Debouncing** (campaign-autosave.ts:41-52)
   - Reference equality check (`state === lastSavedState`)
   - Queue system prevents concurrent writes

2. **Emergency save on unload** (campaign-autosave.ts:118-131)
   - Synchronous localStorage backup for browser close
   - IndexedDB is async and may not complete in `beforeunload`

3. **Visibility change handling** (campaign-autosave.ts:230-240)
   - Auto-saves when tab becomes hidden
   - Falls back to emergency save if async fails

#### Potential Issues

1. **Race condition in auto-save queue** (campaign-autosave.ts:70-76)
   ```typescript
   finally {
     saveInProgress = false;
     if (pendingSave) {
       const queuedState = pendingSave;
       pendingSave = null;
       await autoSave(queuedState, 'queued');
     }
   }
   ```
   - If `autoSave` is called between `pendingSave = null` and the recursive call, the new state could be lost
   - **Severity: Low** - Narrow timing window, saves happen on next trigger

2. **No active slot check before emergency save** (campaign-autosave.ts:118)
   - Emergency save stores state even without active slot
   - Recovery requires active slot to be set
   - **Severity: Very Low** - Recovery still possible via import

3. **forceSave returns boolean but callers often ignore** (campaign-autosave.ts:86-101)
   - `startCampaignGameplay` does `void forceSave(...)` (controller.ts:95)
   - Failed save could leave user in inconsistent state
   - **Severity: Low** - Auto-save will retry later

---

### 4. Checkpoint System (Non-Ironman Recovery)

**Location:** `src/campaign/storage/checkpoint.ts`, `src/campaign/handlers/mission-handlers.ts`

#### Strengths

1. **Pre-mission checkpoint** (campaign-handlers.ts:190-200)
   - Saves state before mission starts
   - Blocks mission launch if checkpoint save fails
   - Clear error message to user

2. **Checkpoint cleanup** (mission-callbacks.ts:186-193)
   - Deleted after successful mission
   - Retained for non-ironman game-over recovery

3. **Graceful fallback** (mission-handlers.ts:119-125)
   - If checkpoint missing, falls back to game-over screen
   - Logs error for debugging

#### Potential Issues

1. **Checkpoint not deleted on victory** (mission-callbacks.ts:186-193)
   - Only deletes if `!needsCheckpointRecovery`
   - Stale checkpoints could accumulate
   - **Severity: Very Low** - Overwritten on next mission

2. **No checkpoint version validation** (checkpoint.ts:80-116)
   - Unlike main save, checkpoints don't check version
   - **Severity: Low** - Checkpoints are short-lived

---

### 5. Mission Flow

**Location:** `src/campaign/mission/`, `src/campaign/handlers/`

#### Strengths

1. **Clear separation of concerns**
   - `mission-launcher.ts` - Setup and spawning
   - `mission-callbacks.ts` - Game loop integration
   - `mission-waves.ts` - Wave logic (shared with replay)
   - `mission-handlers.ts` - Post-mission UI flow

2. **Deterministic mission setup** (mission-launcher.ts:69-74)
   ```typescript
   const seed = deriveKey(
     campaignState.seed,
     'mission',
     campaignState.missionCount,
   );
   ```
   - Same mission count = same combat randomness
   - Prevents save scumming

3. **Ammo persistence** (mission-callbacks.ts:67, 125)
   - Remaining ammo extracted from world after mission
   - Applied to campaign state before save

4. **Replay integration** (mission-callbacks.ts:80-97)
   - Records player loadout, wingmen, contract info
   - Salvage data added after calculation

#### Potential Issues

1. **Game world used after stopGame** (mission-callbacks.ts:204)
   - `showGameOver(controller, game.world)` called after `stopGame(game)`
   - World may be in invalid state
   - **Severity: Low** - Only used for debrief data extraction

2. **Error handling in mission end executor** (mission-callbacks.ts:54-227)
   - No try-catch around the entire flow
   - Errors could leave player stuck on mission screen
   - **Severity: Medium** - Should wrap with error handling

   **Recommendation:**
   ```typescript
   return async () => {
     try {
       // existing code
     } catch (error) {
       logError('Mission end error:', error);
       // Show error screen or return to squadron
     }
   };
   ```

---

### 6. Progression System

**Location:** `src/campaign/recruits.ts`, `src/campaign/salvage.ts`, `src/campaign/store/`

#### Strengths

1. **Sector-scaled difficulty** (recruits.ts:89-103)
   - Skill weights interpolate between sector 1 and 5
   - Higher sectors have better recruits available

2. **Salvage calculation** (salvage.ts:51-133)
   - Deterministic with seeded PRNG
   - Based on destroyed ship data from match stats
   - Weapons have chance to drop, ammo has percentage recovery

3. **Store trickle system** (store/store-trickle.ts)
   - Stock replenishes after each mission
   - Prevents resource exhaustion

4. **Finite store stock** (store/store-catalog.ts)
   - Limited inventory per sector
   - Forces strategic purchasing decisions

#### Potential Issues

1. **Recruit ID reassignment on hire** (recruits.ts:260-278)
   - Recruits have temporary IDs (`recruit_5`)
   - Converted to permanent IDs on hire (`pilot_12`)
   - Well-documented behavior, but could confuse developers
   - **Severity: None** - Intentional design

2. **Salvage totalValue calculation** (salvage.ts:67-68)
   ```typescript
   result.totalValue += scrapCount * (shipPrice / 100);
   ```
   - Uses buy price, not sell price
   - Could overstate actual value to player
   - **Severity: Very Low** - Display only

---

### 7. Ironman Mode

**Location:** `src/campaign/types.ts`, `src/campaign/handlers/mission-handlers.ts`

#### Strengths

1. **Settings locked at creation** (types.ts:10-20)
   - `ironmanMode` and `autoaimDegrees` fixed after campaign start
   - Prevents mid-campaign difficulty changes

2. **Permadeath handling** (mission-handlers.ts:138-175)
   - Campaign deleted from storage on game over
   - Returns to title screen

3. **Checkpoint skipped for ironman** (campaign-handlers.ts:190-201)
   - Only non-ironman campaigns get checkpoints

#### Potential Issues

1. **Campaign deletion failure is logged but ignored** (mission-handlers.ts:150-156)
   ```typescript
   try {
     await deleteCampaign(currentSlotId);
   } catch (error) {
     logError('Failed to delete campaign on game over:', error);
   }
   ```
   - Player could potentially reload page and resume
   - **Severity: Low** - Edge case, auto-save will overwrite anyway

---

### 8. Controller Pattern

**Location:** `src/campaign/controller.ts`, `src/campaign/handlers/`

#### Strengths

1. **Thin orchestrator** (controller.ts:1-14)
   - Controller only wires together components
   - Business logic in handlers and state modules

2. **Clean handler separation**
   - `menu-handlers.ts` - Title, settings, replays
   - `campaign-handlers.ts` - Squadron, store, contracts
   - `mission-handlers.ts` - Results, game over
   - `pause-handler.ts` - Escape key, pause menu

3. **Callback-based screen setup** (campaign-handlers.ts)
   - Screens receive callbacks for navigation
   - No circular dependencies

#### Potential Issues

1. **Pause menu re-entry guard** (pause-handler.ts:22-23)
   ```typescript
   let pauseMenuOpen = false;
   ```
   - Module-level state could cause issues in tests
   - **Severity: Very Low** - Single-instance application

2. **Controller mutation during gameplay** (controller-types.ts:10-19)
   - `game`, `missionContainer`, `missionRenderers` are nullable and mutated
   - Acceptable for runtime coordination
   - **Severity: None** - Standard pattern for ephemeral state

---

## Data Integrity Concerns

### High Priority

1. **No migration system for save format changes**
   - Current version check rejects old saves
   - Will break saves on any format change
   - **Action:** Implement version migration before next format change

### Medium Priority

2. **Incomplete validation on state reconstitution**
   - Corrupted saves could cause runtime crashes
   - **Action:** Add defensive validation in `reconstituteCampaignState`

3. **No error boundary in mission end flow**
   - Exceptions could leave player stuck
   - **Action:** Wrap `createMissionEndExecutor` in try-catch

### Low Priority

4. **Emergency save could have stale/invalid state**
   - Validation is minimal
   - **Action:** Strengthen emergency save validation

---

## Test Coverage Assessment

**Location:** `scripts/tests/campaign/`

| Area | Test Files | Coverage |
|------|------------|----------|
| Storage | `test-campaign-storage.mjs`, `test-checkpoint-storage.mjs` | High |
| SlotArray | `test-slot-array.mjs` | High |
| Resupply | `test-resupply-*.mjs` (4 files) | High |
| Store | `test-store-ammo.mjs`, `test-store-caps.mjs` | Medium |
| Settings | `test-campaign-settings.mjs`, `test-settings-*.mjs` | High |
| Mission Balance | `test-mission-pacing.mjs`, `test-sector-balance.mjs` | High |

**Missing Coverage:**
- `state.ts` - applyMissionResults, applyAmmoUsage
- `loadout.ts` - equip/unequip weapon flows
- `pilot-assignment.ts` - pilot swap scenarios
- `mission-callbacks.ts` - integration tests

---

## Recommendations

### Immediate Actions

1. Add defensive validation in `reconstituteCampaignState` to handle corrupted saves gracefully

2. Wrap mission end executor in try-catch to prevent player getting stuck

3. Add explicit tests for loadout equip/unequip edge cases

### Future Improvements

1. Implement save format migration system similar to replay versioning

2. Add integration tests for full mission flow (start -> complete -> save)

3. Consider adding campaign backup/export on each auto-save for disaster recovery

4. Add telemetry for storage failures to identify issues in production

---

## Conclusion

The campaign system is well-designed with clean architecture and proper state management. The immutable pattern is consistently applied, and the storage layer has good error handling. The main risks are around save format evolution and edge cases in error handling. With the recommended improvements, the system would be production-ready for long-term support.
