# Claude Code Rules for This Project

## Game Overview

**Spaceflight** is a space dogfight roguelike. Players command a squadron through procedurally generated sectors, taking contracts (missions) to earn credits and salvage. Combat is real-time 3D with an ECS architecture. The title screen renders a live battle simulation in the background.

Core loop: Squadron management → Contract selection → Combat mission → Rewards → Repeat

Permadeath: If the commander's ship is destroyed, the campaign ends.

## Where to Find Things

| Task | Location |
|------|----------|
| Add a weapon | `src/data/weapons.ts` → `src/factories/weapon.ts` |
| Add a ship | `src/data/ships.ts` → `src/factories/ship.ts` |
| Add a missile | `src/data/missiles.ts` → `src/factories/missile.ts` |
| New UI screen | `src/ui/screens/` (use Screen framework) |
| New system | `src/systems/` → add to `SYSTEM_ORDER` in `src/game.ts` |
| Campaign flow | `src/campaign/controller.ts` → `src/campaign/handlers/` |
| Game settings | `src/settings/game-settings.ts` |

## Status Verification (MANDATORY)

Before claiming any feature is "not implemented" or making status/priority recommendations:

1. **SEARCH** the codebase for related files (Glob/Grep)
2. **READ** the relevant files to understand what exists
3. **CROSS-REFERENCE** with `docs/PROGRESS.md`
4. **CITE EVIDENCE** - make claims with file:line references

**Never rely on:** conversation summaries, planning documents, or memory of what was "just implemented".

After completing any feature, update `docs/PROGRESS.md` with file:line references.

## Code Quality Rules

- **Max 400 lines per file** - Split if larger
- **Components are interfaces** - No methods, no classes
- **Systems are pure functions** - `(world: World, dt: number) => void`
- **No `Math.random()`** - Use seeded PRNG from `src/core/prng.ts`
- **No `Date.now()` in game logic** - Fixed timestep only

## Formatting Rules (MANDATORY)

This project uses Biome for formatting. Run `npm run lint` before committing.

**STOP SIGNAL:** If a file approaches 400 lines, **STOP**. The only correct response is to split into modules. Never:
- Compress multiple statements onto one line
- Remove blank lines or comments to reduce line count
- Remove functionality to fit the limit

**Correct response:** Identify logically separable code and extract to new module(s).

## UI Screen Pattern

All UI screens must use the Screen framework in `src/ui/framework/screen.ts`.

**Key Rules:**
1. **Never use raw `addEventListener`** - Use `api.on()`, `api.onRoot()`, or `api.onGlobal()`
2. **Always clean up handles** - Call `screenHandle?.destroy()` before creating new ones
3. **Keep render pure** - No side effects in `render()`, only return HTML string
4. **Bind after render** - `bind()` is called after every `render()`, handlers are auto-cleared

See `src/ui/framework/screen.ts` for the full API.

## Pattern References

When working in these areas, read the source for patterns:

- **Screen framework**: `src/ui/framework/screen.ts`
- **Weapon/missile icons**: `src/ui/utils/weapon-icon.ts`
- **Campaign controller**: `src/campaign/controller.ts` and `src/campaign/handlers/`
- **ECS patterns**: `src/core/ecs.ts`
- **State mutations**: `src/campaign/loadout.ts` (immutable update pattern)
- **Replay system**: `src/replay/` (see Replay Determinism below)

## Replay Determinism (CRITICAL)

The replay system records player inputs and reconstructs battles deterministically. **Any entity that affects simulation must be reconstructed identically.**

### When Modifying Mission/Combat Features, Ask:

1. Does this add new entities that affect combat? (ships, weapons, abilities)
2. Does this change how entities are configured? (stats, loadouts, positions)
3. Does this introduce new sources of randomness?

If YES to any: **Update the replay system** in `src/replay/`.

### Replay Reconstruction Checklist

When adding features that affect missions, ensure replay captures:

- [ ] Player ship class and stats
- [ ] Player weapons (type, bank size, ammo counts)
- [ ] Wingmen (loadouts and starting positions)
- [ ] Any new entity types that affect outcomes
- [ ] Any configuration that varies between runs

### Key Files

| File | Purpose |
|------|---------|
| `src/replay/types.ts` | Data structures (bump `REPLAY_VERSION` when changing) |
| `src/input/input-recorder.ts` | Captures data at mission START |
| `src/campaign/mission/mission-callbacks.ts` | Saves replay at mission END |
| `src/replay/mission-setup.ts` | Reconstructs world for playback |
| `src/replay/storage.ts` | Version migration for old replays |

### Historical Bugs

**v2 → v3: Missing loadout data**
- Live game used campaign loadouts; replay used archetype defaults
- Live game spawned wingmen; replay didn't
- Fix: Added `playerLoadout` and `wingmen` to replay data format

**v3: Rendering PRNG contamination**
- Rendering code (lightning, missile exhaust) consumed `world.prng`
- PRNG state diverged based on frame rate, not tick count
- Fix: Added `world.renderPrng` for visual-only randomness

**v3: Wave initialization mismatch**
- Replay was missing `waveState.currentWave = -1` for delayed first waves
- Fix: Created shared `initializeFirstWave()` and `processWaveTick()` in `mission-waves.ts`

## Testing

### Running Tests

```bash
npx tsx scripts/tests/run-tests.mjs          # Quick tests (default, ~20s)
npx tsx scripts/tests/run-tests.mjs --all    # All tests including balance
npx tsx scripts/tests/run-tests.mjs --balance # Balance tests only
```

### Test Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Quick tests | `scripts/tests/` | Fast, deterministic logic tests (~36 test files) |
| Balance tests | `scripts/tests/combat/`, `campaign/` | Simulation-based balance verification |

### Test Framework

All tests use Node.js built-in test runner (`node:test`) with `describe`/`it` pattern:

```javascript
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('Feature', () => {
  it('does something', () => {
    assert.strictEqual(actual, expected, 'message');
  });
});
```

### Key Test Files

| Area | Files |
|------|-------|
| ECS/Game | `integration/test-game.mjs`, `test-architecture.mjs` |
| Weapons | `weapons/test-weapons*.mjs` |
| AI | `ai/test-ai-*.mjs` |
| Campaign | `campaign/test-*.mjs` |
| Campaign Storage | `campaign/test-campaign-storage.mjs` (uses IndexedDB polyfill) |
| Replay | `replay/test-*.mjs`, `systems/test-input-replay.mjs` |
| Determinism | `systems/test-input-replay.mjs` |

### Shared Test Utilities

- `scripts/tests/shared/replay-test-utils.mjs` - Battle simulation helpers, checksum computation

### Browser API Polyfills

The campaign storage tests (`test-campaign-storage.mjs`) require browser API polyfills to run in Node.js:

- **IndexedDB**: Uses `fake-indexeddb` package (npm dev dependency)
- **localStorage**: Simple in-memory Map-based polyfill defined in test file

When adding tests for browser-only code, follow the same pattern:
```javascript
// At top of test file, BEFORE imports that use browser APIs
import 'fake-indexeddb/auto';  // Polyfill indexedDB
globalThis.localStorage = { ... };  // Polyfill localStorage
```
