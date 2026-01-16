# Architecture Review

**Date:** 2026-01-16
**Reviewer:** Claude Code (Automated)
**Scope:** Full codebase architecture analysis

---

## Executive Summary

Spaceflight demonstrates excellent adherence to ECS (Entity-Component-System) architecture principles, with clean separation of concerns and strong TypeScript type safety. The codebase follows its own documented conventions well, with no `any` types, proper use of seeded PRNG, and components that remain data-only interfaces.

**Overall Assessment: Strong** - The architecture is well-designed, maintainable, and follows established patterns consistently. Minor issues exist around file size limits and some Date.now() usage outside deterministic game logic.

---

## 1. ECS Architecture

### Rating: Excellent

The ECS implementation in `src/core/ecs.ts` (256 lines) is textbook correct:

**Components are data-only interfaces:**
- `src/components/health.ts:7-13` - Health component is a pure interface with no methods
- `src/components/transform.ts:8-12` - Transform component stores position/rotation data only
- `src/components/shields.ts:13-22` - Shields component has no behavior attached
- `src/components/ai.ts:35-58` - AIControlled stores state machine data, not logic

**Systems are pure functions:**
- `src/systems/collision.ts:54` - `collisionSystem(world: World, _dt: number): void`
- `src/systems/damage.ts:43` - `damageSystem(world: World, _dt: number): void`
- `src/systems/ai/ai.ts:38` - `aiSystem(world: World, dt: number): void`
- `src/game.ts:68-85` - `SIMULATION_SYSTEMS` array defines explicit execution order

**World holds all state:**
- `src/core/types.ts:190-203` - World interface consolidates entities, components, PRNG, and system state
- `src/core/types.ts:68-186` - SystemState centralizes all mutable state that was previously module-level

**Strengths:**
- Explicit system execution order documented in `src/game.ts:42-62`
- Separate PRNG for simulation (`world.prng`) and rendering (`world.renderPrng`) - addresses historical determinism bug
- Entity queries use generators for memory efficiency: `src/core/ecs.ts:180-191`

---

## 2. Module Organization

### Rating: Good

**Directory Structure:**

| Directory | Purpose | Organization Quality |
|-----------|---------|---------------------|
| `src/core/` | ECS framework, types, PRNG | Clean, minimal dependencies |
| `src/components/` | Data-only component definitions | Excellent isolation |
| `src/systems/` | Game logic systems | Well-organized with sub-modules |
| `src/data/` | Static game data (weapons, ships, AI profiles) | Single source of truth pattern |
| `src/factories/` | Entity creation functions | Clear factory pattern |
| `src/rendering/` | Three.js rendering code | Properly separated from simulation |
| `src/campaign/` | Campaign state management | Good handler delegation pattern |
| `src/ui/` | Screen framework and UI components | Consistent framework usage |

**Dependency Flow (Clean):**
```
core/ <- components/ <- systems/ <- factories/
                     <- data/

rendering/ depends on: core/, components/ (read-only for display)
campaign/ depends on: core/, components/, data/, ui/
```

**Evidence of clean dependencies:**
- Components do not import from systems: Grep for `import.*from '\.\./\.\./systems` in components returns no matches
- `src/core/types.ts` uses dynamic imports for cross-cutting concerns (lines 179, 198-200)

**Campaign controller follows handler delegation:**
- `src/campaign/controller.ts` is only 132 lines (thin orchestrator)
- Handlers split into `menu-handlers.ts`, `campaign-handlers.ts`, `mission-handlers.ts`, `pause-handler.ts`

---

## 3. File Size Compliance

### Rating: Good (No Violations)

**Project rule:** Maximum 400 lines per file

**Files approaching the limit (but compliant):**
| File | Lines | Status |
|------|-------|--------|
| `src/rendering/effects/projectile-hits.ts` | 397 | Within limit |
| `src/systems/weapons/weapon-spawning.ts` | 393 | Within limit |
| `src/ui/ship/connectors.ts` | 390 | Within limit |
| `src/simulation/battle-simulation.ts` | 389 | Within limit |
| `src/systems/weapons/missiles.ts` | 381 | Within limit |

**Observation:** The largest files are rendering effects and weapon systems, which have been appropriately split into sub-modules:
- `weapons/` split into: `beams.ts`, `missiles.ts`, `projectiles.ts`, `weapon-spawning.ts`, `beam-raycasting.ts`, etc.
- `rendering/beam-effects/` split into: `lightning.ts`, `nuclear-lance-beam.ts`, `nuclear-lance-impact.ts`, etc.

**Recommendation:** Monitor `projectile-hits.ts` (397 lines) - consider splitting if it grows further.

---

## 4. Code Patterns

### Rating: Excellent

**Consistent Patterns Observed:**

1. **Component creation functions:**
   - Pattern: `createComponentName(params): Component`
   - Examples: `createHealth()`, `createShields()`, `createTransform()`, `createAIControlled()`
   - Location: Every component file follows this pattern

2. **Factory functions for entities:**
   - `src/factories/ship.ts:88-165` - `createPlayerShip()` creates entity with all required components
   - `src/factories/ship.ts:167-273` - `createAIShip()` with profile-based configuration

3. **UI Screen Framework:**
   - Framework: `src/ui/framework/screen.ts` (267 lines)
   - Pattern: Separate `render()` and `bind()` methods
   - Example: `src/ui/screens/contracts.ts:148-273` - ContractsScreenComponent follows pattern exactly
   - Proper cleanup via `api.on()` delegation instead of raw `addEventListener`

4. **Immutable state updates in campaign:**
   - `src/campaign/loadout.ts` uses spread operators for immutable updates
   - `src/campaign/state.ts` follows same pattern

5. **Seeded PRNG usage:**
   - `src/core/prng.ts` provides deterministic random functions
   - Systems use `world.prng` for simulation, `world.renderPrng` for visual effects

**Anti-pattern check - Math.random():**
- Found in `src/replay/storage.ts:105` - Used for replay ID generation (non-deterministic by design)
- Comment in `src/core/mersenne-twister.ts:14` explicitly documents no Math.random() fallback

---

## 5. Type Safety

### Rating: Excellent

**No `any` types found in source code.** Search for `\bany\b` in `.ts` files returned only:
- Comments (e.g., "any range", "any weapon")
- No actual type annotations using `any`

**Strong typing practices:**

1. **Generic component queries:**
   - `src/core/ecs.ts:129-137` - `getComponent<T extends ComponentBase>()` with proper type narrowing

2. **ComponentType limitation acknowledged:**
   - `src/core/types.ts:24-30` documents the string-based ComponentType as a known limitation
   - Suggests future improvement with literal union types

3. **Branded types for Entity:**
   - `src/core/types.ts:11` - `Entity = number` could benefit from branded type for compile-time safety
   - `src/core/types.ts:14` - `NO_ENTITY = -1 as Entity` sentinel value defined

4. **Readonly component types:**
   - `src/components/weapons.ts:121-134` - PrimaryWeapons uses `readonly type`, `readonly linkModes`, etc.

5. **Proper interface-based component definitions:**
   - All components extend `ComponentBase` with `readonly type: string`

---

## 6. Separation of Concerns

### Rating: Good

**Game Logic vs Rendering:**
- Clear separation: `src/systems/` contains no Three.js code
- `src/rendering/renderer.ts` only reads from World, never mutates simulation state
- `src/rendering/renderer.ts:149` - `syncScene()` takes world as read-only input

**UI vs Business Logic:**
- UI screens in `src/ui/screens/` are presentation-focused
- Business logic delegated to `src/campaign/` modules
- State changes flow through props/callbacks, not direct mutation

**Data vs Logic:**
- Static data centralized in `src/data/` (weapons.ts, ships.ts, missiles.ts, ai-profiles.ts)
- Factories in `src/factories/` convert data into entities
- Systems in `src/systems/` operate on entities without hard-coded data

**Minor Issue - Date.now() Usage:**

Date.now() appears in several places outside deterministic game logic:

| File | Line | Context | Acceptable? |
|------|------|---------|-------------|
| `src/campaign/state.ts` | 81 | Campaign seed generation | Yes - one-time initialization |
| `src/replay/storage.ts` | 104, 181, 189 | Replay timestamps | Yes - metadata only |
| `src/campaign/storage/` | Various | Save/checkpoint timestamps | Yes - persistence metadata |
| `src/simulation/battle-simulation.ts` | 213 | Title screen battle RNG seed | Yes - visual-only simulation |

All usages are appropriate for non-deterministic contexts.

---

## Specific Issues

### Issue 1: Component with behavior helper functions

**Location:** `src/components/shields.ts:76-94`

The `regenerateShields()` function in the component file contains logic that could be considered system behavior. However, this is a reasonable design choice - it keeps shield-specific calculations encapsulated and is called by the shield system.

**Severity:** Low (design preference, not a bug)

### Issue 2: Re-exports for backward compatibility

**Location:** Multiple component files

Several component files have re-exports marked for backward compatibility:
- `src/components/weapons.ts:151` - `WEAPON_DEFS` deprecated
- `src/systems/collision.ts:18` - Re-exports collision types

**Severity:** Low (technical debt, not breaking)

### Issue 3: Object pooling complexity

**Location:** `src/systems/collision.ts:21-48`

The collision system implements object pooling to avoid allocations. While performance-conscious, the `null as unknown as` casts (`lines 38-39`) reduce type safety.

**Severity:** Low (necessary performance optimization)

---

## Recommendations

### High Priority

1. **Document ComponentType evolution path** - The string-based ComponentType noted in `src/core/types.ts:24-30` should have a tracked issue for future type-safe implementation.

### Medium Priority

2. **Monitor large files** - Set up automated checks for files approaching 400 lines:
   - `projectile-hits.ts` (397 lines)
   - `weapon-spawning.ts` (393 lines)
   - `connectors.ts` (390 lines)

3. **Consider Entity branding** - Using TypeScript branded types for Entity would catch entity/number confusion at compile time.

### Low Priority

4. **Clean up deprecated re-exports** - The backward compatibility re-exports should be removed in a future version.

5. **Pool typing improvement** - Consider a generic pool implementation that doesn't require `null as unknown as` casts.

---

## Strengths Summary

1. **Exemplary ECS implementation** - Components are pure data, systems are pure functions, explicit execution order
2. **Zero `any` types** - Strong TypeScript discipline across the codebase
3. **Deterministic simulation** - Proper seeded PRNG with separate render PRNG to prevent contamination
4. **Clean module boundaries** - Components don't import systems, rendering doesn't mutate simulation
5. **Consistent patterns** - UI framework, factory functions, and state management follow established conventions
6. **Good documentation** - CLAUDE.md provides clear guidance, historical bugs documented in replay code

## Weaknesses Summary

1. **ComponentType is stringly-typed** - Could benefit from literal union types for compile-time safety
2. **Some files approaching size limit** - Need monitoring to prevent violations
3. **Object pool typing** - Performance optimization reduces some type safety

---

## Conclusion

The Spaceflight codebase demonstrates mature architecture practices. The ECS pattern is implemented correctly and consistently, module boundaries are respected, and TypeScript is used effectively without type escape hatches. The few areas identified for improvement are minor and do not impact the overall quality or maintainability of the codebase.

**Recommendation:** Continue current practices. Address high-priority recommendations when convenient. The codebase is well-positioned for continued development.
