# Codebase Review Summary

**Date:** February 2026
**Reviewer:** Claude Opus 4.6
**Scope:** Full codebase (~35,000 lines across ~300 files)
**Method:** 7 independent review agents, each covering a major subsystem

## Individual Reviews

| Review | Issues | Highest Severity |
|--------|--------|-----------------|
| [Core Architecture & ECS](core-architecture.md) | 8 | Medium |
| [Combat & Weapon Systems](combat-weapons.md) | 10 | Medium |
| [AI Systems](ai-systems.md) | 3 | Low |
| [Multiplayer & Networking](multiplayer-networking.md) | 17 | Medium |
| [Campaign & Progression](campaign-progression.md) | 8 | Medium |
| [Rendering & Visual Systems](rendering-visuals.md) | 7 | Low |
| [UI Framework & Screens](ui-screens.md) | 10 | Low |

**Total: 63 issues (7 medium, 56 low)**

---

## Overall Assessment

The codebase is in good shape. There are no high-severity issues. The 7 medium-severity issues span multiplayer state management, a combat system bug, campaign code organization, and core infrastructure concerns. Three subsystems -- AI, Rendering, and UI -- have no medium-or-higher issues, indicating those areas are particularly strong.

The nature of remaining issues is predominantly design observations, minor allocation inconsistencies, and maintenance items like code duplication and parameter style. The multiplayer layer has the most issues (17), though most are low-severity design observations about protocol edge cases and minor state management concerns.

---

## Medium-Severity Issues

1. **Beam hash omits simulation-critical ActiveBeam fields** -- `src/serialization/hashing.ts:117-126` -- `lastInstantFireTime`, `pulseActive`, and `lastPulseTime` affect simulation outcomes but are not included in the beam hash, making multiplayer desync undetectable for these fields. *(Core Architecture)*

2. **Game loop has no accumulator cap (spiral of death)** -- `src/game.ts:170-177` -- If the browser tab is backgrounded and foregrounded, `requestAnimationFrame` delivers a large delta causing hundreds or thousands of ticks in one frame. *(Core Architecture)*

3. **AI single-weapon selection silently fails due to linkMode mismatch** -- `src/systems/weapons/weapons-ai.ts:99-104` -- `setLinkModeByType` receives weapon display names but `linkModes` contains bank index strings, so AI "single weapon" selection always falls back to linked fire, undermining heat/ammo conservation and tactical weapon choice. *(Combat & Weapons)*

4. **PauseCoordinator captures `lobbyState` by reference at init time** -- `src/multiplayer/pause-coordinator.ts:67` -- The destructured `lobbyState` becomes stale after any lobby state update (immutable pattern replaces the object). Closures like `getLocalCallsign()` and `doPause()` read from the stale reference. *(Multiplayer & Networking)*

5. **Denormalized pilot data requires fragile dual updates** -- `src/campaign/state-mission-results.ts:144-171` and `src/campaign/state-mission-stats.ts:117-148` -- Pilot data exists in both `state.pilots[]` and `state.ships[].pilot`, requiring every mutation to update both locations. *(Campaign & Progression)*

6. **`showMultiplayerResults` still uses 12 positional parameters** -- `src/campaign/handlers/mission-results.ts:113-126` -- Unlike the singleplayer `showResults` which uses an options interface, the multiplayer variant still takes 12 positional arguments. *(Campaign & Progression)*

7. **Lobby re-bind code duplicated across handler files** -- `src/campaign/handlers/mission-results.ts:156-204` and `src/campaign/handlers/mission-handlers.ts:110-162` -- ~50 lines of `bindLobbyScreen` callback wiring duplicated nearly identically. *(Campaign & Progression)*

---

## Cross-Cutting Themes

### Remaining Allocation Inconsistencies

A small set of per-frame or per-call allocations remain:

- `getWeaponIndicesForCurrentMode` allocates an array per call, ~30-40 times/frame (Combat)
- `lightning-bolt.ts` allocates vectors in pulse functions (Rendering)
- Geometry `.clone()` calls on infrequent effects (Rendering: beam-glow, shield-effects, nuclear lance)
- `findAllBeamHits` allocates fresh arrays per call (Combat)
- `destroyProjectilesInRadius` allocates a local array per call (Combat)

These are lower impact than typical per-frame allocations (most fire infrequently or on small data), but they break the otherwise consistent allocation discipline.

### Minor Code Duplication

- `broadcastAndApply` duplicated in `lobby-actions.ts` and `lobby-kick.ts` (Multiplayer)
- Resupply message-building loops duplicated between two files (Campaign)
- Inline `capitalize()` at 8 call sites despite shared utility existing (UI)
- `createResultsUI` takes 13 positional parameters with `undefined` placeholders (Campaign)
- Battle canvas re-attachment pattern duplicated in settings and load-campaign screens (UI)

### Hardcoded String Comparisons

Weapon name string literals appear in beam type checks (`beam-continuous.ts:81-82` checks `weapon.name === 'Nuclear Lance'` and `weapon.name === 'Torch'`). Data-driven properties exist that could replace these checks.

---

## Architectural Strengths

Every review independently highlighted these qualities:

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
