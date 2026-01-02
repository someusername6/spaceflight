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
// CORRECT - system is a pure function
function updatePhysics(world: World, dt: number): void {
  for (const entity of query(world, ['transform', 'physics'])) {
    // operate on component data
  }
}

// WRONG - system has state
let lastTime = 0;  // NO! State belongs in components
function updatePhysics(world: World, dt: number): void { ... }
```

**World:** Container for all entities and components. Passed to every system.

### System Execution Order

Systems run in a fixed, explicit order defined in `src/game.ts`:

```typescript
const SYSTEM_ORDER = [
  inputSystem,      // 1. Read player input
  aiSystem,         // 2. AI decision making
  physicsSystem,    // 3. Apply movement
  collisionSystem,  // 4. Detect collisions
  weaponSystem,     // 5. Handle firing
  projectileSystem, // 6. Move projectiles
  missileSystem,    // 7. Track missiles
  damageSystem,     // 8. Apply damage
  shieldSystem,     // 9. Regenerate shields
  heatSystem,       // 10. Cool down heat
  cleanupSystem,    // 11. Remove dead entities
  missionSystem,    // 12. Check win/lose
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
├── core/           # ECS framework (World, Entity, System)
├── components/     # Component interfaces (data only)
├── systems/        # System functions (logic only)
├── rendering/      # Three.js, HUD, effects (non-deterministic)
├── data/           # Static definitions (ships, weapons)
├── ui/             # Non-gameplay UI (menus, hangar)
├── campaign/       # Roguelike progression
├── simulation/     # Testing/balancing harness
├── game.ts         # Main loop, system order
└── main.ts         # Entry point
```

## Code Rules

### 300-Line Limit

No `.ts` file may exceed 300 lines. Enforced by:
- Pre-commit hook (`scripts/check-file-size.sh`)
- CI check
- Manual review

### Split Strategies

When approaching 200 lines, proactively split:
- Extract helpers to `utils/`
- Split system into sub-systems (e.g., `ai.ts` → `ai-pursue.ts`)
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

let accumulator = 0;
let lastTime = performance.now();

function gameLoop(currentTime: number) {
  const delta = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += delta;

  // Fixed timestep updates (deterministic)
  while (accumulator >= TICK_MS) {
    tick(world, TICK_MS / 1000);
    accumulator -= TICK_MS;
  }

  // Render with interpolation (non-deterministic)
  const alpha = accumulator / TICK_MS;
  render(world, alpha);

  requestAnimationFrame(gameLoop);
}
```
