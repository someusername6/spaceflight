/**
 * Main game loop and system orchestration.
 *
 * This file defines the explicit system execution order.
 */

import type { World, SystemFn } from './core/types';
import { createWorld } from './core/ecs';
import { createPRNG, type PRNGState } from './core/prng';

// Systems (in execution order)
import { inputSystem } from './systems/input';
import { targetingSystem } from './systems/targeting';
import { aiSystem } from './systems/ai';
import { aimErrorSystem } from './systems/aim-error';
import { weaponSystem } from './systems/weapons';
import { beamSystem } from './systems/beams';
import { physicsSystem } from './systems/physics';
import { projectileSystem } from './systems/projectiles';
import { missileSystem } from './systems/missiles';
import { collisionSystem } from './systems/collision';
import { damageSystem } from './systems/damage';
import { shieldSystem } from './systems/shields';
import { heatSystem } from './systems/heat';
import { cleanupSystem } from './systems/cleanup';
import { missionSystem, getMissionResult, MissionResult } from './systems/mission';

/** Fixed timestep: 60 ticks per second */
const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
const TICK_SEC = 1 / TICK_RATE;

/**
 * System execution order.
 *
 * Order rationale:
 * 1. input - Read player intent first
 * 2. targeting - Process target selection from input
 * 3. ai - AI decisions based on current state
 * 4. aimError - Update AI aim drift (before weapons fire)
 * 5. weapons - Handle firing, spawn projectiles/missiles
 * 6. beams - Handle continuous beam damage (after weapons, same frame)
 * 7. physics - Apply movement from input/AI
 * 8. projectiles - Move projectiles (separate from ship physics)
 * 9. missiles - Move missiles with tracking (after projectiles)
 * 10. collision - Detect collisions after movement
 * 11. damage - Apply damage from collisions/projectiles/missiles
 * 12. shields - Regenerate shields after damage delay
 * 13. heat - Cool down weapon heat
 * 14. cleanup - Remove dead entities
 * 15. mission - Check win/lose after cleanup
 */
const SYSTEM_ORDER: SystemFn[] = [
  inputSystem,       // 1. Read player input
  targetingSystem,   // 2. Process target selection
  aiSystem,          // 3. AI decision making
  aimErrorSystem,    // 4. Update aim drift
  weaponSystem,      // 5. Handle firing
  beamSystem,        // 6. Handle beam damage
  physicsSystem,     // 7. Apply movement
  projectileSystem,  // 8. Move projectiles
  missileSystem,     // 9. Move missiles with tracking
  collisionSystem,   // 10. Detect collisions
  damageSystem,      // 11. Apply damage
  shieldSystem,      // 12. Regenerate shields
  heatSystem,        // 13. Cool heat
  cleanupSystem,     // 14. Remove dead entities
  missionSystem,     // 15. Check win/lose
];

/** Game instance state */
export interface Game {
  world: World;
  prng: PRNGState;
  accumulator: number;
  lastTime: number;
  running: boolean;
  onTick?: (world: World) => void;
  onRender?: (world: World, alpha: number) => void;
  onMissionEnd?: (result: MissionResult) => void;
}

/** Creates a new game instance */
export function createGame(seed = 12345): Game {
  return {
    world: createWorld(),
    prng: createPRNG(seed),
    accumulator: 0,
    lastTime: 0,
    running: false,
  };
}

/** Single deterministic tick */
export function tick(game: Game): void {
  const { world } = game;

  // Run all systems in order
  for (const system of SYSTEM_ORDER) {
    system(world, TICK_SEC);
  }

  // Check for mission end
  const result = getMissionResult();
  if (result !== MissionResult.InProgress && game.onMissionEnd) {
    game.onMissionEnd(result);
  }

  // Notify tick callback (for rendering sync)
  if (game.onTick) {
    game.onTick(world);
  }
}

/** Game loop frame (call from requestAnimationFrame) */
export function gameFrame(game: Game, currentTime: number): void {
  if (!game.running) return;

  // Calculate delta time
  if (game.lastTime === 0) {
    game.lastTime = currentTime;
  }
  const delta = currentTime - game.lastTime;
  game.lastTime = currentTime;

  // Accumulate time
  game.accumulator += delta;

  // Fixed timestep updates (deterministic)
  while (game.accumulator >= TICK_MS) {
    tick(game);
    game.accumulator -= TICK_MS;
  }

  // Render with interpolation
  const alpha = game.accumulator / TICK_MS;
  if (game.onRender) {
    game.onRender(game.world, alpha);
  }
}

/** Start the game loop */
export function startGame(game: Game): void {
  game.running = true;
  game.lastTime = 0;
  game.accumulator = 0;

  function loop(time: number) {
    gameFrame(game, time);
    if (game.running) {
      requestAnimationFrame(loop);
    }
  }

  requestAnimationFrame(loop);
}

/** Stop the game loop */
export function stopGame(game: Game): void {
  game.running = false;
}

/** Get the world from game (convenience) */
export function getWorld(game: Game): World {
  return game.world;
}

/** Get the PRNG from game (convenience) */
export function getPRNG(game: Game): PRNGState {
  return game.prng;
}

export { MissionResult };
