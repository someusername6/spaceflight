# Codebase Review Summary

**Date:** February 2026
**Reviewer:** Claude Opus 4.6
**Scope:** Full codebase (~35,000 lines across ~300 files)
**Method:** 7 independent review agents, each covering a major subsystem

## Individual Reviews

| Review | Issues | Highest Severity |
|--------|--------|-----------------|
| [Core Architecture & ECS](core-architecture.md) | 3 | Low |
| [Combat & Weapon Systems](combat-weapons.md) | 6 | Low |
| [AI Systems](ai-systems.md) | 3 | Low |
| [Multiplayer & Networking](multiplayer-networking.md) | 6 | Low |
| [Campaign & Progression](campaign-progression.md) | 2 | Low |
| [Rendering & Visual Systems](rendering-visuals.md) | 3 | Low |
| [UI Framework & Screens](ui-screens.md) | 4 | Low |

**Total: 27 issues, all low severity**

---

## Overall Assessment

The codebase is in strong shape. There are no high or medium severity issues. All 27 remaining issues are low-severity design observations, minor allocation inconsistencies, and maintenance items. Every subsystem has no medium-or-higher issues.

The nature of remaining issues is predominantly:
- **Allocation patterns** (geometry clones, per-call array allocations) — individually negligible, noted for consistency
- **Design observations** (god-object growth, message type reuse, navigation depth)
- **Minor maintenance** (redundant wrapper functions, battle canvas duplication)
- **Defensive hardening** (unescaped pilot names, unvalidated JSON.parse)

---

## Cross-Cutting Themes

### Remaining Allocation Inconsistencies

A small set of per-frame or per-call allocations remain:

- `lightning-bolt.ts` allocates vectors in generation functions (Rendering)
- Geometry `.clone()` calls on infrequent effects (Rendering: nuclear lance, explosions)
- `findAllBeamHits` allocates fresh arrays per call (Combat)
- `destroyProjectilesInRadius` allocates a local array per call (Combat)

These are lower impact than typical per-frame allocations (most fire infrequently or on small data), but they break the otherwise consistent allocation discipline.

### Minor Maintenance Items

- `formatShipClass()` wrapper in `skill-rendering.ts` duplicates `capitalize()` (UI)
- Battle canvas re-attachment pattern duplicated in settings and load-campaign screens (UI)
- Pilot names unescaped in 3 UI files (viewer.ts, card.ts, ship-item.ts) (UI)

---

## Architectural Strengths

Every review independently highlighted these qualities:

- **Principled ECS design** -- Entities are plain numbers, components are data-only interfaces, systems are pure `(world, dt) => void` functions. The `ComponentRegistry` type mapping provides compile-time safety with zero runtime overhead. 26 component types are perfectly consistent across the registry, serialization, and hashing layers. Positive entity identification via `shipTag` component.

- **Determinism-first architecture** -- Separate `prng` (simulation) and `renderPrng` (visual) on the World object. `SystemState` fields explicitly categorized as "simulation-critical" vs "transient/local." Seeded PRNG with `deriveKey` for save-scum-proof campaign randomness. Visual effects correctly use `renderPrng` throughout.

- **Strong allocation discipline** -- Module-level reusable vectors throughout all hot paths (30+ instances in weapon systems alone). Object pooling for projectile trails, explosions, muzzle flashes, lightning lines, and reticle target info. Per-tick caching for expensive lookups (missile target set, convoy centroid, station position, missile threat state). Pooled weapon index arrays.

- **Excellent multiplayer protocol** -- Binary encoding with symmetric encode/decode, size pre-calculation, bounds checking, exhaustive switch statements with `never` type checks, `HOST_ONLY_MESSAGES` trust boundary, auto-derived message range detection. Comprehensive `@mp-*` JSDoc annotations document actor, permission, flow, and UI impact for every message type.

- **Clean immutable state pattern** -- Campaign state, lobby state, and settings all use disciplined spread-operator updates. Auto-save leverages reference equality (`state === lastSavedState`) to skip no-op saves. Lobby state updater functions are consistent and predictable.

- **Well-engineered replay system** -- Versioned format with forward-compatible migration (versions 1-6), RLE + gzip compression, separate metadata for efficient listing, per-player input streams for multiplayer, deterministic world reconstruction from seed + inputs, `crypto.getRandomValues` for ID generation.

- **Thoughtful AI design** -- FSM with clean state boundaries, playstyle system with principled skill scaling and inversion handling, 12 mission-specific behavior modes, sophisticated weapon/missile selection scoring. Per-frame caching of expensive lookups. Well-calibrated 6-tier difficulty profiles with documented parameter rationales.

- **Strong file decomposition** -- All files under 400 lines with logical module boundaries. Large subsystems are cleanly split: nuclear lance (6 files), weapon display (4 files), HUD (11 files), skybox (5 files), reticles (4 files). The Screen framework enforces clean render/bind separation.

- **Consistent accessibility** -- ARIA roles, tablists, `aria-selected`, `aria-label`, `role="dialog"`, `aria-modal`, `role="status"`, `aria-hidden` used correctly throughout all UI screens.

- **Thorough XSS protection** -- All network-facing screens (lobby, chat, notifications, contracts) consistently use `escapeHtml()` on user-supplied and network-received text. Squadron list and roster pilot viewer also escape pilot names.

- **Robust error handling and cleanup** -- `fetchWithRetry` with exponential backoff, `ReconnectionManager` with jitter, `ProtocolError` for malformed messages, comprehensive `cleanupLobby()` chaining, three-layer save resilience (IndexedDB, localStorage emergency, pre-mission checkpoints), defensive settings loading with per-field validation and default fallback.

- **Data-driven weapon behavior** -- Beam type detection uses data properties (`isInstantBeam`, `heatInjection`, `isPulseBeam`) instead of hardcoded name strings. Faction guards are consistent across missile AOE functions. Results UI uses clean options interfaces.
