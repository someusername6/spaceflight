# Space Dogfight Roguelike - Implementation Plan

## Overview

Build a web-based space dogfighting roguelike game combining Freespace 2-style combat with FTL/Battletech campaign structure. Player leads a mercenary squadron (3-8 ships) through contracts, salvage, and permadeath progression.

**Tech Stack:**
- Three.js for 3D rendering
- TypeScript for type safety and maintainability ✓ (confirmed)
- Vite for fast dev server and builds
- Custom lightweight ECS architecture ✓ (confirmed)
- Pragmatic determinism (seeded PRNG, fixed timestep) ✓ (confirmed)

**Slice 1 Prototype Weapon:** Plasma ✓ (confirmed)

---

## Phase 0: Project Setup

### 0.1 Create GitHub Repository

```bash
gh repo create someusername6/spaceflight --private --description "Space dogfight roguelike game"
cd /Users/telmo/project/spaceflight
git init
git remote add origin git@github.com:someusername6/spaceflight.git
```

### 0.2 Initialize Project Structure

```
spaceflight/
├── src/
│   ├── core/                 # ECS framework
│   │   ├── ecs.ts           # World, Entity, Component, System base
│   │   ├── types.ts         # Shared type definitions
│   │   └── prng.ts          # Seeded random number generator
│   │
│   ├── components/          # All game components (plain data)
│   │   ├── transform.ts     # Position, rotation, scale
│   │   ├── physics.ts       # Velocity, acceleration, drag
│   │   ├── health.ts        # Hull, shields, shield regen
│   │   ├── heat.ts          # Current heat, max heat, cooling rate
│   │   ├── weapons.ts       # Primary banks, secondary banks
│   │   ├── targeting.ts     # Current target, lock state
│   │   ├── ai.ts            # AI state, parameters
│   │   ├── faction.ts       # Team affiliation
│   │   ├── projectile.ts    # Projectile data
│   │   ├── missile.ts       # Missile tracking data
│   │   └── ship.ts          # Ship archetype reference
│   │
│   ├── systems/             # All game systems (pure logic)
│   │   ├── input.ts         # Keyboard input processing
│   │   ├── physics.ts       # Movement, drag, collision
│   │   ├── weapons.ts       # Firing, heat, ammo
│   │   ├── projectiles.ts   # Projectile movement, hit detection
│   │   ├── missiles.ts      # Missile tracking, movement
│   │   ├── targeting.ts     # Target selection, lock-on
│   │   ├── shields.ts       # Shield regeneration
│   │   ├── heat.ts          # Heat cooling
│   │   ├── ai.ts            # AI state machine
│   │   ├── damage.ts        # Damage application
│   │   ├── cleanup.ts       # Remove dead entities
│   │   └── mission.ts       # Win/lose conditions
│   │
│   ├── rendering/           # Three.js rendering (non-deterministic)
│   │   ├── renderer.ts      # Main Three.js setup
│   │   ├── camera.ts        # Third-person camera
│   │   ├── hud.ts           # HUD overlay (HTML/CSS or canvas)
│   │   ├── skybox.ts        # Nebula backgrounds
│   │   ├── dust.ts          # Movement dust particles
│   │   ├── effects.ts       # Explosions, beams, trails
│   │   └── models.ts        # Ship/weapon model loading
│   │
│   ├── data/                # Static game data (JSON or TS objects)
│   │   ├── ships.ts         # Ship archetypes
│   │   ├── weapons.ts       # Weapon definitions
│   │   ├── missions.ts      # Mission templates
│   │   └── factions.ts      # Faction definitions
│   │
│   ├── ui/                  # Non-gameplay UI
│   │   ├── hangar.ts        # Ship/weapon management
│   │   ├── contracts.ts     # Mission selection
│   │   ├── store.ts         # Buy/sell interface
│   │   └── main-menu.ts     # Title screen
│   │
│   ├── campaign/            # Roguelike progression
│   │   ├── state.ts         # Campaign state (ships, credits, etc)
│   │   ├── salvage.ts       # Salvage calculation
│   │   ├── economy.ts       # Pricing, rewards
│   │   └── sectors.ts       # Sector/contract generation
│   │
│   ├── simulation/          # Testing/balancing harness
│   │   ├── runner.ts        # Run headless simulations
│   │   ├── scenarios.ts     # Test scenarios
│   │   └── metrics.ts       # Outcome tracking
│   │
│   ├── game.ts              # Main game loop, state machine
│   └── main.ts              # Entry point
│
├── docs/
│   ├── DESIGN.md            # Core design document
│   ├── ARCHITECTURE.md      # ECS and code architecture
│   ├── WEAPONS.md           # Weapon specifications
│   ├── SHIPS.md             # Ship specifications
│   ├── AI.md                # AI state machine design
│   └── CAMPAIGN.md          # Campaign/economy design
│
├── assets/
│   └── placeholder/         # Placeholder geometry
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── README.md
```

### 0.3 Package Dependencies

```json
{
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@types/three": "^0.160.0"
  }
}
```

### 0.4 TypeScript Configuration

Strict mode enabled, targeting ES2022, module resolution for bundler.

---

## Phase 1: Documentation Generation

Create comprehensive documentation before writing code. This serves as the source of truth and prevents scope creep.

### 1.1 DESIGN.md
- Game overview and vision
- Core gameplay loop
- Target experience (1-3 min missions, heat-based pacing)
- What this game is NOT (not a sim, not MMO, not procedural ships)

### 1.2 ARCHITECTURE.md
- ECS philosophy and rules
- System execution order (explicit list)
- Determinism requirements
- File size limits (400 lines max)
- Component vs System responsibilities

### 1.3 WEAPONS.md
Full specifications for each weapon:

**Primary Weapons:**
| Weapon | Ammo | Heat/Shot | Projectile Speed | Fire Rate | Range | Damage | Special |
|--------|------|-----------|------------------|-----------|-------|--------|---------|
| Plasma | ∞ | High | Medium | Medium | Medium | Medium | - |
| Pulse | ∞ | Medium | Fast | Fast | Short | Low | - |
| Ion | ∞ | Medium | Medium | Medium | Medium | Low | Shield bonus, lock disruption |
| Autocannon | Finite | Low | Medium | Very Fast | Short | Low | - |
| Railgun | Finite | Low | Very Fast | Slow | Very Long | High | - |
| Flak | Finite | Low | Medium | Medium | Short | Low | Shrapnel AoE |
| Red Laser | ∞ | Over time | Instant | Continuous | Long | High | Linear falloff (1/r) |
| Green Laser | ∞ | Over time | Instant | Continuous | Medium | Medium | Linear falloff (1/r) |
| Blue Laser | ∞ | Over time | Instant | Continuous | Short | Low | Linear falloff (1/r) |
| Lightning | ∞ | Over time | Instant | Flicker | Short | Medium | Constant damage/distance |
| Nuclear Lance | 1 | None | Instant | Single | Very Long | Extreme | One-shot |

**Secondary Weapons:**
| Weapon | Lock | Count | Speed | Turn Rate | Range | Damage | Special |
|--------|------|-------|-------|-----------|-------|--------|---------|
| Rocket | No | 1 | Fast | None | Medium | Medium | Dumbfire |
| Seeker | Yes | 1 | Medium | Medium | Long | Medium | - |
| Dart | Yes | 1 | Fast | High | Short | Low | - |
| Cluster | No | 3 | Medium | Medium | Medium | Low | Helix pattern, auto-retarget |
| Swarm | Yes | 8 | Fast | High | Short | Very Low | - |
| Torpedo | Yes | 1 | Slow | Low | Very Long | High | - |
| Nuke | Yes | 1 | Slow | Low | Long | Extreme | AoE, friendly fire |
| Decoy | No | 1 | Slow | None | - | - | Flies backward, 50% distract, 10s life |

### 1.4 SHIPS.md
Ship archetype template:
- Hull points, shield points, shield regen, regen delay
- Max speed, turn rate (pitch/yaw/roll), acceleration
- Max heat, cooling rate
- Primary banks (count, sizes)
- Secondary banks (count, sizes)
- Hitbox size multiplier
- Role description

Initial ship roster (6-8 ships for variety).

### 1.5 AI.md
Finite State Machine design:

**States:**
- `PURSUE` - Close distance to target
- `ENGAGE` - Maintain distance, fire weapons
- `EVADE` - Break away when threatened
- `PROTECT` - Aggressively engage threats to protectee, driving them away
- `REGROUP` - Large loop, then re-engage
- `IDLE` - No current objective

**Transitions:**
- Detailed trigger conditions for each state change
- Cooldowns to prevent rapid state oscillation

**Aim Error System:**
- Base error magnitude (configurable)
- Speed-based error scaling (faster target = more error)
- Error direction changes over time (not per-shot random)
- Formulas and tuning parameters

**Constraints:**
- Max 3 enemies targeting same human player
- Allied AI prioritizes protecting humans
- Missile firing policy (cooldowns, conditions)

### 1.6 CAMPAIGN.md
- Sector structure
- Contract generation
- Reward calculation (credits + salvage ratio)
- Salvage mechanics (scrap accumulation)
- Economy balance targets
- Progression curve
- Death spiral prevention mechanics

---

## Phase 2: Slice 1 - Basic Flight

**Goal:** Flyable ship, one weapon, one enemy, win/lose condition.

### 2.1 Core ECS Framework
```typescript
// src/core/ecs.ts (~150 lines)
- Entity: number (ID)
- Component: plain object with type tag
- World: entity storage, component maps, system list
- System: interface with update(world, dt)
- Query: helper to find entities with specific components
```

### 2.2 PRNG Implementation
```typescript
// src/core/prng.ts (~30 lines)
- mulberry32 seeded PRNG
- Methods: random(), range(min, max), choice(array)
```

### 2.3 Basic Components
- `Transform`: position (Vector3), rotation (Quaternion)
- `Physics`: velocity (Vector3), maxSpeed, drag, turnRate
- `Health`: hull, maxHull
- `Faction`: team number
- `PlayerControlled`: marker component
- `AIControlled`: marker component

### 2.4 Basic Systems (in execution order)
1. `InputSystem` - Read keyboard, set intent
2. `AISystem` - Simple: always pursue player
3. `PhysicsSystem` - Apply velocity, drag, speed limits
4. `CollisionSystem` - Ship-to-ship (simple sphere)
5. `DamageSystem` - Apply collision damage
6. `CleanupSystem` - Remove dead entities
7. `MissionSystem` - Check win (no enemies) / lose (player dead)

### 2.5 Basic Rendering
- Three.js scene setup
- Placeholder ship geometry (colored boxes)
- Third-person camera following player
- Simple skybox (static color or basic starfield)

### 2.6 Game Loop
- Fixed timestep: 60 ticks/sec (16.67ms)
- Accumulator pattern for determinism
- Render interpolation for smoothness

### 2.7 Deliverable
Playable: WASD+QE to fly, crash into enemy to damage, destroy all enemies to win.

---

## Phase 3: Slice 2 - Combat Variety

**Goal:** All weapons working, full AI, heat/shields, targeting HUD.

### 3.1 Weapon Components
- `PrimaryWeapons`: array of equipped weapons per bank
- `SecondaryWeapons`: array of missiles/decoys per bank
- `Heat`: current, max, coolingRate
- `Ammo`: per-weapon ammo counts

### 3.2 Weapon Systems
- `WeaponSystem` - Handle firing, heat, ammo
- `ProjectileSystem` - Move projectiles, check hits
- `MissileSystem` - Tracking logic, lock-on
- `BeamSystem` - Raycast beams, damage over time

#### 3.2.1 Primary Weapon Bank Linking (FS2-style)
Player can toggle between LINKED and SINGLE fire modes (V key):

**SINGLE mode (default):**
- Only the currently selected weapon fires
- Use `<` / `>` to cycle through weapons
- Fire rate and heat based on selected weapon only

**LINKED mode:**
- ALL primary weapons fire simultaneously
- Projectile weapons fire at the slowest projectile weapon's rate
- Beam weapons fire continuously (each adds heat per second)
- Total heat from all weapons checked before firing
- Empty weapons (ammo=0) are skipped, others still fire

**Weapon type behavior when linked:**
| Type | Linked Behavior |
|------|-----------------|
| Energy (Plasma, Pulse, Ion) | Fire at slowest rate, each adds heat |
| Ballistic (Autocannon, Railgun) | Fire at slowest rate, skip if empty |
| Beam (Lasers) | All beams fire continuously |
| Mixed (projectile + beam) | Projectiles at slowest projectile rate, beams continuous |

**AI behavior:** AI always fires linked (all weapons together)

#### 3.2.2 Weapon Bank Sizes
Each weapon bank has a size (1, 2, or 3) that affects weapon performance:

| Weapon Type | Size Effect | Scaling |
|-------------|-------------|---------|
| Energy | Reduced heat per shot | `heat / size` |
| Ballistic | Increased ammo capacity | `ammo × size` |
| Beam | Reduced heat per second | `heat / size` |
| Missiles/Decoys | Increased count | `count × size` |

This creates equipment-fitting decisions: which weapon goes in which bank?

#### 3.2.3 Heat Locking Thresholds
Heat affects both weapons and afterburner with graduated thresholds:

| Threshold | Value | System | Unlock At |
|-----------|-------|--------|-----------|
| Warning | 90% | HUD indicator | <90% |
| Afterburner Lock | 95% | Afterburner disabled | ≤50% |
| Weapon Lock | 100% | Weapons disabled | ≤95% |

Both use hysteresis to prevent oscillation:
- Afterburner: 45% gap (locks at 95%, unlocks at 50%)
- Weapons: 5% gap (locks at 100%, unlocks at 95%)

Constants centralized in `heat.ts` for consistency.

### 3.3 Shield System
- `Shields`: current, max, regenRate, regenDelay, lastDamageTime
- `ShieldSystem` - Regeneration logic

### 3.4 Full AI Implementation
- State machine with all states from AI.md
- Aim error system (base + speed scaling)
- Missile firing policy
- Target selection logic
- Max-3-on-human constraint

#### 3.4.1 AI Weapon Selection (Future Enhancement)
Currently AI always fires linked (all weapons). Future enhancement to add smart weapon selection:
- **Range-based selection:** At long range, prefer railgun/long-range weapons only
- **Close-range selection:** Prefer beams/short-range high-DPS weapons
- **Heat management:** Switch to cooler weapons if overheating
- **Ammo conservation:** Avoid wasting finite ammo at poor angles
- **Target-type selection:** Use anti-shield weapons on shielded targets

Implementation: Add `selectOptimalWeapon(distance, targetHealth, ownHeat)` that returns either "linked" or specific weapon index

### 3.5 Targeting System
- `Targeting`: currentTarget, lockProgress, lockTarget
- `TargetingSystem` - Lock-on progress, break conditions
- Cycle targets (<, >, T keys)

### 3.6 HUD Implementation
- Target reticles (corners of square)
- Lead indicator (where to shoot)
- Lock-on indicator (circle → diamond)
- Off-screen arrows
- Distance display
- **Bottom-center:** speed, hull, shields, heat bars
- **Bottom-right:** weapon banks display
  - Primary banks: show weapon name, ammo count (or ∞), heat % for selected
  - Secondary banks: show weapon name, count, lock status for ALL (not just selected)
  - Currently selected weapon highlighted (green border)
  - Cooldown indicator (orange border/name when on cooldown)
  - LINKED/SINGLE mode indicator in section header
  - When LINKED: all primary weapons show selected highlight
  - Keyboard hints: `[</>]` for cycling, `[V]` for link toggle
- **Top-left:** allied ship health bars
- **Top-right:** target camera + stats
- **Bottom-left:** 2D radar

### 3.7 Visual Effects
- Projectile trails
- Beam rendering
- Missile exhaust
- Explosions
- Shield hit effects

### 3.8 Dust Particles
- Spawn around player based on proximity
- Despawn when far
- Provides motion sensation

### 3.9 Deliverable
Full combat with all weapon types, working AI, complete HUD.

---

## Phase 4: Slice 3 - Campaign Loop

**Goal:** Hangar UI, one contract, salvage, buy/sell, second mission.

### 4.1 Campaign State
```typescript
interface CampaignState {
  credits: number;
  ships: Ship[];          // Owned ships
  pilots: Pilot[];        // Hired pilots
  hangar: Equipment[];    // Stored equipment
  currentSector: Sector;
  completedContracts: string[];
}
```

### 4.2 Hangar UI
- Visual ship display (silhouettes)
- Drag-drop equipment to banks
- Ship stats panel
- Pilot assignment

### 4.3 Contract UI
- Available contracts list
- Reward preview (credits + salvage slider)
- Mission briefing
- Accept/decline

### 4.4 Store UI
- Buy weapons, ammo, ships
- Sell equipment
- Hire/fire pilots

### 4.5 Salvage System
- Post-mission salvage calculation
- Scrap accumulation toward ships
- Random component from salvage

### 4.6 Mission Flow
- Contract select → Loadout → Mission → Results → Hangar
- State persistence between missions

### 4.7 Deliverable
Complete loop: hangar → contract → fly → salvage → hangar.

---

## Phase 5: Slice 4 - Full Campaign

**Goal:** Multiple sectors, full economy, mission variety, balance simulation.

### 5.1 Sector System
- Multiple sectors with contracts
- Sector transitions
- Faction influence

### 5.2 Mission Variety
All mission types from design doc:
- Destroy all enemies
- Survive X time (waves)
- Capture (don't damage) specific enemy
- Assassination (destroy specific target)
- Defend stationary ship
- Destroy stationary ship
- Scan objects
- Prevent enemy scans

### 5.3 Campaign Duration & Progression Research

**Target Campaign Length:**
- Research comparable games: FTL (~2-3 hours), Battletech campaign (~40 hours), Into the Breach (~2 hours)
- Define target: likely 1.5-3 hours for a full run (45-90 missions at 1-3 min each)
- Define sector count and missions per sector

**Meaningful Mission-to-Mission Progress:**
Each mission should offer at least one of:
- Enough credits to buy a meaningful upgrade (new weapon, ammo refill)
- Salvage progress toward a new ship (visible scrap accumulation)
- Unlocking new contract tiers / faction access
- Story/narrative progression (if implemented)

**Progression Pacing Targets:**
| Campaign % | Expected State |
|------------|----------------|
| 0% (start) | 3 ships, basic loadout |
| 25% | 4-5 ships, one upgraded weapon per ship |
| 50% | 5-6 ships, mixed weapon loadouts, first ship loss likely recovered |
| 75% | 6-7 ships, specialized loadouts, facing elite enemies |
| 100% (end) | 7-8 ships, optimized builds, final challenge |

**Simulation Validation:**
- Run N simulated campaigns with different strategies
- Track: missions to first ship, missions to first loss, final ship count, credit curve
- Identify: too-fast progression, too-slow progression, death spirals, dominant strategies

### 5.4 Economy Balancing
- Define progression curve targets (from above research)
- Implement simulation runner
- Run headless campaign simulations
- Tune rewards, costs, salvage rates
- Validate against progression pacing targets

### 5.5 Death Spiral Prevention
- Catch-up mechanics if needed
- Minimum viable loadout guarantee

### 5.5 Deliverable
Full roguelike campaign, playable start to finish.

---

## Phase 6: Slice 5 - Polish & MP Prep

**Goal:** UI polish, key rebinding, determinism hardening, MP architecture.

### 6.1 Settings
- Key rebinding
- Match-speed toggle
- Volume controls

### 6.2 UI Polish
- Proper icons for weapons
- Ship silhouettes
- Transitions and animations
- Sound effects (Web Audio)

### 6.3 Determinism Hardening
- Audit all systems for non-determinism
- Add deterministic trig if needed
- Implement state checksum for verification

### 6.4 Multiplayer Architecture (Design Only)
- Document netcode approach
- Identify state that must sync
- Plan for host migration

### 6.5 Deliverable
Polished single-player game, ready for MP in future iteration.

---

## Implementation Rules

### Code Quality
- **Max 400 lines per file** - Split if larger
- **One system = one responsibility** - No god systems
- **Components are plain data** - No methods
- **Systems are pure functions** - No hidden state
- **Explicit execution order** - Array in game.ts

### Determinism
- Use `PRNG` class, never `Math.random()`
- Fixed timestep, no `Date.now()` in game logic
- No object key iteration for game state
- Separate deterministic state from rendering

### Documentation
- Update docs when design changes
- Code comments for "why", not "what"
- Each system has a one-line purpose comment

### Testing
- Simulation runner from Slice 4
- Manual playtesting each slice
- Balance metrics tracking

---

## Code Quality Enforcement (Concrete Details)

The previous project failed partly due to architectural rot: 3k-line files, code duplication, legacy conversion layers. Here's how we prevent that:

### 1. Automated File Size Check

**Implementation:** Add a pre-commit script that fails if any `.ts` file exceeds 400 lines.

```bash
# scripts/check-file-size.sh
MAX_LINES=400
FAILED=0
for file in $(find src -name "*.ts"); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES)"
    FAILED=1
  fi
done
exit $FAILED
```

**Enforcement:**
- Run in CI (GitHub Actions)
- Run as pre-commit hook
- I will check before each commit

### 2. Directory Organization

**Implementation:** Systems and rendering modules are organized into subdirectories by domain:

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

**Enforcement:**
- If a system's purpose can't be described in one line, it's too broad
- Related files should be grouped in subdirectories
- Directory structure is self-documenting

### 3. No Conversion/Legacy Code Policy

**Policy:** When a mechanic changes, ALL old code is deleted. No backwards compatibility layers.

**Enforcement:**
- Before changing a mechanic, grep for all usages
- Delete all old code in the same commit as the new code
- I will explicitly list what's being deleted in commit messages

### 4. Component Purity Check

**Policy:** Components are interfaces with only data fields. No methods, no constructor logic.

**Implementation:** TypeScript interfaces (not classes) for components:

```typescript
// CORRECT
interface Transform {
  type: 'transform';
  position: Vector3;
  rotation: Quaternion;
}

// WRONG - would be a class with methods
class Transform {
  constructor(x, y, z) { ... }
  translate(delta: Vector3) { ... }  // NO! This belongs in a system
}
```

**Enforcement:**
- Components defined as `interface`, not `class`
- Any method on a component is a code review failure

### 5. System Purity Check

**Policy:** Systems are pure functions: `(world: World, dt: number) => void`
- No instance variables storing state between frames
- All state lives in components

**Implementation:**
```typescript
// CORRECT
function updatePhysics(world: World, dt: number): void {
  for (const entity of query(world, ['transform', 'physics'])) {
    // Operate on component data
  }
}

// WRONG - storing state in closure/instance
let lastFrameTime = 0;  // NO! State outside components
function updatePhysics(world: World, dt: number): void {
  const elapsed = Date.now() - lastFrameTime;  // NO! Non-deterministic
  ...
}
```

**Enforcement:**
- Systems exported as plain functions, not classes
- I will flag any `let` at module scope in system files

### 6. Explicit Execution Order

**Implementation:** `src/game.ts` contains a single array defining system execution:

```typescript
const SYSTEM_ORDER: System[] = [
  inputSystem,
  aiSystem,
  physicsSystem,
  collisionSystem,
  weaponSystem,
  projectileSystem,
  missileSystem,
  damageSystem,
  shieldSystem,
  heatSystem,
  cleanupSystem,
  missionSystem,
];

function tick(world: World, dt: number) {
  for (const system of SYSTEM_ORDER) {
    system(world, dt);
  }
}
```

**Enforcement:**
- No system runs outside this array
- Adding a system requires adding it to this array with a comment explaining position

### 7. Slice Completion Checklist

Before marking a slice complete:

- [ ] All new files under 400 lines
- [ ] Related files grouped in appropriate subdirectories
- [ ] All components are interfaces (not classes)
- [ ] No `Math.random()` or `Date.now()` in game logic
- [ ] System order updated in game.ts
- [ ] Manual playtest confirms slice deliverable works
- [ ] No TODO comments left in code (either do it or add to plan)

### 8. Code Review Protocol

For every significant change, I will:
1. List files modified and their new line counts
2. Confirm no file exceeds 400 lines
3. Confirm system responsibilities unchanged or registry updated
4. Confirm no legacy/conversion code remains

### 9. When to Split Files

A file should be split when:
- It exceeds 300 lines (proactive, before hitting 400)
- It handles more than one conceptual responsibility
- You need to scroll to understand what's happening

**Split strategies:**
- Extract helper functions to `utils/`
- Split system into sub-systems (e.g., `ai.ts` → `ai-pursue.ts`, `ai-evade.ts`)
- Split component definitions into logical groups

---

## Immediate Next Steps

1. Create GitHub repo
2. Initialize project (package.json, tsconfig, vite)
3. Generate all documentation files
4. Implement Slice 1 (basic flight)

---

## Files to Create (Phase 0-1)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `package.json` | Dependencies | 20 |
| `tsconfig.json` | TypeScript config | 25 |
| `vite.config.ts` | Build config | 15 |
| `.gitignore` | Git ignores | 15 |
| `index.html` | Entry HTML | 15 |
| `README.md` | Project readme | 50 |
| `docs/DESIGN.md` | Design document | 200 |
| `docs/ARCHITECTURE.md` | Architecture doc | 150 |
| `docs/WEAPONS.md` | Weapon specs | 200 |
| `docs/SHIPS.md` | Ship specs | 150 |
| `docs/AI.md` | AI design | 200 |
| `docs/CAMPAIGN.md` | Campaign design | 150 |
| `src/core/ecs.ts` | ECS framework | 150 |
| `src/core/types.ts` | Shared types | 50 |
| `src/core/prng.ts` | Seeded RNG | 30 |
| `src/main.ts` | Entry point | 20 |
| `src/game.ts` | Game loop | 100 |
