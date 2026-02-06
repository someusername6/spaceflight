# Campaign & Progression Layer - Code Review

**Reviewer:** Claude Opus 4.6
**Date:** 2026-02-05
**Scope:** `src/campaign/` (state, loadout, mission, handlers, store, storage, resupply), `src/replay/` (types, storage)
**Files reviewed:** ~50 files across 8 directory areas

---

## Overview

The Campaign & Progression layer manages the roguelike core loop: squadron management, contract selection, mission launch, rewards, and persistence. The codebase is well-structured with clean separation between campaign state mutation, UI handlers, mission execution, and persistence. The immutable state pattern is applied consistently, and the replay system demonstrates thoughtful engineering with versioned formats, compression, and deterministic reconstruction.

Since the last review, several recommended fixes have been implemented. This review validates those fixes and identifies remaining and new issues.

---

## Previous Fix Validation

### FIXED: `state-mission.ts` split into sub-modules (was Issue #9)

The monolithic 398-line `state-mission.ts` has been properly split:
- `src/campaign/state-mission.ts` is now a 15-line barrel re-export (line 1-15)
- `src/campaign/state-mission-results.ts` contains `applyMissionResults` (201 lines)
- `src/campaign/state-mission-ammo.ts` contains `applyAmmoUsage` (57 lines)
- `src/campaign/state-mission-stats.ts` contains `applyPilotStats` and `calculateMissionSalaries` (156 lines)

Backwards compatibility is maintained through re-exports. Clean split.

### FIXED: `showResults` refactored to use options object (was Issue #5)

`src/campaign/handlers/mission-results.ts:49-62` now defines a `ShowResultsOptions` interface, and `showResults()` at line 65 accepts a single `options` parameter:

```typescript
export interface ShowResultsOptions {
  controller: CampaignController;
  victory: boolean;
  contract: Contract;
  setupContractsScreen: (controller: CampaignController) => void;
  world?: World | undefined;
  // ... other optional fields
}

export function showResults(options: ShowResultsOptions): void {
```

Call sites in `mission-end-executor.ts:231-244` now use the named-property pattern. This is a clean fix.

### FIXED: Weapon property helpers extracted (was Issue #4)

`src/campaign/campaign-weapons.ts:21-42` now has `applyOptionalPrimaryStats(weapon, stats)` and `applyOptionalSecondaryStats(weapon, stats)` at lines 45-63. Both `createPrimaryFromEquipped` (line 66) and `createPrimaryFromReplay` (line 172) call the same shared helper. The duplication is eliminated.

### FIXED: Campaign export accepts older versions (was Issue #7)

`src/campaign/storage/campaign-export.ts:129` now uses `>` instead of `!==`:

```typescript
if (obj.version > CAMPAIGN_STORAGE_VERSION) return false;
```

This correctly allows importing older exports that can be migrated via `reconstituteCampaignState()`.

### FIXED: Emergency save accepts older versions (was Issue #12)

`src/campaign/storage/campaign-autosave.ts:158` now uses `>` instead of `!==`:

```typescript
if ((save.version as number) > CAMPAIGN_STORAGE_VERSION) {
```

This correctly allows recovering emergency saves from older game versions.

### FIXED: `Math.random` replaced in replay storage ID (was Issue #8)

`src/replay/storage.ts:103-109` now uses `crypto.getRandomValues`:

```typescript
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const buf = new ArrayBuffer(4);
  crypto.getRandomValues(new Uint8Array(buf));
  const random = new DataView(buf).getUint32(0).toString(36);
  return `${timestamp}-${random}`;
}
```

No `Math.random()` usage remains in the campaign directory (verified via grep).

### FIXED: Duplicated resupply shortage logic shared (was Issue #10)

`src/campaign/resupply/resupply-ship.ts:52-66` now exports a `determineShortageReason()` helper and `getShortageReason()` helper. `resupply-constrained.ts` imports and reuses both (lines 14-18). The shortage-determination logic is no longer duplicated.

### FIXED: Replay storage v5 to v6 migration (was new in prior review)

`src/replay/storage.ts:276-286` correctly migrates v5 multiplayer replays by copying `playerAutoaim` to each player's `autoaimDegrees` field:

```typescript
if (replay.version === 5) {
  if ('isMultiplayer' in replay && replay.isMultiplayer === true) {
    const mpReplay = replay as MultiplayerReplayData;
    for (const player of mpReplay.players) {
      if (player.autoaimDegrees === undefined) {
        player.autoaimDegrees = mpReplay.playerAutoaim;
      }
    }
  }
  replay.version = 6;
}
```

---

## Remaining Issues (from previous review)

### 1. Debug `console.log` statement in mission-end-helpers.ts

**File:** `src/campaign/mission/mission-end-helpers.ts:186`
**Category:** Bug (minor)
**Severity:** Low

The previous review identified debug console.log statements in mission-results.ts. Those have been cleaned up, but a new one exists in the refactored helper:

```typescript
console.log('[EXECUTOR] Multiplayer path, showing results');
```

The project uses `logDebug()` from `src/core/logger.ts` for structured logging. This should either be removed or converted to `logDebug()`.

Additionally, `src/campaign/handlers/lobby-guest-handlers.ts` contains several `console.log` and `console.warn` statements (lines 62, 69, 99, 111, 130, 140, 150) that should use the project's logger infrastructure.

---

### 2. Denormalized pilot data requires fragile dual updates

**File:** `src/campaign/state-mission-results.ts:144-171` and `src/campaign/state-mission-stats.ts:117-148`
**Category:** Maintenance
**Severity:** Medium

Pilot data remains stored in two locations: `state.pilots[]` (the roster) and `state.ships[].pilot` (the assigned pilot). Every mutation must update both. The pattern is correctly implemented but repeated in both `applyMissionResults` and `applyPilotStats`:

```typescript
// state-mission-results.ts:164-171
const updatedShips = survivingShips.map((ship) => {
  if (!ship.pilot) return ship;
  const updatedPilot = updatePilotAfterMission(ship.pilot);
  if (!updatedPilot || updatedPilot === ship.pilot) return ship;
  return { ...ship, pilot: updatedPilot };
});
```

```typescript
// state-mission-stats.ts:142-148
const updatedShips = state.ships.map((ship) => {
  if (!ship.pilot) return ship;
  const updatedPilot = applyStats(ship.pilot);
  if (updatedPilot === ship.pilot) return ship;
  return { ...ship, pilot: updatedPilot };
});
```

If a new pilot mutation is added and the author forgets to update both locations, campaign state will silently desynchronize. Consider extracting a `syncPilotsToShips(state, updateFn)` utility that guarantees both are updated together.

---

### 3. Emergency save may exceed localStorage quota

**File:** `src/campaign/storage/campaign-autosave.ts:118-131`
**Category:** Performance
**Severity:** Low

The emergency save serializes the entire `CampaignState` as uncompressed JSON into localStorage, which has a ~5MB limit. The error is caught gracefully (`logWarn`), so there is no crash risk, but the user loses their emergency backup silently. Late-game campaigns with many stored weapons, pilots, and recruits may approach this limit.

---

### 4. Salvage weapon drop probability design note

**File:** `src/campaign/salvage.ts:58-59`
**Category:** Design
**Severity:** Low (informational)

Each destroyed enemy ship rolls a 0-10% multiplier, and each weapon has a `(multiplier)` chance (0-10%) to drop. The expected number of weapon drops per 10-enemy mission is approximately 1.5. This is intentionally scarce for roguelike tension but worth monitoring through playtesting.

---

## New Issues

### 5. `showMultiplayerResults` still uses 12 positional parameters

**File:** `src/campaign/handlers/mission-results.ts:113-126`
**Category:** Maintenance
**Severity:** Medium

While `showResults` was refactored to use a `ShowResultsOptions` interface, `showMultiplayerResults` was not given the same treatment:

```typescript
export function showMultiplayerResults(
  controller: CampaignController,
  victory: boolean,
  contract: Contract,
  _setupContractsScreen: (controller: CampaignController) => void,
  world?: World,
  salvage?: SalvageResult | null,
  earnedReward?: number,
  escortResults?: EscortResultsDisplay,
  ambushResults?: AmbushResultsDisplay,
  stationDefenseResults?: StationDefenseResultsDisplay,
  attackStationResults?: AttackStationResultsDisplay,
  salaryInfo?: SalaryInfo,
): void {
```

The call site in `mission-end-helpers.ts:204-217` still passes 12 positional arguments. This function should accept a `ShowMultiplayerResultsOptions` interface (or reuse `ShowResultsOptions` with an additional multiplayer flag) for consistency with the singleplayer path.

---

### 6. Lobby re-bind code duplicated across three handler files

**File:** `src/campaign/handlers/mission-results.ts:156-204`, `src/campaign/handlers/mission-handlers.ts:110-162`
**Category:** Maintenance
**Severity:** Medium

The `bindLobbyScreen` invocation with its full set of callbacks (`onReady`, `onSendChat`, `onBack`, `onPermissionChange`, `onCallsignChange`, `onNavigate`, `isCountdownActive`) is duplicated nearly identically in:

1. `mission-results.ts:156-204` (showMultiplayerResults returnToLobby)
2. `mission-handlers.ts:110-162` (handleNonIronmanDefeat returnToLobby)
3. `lobby-handlers.ts:202+` and `lobby-handlers.ts:328+` (initial lobby setup)

The first two are virtually identical blocks (~50 lines each). A shared helper like `rebindLobbyAfterMission(controller, lobbyCtx, setupContractsScreen)` would eliminate this duplication and reduce the risk of callback inconsistencies when lobby bindings change.

---

### 7. Unused `_setupContractsScreen` parameter in `showMultiplayerResults`

**File:** `src/campaign/handlers/mission-results.ts:118`
**Category:** Bug (minor)
**Severity:** Low

The `_setupContractsScreen` parameter (prefixed with underscore indicating it is intentionally unused) in `showMultiplayerResults` is never used within that function. However, when the fallback to singleplayer occurs (line 137), it passes the module-level `setupContractsScreen` import instead of the parameter:

```typescript
if (!lobbyCtx) {
  showResults({
    controller,
    ...
    setupContractsScreen, // Uses the imported module function, not the parameter
    ...
  });
  return;
}
```

This works because the imported `setupContractsScreen` and the parameter would be the same function, but the parameter should either be used in the fallback or removed entirely to avoid confusion.

---

### 8. Files approaching the 400-line limit

**Category:** Maintenance
**Severity:** Low

Several files are approaching the project's 400-line maximum:

| File | Lines | Status |
|------|-------|--------|
| `src/replay/types.ts` | 387 | Near limit - multiplayer types could be extracted |
| `src/campaign/storage/campaign-export.ts` | 375 | Approaching - import/export could be separate files |
| `src/campaign/storage/campaign-db.ts` | 373 | Approaching |
| `src/campaign/mission/mission-waves.ts` | 348 | Safe for now |
| `src/campaign/resupply/resupply-ship.ts` | 343 | Safe for now |
| `src/campaign/handlers/mission-handlers.ts` | 334 | Safe for now |

`src/replay/types.ts` at 387 lines is the most urgent. The multiplayer replay types (`MultiplayerReplayPlayer`, `MultiplayerReplayInputs`, `MultiplayerReplayData`) could be extracted into `src/replay/multiplayer-types.ts`.

---

### 9. Resupply message-building code still partially duplicated

**File:** `src/campaign/resupply/resupply-ship.ts:288-324` and `src/campaign/resupply/resupply-constrained.ts:117-168`
**Category:** Maintenance
**Severity:** Low

While the shortage reason determination is now properly shared via `determineShortageReason()` and `getShortageReason()`, the message-building loops remain duplicated between `resupplyShipConstrained()` and `resupplyAllShipsConstrained()`. Both files iterate over `fromStorage`, `bought`, and `shortages` maps to build identical message formats:

```typescript
// Both files have these identical loops:
for (const [wt, count] of fromStorage.ammo) {
  messages.push(`Loaded ${count} ${getAmmoDisplayName(wt)} from storage`);
}
for (const [wt, count] of bought.ammo) {
  const pricePerUnit = getAmmoPrice(wt, 'buy');
  const cost = Math.round(count * pricePerUnit);
  messages.push(`Bought ${count} ${getAmmoDisplayName(wt)} for ${cost} cr`);
}
// ... 4 more identical loops
```

A shared `buildResupplyMessages(fromStorage, bought, shortages, storeStock, credits)` helper would eliminate approximately 50 lines of duplication.

---

### 10. `createResultsUI` still takes many positional parameters

**File:** `src/campaign/handlers/mission-results.ts:83-103` and `mission-handlers.ts:174-193`
**Category:** Maintenance
**Severity:** Low

While `showResults` now uses an options interface, the underlying `createResultsUI` call still passes 13 positional arguments including `undefined` placeholders:

```typescript
createResultsUI(
  resultsElement,
  victory,
  contract,
  screenManager.campaignState,
  () => { ... },       // onContinue
  world,
  salvage,
  earnedReward,
  escortResults,
  ambushResults,
  stationDefenseResults,
  attackStationResults,
  undefined,           // multiplayerOptions
  salaryInfo,
);
```

The `undefined` placeholder at position 12 (multiplayerOptions) is particularly error-prone -- if new parameters are added before it, the placeholder shifts. This UI function should also adopt an options interface.

---

## Strengths

### Consistent immutable state pattern
Every state mutation across `state-mission-results.ts`, `state-mission-ammo.ts`, `state-mission-stats.ts`, `loadout.ts`, `salvage.ts`, and `store/*.ts` uses immutable updates via spread operators. The `autoSave` system leverages this by doing reference equality checks (`state === lastSavedState`) to skip no-op saves. This is a clean, principled approach.

### Comprehensive save/load system with layered resilience
The storage layer (`campaign-db.ts`, `campaign-autosave.ts`) provides three layers of protection: normal IndexedDB saves, emergency localStorage backups on browser close, and pre-mission checkpoints for defeat recovery. The checkpoint system stores state before a mission so defeat rolls back to the pre-mission state. The version checks now correctly use `>` rather than `!==`, allowing migration from older saves.

### Well-engineered replay system
The replay system demonstrates excellent engineering:
- Versioned format with forward-compatible migration (`storage.ts:migrateReplay`, versions 1 through 6)
- Per-player autoaim support added cleanly in v6 with proper migration
- RLE compression for input sequences
- Gzip compression for storage with fallback
- Separate metadata for efficient listing without decompression
- Per-player input streams for multiplayer support
- Deterministic world reconstruction from seed + inputs
- `crypto.getRandomValues` for ID generation

### Clean campaign weapon conversion
`campaign-weapons.ts` now cleanly separates concerns: shared helpers (`applyOptionalPrimaryStats`, `applyOptionalSecondaryStats`) handle the optional property copying, while separate functions handle campaign-to-game and replay-to-game conversions. Adding a new weapon property requires only a single line in the shared helper.

### Clean mission type extensibility
The mission type system follows a consistent pattern: each type has a launcher, a tick function, a completion check, and a results display. The `Contract` type uses optional typed data fields (`escortData`, `ambushData`, etc.) that cleanly separate mission-specific configuration.

### Thoughtful pilot systems
The ejection system (`ejection.ts`) creates meaningful risk escalation through probability curves that increase KIA risk with each ejection, using seeded PRNG for determinism. The XP system (`pilot-xp.ts`, `pilot-skills.ts`) provides clean manual-spending progression with ship-specific skills. The salary system scales appropriately with pilot skill level.

### Well-structured file decomposition
The split of `state-mission.ts` into three focused modules (`state-mission-results.ts`, `state-mission-ammo.ts`, `state-mission-stats.ts`) with a barrel re-export for backwards compatibility is exactly how the project's 400-line rule should be handled. Each module now has a clear single responsibility.

### Good auto-save debouncing
The auto-save coordinator correctly handles concurrent saves: it queues saves during in-progress operations and uses the latest state for the queued save. The `visibilitychange` handler provides an intermediate layer between normal saves and emergency saves.

---

## Recommendations

### Priority 1: Remove debug console.log statement (Issue #1)
Remove or convert the `console.log` in `mission-end-helpers.ts:186` to `logDebug()`. Also audit `lobby-guest-handlers.ts` for similar cleanup.

### Priority 2: Refactor `showMultiplayerResults` to use options object (Issue #5)
Apply the same options-interface pattern used for `showResults` to `showMultiplayerResults`. This will also make the lobby re-bind duplication (Issue #6) easier to extract.

### Priority 3: Extract shared lobby re-bind helper (Issue #6)
Create a `rebindLobbyAfterMission(controller, lobbyCtx, setupContractsScreen)` utility to eliminate the ~50-line duplication between `mission-results.ts` and `mission-handlers.ts`.

### Priority 4: Monitor `src/replay/types.ts` line count (Issue #8)
At 387 lines, this file should be split before multiplayer types grow further. Extract multiplayer-specific types to `src/replay/multiplayer-types.ts`.

### Lower priority
- Consider normalizing pilot data to eliminate dual-update requirement (Issue #2)
- Extract resupply message building into shared helper (Issue #9)
- Refactor `createResultsUI` to use options interface (Issue #10)
- Monitor emergency save sizes in production (Issue #3)
