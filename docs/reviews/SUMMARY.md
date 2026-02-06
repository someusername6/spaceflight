# Codebase Review Summary

**Date:** February 2026 (Post-Remediation)
**Reviewer:** Claude Opus 4.6
**Scope:** Full codebase (~35,000 lines across ~300 files)
**Method:** 7 independent review agents, each covering a major subsystem
**Context:** Regenerated after addressing ~72 issues from the initial review round

## Individual Reviews

| Review | Remaining Issues | Resolved Issues | Highest Severity |
|--------|-----------------|-----------------|-----------------|
| [Core Architecture & ECS](core-architecture.md) | 8 | 5 | Medium |
| [Combat & Weapon Systems](combat-weapons.md) | 10 | 9 | Medium |
| [AI Systems](ai-systems.md) | 8 | 10 | Low |
| [Multiplayer & Networking](multiplayer-networking.md) | 18 | 10 | Medium |
| [Campaign & Progression](campaign-progression.md) | 10 | 8 | Medium |
| [Rendering & Visual Systems](rendering-visuals.md) | 12 | 12 | Medium |
| [UI Framework & Screens](ui-screens.md) | 11 | 7 | Low |

**Total: 77 remaining issues, 61 resolved from previous round**

---

## Overall Assessment

The remediation round was highly effective. Of the ~100 issues identified in the initial review, 61 have been fully resolved. The single High-severity issue (GPU memory leak in the renderer) is fixed. Both Medium-severity security issues in the multiplayer layer (host-authority bypass for dismissPilot/spendXP, and unchecked JSON.parse for guest action data) are fixed. The per-frame allocation campaign that spanned 16 sites across 4 subsystems has been largely addressed: Sets are now module-level with `.clear()`, beam vectors are hoisted, `HashState.addFloat64` uses static buffers, the O(N*M) missile scan uses a per-tick `Set<Entity>`, and `toRemove` arrays are at module scope. Code duplication was reduced through shared modules for autoaim, broadcastMessage, weapon property helpers, resupply shortage logic, and beam line functions. Four dead code items were removed. Multiple files that were at the 400-line limit have been split.

The remaining 77 issues are predominantly Low severity. Only 6 are Medium: beam hash omitting simulation-critical fields (Core), game loop accumulator cap (Core), AI single-weapon selection bug (Combat), PauseCoordinator stale state capture (Multiplayer), denormalized pilot data requiring dual updates (Campaign), and scene graph traversal every frame in the target camera (Rendering). Two subsystems -- AI and UI -- have no remaining Medium-or-higher issues, indicating those areas are in strong shape. The nature of remaining issues has shifted from bugs and security gaps toward design observations, minor allocation inconsistencies, and maintenance items like files approaching the 400-line limit. This is healthy: the high-impact issues have been addressed and what remains is polish.

The multiplayer layer has the most remaining issues (18), though most are Low-severity design observations about protocol edge cases and minor state management concerns. The new PauseCoordinator stale state capture (Medium) is the most architecturally concerning new finding. The rendering layer has improved dramatically -- all 12 previously-identified issues from the initial round are resolved, and the 12 remaining are new findings that are less severe.

---

## Remaining High/Medium Issues

### Medium Severity

1. **Beam hash omits simulation-critical ActiveBeam fields** -- `src/serialization/hashing.ts:117-126` -- `lastInstantFireTime`, `pulseActive`, and `lastPulseTime` affect simulation outcomes but are not included in the beam hash, making multiplayer desync undetectable for these fields. *(Core Architecture)*

2. **Game loop has no accumulator cap (spiral of death)** -- `src/game.ts:170-177` -- If the browser tab is backgrounded and foregrounded, `requestAnimationFrame` delivers a large delta causing hundreds or thousands of ticks in one frame. *(Core Architecture)*

3. **AI single-weapon selection silently fails due to linkMode mismatch** -- `src/systems/weapons/weapons-ai.ts:99-104` -- `setLinkModeByType` receives weapon display names but `linkModes` contains bank index strings, so AI "single weapon" selection always falls back to linked fire, undermining heat/ammo conservation and tactical weapon choice. *(Combat & Weapons)*

4. **PauseCoordinator captures `lobbyState` by reference at init time** -- `src/multiplayer/pause-coordinator.ts:67` -- The destructured `lobbyState` becomes stale after any lobby state update (immutable pattern replaces the object). Closures like `getLocalCallsign()` and `doPause()` read from the stale reference. *(Multiplayer & Networking)*

5. **Denormalized pilot data requires fragile dual updates** -- `src/campaign/state-mission-results.ts:144-171` and `src/campaign/state-mission-stats.ts:117-148` -- Pilot data exists in both `state.pilots[]` and `state.ships[].pilot`, requiring every mutation to update both locations. *(Campaign & Progression)*

6. **`showMultiplayerResults` still uses 12 positional parameters** -- `src/campaign/handlers/mission-results.ts:113-126` -- Unlike the singleplayer `showResults` which was refactored to use an options interface, the multiplayer variant still takes 12 positional arguments. *(Campaign & Progression)*

7. **Lobby re-bind code duplicated across handler files** -- `src/campaign/handlers/mission-results.ts:156-204` and `src/campaign/handlers/mission-handlers.ts:110-162` -- ~50 lines of `bindLobbyScreen` callback wiring duplicated nearly identically. *(Campaign & Progression)*

8. **Scene graph traversal every frame in target camera** -- `src/rendering/hud/target-camera.ts:148-153` -- `scene.traverse()` walks the entire scene graph every frame just to find 2-3 lights for the PiP render. *(Rendering & Visuals)*

---

## Cross-Cutting Themes

### Files Approaching the 400-Line Limit

Multiple files across subsystems are within 15 lines of the project maximum. The most urgent:

| File | Lines | Review |
|------|-------|--------|
| `src/multiplayer/protocol/router.ts` | 395 | Multiplayer |
| `src/ui/ship/connectors.ts` | 392 | UI |
| `src/rendering/hud/hud.ts` | 389 | Rendering |
| `src/replay/types.ts` | 387 | Campaign |
| `src/ui/screens/lobby/lobby.ts` | 387 | UI |
| `src/rendering/reticle/reticle-drawing.ts` | 385 | Rendering |
| `src/rendering/hud/target-stats.ts` | 383 | Rendering |

Adding any feature to `router.ts` (395 lines) will require a split. Several reviews independently flagged this theme.

### Remaining Allocation Inconsistencies

While the bulk of per-frame allocations have been fixed, a smaller set remains:

- `getWeaponIndicesForCurrentMode` allocates an array per call, ~30-40 times/frame (Combat)
- `getMissileThreatState` allocates a result object every frame during combat (Rendering)
- `findStationAttacker` allocates a Map and Array per call (AI)
- `lightning-bolt.ts` allocates vectors in pulse functions (Rendering)
- Geometry `.clone()` calls on infrequent effects (Rendering: beam-glow, shield-effects, nuclear lance)

These are lower impact than the initial round's allocations (most fire infrequently or on small data), but they break the otherwise consistent allocation discipline.

### Minor Code Duplication Remaining

- `broadcastAndApply` still duplicated in `lobby-actions.ts` and `lobby-kick.ts` (Multiplayer)
- Resupply message-building loops duplicated between two files (Campaign)
- Inline `capitalize()` at 8 call sites despite shared utility existing (UI)
- `createResultsUI` still takes 13 positional parameters with `undefined` placeholders (Campaign)
- Battle canvas re-attachment pattern duplicated in settings and load-campaign screens (UI)

### Hardcoded String Comparisons

Weapon name string literals appear in beam type checks (`beam-continuous.ts:81-82` checks `weapon.name === 'Nuclear Lance'` and `weapon.name === 'Torch'`), beam glow color detection, and the AI weapon selection bug. Data-driven properties exist that could replace these checks.

---

## Previously Resolved (Summary)

The remediation round addressed 61 issues across all 7 subsystems:

- **Security fixes (3):** Host-authority bypass for dismissPilot/spendXP, unchecked JSON.parse for action data, CallsignAnnounce validation on host
- **GPU/memory fixes (2):** Material disposal on entity destruction, jump-effect Uint16 index buffer check
- **Per-frame allocation fixes (13):** Module-level Sets (4 sites), beam effect vectors (4 sites), HashState static buffers, getNukeColor scratch color, getMissilesTargetingPlayer caching, toRemove arrays (3 sites), idle follow behavior vectors
- **O(N*M) scan elimination (1):** `hasIncomingMissiles` now uses per-tick `Set<Entity>`
- **Code duplication reduction (8):** Autoaim shared module, beam dt explicit parameter, weapon property helpers, resupply shortage logic, broadcastMessage utility, beam line functions merged, action-processing split, capitalize utility created
- **Dead code removal (4):** `actions.ts`, `tooltip.ts`, `session-state.ts`, `DECOY_CONSTANTS`
- **File splits (3):** `state-mission.ts` into 3 sub-modules, `projectile-hits.ts` config extracted, `missiles.ts` shrapnel extracted
- **Version handling fixes (2):** Campaign export and emergency save now accept older migratable versions
- **API improvements (2):** `showResults` refactored to options object, `worldsEqual` renamed to `worldHashesMatch`
- **Documentation/comments (5):** MT mask explanation, calculateInterceptPoint JSDoc, shieldHit hash skip rationale, evade heat comment, sendCallsignAnnounce broadcast comment
- **Other fixes (18):** Stale byte range comments, protocol validation improvements, module state resets, geometry sharing, beam color copy, torch material cleanup, and miscellaneous cleanup

---

## Architectural Strengths

Every review independently highlighted these qualities, which remain strong after the remediation round:

- **Principled ECS design** -- Entities are plain numbers, components are data-only interfaces, systems are pure `(world, dt) => void` functions. The `ComponentRegistry` type mapping provides compile-time safety with zero runtime overhead. 26 component types are perfectly consistent across the registry, serialization, and hashing layers.

- **Determinism-first architecture** -- Separate `prng` (simulation) and `renderPrng` (visual) on the World object. `SystemState` fields explicitly categorized as "simulation-critical" vs "transient/local." Seeded PRNG with `deriveKey` for save-scum-proof campaign randomness. Visual effects correctly use `renderPrng` throughout.

- **Strong allocation discipline** -- Module-level reusable vectors throughout all hot paths (30+ instances in weapon systems alone). Object pooling for projectile trails, explosions, muzzle flashes, lightning lines, and reticle target info. Per-tick caching for expensive lookups (missile target set, convoy centroid, station position, missile threat state).

- **Excellent multiplayer protocol** -- Binary encoding with symmetric encode/decode, size pre-calculation, bounds checking, exhaustive switch statements with `never` type checks, `HOST_ONLY_MESSAGES` trust boundary, auto-derived message range detection. Comprehensive `@mp-*` JSDoc annotations document actor, permission, flow, and UI impact for every message type.

- **Clean immutable state pattern** -- Campaign state, lobby state, and settings all use disciplined spread-operator updates. Auto-save leverages reference equality (`state === lastSavedState`) to skip no-op saves. Lobby state updater functions are consistent and predictable.

- **Well-engineered replay system** -- Versioned format with forward-compatible migration (versions 1-6), RLE + gzip compression, separate metadata for efficient listing, per-player input streams for multiplayer, deterministic world reconstruction from seed + inputs, `crypto.getRandomValues` for ID generation.

- **Thoughtful AI design** -- FSM with clean state boundaries, playstyle system with principled skill scaling and inversion handling, 12 mission-specific behavior modes, sophisticated weapon/missile selection scoring. Per-frame caching of expensive lookups. Well-calibrated 6-tier difficulty profiles with documented parameter rationales.

- **Strong file decomposition** -- All files under 400 lines with logical module boundaries. Large subsystems are cleanly split: nuclear lance (6 files), weapon display (4 files), HUD (11 files), skybox (5 files), reticles (4 files). The Screen framework enforces clean render/bind separation.

- **Consistent accessibility** -- ARIA roles, tablists, `aria-selected`, `aria-label`, `role="dialog"`, `aria-modal`, `role="status"`, `aria-hidden` used correctly throughout all UI screens.

- **Thorough XSS protection** -- All network-facing screens (lobby, chat, notifications, contracts) consistently use `escapeHtml()` on user-supplied and network-received text.

- **Robust error handling and cleanup** -- `fetchWithRetry` with exponential backoff, `ReconnectionManager` with jitter, `ProtocolError` for malformed messages, comprehensive `cleanupLobby()` chaining, three-layer save resilience (IndexedDB, localStorage emergency, pre-mission checkpoints), defensive settings loading with per-field validation and default fallback.
