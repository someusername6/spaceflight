# Claude Code Rules for This Project

## Workflow Rules

- **NEVER commit without explicit approval** - Do not run `git commit` unless the user explicitly asks you to commit. This applies even after context compaction.

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
| Add a mission | `src/ui/screens/missions/sector*/` (see Mission Types below) |
| Mission launcher | `src/campaign/mission/*-launcher.ts` |
| Mission types | `src/campaign/types.ts` (Contract, MissionType, mission data interfaces) |

## Status Verification (MANDATORY)

Before claiming any feature is "not implemented" or making status/priority recommendations:

1. **SEARCH** the codebase for related files (Glob/Grep)
2. **READ** the relevant files to understand what exists
3. **CITE EVIDENCE** - make claims with file:line references

**Never rely on:** conversation summaries, planning documents, or memory of what was "just implemented".

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

## Mission Types

Four mission types exist, each with distinct victory/defeat conditions and reward structures:

| Type | Victory | Defeat | Reward |
|------|---------|--------|--------|
| `elimination` | All enemies destroyed | Commander dies | Fixed 100% |
| `escort` | ≥1 convoy escapes | All convoy destroyed OR commander dies | % convoy survived |
| `station-defense` | Station survives | Station destroyed OR commander dies | % station hull |
| `ambush` | All convoy neutralized | Any convoy escapes OR commander dies | 100% stopped, 50% destroyed |

### Adding a New Mission of Existing Type

1. Create contract in `src/ui/screens/missions/sector{N}/{type}.ts`
2. Export from `src/ui/screens/missions/sector{N}/index.ts`
3. Follow existing patterns for difficulty balance targets

### Creating a New Mission Type

Required changes:

1. **Types** (`src/campaign/types.ts`):
   - Add to `MissionType` union
   - Create `{Type}MissionData` interface
   - Add optional `{type}Data` field to `Contract`

2. **Launcher** (`src/campaign/mission/{type}-launcher.ts`):
   - `launch{Type}Mission(world, contract, campaignState)` - spawns entities
   - Handle win/lose detection and reward calculation
   - Set `missionEndState.rewardMultiplier` if reward scales

3. **Mission Launcher** (`src/campaign/mission/mission-launcher.ts`):
   - Add case in `launchMission()` to call your launcher

4. **Contract Rendering** (`src/ui/screens/contracts-rendering.ts`):
   - Add `render{Type}Info(contract)` function
   - Add case in `renderContractDetail()` to display mission info

5. **Results Display** (`src/ui/screens/results/results.ts`):
   - Add `{Type}ResultsDisplay` interface if needed
   - Update `renderRewards()` to show mission-specific results

6. **Mission Handlers** (`src/campaign/handlers/mission-handlers.ts`):
   - Add results parameter to `showResults()` if needed

7. **Mission Callbacks** (`src/campaign/mission/mission-callbacks.ts`):
   - Pass mission results to `showResults()`

8. **Replay** (`src/replay/`):
   - If mission type affects replay, update `types.ts` and `mission-setup.ts`

9. **Missions** (`src/ui/screens/missions/sector*/`):
   - Create `{type}.ts` files for each sector with contracts

### Balance Targets by Difficulty

| Difficulty | Win Rate | Wingman Survival (on wins) |
|------------|----------|----------------------------|
| Easy | 80-90% | 3.0-3.5 of 4 |
| Medium | 70-80% | 2.5-3.0 of 4 |
| Hard | 60-70% | 2.0-2.5 of 4 |

**Note**: Attack-station missions have different targets due to sustained combat - see mission file headers.

### Mission Balancing Process

When rebalancing missions, follow this systematic approach:

1. **Analyze working examples first**: If a similar mission already has good balance, study WHY it works (enemy count, skill levels, reinforcement timing) and adapt from there rather than starting from scratch.

2. **Understand variable relationships**:
   - Enemy count/skill → primarily affects win rate
   - Reinforcement timing → affects both win rate AND survival
   - Initial allies → affect both metrics (they protect everyone including assault ships)
   - Station type (attack-station) → directly affects difficulty (mining=12500, refinery=15000, military=10000 HP)

3. **Tune one metric at a time**: Get win rate in range first, THEN adjust survival.

4. **Use larger increments**: Change enemy count by 2-3, delay by 15-20s to find the ballpark faster.

5. **Know the constraints**:
   - Sector 1 allies: `fighter`, `assaultFighter` only
   - Sector 1 enemies: `gnat`, `ember`, `shocker`, `mantis` (rookie/regular/veteran)
   - Each reinforcement wave needs at least 2 ships
   - Overwhelming wave timing (180s) should not change

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
npx tsx scripts/tests/run-tests.mjs                   # Quick tests (default, ~20s)
npx tsx scripts/tests/run-tests.mjs --all             # All tests (balance in advisory mode)
npx tsx scripts/tests/run-tests.mjs --balance         # Balance tests only (advisory mode)
npx tsx scripts/tests/run-tests.mjs --balance --strict  # Balance tests with strict failures
```

### Test Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Quick tests | `scripts/tests/` | Fast, deterministic logic tests (~45 test files) |
| Balance tests | `scripts/tests/combat/`, `campaign/` | Simulation-based balance verification (advisory) |

**Advisory mode**: Balance tests run and report results but don't fail the build. Use `--strict` to enforce failures when explicitly checking balance.

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
