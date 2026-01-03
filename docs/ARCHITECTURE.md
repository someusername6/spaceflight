# Architecture

## Entity-Component-System (ECS)

This game uses a custom lightweight ECS architecture designed for:
- Deterministic execution (multiplayer-ready)
- Maintainability (small files, clear responsibilities)
- Simplicity (no external dependencies beyond three.js)

### Core Concepts

**Entity:** A unique numeric ID. Nothing more.

**Component:** Plain data object with a type tag. No methods.

```typescript
// CORRECT - component is just data
interface Transform {
  type: 'transform';
  position: Vector3;
  rotation: Quaternion;
}

// WRONG - components don't have methods
class Transform {
  translate(v: Vector3) { ... }  // NO!
}
```

**System:** Pure function that operates on entities with specific components.

```typescript
// CORRECT - system is a pure function, all state in world
function updatePhysics(world: World, dt: number): void {
  for (const entity of query(world, ['transform', 'physics'])) {
    // operate on component data
  }
}

// WRONG - system has module-level mutable state
let lastTime = 0;  // NO! State belongs in world.systemState
function updatePhysics(world: World, dt: number): void { ... }
```

**World:** Container for ALL game state. Includes:
- `entities`: Set of entity IDs
- `components`: Map of entity to component data
- `systemState`: System-specific state (replaces module-level variables)

### System State

Systems that need persistent state between frames store it in `world.systemState`:

```typescript
// In types.ts
interface SystemState {
  gameTime: number;  // Shared game clock
  weapons: { prevInput: {...} };  // Edge detection
  beams: { activeBeams: Map<Entity, ActiveBeam[]> };  // Render state
}

// In a system
function weaponSystem(world: World, dt: number): void {
  const state = world.systemState.weapons;
  const gameTime = world.systemState.gameTime;
  // Use state instead of module-level variables
}
```

This ensures:
1. All state lives in World (true to ECS principles)
2. Systems remain pure functions
3. State resets when a new World is created
4. No hidden module-level dependencies

### System Execution Order

Systems run in a fixed, explicit order defined in `src/game.ts`:

```typescript
const SYSTEM_ORDER = [
  inputSystem,       // 1. Read player input
  targetingSystem,   // 2. Process target selection
  aiSystem,          // 3. AI decision making
  aimErrorSystem,    // 4. Update AI aim drift
  weaponSystem,      // 5. Handle firing
  beamSystem,        // 6. Handle beam damage
  physicsSystem,     // 7. Apply movement
  projectileSystem,  // 8. Move projectiles
  missileSystem,     // 9. Move missiles with tracking
  collisionSystem,   // 10. Detect collisions
  damageSystem,      // 11. Apply damage
  shieldSystem,      // 12. Regenerate shields
  heatSystem,        // 13. Cool heat
  cleanupSystem,     // 14. Remove dead entities, spawn explosions
  explosionSystem,   // 15. Update explosion effects
  missionSystem,     // 16. Check win/lose
];
```

**Rule:** No system runs outside this array. Adding a system requires adding it here.

### Determinism Requirements

For multiplayer support and consistent testing:

1. **Seeded PRNG:** Use `PRNG` class, never `Math.random()`
2. **Fixed timestep:** 60 ticks/sec (16.67ms), accumulator pattern
3. **No Date.now():** In game logic
4. **No object key iteration:** Use arrays or Maps
5. **Explicit order:** Systems always run in same order
6. **No module-level mutable state:** Use `world.systemState`

### Game State vs Render State

```
┌─────────────────────────────────────────────┐
│                 DETERMINISTIC               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ World   │  │ Systems │  │ PRNG    │     │
│  │ (ECS)   │  │         │  │         │     │
│  └─────────┘  └─────────┘  └─────────┘     │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              NON-DETERMINISTIC              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Three.js │  │  HUD    │  │  Dust   │     │
│  │ Scene   │  │         │  │Particles│     │
│  └─────────┘  └─────────┘  └─────────┘     │
└─────────────────────────────────────────────┘
```

Rendering reads from game state but never writes to it.

## File Structure

```
src/
├── core/           # ECS framework (World, Entity, types, PRNG)
├── components/     # Component interfaces (data only)
├── systems/        # System functions (logic only)
├── factories/      # Entity creation helpers (ships, etc.)
├── rendering/      # Three.js, HUD, effects (non-deterministic)
├── game.ts         # Main loop, system order
└── main.ts         # Entry point
```

## Code Rules

### 300-Line Limit

No `.ts` file may exceed 300 lines. Enforced by:
- Pre-commit hook
- Manual review

### Split Strategies

When approaching 200 lines, proactively split:
- Extract helpers (e.g., `weapon-spawning.ts`)
- Split rendering modules (e.g., `weapon-display-secondary.ts`)
- Split component definitions into groups

### System Registry

Every system must be documented in `src/systems/REGISTRY.md`:

| System | Purpose | Max Entities |
|--------|---------|--------------|
| inputSystem | Reads keyboard, sets player intent | 1 |
| physicsSystem | Applies velocity and drag | ~50 |

If you can't describe a system's purpose in one line, it's too broad.

### No Legacy Code

When a mechanic changes:
1. Grep for all usages
2. Delete ALL old code in the same commit
3. No backwards compatibility layers
4. No conversion code

## Game Loop

```typescript
const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
const TICK_SEC = 1 / TICK_RATE;

function tick(game: Game): void {
  const { world } = game;

  // Update game time (used by weapons, shields, etc.)
  world.systemState.gameTime += TICK_SEC;

  // Run all systems in order
  for (const system of SYSTEM_ORDER) {
    system(world, TICK_SEC);
  }
}

function gameFrame(game: Game, currentTime: number): void {
  // ... accumulator pattern ...
  while (game.accumulator >= TICK_MS) {
    tick(game);
    game.accumulator -= TICK_MS;
  }

  // Render with interpolation
  const alpha = game.accumulator / TICK_MS;
  render(world, alpha);
}
```
