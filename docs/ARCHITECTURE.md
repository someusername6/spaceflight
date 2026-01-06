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
├── data/           # Game data definitions (single source of truth)
├── rendering/      # Three.js, HUD, effects (non-deterministic)
├── campaign/       # Campaign state, contracts, mission management
├── ui/             # Campaign UI screens and components
│   ├── common/     # Shared UI components (nav-bar, screens)
│   ├── screens/    # Screen-specific TypeScript (hangar, contracts, etc.)
│   ├── ship/       # Ship viewer components
│   ├── store/      # Store UI components
│   └── styles/     # CSS files (see CSS Architecture below)
├── game.ts         # Main loop, system order
└── main.ts         # Entry point (imports CSS)
```

## CSS Architecture

Campaign UI styles use separate CSS files with CSS custom properties for theming.

### File Structure

```
src/ui/styles/
├── index.css          # Main entry - imports all CSS modules
├── theme.css          # CSS custom properties (colors, fonts)
├── base.css           # Foundation styles (.game-screen, panels)
├── buttons.css        # Button system (.btn variants)
├── list.css           # Ship/contract list styles
├── nav-bar.css        # Navigation bar and campaign-page wrapper
├── tooltip.css        # Tooltip system
├── picker.css         # Weapon/missile picker dropdowns
├── screens/           # Screen-specific styles
│   ├── hangar.css
│   ├── roster.css
│   ├── loadout.css
│   ├── results.css
│   ├── debrief.css
│   ├── rewards.css
│   ├── salvage.css
│   └── game-over.css
├── ship/              # Ship component styles
│   ├── card.css
│   ├── viewer.css
│   └── viewer-actions.css
└── store/             # Store screen styles
    ├── main.css
    ├── detail.css
    └── storage.css
```

### Usage

CSS is imported once in `src/main.ts`:
```typescript
import './ui/styles/index.css';
```

Vite handles CSS bundling, minification, and tree-shaking.

### Theme Variables

All colors, fonts, and common values are CSS custom properties in `theme.css`:
```css
:root {
  --color-primary: #ffaa44;      /* Amber - player/accent */
  --color-secondary: #44aaff;    /* Cyan - wingmen/info */
  --color-success: #44ff66;      /* Green - positive */
  --color-danger: #ff4444;       /* Red - negative/KIA */
  --font-display: 'Orbitron', monospace;
  --font-body: 'Share Tech Mono', monospace;
  /* ... etc */
}
```

### HUD vs Campaign UI

The game has two separate styling systems:
- **Campaign UI** (amber/cyan): `src/ui/styles/` - used for menus, hangar, store
- **HUD** (green-on-black): `src/rendering/hud/` - dynamically injected during missions

These intentionally use different color palettes for visual distinction.

## Data Layer Architecture

All game data has a single source of truth in `src/data/`. Components and factories derive from these, never duplicate.

### Hierarchy

```
data/weapons.ts     ─── PRIMARY_WEAPONS (weapon stats)
                         └── components/weapons.ts imports and re-exports

data/missiles.ts    ─── MISSILES (missile stats)
                         └── components/missile.ts imports and re-exports

data/ships.ts       ─── SHIP_CLASSES (7 chassis types)
                         └── factories/ship-archetypes.ts combines with loadouts
                              └── SHIP_ARCHETYPES (ship class + weapons)
```

### Ship Classes vs Archetypes

**Ship Class** (in `data/ships.ts`): The chassis - hull, shields, speed, etc.
- 7 classes: scout, interceptor, striker, bomber, defender, raider, sentinel

**Archetype** (in `factories/ship-archetypes.ts`): Ship class + weapon loadout
- Base archetypes: One per ship class with standard loadout
- Variant archetypes: Same chassis, different loadout (e.g., "lancer" = sentinel + blue lasers)

```typescript
// Archetypes derive from ship classes
const lancer = createArchetype('sentinel', {
  primaryWeapons: [
    { name: 'blueLaser', size: 2 },
    { name: 'blueLaser', size: 2 },
    { name: 'blueLaser', size: 2 },
  ],
  preferredCombatRange: 1000,
});
```

### Validation

`factories/archetype-validation.ts` validates weapon/missile names reference valid definitions. It does NOT duplicate loadout specs - archetypes are the source of truth.

## Code Rules

### 400-Line Limit

No `.ts` file may exceed 400 lines. Enforced by:
- Pre-commit hook
- Manual review

### Split Strategies

When approaching 200 lines, proactively split:
- Extract helpers (e.g., `weapon-spawning.ts`)
- Split rendering modules (e.g., `weapon-display-secondary.ts`)
- Split component definitions into groups

### Directory Organization

Systems and rendering modules are organized into subdirectories by domain:

```
src/systems/
├── ai/              # AI decision-making (ai.ts, ai-behaviors.ts, etc.)
├── weapons.ts       # Weapon firing logic
└── ...

src/rendering/
├── effects/         # Visual effects (explosions, trails, etc.)
├── hud/             # HUD elements (status bars, radar, etc.)
├── reticle/         # Targeting UI (brackets, lead indicators)
├── skybox/          # Space background generation
├── weapon-display/  # Weapon status UI
├── beam-effects/    # Beam weapon visuals
└── renderer.ts      # Core Three.js scene management
```

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
