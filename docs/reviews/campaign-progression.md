# Campaign & Progression Layer - Code Review

**Last updated:** February 2026
**Scope:** `src/campaign/` (state, loadout, mission, handlers, store, storage, resupply), `src/replay/` (types, storage)
**Files reviewed:** ~50 files across 8 directory areas

---

## Overview

The Campaign & Progression layer manages the roguelike core loop: squadron management, contract selection, mission launch, rewards, and persistence. The codebase is well-structured with clean separation between campaign state mutation, UI handlers, mission execution, and persistence. The immutable state pattern is applied consistently, and the replay system demonstrates thoughtful engineering with versioned formats, compression, and deterministic reconstruction.

The remaining issues are maintenance concerns around code duplication, parameter style, and a design note about denormalized pilot data.

---

## Issues

### 1. Denormalized pilot data requires fragile dual updates

**File:** `src/campaign/state-mission-results.ts:144-171` and `src/campaign/state-mission-stats.ts:117-148`
**Category:** Maintenance
**Severity:** Medium

Pilot data is stored in two locations: `state.pilots[]` (the roster) and `state.ships[].pilot` (the assigned pilot). Every mutation must update both. The pattern is correctly implemented but repeated in both `applyMissionResults` and `applyPilotStats`:

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

### 2. Emergency save may exceed localStorage quota

**File:** `src/campaign/storage/campaign-autosave.ts:118-131`
**Category:** Performance
**Severity:** Low

The emergency save serializes the entire `CampaignState` as uncompressed JSON into localStorage, which has a ~5MB limit. The error is caught gracefully (`logWarn`), so there is no crash risk, but the user loses their emergency backup silently. Late-game campaigns with many stored weapons, pilots, and recruits may approach this limit.

---

### 3. Salvage weapon drop probability design note

**File:** `src/campaign/salvage.ts:58-59`
**Category:** Design
**Severity:** Low (informational)

Each destroyed enemy ship rolls a 0-10% multiplier, and each weapon has a `(multiplier)` chance (0-10%) to drop. The expected number of weapon drops per 10-enemy mission is approximately 1.5. This is intentionally scarce for roguelike tension but worth monitoring through playtesting.

---

### 4. `showMultiplayerResults` still uses 12 positional parameters

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

The call site in `mission-end-helpers.ts` still passes 12 positional arguments. This function should accept a `ShowMultiplayerResultsOptions` interface (or reuse `ShowResultsOptions` with an additional multiplayer flag) for consistency with the singleplayer path.

---

### 5. Lobby re-bind code duplicated across three handler files

**File:** `src/campaign/handlers/mission-results.ts:156-204`, `src/campaign/handlers/mission-handlers.ts:110-162`
**Category:** Maintenance
**Severity:** Medium

The `bindLobbyScreen` invocation with its full set of callbacks (`onReady`, `onSendChat`, `onBack`, `onPermissionChange`, `onCallsignChange`, `onNavigate`, `isCountdownActive`) is duplicated nearly identically in:

1. `mission-results.ts:156-204` (showMultiplayerResults returnToLobby)
2. `mission-handlers.ts:110-162` (handleNonIronmanDefeat returnToLobby)
3. `lobby-handlers.ts:202+` and `lobby-handlers.ts:328+` (initial lobby setup)

The first two are virtually identical blocks (~50 lines each). A shared helper like `rebindLobbyAfterMission(controller, lobbyCtx, setupContractsScreen)` would eliminate this duplication and reduce the risk of callback inconsistencies when lobby bindings change.

---

### 6. Unused `_setupContractsScreen` parameter in `showMultiplayerResults`

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

### 7. Resupply message-building code still partially duplicated

**File:** `src/campaign/resupply/resupply-ship.ts:288-324` and `src/campaign/resupply/resupply-constrained.ts:117-168`
**Category:** Maintenance
**Severity:** Low

While the shortage reason determination is now properly shared, the message-building loops remain duplicated between `resupplyShipConstrained()` and `resupplyAllShipsConstrained()`. Both files iterate over `fromStorage`, `bought`, and `shortages` maps to build identical message formats.

A shared `buildResupplyMessages(fromStorage, bought, shortages, storeStock, credits)` helper would eliminate approximately 50 lines of duplication.

---

### 8. `createResultsUI` still takes many positional parameters

**File:** `src/campaign/handlers/mission-results.ts:83-103` and `mission-handlers.ts:174-193`
**Category:** Maintenance
**Severity:** Low

The underlying `createResultsUI` call still passes 13 positional arguments including `undefined` placeholders:

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

The `undefined` placeholder at position 12 (multiplayerOptions) is particularly error-prone. This UI function should also adopt an options interface.

---

## Strengths

### Consistent immutable state pattern
Every state mutation across `state-mission-results.ts`, `state-mission-ammo.ts`, `state-mission-stats.ts`, `loadout.ts`, `salvage.ts`, and `store/*.ts` uses immutable updates via spread operators. The `autoSave` system leverages this by doing reference equality checks (`state === lastSavedState`) to skip no-op saves. This is a clean, principled approach.

### Comprehensive save/load system with layered resilience
The storage layer (`campaign-db.ts`, `campaign-autosave.ts`) provides three layers of protection: normal IndexedDB saves, emergency localStorage backups on browser close, and pre-mission checkpoints for defeat recovery. The checkpoint system stores state before a mission so defeat rolls back to the pre-mission state.

### Well-engineered replay system
The replay system demonstrates excellent engineering:
- Versioned format with forward-compatible migration (versions 1 through 6)
- Per-player autoaim support added cleanly in v6 with proper migration
- RLE compression for input sequences
- Gzip compression for storage with fallback
- Separate metadata for efficient listing without decompression
- Per-player input streams for multiplayer support
- Deterministic world reconstruction from seed + inputs
- `crypto.getRandomValues` for ID generation

### Clean campaign weapon conversion
`campaign-weapons.ts` cleanly separates concerns: shared helpers (`applyOptionalPrimaryStats`, `applyOptionalSecondaryStats`) handle the optional property copying, while separate functions handle campaign-to-game and replay-to-game conversions. Adding a new weapon property requires only a single line in the shared helper.

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

### Priority 1: Refactor `showMultiplayerResults` to use options object (Issue 4)
Apply the same options-interface pattern used for `showResults` to `showMultiplayerResults`. This will also make the lobby re-bind duplication (Issue 5) easier to extract.

### Priority 2: Extract shared lobby re-bind helper (Issue 5)
Create a `rebindLobbyAfterMission(controller, lobbyCtx, setupContractsScreen)` utility to eliminate the ~50-line duplication between `mission-results.ts` and `mission-handlers.ts`.

### Lower priority
- Consider normalizing pilot data to eliminate dual-update requirement (Issue 1)
- Extract resupply message building into shared helper (Issue 7)
- Refactor `createResultsUI` to use options interface (Issue 8)
- Monitor emergency save sizes in production (Issue 2)
