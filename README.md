# Spaceflight

A space dogfight roguelike combining Freespace 2-style combat with FTL/Battletech campaign structure.

[itch.io](https://sunlitgrove.itch.io/spaceflight)

## Quick Start

```bash
npm install
npm run dev
```

## Features

- **Real-time 3D combat** with an ECS architecture
- **Squadron management** - Hire pilots, customize loadouts, deploy up to 4 ships per mission
- **5 mission types** - Elimination, Escort, Station Defense, Ambush, Attack Station
- **Roguelike progression** - 5 sectors with increasing difficulty, permadeath for the commander
- **Pilot progression** - XP system, skill levels (rookie → elite), ejection/retirement mechanics
- **Replay system** - Record and playback battles with deterministic simulation

## Documentation

- [Design Document](docs/DESIGN.md) - Game vision, core loop, mission types
- [Architecture](docs/ARCHITECTURE.md) - ECS and code structure
- [AI System](docs/AI.md) - AI state machine, behavior modes, aim error
- [Mission Design](docs/MISSION-DESIGN.md) - How to create and balance missions
- [Economy](docs/ECONOMY.md) - Pricing, salvage, store stock system
- [Balance Testing](docs/BALANCE_TESTING.md) - Simulation-based balance validation

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check formatting and lint
npm run lint:fix     # Auto-fix lint issues
npm run test         # Run quick tests
npm run test:all     # Run all tests including balance
npm run check-size   # Verify no file exceeds 400 lines
```

## Controls

Controls are rebindable in Settings. Defaults:

**Flight:**
- W/S - Pitch up/down
- A/D - Yaw left/right
- Q/E - Roll left/right
- Shift - Accelerate
- Ctrl - Decelerate
- Z - Afterburner

**Combat:**
- Space - Fire primary weapon
- F - Fire secondary weapon
- V - Cycle primary weapon
- X - Cycle secondary weapon
- C - Launch decoy

**Targeting:**
- T - Target nearest enemy
- [ - Previous target
- ] - Next target
- M - Match target speed

**Menu:**
- Escape - Pause

## Architecture

Built with a custom Entity-Component-System (ECS) architecture for deterministic gameplay. Uses seeded PRNG throughout for replay support. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.
