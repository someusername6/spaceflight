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
