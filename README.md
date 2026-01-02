# Spaceflight

A space dogfight roguelike game combining Freespace 2-style combat with FTL/Battletech campaign structure.

## Quick Start

```bash
npm install
npm run dev
```

## Documentation

- [Design Document](docs/DESIGN.md) - Game vision and core loop
- [Architecture](docs/ARCHITECTURE.md) - ECS and code structure
- [Weapons](docs/WEAPONS.md) - Weapon specifications
- [Ships](docs/SHIPS.md) - Ship archetypes
- [AI](docs/AI.md) - AI state machine design
- [Campaign](docs/CAMPAIGN.md) - Roguelike progression

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check-size` - Verify no file exceeds 300 lines

## Controls (Slice 1)

- W/S - Pitch up/down
- A/D - Turn left/right
- Q/E - Roll
- Shift - Accelerate
- Ctrl - Decelerate
- Space - Fire primary weapon
- T - Target nearest enemy
- <, > - Cycle targets

## Architecture

Built with a custom Entity-Component-System (ECS) architecture for deterministic gameplay. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.
