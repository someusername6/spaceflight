# System Registry

Every system must be listed here with a one-line purpose description.

| System | File | Purpose | Typical Entities |
|--------|------|---------|------------------|
| inputSystem | input.ts | Reads keyboard state, sets player intent flags | 1 (player) |
| targetingSystem | targeting.ts | Handles target cycling, lock-on progress for player | 1 (player) |
| aiSystem | ai.ts | AI state machine, target selection, behavior | 3-20 (AI ships) |
| aimErrorSystem | aim-error.ts | Updates AI aim drift over time | 3-20 (AI ships) |
| weaponSystem | weapons.ts | Handles firing, heat generation, ammo consumption | ~10 (armed ships) |
| beamSystem | beams.ts | Handles continuous beam damage and rendering | ~10 (armed ships) |
| physicsSystem | physics.ts | Applies velocity, drag, rotation to transforms | ~30 (all moving) |
| projectileSystem | projectiles.ts | Moves projectiles, checks hits, despawns | ~100 |
| missileSystem | missiles.ts | Missile tracking, turning, lock-on progress | ~20 |
| collisionSystem | collision.ts | Detects ship-to-ship and projectile collisions | ~50 |
| damageSystem | damage.ts | Applies damage to hull/shields from hits | ~30 |
| shieldSystem | shields.ts | Regenerates shields when not taking damage | ~10 |
| heatSystem | heat.ts | Cools down heat over time | ~10 |
| cleanupSystem | cleanup.ts | Removes entities marked for deletion, spawns explosions | all |
| explosionSystem | explosions.ts | Updates explosion effect lifetimes | ~5 |
| missionSystem | mission.ts | Checks win/lose conditions | all |

## Helper Modules (Not Systems)

| Module | Purpose |
|--------|---------|
| weapon-spawning.ts | Projectile/missile creation helpers for weaponSystem |
| ai-behaviors.ts | State behavior functions (Evade/Protect/Regroup) for aiSystem |

## Adding a New System

1. Add entry to the system table above
2. Create file in `src/systems/`
3. Export system function: `(world: World, dt: number) => void`
4. Add to `SYSTEM_ORDER` in `src/game.ts`
5. Document position rationale in game.ts comment
