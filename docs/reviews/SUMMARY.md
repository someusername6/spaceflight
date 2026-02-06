# Codebase Review Summary

**Date:** February 2026
**Reviewer:** Claude Opus 4.6
**Scope:** Full codebase (~35,000 lines across ~300 files)
**Method:** 7 independent review agents, each covering a major subsystem

## Individual Reviews

| Review | Files | Issues | Highest Severity |
|--------|-------|--------|-----------------|
| [Core Architecture & ECS](core-architecture.md) | ~40 | 11 | Medium |
| [Combat & Weapon Systems](combat-weapons.md) | ~40 | 15 | Medium |
| [AI Systems](ai-systems.md) | ~25 | 14 | Medium |
| [Multiplayer & Networking](multiplayer-networking.md) | ~45 | 17 | Medium (Security) |
| [Campaign & Progression](campaign-progression.md) | ~55 | 12 | Medium |
| [Rendering & Visual Systems](rendering-visuals.md) | ~55 | 18 | **High** |
| [UI Framework & Screens](ui-screens.md) | ~55 | 13 | Low |

**Total issues found: 100** (1 high, ~25 medium, ~74 low)

---

## Overall Assessment

The codebase is in **good health**. All 7 reviews independently reached the same conclusion: the architecture is clean, well-decomposed, and consistently follows established patterns. The ECS design is principled, the multiplayer protocol is well-engineered, and the rendering system shows strong performance awareness. File sizes respect the 400-line limit. Code quality is uniform across all areas, which is notable for a codebase of this size.

The single high-severity issue is a GPU memory leak in the renderer. The medium-severity issues cluster into three categories: security gaps in the multiplayer host-authority model, per-frame allocation patterns that escaped an otherwise disciplined allocation-avoidance strategy, and maintenance concerns around code duplication.

---

## Critical Issues

### 1. GPU Memory Leak on Entity Destruction (HIGH)

**File:** `src/rendering/renderer.ts:278-284`
**Review:** Rendering

When entities are destroyed, their meshes are removed from the scene but geometry and materials are never disposed. In long missions with many kills, this will degrade performance or exhaust GPU memory. This is the most impactful bug in the codebase.

**Fix:** Add `mesh.geometry.dispose()` and `mesh.material.dispose()` in the entity cleanup loop.

### 2. Multiplayer Host-Authority Bypass (MEDIUM - Security)

**File:** `src/multiplayer/action-processing.ts:152-162`
**Review:** Multiplayer

`dismissPilot` and `spendXP` actions are documented as host-only but pass permission validation for any player. The UI hides the buttons for guests, but a crafted `ActionRequest` bypasses this. The host is the trust boundary -- UI-only enforcement is insufficient.

**Fix:** Return an error in `validateActionPermission()` when a non-host player requests these actions.

### 3. Unchecked `JSON.parse` for Guest Action Data (MEDIUM - Security)

**File:** `src/multiplayer/protocol/buffer-utils.ts:190-198`
**Review:** Multiplayer

`ActionRequestData` is deserialized via `JSON.parse(str) as T` with no runtime validation. A malicious guest could send unexpected field values (negative quantities, invalid indices). The host should validate critical fields before executing actions.

---

## Cross-Cutting Themes

### Per-Frame Allocations (16 instances across 4 subsystems)

The codebase generally follows excellent allocation discipline -- module-level reusable vectors, object pooling, pre-allocated arrays. However, several allocations escaped this pattern and are created every frame:

| Subsystem | What | Count | Severity |
|-----------|------|-------|----------|
| Rendering | `new Set()` for entity tracking | 4 sites | Medium |
| Rendering | `new THREE.Vector3()` in beam effects | 4 sites | Medium |
| Rendering | `new THREE.Color()` in nuke colors | 1 site | Medium |
| Rendering | `new ImageData()` in target camera | 1 site | Medium |
| Combat | `toRemove: Entity[] = []` per system | 3 sites | Low |
| Core | `ArrayBuffer(8)` in `HashState.addFloat64` | 1 site | Medium |
| AI | `.clone()` in idle follow behaviors | 4 sites | Low |

**Pattern fix:** Hoist to module-level and `.clear()` / `.length = 0` each frame, following the existing `seenMissiles` pattern in `missile-exhaust.ts`.

### O(N*M) Entity Scans (flagged by 2 reviews independently)

`hasIncomingMissiles()` iterates all missiles for every AI ship every frame. With 12 AI ships and 20 missiles, that's 240 iterations per frame. Flagged by both the **Combat** and **AI** reviews.

**Fix:** Cache a `Set<Entity>` of missile targets once per tick, or add a reverse-lookup map updated when missiles spawn/die/retarget.

### Code Duplication (8 instances)

| Area | What | Files |
|------|------|-------|
| Combat | Autoaim cone-check logic | 3 files |
| Combat | `dt` recovery from damage ratio | 2 sites in 1 file |
| Campaign | Weapon property copying (15 fields) | 4 blocks in 1 file |
| Campaign | Resupply shortage logic | 2 files |
| Multiplayer | `broadcastMessage` helper | 3 files |
| Rendering | Beam line update functions | 2 functions in 1 file |
| UI | `capitalize()` utility | 4 files |
| UI | Battle canvas re-attachment | 2 files |

### Files at the 400-Line Limit (18 files)

Multiple files across all subsystems are at or approaching the 400-line project limit. The most urgent:

| File | Lines | Status |
|------|-------|--------|
| `src/campaign/state-mission.ts` | 398 | **At limit** |
| `src/rendering/effects/projectile-hits.ts` | 398 | **At limit** |
| `src/systems/weapons/missiles.ts` | 396 | At limit |
| `src/multiplayer/protocol/router.ts` | 395 | At limit |
| `src/systems/weapons/weapon-spawning.ts` | 392 | Near limit |
| `src/ui/ship/connectors.ts` | 391 | Near limit |
| `src/rendering/hud/hud.ts` | 390 | Near limit |
| `src/ui/screens/lobby/lobby.ts` | 388 | Near limit |

Any addition to files at 396+ lines will require a split.

### Stale Module-Level State (3 instances)

| File | State | Risk |
|------|-------|------|
| `action-client.ts` | `isResponseHandlerSetUp` never resets | Handler goes stale across sessions |
| `lobby-state.ts` | `nextMessageId` never resets | Monotonic growth across sessions |
| `ui/ship/connectors.ts` | `maskIdCounter` never resets | Unbounded SVG IDs |

### Dead or Vestigial Code (4 instances)

- `src/ui/ship/actions.ts` -- exports an empty function, still called
- `src/ui/common/tooltip.ts` -- permanent no-op, still imported
- `src/multiplayer/networking/session-state.ts` -- "preparatory" code, never used
- `src/data/missiles.ts:206-211` -- `DECOY_CONSTANTS` duplicates values from component, never consumed

---

## Prioritized Action Plan

### Tier 1: Fix Now (high impact, low effort)

1. **Fix GPU memory leak** in `renderer.ts:278-284` -- add geometry/material dispose
2. **Fix host-only action bypass** -- validate `playerId` in `validateActionPermission()` for `dismissPilot` and `spendXP`
3. **Hoist per-frame Set/Vector allocations** -- 8 sites in rendering, follow existing `seenMissiles` pattern
4. **Cache `hasIncomingMissiles` per tick** -- eliminates O(N*M) scan flagged by two reviews
5. **Hoist `HashState.addFloat64` buffers** -- move `ArrayBuffer`/`DataView` to static class fields

### Tier 2: Fix Soon (medium impact, moderate effort)

6. **Pass `dt` explicitly to `applyBeamDamageAndEffects`** -- eliminates fragile `damage / weapon.damage` recovery pattern
7. **Split files at 396+ lines** -- `state-mission.ts`, `projectile-hits.ts`, `missiles.ts`, `router.ts`
8. **Extract shared weapon property helper** -- eliminates 4x duplication in `campaign-weapons.ts`
9. **Fix campaign export version check** -- accept migratable versions, not strict equality
10. **Reset `isResponseHandlerSetUp`** on lobby cleanup in `action-client.ts`

### Tier 3: Improve Later (low impact, cleanup)

11. Extract shared autoaim helper (3 implementations)
12. Consolidate `broadcastMessage` helper (3 copies)
13. Consolidate `capitalize()` utility (4 copies)
14. Remove dead code (actions.ts, tooltip.ts, session-state.ts, DECOY_CONSTANTS)
15. Document or fix Mersenne Twister initialization mask
16. Add runtime validation for `ActionRequestData` on host
17. Validate callsign in `handleCallsignAnnounce`
18. Remove debug `console.log` statements in `mission-results.ts`

---

## Architectural Strengths

Every review independently highlighted these qualities:

- **Consistent ECS discipline** -- components are interfaces, systems are pure functions, world holds all state
- **Determinism-first design** -- separate simulation/render PRNGs, seeded randomness, replay-safe architecture
- **Allocation-conscious hot paths** -- module-level reusable vectors, object pooling for projectiles/explosions/bolts
- **Strong file decomposition** -- all files under 400 lines, logical module boundaries, clear naming
- **Well-engineered multiplayer protocol** -- binary encoding with size pre-calculation, symmetric encode/decode, exhaustive switch statements, host-authority model
- **Comprehensive documentation** -- `@mp-*` annotations, calibration comments in AI profiles, CLAUDE.md matches reality
- **Clean immutable state** -- campaign state, lobby state, and settings all use disciplined immutable updates
- **Thoughtful AI design** -- playstyle system with skill inversion handling, per-role parameter tuning, well-calibrated difficulty profiles
