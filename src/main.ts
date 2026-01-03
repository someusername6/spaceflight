/**
 * Main entry point - initializes game and starts the loop.
 */

import { Vector3 } from 'three';
import { createGame, startGame } from './game';
import { initInput } from './systems/input';
import { resetMission } from './systems/mission';
import { createRenderer, syncScene, render, followEntity, getScene } from './rendering/renderer';
import { createDustSystem, updateDustSystem } from './rendering/dust';
import { createExplosionRenderer, updateExplosionRenderer } from './rendering/explosions';
import { createHUD, updateHUD } from './rendering/hud';
import { createPlayerShip, createEnemyShip } from './factories/ship';
import { findEntity, getComponent } from './core/ecs';
import type { Transform } from './components/transform';

/** Initialize and start the game */
function main(): void {
  // Get container
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container not found');
  }

  // Initialize input
  initInput();

  // Create game
  const game = createGame(Date.now()); // Use current time as seed for variety

  // Create renderer
  const renderer = createRenderer(container);

  // Create dust particle system
  const dustSystem = createDustSystem(getScene(renderer));

  // Create explosion renderer
  const explosionRenderer = createExplosionRenderer();

  // Create HUD
  const hud = createHUD(container);

  // Setup Slice 1 test scene
  setupSlice1Scene(game);

  // Set render callback
  game.onRender = (world, _alpha) => {
    // Sync scene with ECS
    syncScene(renderer, world);

    // Update explosion effects
    updateExplosionRenderer(explosionRenderer, getScene(renderer), world);

    // Follow player and update dust
    const player = findEntity(world, ['playerControlled', 'transform']);
    if (player !== undefined) {
      followEntity(renderer, world, player);

      // Update dust particles around player position
      const transform = getComponent<Transform>(world, player, 'transform');
      if (transform) {
        updateDustSystem(dustSystem, transform.position);
      }
    }

    // Render (updates all world matrices)
    render(renderer);

    // Update HUD (uses matrices updated by render)
    updateHUD(hud, world, renderer.camera, renderer.entityMeshes, container.clientWidth, container.clientHeight);
  };

  // Mission end disabled for flight testing
  // game.onMissionEnd = (result) => {
  //   if (result === MissionResult.Victory) {
  //     console.log('Victory! All enemies destroyed.');
  //     showMessage('VICTORY', 'green');
  //   } else if (result === MissionResult.Defeat) {
  //     console.log('Defeat! Player destroyed.');
  //     showMessage('DEFEAT', 'red');
  //   }
  // };

  // Start game loop
  startGame(game);

  console.log('Spaceflight Slice 2 - Combat Basics');
  console.log('Flight: WASD = Pitch/Yaw, QE = Roll, Shift = Accelerate, Ctrl = Decelerate, Z = Afterburner');
  console.log('Combat: Space = Fire, T = Target nearest, [ ] = Cycle targets, < > = Cycle weapons');
  console.log('Objective: Destroy all enemy ships!');
}

/** Setup the Slice 1 test scene */
function setupSlice1Scene(game: ReturnType<typeof createGame>): void {
  const { world } = game;

  // Reset mission state
  resetMission();

  // Create player ship at origin
  createPlayerShip(world, 'interceptor', new Vector3(0, 0, 0));

  // Create idle enemies for testing (AI disabled)
  createEnemyShip(world, 'scout', new Vector3(100, 20, -200));
  createEnemyShip(world, 'scout', new Vector3(-80, -10, -150));
  createEnemyShip(world, 'interceptor', new Vector3(50, 30, -300));
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
