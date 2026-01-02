# System Registry

Every system must be listed here with a one-line purpose description.

| System | File | Purpose | Typical Entities |
|--------|------|---------|------------------|
| inputSystem | input.ts | Reads keyboard state, sets player intent flags | 1 (player) |
| aiSystem | ai.ts | AI state machine, target selection, behavior | 3-20 (AI ships) |
| physicsSystem | physics.ts | Applies velocity, drag, rotation to transforms | ~30 (all moving) |
| collisionSystem | collision.ts | Detects ship-to-ship and projectile collisions | ~50 |
| weaponSystem | weapons.ts | Handles firing, heat generation, ammo consumption | ~10 (armed ships) |
| projectileSystem | projectiles.ts | Moves projectiles, checks hits, despawns | ~100 |
| missileSystem | missiles.ts | Missile tracking, turning, lock-on progress | ~20 |
| damageSystem | damage.ts | Applies damage to hull/shields from hits | ~30 |
| shieldSystem | shields.ts | Regenerates shields when not taking damage | ~10 |
| heatSystem | heat.ts | Cools down heat over time | ~10 |
| cleanupSystem | cleanup.ts | Removes entities marked for deletion | all |
| missionSystem | mission.ts | Checks win/lose conditions | all |

## Adding a New System

1. Add entry to this table
2. Create file in `src/systems/`
3. Export system function: `(world: World, dt: number) => void`
4. Add to `SYSTEM_ORDER` in `src/game.ts`
5. Document position rationale in game.ts comment
