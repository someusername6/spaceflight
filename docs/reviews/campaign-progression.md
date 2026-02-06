# Campaign & Progression Layer - Code Review

**Last updated:** February 2026
**Scope:** `src/campaign/` (state, loadout, mission, handlers, store, storage, resupply), `src/replay/` (types, storage)
**Files reviewed:** ~50 files across 8 directory areas

---

## Overview

The Campaign & Progression layer manages the roguelike core loop: squadron management, contract selection, mission launch, rewards, and persistence. The codebase is well-structured with clean separation between campaign state mutation, UI handlers, mission execution, and persistence. The immutable state pattern is applied consistently, and the replay system demonstrates thoughtful engineering with versioned formats, compression, and deterministic reconstruction.

The remaining issues are minor design notes around edge-case resilience and game balance tuning.

---

## Issues

### 1. Emergency save may exceed localStorage quota

**File:** `src/campaign/storage/campaign-autosave.ts:118-131`
**Category:** Performance
**Severity:** Low

The emergency save serializes the entire `CampaignState` as uncompressed JSON into localStorage, which has a ~5MB limit. The error is caught gracefully (`logWarn`), so there is no crash risk, but the user loses their emergency backup silently. Late-game campaigns with many stored weapons, pilots, and recruits may approach this limit.

---

### 2. Salvage weapon drop probability design note

**File:** `src/campaign/salvage.ts:58-59`
**Category:** Design
**Severity:** Low (informational)

Each destroyed enemy ship rolls a 0-10% multiplier, and each weapon has a `(multiplier)` chance (0-10%) to drop. The expected number of weapon drops per 10-enemy mission is approximately 1.5. This is intentionally scarce for roguelike tension but worth monitoring through playtesting.

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

### Clean results UI with options interface
The `createResultsUI` function uses a `CreateResultsOptions` interface for optional parameters, avoiding positional parameter confusion. The `ShowResultsOptions` interface provides a clean contract for both singleplayer and multiplayer results display.

### Shared resupply message building
The `buildResupplyMessages` helper centralizes human-readable message generation for resupply operations, used consistently by both single-ship and fleet-wide resupply paths.

### Thoughtful pilot systems
The ejection system (`ejection.ts`) creates meaningful risk escalation through probability curves that increase KIA risk with each ejection, using seeded PRNG for determinism. The XP system (`pilot-xp.ts`, `pilot-skills.ts`) provides clean manual-spending progression with ship-specific skills. The salary system scales appropriately with pilot skill level.

### Well-structured file decomposition
The split of `state-mission.ts` into three focused modules (`state-mission-results.ts`, `state-mission-ammo.ts`, `state-mission-stats.ts`) with a barrel re-export for backwards compatibility is exactly how the project's 400-line rule should be handled. Each module now has a clear single responsibility.

### Good auto-save debouncing
The auto-save coordinator correctly handles concurrent saves: it queues saves during in-progress operations and uses the latest state for the queued save. The `visibilitychange` handler provides an intermediate layer between normal saves and emergency saves.

---

## Recommendations

- Monitor emergency save sizes in production (Issue 1)
