# Code Architecture Review

**Last updated:** February 2026

## Overview

Spaceflight uses a custom ECS (Entity-Component-System) architecture designed for determinism, maintainability, and simplicity. The codebase enforces strict patterns for replay compatibility and modular file organization.

## ECS Architecture

### Core Concepts

**Entity:** Unique numeric ID, nothing more.

**Component:** Plain data interface with type tag. No methods.

```typescript
// Correct - component is data
interface Health {
  type: 'health';
  hull: number;
  maxHull: number;
}

// Wrong - components don't have methods
class Health {
  takeDamage(amount: number) { ... }  // NO!
}
```

**System:** Pure function operating on entities with specific components.

```typescript
// Correct - system is pure, state in world
function damageSystem(world: World, dt: number): void {
  for (const entity of query(world, ['health', 'damage'])) {
    // operate on component data
  }
}

// Wrong - module-level mutable state
let lastDamage = 0;  // NO! Use world.systemState
```

### System Execution Order

Systems run in explicit order defined in `src/game.ts`:

```
1. inputSystem           - Read player input
2. targetingSystem       - Process target selection
3. convoyAutopilotSystem - Convoy movement (before AI)
4. aiSystem              - AI decision making
5. aimErrorSystem        - Update aim drift
6. weaponSystem          - Handle firing
7. physicsSystem         - Apply movement
8. beamSystem            - Beam damage (uses current transform)
9. projectileSystem      - Move projectiles
10. missileSystem        - Missile tracking
11. decoySystem          - Decoy logic
12. collisionSystem      - Collision detection
13. collisionResponseSystem - Push ships apart
14. damageSystem         - Apply damage
15. shieldSystem         - Regenerate shields
16. heatSystem           - Cool heat
17. cleanupSystem        - Remove dead entities
18. explosionSystem      - Update explosions
19. hyperspaceJumpSystem - Jump animations
20. missionSystem        - Check win/lose
```

**Rule:** No system runs outside this array.

### World State

All game state lives in `World`:

- `entities`: Set of entity IDs
- `components`: Map of entity to component data
- `systemState`: System-specific persistent state
- `prng`: Seeded random for game logic
- `renderPrng`: Separate random for visuals

## Determinism Requirements

For replay and multiplayer compatibility:

| Requirement | Implementation |
|-------------|----------------|
| Seeded PRNG | `src/core/prng.ts` - never `Math.random()` |
| Fixed timestep | 60 ticks/sec (16.67ms) |
| No Date.now() | In game logic |
| No object key iteration | Use arrays or Maps |
| Explicit system order | SYSTEM_ORDER array |
| No module state | Use world.systemState |

### Game vs Render State

```
┌─────────────────────────────────────────────┐
│                 DETERMINISTIC               │
│  World, Systems, PRNG                       │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              NON-DETERMINISTIC              │
│  Three.js Scene, HUD, Particles             │
└─────────────────────────────────────────────┘
```

Rendering reads game state but never writes to it.

## File Organization

```
src/
├── core/           # ECS framework, PRNG, types
├── components/     # Component interfaces (data only)
├── systems/        # System functions (logic only)
│   └── ai/         # AI subsystems
├── factories/      # Entity creation helpers
├── data/           # Game data definitions
├── rendering/      # Three.js, HUD, effects
│   ├── effects/    # Visual effects
│   ├── hud/        # HUD elements
│   └── reticle/    # Targeting UI
├── campaign/       # Campaign state and logic
│   ├── handlers/   # Screen transition handlers
│   └── mission/    # Mission launchers
├── ui/             # Campaign UI screens
│   ├── framework/  # Screen framework
│   ├── screens/    # Screen implementations
│   └── styles/     # CSS files
├── replay/         # Input recording/playback
├── game.ts         # Main loop, system order
└── main.ts         # Entry point
```

## Code Quality Rules

### 400-Line Limit

No `.ts` file may exceed 400 lines. Enforced by pre-commit hook.

**Split strategies:**
- Extract helpers to separate modules
- Split rendering by domain
- Group related components

### Formatting

- Biome for linting/formatting
- Pre-commit hooks enforce standards
- `npm run lint` before commits

### Type Safety

- Full TypeScript coverage
- Strict mode enabled
- No `any` types in game logic

## UI Framework

Custom screen framework in `src/ui/framework/screen.ts`:

### Key Patterns

```typescript
// Pure render - returns HTML string
render(state: State): string {
  return `<div>${state.value}</div>`;
}

// Bind after render - setup event handlers
bind(api: ScreenAPI): void {
  api.on('button', 'click', () => this.handleClick());
}

// State updates trigger re-render
setState({ value: newValue });
```

### Event Management

- `api.on()` for element events
- `api.onRoot()` for container events
- `api.onGlobal()` for window events
- All handlers auto-cleaned on re-render

## Campaign Architecture

### State Flow

```
CampaignState (immutable)
       │
       ▼
   controller.ts (orchestration)
       │
       ├── handlers/ (screen transitions)
       └── mission/ (mission launchers)
```

### Persistence

- IndexedDB for campaign state
- localStorage for settings
- Export/import for manual backup

## Replay System

### Architecture

```
Mission Start
    │
    ▼
InputRecorder captures:
- Player loadout, wingmen
- World seed, settings
    │
    ▼
During Mission:
- Per-tick input recording
- RLE compression
    │
    ▼
Mission End:
- Save to IndexedDB
- FIFO eviction (50 replays max)
    │
    ▼
Playback:
- Reconstruct world from seed
- Inject recorded inputs
- Identical simulation
```

### Key Files

| File | Purpose |
|------|---------|
| `src/replay/types.ts` | Data structures, version |
| `src/input/input-recorder.ts` | Input capture |
| `src/replay/mission-setup.ts` | World reconstruction |
| `src/replay/storage.ts` | IndexedDB operations |

## Multiplayer Architecture

Full cooperative multiplayer using rollback netcode for lag-free gameplay.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Multiplayer Module                        │
│                   (src/multiplayer/)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Rollback   │  │   WebRTC    │  │  Protocol   │         │
│  │  Netcode    │  │    Mesh     │  │  Messages   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│              ┌─────────────────────┐                       │
│              │  Multiplayer        │                       │
│              │  Session            │                       │
│              └─────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Networking Stack

| Layer | Implementation |
|-------|----------------|
| Transport | WebRTC DataChannels (peer-to-peer) |
| Signaling | HTTP polling to signaling server |
| Topology | Full mesh (all peers connected) |
| Sync | Rollback netcode with resimulation |

### Key Features

- **Rollback Netcode:** Uses `rollback-netcode` library for deterministic sync
- **Room Codes:** 8-character alphanumeric codes for joining
- **Lobby System:** Host creates room, assigns ships to guests
- **Chat:** In-lobby and post-mission messaging
- **Spectator Mode:** Watch without controlling a ship
- **Pause Coordination:** Synchronized pause across all players
- **Reconnection:** Automatic reconnect handling

### Key Files

| File | Purpose |
|------|---------|
| `src/multiplayer/index.ts` | Public API |
| `src/multiplayer/multiplayer-session.ts` | Session management |
| `src/multiplayer/networking/` | WebRTC mesh, signaling |
| `src/multiplayer/protocol/` | Message encoding/decoding |
| `src/multiplayer/lobby-state.ts` | Lobby state machine |
| `src/multiplayer/campaign-sync.ts` | Campaign state sync |

## Testing

### Test Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Quick tests | `scripts/tests/` | Fast logic tests (~45 files) |
| Balance tests | `scripts/tests/combat/` | Simulation balance |
| Determinism | `scripts/tests/replay/` | Replay verification |

### Running Tests

```bash
npx tsx scripts/tests/run-tests.mjs        # Quick tests
npx tsx scripts/tests/run-tests.mjs --all  # All tests
```

## Strengths

1. **Clear Separation:** ECS keeps concerns organized
2. **Deterministic Design:** Replay-safe from the start
3. **Modular Files:** 400-line limit prevents god files
4. **Consistent Patterns:** Same approach across codebase
5. **Type Safety:** Full TypeScript with strict mode
6. **Test Coverage:** ~45 test files covering core logic

## Areas for Improvement

1. **System Dependencies:** Order matters but relationships not explicit
2. **Component Count:** Many small files (50+ components)
3. **Documentation:** Limited inline comments
4. **Error Handling:** Some systems lack defensive checks
5. **Hot Reload:** No development hot reload support
