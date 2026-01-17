/**
 * Main game loop and system orchestration.
 *
 * This file defines the explicit system execution order.
 */

import { createWorld } from './core/ecs';
import type { SystemFn, World } from './core/types';
import { getFrameIntervalMs } from './settings/game-settings';
import { aiSystem } from './systems/ai/ai';
import { aimErrorSystem } from './systems/aim-error';
import { cleanupSystem } from './systems/cleanup';
import { collisionSystem } from './systems/collision';
import { collisionResponseSystem } from './systems/collision-response';
import { convoyAutopilotSystem } from './systems/convoy-autopilot';
import { damageSystem } from './systems/damage';
import { decoySystem } from './systems/decoys';
import { explosionSystem } from './systems/explosions';
import { heatSystem } from './systems/heat';
// Systems (in execution order)
import { inputSystem } from './systems/input';
import {
  countLivingEnemyShips,
  getMissionResult,
  MissionResult,
  missionSystem,
  resetMissionState,
} from './systems/mission';
import { physicsSystem } from './systems/physics';
import { shieldSystem } from './systems/shields';
import { targetingSystem } from './systems/targeting';
import { beamSystem } from './systems/weapons/beams';
import { missileSystem } from './systems/weapons/missiles';
import { projectileSystem } from './systems/weapons/projectiles';
import { weaponSystem } from './systems/weapons/weapons';

/** Fixed timestep: 60 ticks per second */
export const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
/** Time step in seconds (exported for interpolation) */
export const TICK_SEC = 1 / TICK_RATE;

/**
 * System execution order.
 *
 * Order rationale:
 * 1. input - Read player intent first
 * 2. targeting - Process target selection from input
 * 3. convoyAutopilot - Move convoy ships toward escape zone (before AI)
 * 4. ai - AI decisions based on current state
 * 5. aimError - Update AI aim drift (before weapons fire)
 * 6. weapons - Handle firing, spawn projectiles/missiles
 * 7. physics - Apply movement from input/AI (rotation must be applied before beams)
 * 8. beams - Handle continuous beam damage (uses current frame's transform)
 * 9. projectiles - Move projectiles (separate from ship physics)
 * 10. missiles - Move missiles with tracking (after projectiles)
 * 11. decoys - Move decoys, destroy missiles on contact
 * 12. collision - Detect collisions
 * 13. collisionResponse - Push colliding ships apart (impulse response)
 * 14. damage - Apply damage from collisions/projectiles/missiles
 * 15. shields - Regenerate shields after damage delay
 * 16. heat - Cool down weapon heat
 * 17. cleanup - Remove dead entities, spawn explosions
 * 18. explosions - Update explosion effects
 * 19. mission - Check win/lose after cleanup
 */
/**
 * Simulation systems (without input handling).
 * Used by replay playback to maintain identical execution order.
 * Exported so replay can import directly instead of duplicating.
 */
export const SIMULATION_SYSTEMS: SystemFn[] = [
  targetingSystem, // 1. Process target selection
  convoyAutopilotSystem, // 2. Convoy ship movement (before AI)
  aiSystem, // 3. AI decision making
  aimErrorSystem, // 4. Update aim drift
  weaponSystem, // 5. Handle firing (projectiles)
  physicsSystem, // 6. Apply movement (rotation must be applied before beams)
  beamSystem, // 7. Handle beam damage (uses current frame's transform)
  projectileSystem, // 8. Move projectiles
  missileSystem, // 9. Move missiles with tracking (decoy seduction here)
  decoySystem, // 10. Move decoys, destroy missiles on contact
  collisionSystem, // 11. Detect collisions
  collisionResponseSystem, // 12. Push colliding ships apart
  damageSystem, // 13. Apply damage
  shieldSystem, // 14. Regenerate shields
  heatSystem, // 15. Cool heat
  cleanupSystem, // 16. Remove dead entities, spawn explosions
  explosionSystem, // 17. Update explosion effects
  missionSystem, // 18. Check win/lose
];

/** Full system order including input (for live gameplay) */
const SYSTEM_ORDER: SystemFn[] = [
  inputSystem, // Read player input first
  ...SIMULATION_SYSTEMS,
];

/** Game instance state */
export interface Game {
  world: World;
  accumulator: number;
  lastTime: number;
  /** Last render timestamp for frame rate capping */
  lastRenderTime: number;
  running: boolean;
  /** Paused state - physics stops but rendering continues */
  paused: boolean;
  /** Tracks last notified result to prevent duplicate callbacks */
  lastNotifiedResult: MissionResult;
  onTick?: (world: World) => void;
  onRender?: (world: World, alpha: number) => void;
  onMissionEnd?: (result: MissionResult) => void;
}

/** Creates a new game instance */
export function createGame(seed = 12345): Game {
  return {
    world: createWorld(seed),
    accumulator: 0,
    lastTime: 0,
    lastRenderTime: 0,
    running: false,
    paused: false,
    lastNotifiedResult: MissionResult.InProgress,
  };
}

/** Single deterministic tick */
export function tick(game: Game): void {
  const { world } = game;

  // Update game time (used by weapons, shields, etc.)
  world.systemState.gameTime += TICK_SEC;

  // Run all systems in order
  for (const system of SYSTEM_ORDER) {
    system(world, TICK_SEC);
  }

  // Check for mission end (only notify once per state change)
  const result = getMissionResult(world);
  if (result !== game.lastNotifiedResult && game.onMissionEnd) {
    game.lastNotifiedResult = result;
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
    game.lastRenderTime = currentTime;
  }
  const delta = currentTime - game.lastTime;
  game.lastTime = currentTime;

  // When paused, skip physics but still render frozen frame
  if (!game.paused) {
    // Accumulate time
    game.accumulator += delta;

    // Fixed timestep updates (deterministic)
    while (game.accumulator >= TICK_MS) {
      tick(game);
      game.accumulator -= TICK_MS;
    }
  }

  // Frame rate capping - only render if enough time has passed
  const frameInterval = getFrameIntervalMs();
  const timeSinceLastRender = currentTime - game.lastRenderTime;

  // Render with interpolation (respecting frame cap)
  // frameInterval of 0 means uncapped (render every frame)
  if (frameInterval === 0 || timeSinceLastRender >= frameInterval) {
    game.lastRenderTime = currentTime;
    const alpha = game.paused ? 1 : game.accumulator / TICK_MS;
    if (game.onRender) {
      game.onRender(game.world, alpha);
    }
  }
}

/** Start the game loop */
export function startGame(game: Game): void {
  game.running = true;
  game.lastTime = 0;
  game.lastRenderTime = 0;
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

/** Pause the game (physics stops, rendering continues) */
export function pauseGame(game: Game): void {
  game.paused = true;
}

/** Resume the game from pause */
export function resumeGame(game: Game): void {
  game.paused = false;
  // Reset lastTime to avoid accumulator spike from time spent paused
  game.lastTime = 0;
}

/** Get the world from game (convenience) */
export function getWorld(game: Game): World {
  return game.world;
}

/** Reset mission notification tracking (for multi-wave missions) */
export function resetMissionNotification(game: Game): void {
  game.lastNotifiedResult = MissionResult.InProgress;
}

export { countLivingEnemyShips, MissionResult, resetMissionState };
