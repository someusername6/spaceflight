# Code Architecture Review

## ECS Architecture

The game uses an Entity-Component-System pattern:

### Components
- Pure data interfaces (no methods)
- Located in `src/components/`
- Examples: health, shields, physics, weapons, ai

### Systems
- Pure functions: `(world: World, dt: number) => void`
- Located in `src/systems/`
- Ordered execution via `SYSTEM_ORDER` in `src/game.ts`

### Entities
- Simple numeric IDs
- Components attached via world functions
- Queried with component requirements

## Key Architectural Decisions

### Determinism
- Seeded PRNG (`src/core/prng.ts`) - no `Math.random()`
- Fixed timestep physics (1/60s)
- Separate `world.renderPrng` for visual-only randomness
- Supports replay system

### File Organization
| Area | Location |
|------|----------|
| Components | `src/components/` |
| Systems | `src/systems/` |
| Data definitions | `src/data/` |
| Entity factories | `src/factories/` |
| Campaign logic | `src/campaign/` |
| UI screens | `src/ui/screens/` |
| Rendering | `src/rendering/` |

### File Size Limit
- Max 400 lines per file
- Enforced by pre-commit hook
- Forces modular design

## UI Framework

Custom screen framework (`src/ui/framework/screen.ts`):
- Pure render functions (HTML strings)
- Automatic event cleanup
- Event delegation
- State management via `setState()`

## Campaign Architecture

### State Management
- Immutable updates in `src/campaign/loadout.ts`
- Campaign state in `src/campaign/types.ts`
- Persistence via IndexedDB

### Controller Pattern
- `src/campaign/controller.ts` orchestrates flow
- Handlers in `src/campaign/handlers/`
- Mission launchers in `src/campaign/mission/`

## Strengths

1. **Clear Separation** - ECS keeps logic organized
2. **Deterministic Design** - Replay-safe from the start
3. **Modular Files** - 400-line limit prevents god files
4. **Consistent Patterns** - Same approach across codebase
5. **Type Safety** - Full TypeScript coverage

## Areas for Improvement

1. **System Dependencies** - Order matters but isn't explicit
2. **Component Sprawl** - Many small component files
3. **Mixed Concerns** - Some systems do rendering
4. **Testing Gaps** - Not all systems have tests
5. **Documentation** - Limited inline comments

## Code Quality

### Formatting
- Biome for linting/formatting
- Pre-commit hooks enforce standards
- `npm run lint` before commits

### Testing
- Node.js built-in test runner
- Quick tests (~36 files)
- Balance tests (simulation-based)
- Determinism tests for replay

## Recommendations

1. Add explicit system dependency graph
2. Consider component composition patterns
3. Separate rendering from game systems
4. Increase test coverage for edge cases
5. Add JSDoc comments for public APIs
