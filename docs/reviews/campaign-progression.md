# Campaign & Progression Layer - Code Review

**Reviewer:** Claude Opus 4.6
**Date:** 2026-02-05
**Scope:** `src/campaign/`, `src/campaign/mission/`, `src/campaign/contracts/`, `src/campaign/resupply/`, `src/campaign/store/`, `src/campaign/storage/`, `src/campaign/handlers/` (excluding lobby handlers), `src/replay/`
**Files reviewed:** ~55 files across 8 directory areas

---

## Overview

The Campaign & Progression layer is the backbone of the roguelike loop: squadron management, contract selection, mission launch, rewards, and persistence. The codebase is well-structured with clean separation between campaign state mutation, UI handlers, mission execution, and persistence. The immutable state pattern is applied consistently, and the replay system demonstrates thoughtful engineering with versioned formats, compression, and deterministic reconstruction.

The overall quality is high. Most issues found are maintenance concerns (near-limit file sizes, duplicated patterns) rather than correctness bugs. There are a few genuine bugs and one design concern worth addressing.

---

## Issues Found

### 1. Debug console.log statements left in production code

**File:** `src/campaign/handlers/mission-results.ts:219-259`
**Category:** Bug
**Severity:** Low

Six `console.log` statements are left in `showMultiplayerResults()`, logging UI element dimensions and display states. These are clearly debugging artifacts:

```typescript
console.log(
  '[showMultiplayerResults] Creating results UI, element display:',
  resultsElement.style.display,
);
// ...
console.log('[showMultiplayerResults] Results UI created');
console.log('[showMultiplayerResults] Container display:', ...);
console.log('[showMultiplayerResults] Inner element found:', !!resultsInner);
console.log('[showMultiplayerResults] Inner rect:', rect.width, 'x', rect.height);
```

The project has `logDebug()` from `src/core/logger.ts` for structured logging. These should either be removed or converted to `logDebug()`.

---

### 2. Shortage reason fallback defaults to 'both' when neither stock nor credits are the issue

**File:** `src/campaign/resupply/resupply-ship.ts:274-277` and `src/campaign/resupply/resupply-constrained.ts:154-157`
**Category:** Bug
**Severity:** Medium

When a shortage exists but neither stock is zero nor credits are below 1, the code defaults to `'both'`:

```typescript
if (hasStockIssue && hasCreditIssue) {
  shortageReason = 'both';
} else if (hasCreditIssue) {
  shortageReason = 'credits';
} else if (hasStockIssue) {
  shortageReason = 'stock';
} else {
  shortageReason = 'both'; // Fallback - should not happen
}
```

This scenario can occur when credits are low (but not < 1) and stock is non-zero but insufficient to fully resupply. The correct fallback should be `'both'` or a more precise diagnosis. While the current behavior is arguably reasonable (if there is a shortage and neither single cause explains it, both factors contributed), the code comment suggests the author did not expect this path to be reachable. This identical logic is duplicated across two files.

---

### 3. Denormalized pilot data requires fragile dual updates

**File:** `src/campaign/state-mission.ts:218-225` and `src/campaign/state-mission.ts:384-390`
**Category:** Maintenance
**Severity:** Medium

Pilot data is stored in two locations: `state.pilots[]` (the roster) and `state.ships[].pilot` (the assigned pilot). Every mutation must update both locations in sync. The code handles this correctly but the pattern is repeated for each mutation function:

```typescript
// Update pilots array
const updatedPilots = state.pilots.map(updatePilotAfterMission)...;

// Also update pilots embedded in surviving ships (data is denormalized)
const updatedShips = survivingShips.map((ship) => {
  if (!ship.pilot) return ship;
  const updatedPilot = updatePilotAfterMission(ship.pilot);
  ...
});
```

The same dual-update pattern appears in `applyPilotStats()` (line 384) and `applyMissionResults()` (line 218). If a new pilot mutation function is added and the author forgets to update both locations, the campaign state will silently desynchronize. Consider either normalizing the data (ships reference pilot IDs, single source of truth) or extracting a helper that guarantees both are updated.

---

### 4. Code duplication between campaign and replay weapon conversion

**File:** `src/campaign/campaign-weapons.ts:21-64` vs `src/campaign/campaign-weapons.ts:160-207`
**Category:** Maintenance
**Severity:** Medium

`createPrimaryFromEquipped()` and `createPrimaryFromReplay()` copy 15 identical optional property assignments from `stats`:

```typescript
// Both functions have this identical block:
if (stats.flakRadius) weapon.flakRadius = stats.flakRadius;
if (stats.shrapnelCount) weapon.shrapnelCount = stats.shrapnelCount;
if (stats.shrapnelRange) weapon.shrapnelRange = stats.shrapnelRange;
if (stats.shrapnelDamage) weapon.shrapnelDamage = stats.shrapnelDamage;
if (stats.shrapnelSpeed) weapon.shrapnelSpeed = stats.shrapnelSpeed;
if (stats.isPulseBeam) weapon.isPulseBeam = stats.isPulseBeam;
// ... 9 more lines
```

The same duplication exists between `createSecondaryFromEquipped()` (lines 67-111) and `createSecondaryFromReplay()` (lines 210-250). When a new weapon property is added, it must be copied into four places. A shared helper like `applyOptionalWeaponStats(weapon, stats)` would eliminate this.

---

### 5. `showResults` function takes 12 positional parameters

**File:** `src/campaign/handlers/mission-results.ts:64-77` and `src/campaign/mission/mission-end-executor.ts:232-245`
**Category:** Maintenance
**Severity:** Medium

```typescript
showResults(
  controller,
  missionEndState.victory,
  contract,
  setupContractsScreen,
  game.world,
  salvageResult,
  baseReward,
  missionEndState.escortResults,
  missionEndState.ambushResults,
  missionEndState.stationDefenseResults,
  missionEndState.attackStationResults,
  salaryInfo,
);
```

Twelve positional parameters (8 optional) make call sites fragile and hard to read. A single options object `ResultsOptions` would be clearer and allow adding new mission result types without growing the parameter list.

---

### 6. Emergency save may exceed localStorage quota

**File:** `src/campaign/storage/campaign-autosave.ts:118-131`
**Category:** Performance
**Severity:** Low

The emergency save serializes the entire `CampaignState` as JSON into localStorage:

```typescript
localStorage.setItem(EMERGENCY_SAVE_KEY, JSON.stringify(save));
```

localStorage has a ~5MB limit across all keys. A late-game campaign with many ships, pilots, stored weapons, and store inventory could approach this limit. The code does catch the error gracefully (`logWarn`), but the user would lose their emergency save silently. Consider compressing the state or storing only a delta since last IndexedDB save.

---

### 7. Campaign export validation rejects older save versions

**File:** `src/campaign/storage/campaign-export.ts:129`
**Category:** Bug
**Severity:** Medium

The import validation function performs a strict version equality check:

```typescript
if (obj.version !== CAMPAIGN_STORAGE_VERSION) return false;
```

This means a campaign exported at version N cannot be imported at version N+1, even though the codebase has migration logic in `campaign-utils.ts:reconstituteCampaignState()` that handles older versions. The `loadCampaign()` path uses migration correctly, but the import path silently rejects valid older exports. The validation should accept versions that can be migrated (i.e., `version >= MIN_SUPPORTED_VERSION`).

---

### 8. `Math.random()` used in replay storage ID generation

**File:** `src/replay/storage.ts:105`
**Category:** Maintenance
**Severity:** Low

```typescript
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${timestamp}-${random}`;
}
```

The project rule states "No `Math.random()` - Use seeded PRNG from `src/core/prng.ts`". However, this is a storage ID generator, not game simulation logic, so it does not affect determinism. The rule violation is purely a style concern. Using `crypto.getRandomValues()` would be more robust if true uniqueness is needed, or this could be documented as an intentional exception.

---

### 9. Files approaching the 400-line limit

**Category:** Maintenance
**Severity:** Low

Several files are at or near the 400-line project limit:

| File | Lines | Risk |
|------|-------|------|
| `src/campaign/state-mission.ts` | 398 | At limit - any addition forces a split |
| `src/replay/types.ts` | 388 | Near limit - multiplayer types could be extracted |
| `src/campaign/storage/campaign-export.ts` | 376 | Approaching - import/export could be separate files |
| `src/campaign/storage/campaign-db.ts` | 374 | Approaching |
| `src/campaign/mission/mission-renderer.ts` | 355 | Safe for now |
| `src/campaign/mission/mission-waves.ts` | 349 | Safe for now |
| `src/replay/playback.ts` | 347 | Safe for now |

`state-mission.ts` at 398 lines is the most urgent. The three public functions (`applyMissionResults`, `applyAmmoUsage`, `applyPilotStats`) could be split into separate modules.

---

### 10. Duplicated shortage-determination and message-building code

**File:** `src/campaign/resupply/resupply-ship.ts:253-316` and `src/campaign/resupply/resupply-constrained.ts:126-193`
**Category:** Maintenance
**Severity:** Low

While `getShortageReason()` is properly shared, the surrounding pattern - computing `totalShortage`, determining `shortageReason` from `hasStockIssue`/`hasCreditIssue`, and iterating over shortages to build messages - is duplicated nearly verbatim between `resupplyShipConstrained()` and `resupplyAllShips()`. Extracting a `buildResupplyMessages(shortages, storeStock, credits)` helper would eliminate this.

---

### 11. Salvage weapon drop probability may be too low for player satisfaction

**File:** `src/campaign/salvage.ts:58-59`
**Category:** Design
**Severity:** Low

```typescript
// Roll salvage multiplier: 0.0 to 0.1 (0-10% of ship value)
const multiplier = rng() * 0.1;
```

Each destroyed enemy ship rolls a 0-10% multiplier, and each weapon on that ship then has a `(multiplier)` chance (0-10%) to drop. For a ship with 2 primary weapons and 1 secondary, the expected number of weapon drops per ship is approximately `0.05 * 3 = 0.15`. In a typical mission killing 10 enemies, the expected weapon drops are ~1.5. This is intentionally scarce for roguelike tension, but worth verifying through playtesting that the rate feels rewarding enough to sustain engagement across 5 sectors.

---

### 12. Emergency save version check discards potentially recoverable data

**File:** `src/campaign/storage/campaign-autosave.ts:158-161`
**Category:** Bug
**Severity:** Low

```typescript
if (save.version !== CAMPAIGN_STORAGE_VERSION) {
  logWarn(`Emergency save version mismatch: ${save.version}`);
  localStorage.removeItem(EMERGENCY_SAVE_KEY);
  return null;
}
```

Similar to issue #7, the emergency save recovery uses strict version equality. If the game is updated between the emergency save and recovery, the save is silently discarded. Emergency saves should be treated as last-resort data and attempt migration rather than immediate rejection.

---

## Strengths

### Consistent immutable state pattern
Every state mutation across `state-mission.ts`, `loadout.ts`, `salvage.ts`, and `store/*.ts` uses immutable updates via spread operators. The `autoSave` system leverages this by doing reference equality checks (`state === lastSavedState`) to skip no-op saves. This is a clean, principled approach.

### Comprehensive save/load system with layered resilience
The storage layer (`campaign-db.ts`, `campaign-autosave.ts`, `checkpoint.ts`) provides three layers of protection: normal IndexedDB saves, emergency localStorage backups on browser close, and pre-mission checkpoints for defeat recovery. The checkpoint system is particularly well-designed - it stores the state before a mission so that defeat rolls back to the pre-mission state rather than losing progress.

### Well-engineered replay system
The replay system demonstrates excellent engineering:
- Versioned format with forward-compatible migration (`storage.ts:migrateReplay`)
- RLE compression for input sequences (`compression.ts`)
- Gzip compression for storage (`gzip.ts`)
- Separate metadata for efficient listing without decompression
- Per-player input streams for multiplayer support
- Deterministic world reconstruction from seed + inputs

### Clean mission type extensibility
The mission type system follows a consistent pattern: each type has a launcher, a tick function, a completion check, and a results display. The `Contract` type uses optional typed data fields (`escortData`, `ambushData`, etc.) that cleanly separate mission-specific configuration. Adding a new mission type is well-documented in `CLAUDE.md`.

### Thoughtful store trickle system
`store-trickle.ts` provides a natural resupply mechanic where store stock probabilistically increases after each mission. The probability curves (70% for ammo/missiles, 50% for weapons) create meaningful scarcity without hard gates. The capacity-based stock limits in `store-catalog.ts` scale with ship class appropriately.

### Good auto-save debouncing
The auto-save coordinator in `campaign-autosave.ts` handles concurrent saves correctly: it queues saves during in-progress operations and uses the latest state for the queued save. The `visibilitychange` handler provides an intermediate layer between normal saves and emergency saves.

### Robust ejection system
The ejection system (`ejection.ts`) creates meaningful risk escalation through an elegant probability curve that increases KIA risk with each ejection. The system uses seeded PRNG for deterministic outcomes while maintaining the feel of randomness.

### Well-structured pilot XP and skill system
`pilot-xp.ts` and `pilot-skills.ts` provide a clean XP-to-skill progression with manual spending. Ship-specific skills (`pilot.shipSkills[shipClass]`) add strategic depth to pilot-ship assignment decisions.

---

## Recommendations

### Priority 1: Fix campaign export version check (Issue #7)
This is the most impactful bug. Players who export a campaign and then update the game will be unable to import their save, even though the underlying migration system can handle it. Change `validateExportedCampaign` to accept versions within the migratable range and apply migration during import.

### Priority 2: Split `state-mission.ts` before it exceeds 400 lines (Issue #9)
At 398 lines, this file will exceed the limit with any addition. Split into `state-mission-results.ts` (applyMissionResults), `state-mission-ammo.ts` (applyAmmoUsage), and `state-mission-stats.ts` (applyPilotStats + salary calculation).

### Priority 3: Extract shared weapon property copying (Issue #4)
Create a `copyOptionalPrimaryStats(weapon, stats)` and `copyOptionalSecondaryStats(weapon, stats)` helper to eliminate the duplicated 15-line blocks. This will prevent missed properties when new weapon features are added.

### Priority 4: Remove debug console.log statements (Issue #1)
Straightforward cleanup - remove or convert to `logDebug()`.

### Priority 5: Refactor `showResults` to use an options object (Issue #5)
Convert the 12-parameter function to accept a `ShowResultsOptions` interface. This improves readability and makes it safe to add new mission result types.

### Lower priority
- Consider normalizing pilot data to eliminate dual-update requirement (Issue #3)
- Extract resupply message building into shared helper (Issue #10)
- Monitor emergency save sizes in production (Issue #6)
- Document `Math.random()` exception in storage code (Issue #8)
