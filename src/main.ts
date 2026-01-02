/**
 * Main entry point - initializes game and starts the loop.
 */

import { Vector3 } from 'three';
import { createGame, startGame, MissionResult } from './game';
import { initInput } from './systems/input';
import { resetMission } from './systems/mission';
import { createRenderer, syncScene, render, followEntity } from './rendering/renderer';
import { createPlayerShip, createEnemyShip } from './factories/ship';
import { findEntity } from './core/ecs';

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

  // Setup Slice 1 test scene
  setupSlice1Scene(game);

  // Set render callback
  game.onRender = (world, _alpha) => {
    // Sync scene with ECS
    syncScene(renderer, world);

    // Follow player
    const player = findEntity(world, ['playerControlled', 'transform']);
    if (player !== undefined) {
      followEntity(renderer, world, player);
    }

    // Render
    render(renderer);
  };

  // Handle mission end
  game.onMissionEnd = (result) => {
    if (result === MissionResult.Victory) {
      console.log('Victory! All enemies destroyed.');
      showMessage('VICTORY', 'green');
    } else if (result === MissionResult.Defeat) {
      console.log('Defeat! Player destroyed.');
      showMessage('DEFEAT', 'red');
    }
  };

  // Start game loop
  startGame(game);

  console.log('Spaceflight Slice 1 - Basic Flight');
  console.log('Controls: WASD = Pitch/Yaw, QE = Roll, Shift = Accelerate, Ctrl = Decelerate');
  console.log('Objective: Destroy all enemy ships (ram them!)');
}

/** Setup the Slice 1 test scene */
function setupSlice1Scene(game: ReturnType<typeof createGame>): void {
  const { world } = game;

  // Reset mission state
  resetMission();

  // Create player ship at origin
  createPlayerShip(world, 'interceptor', new Vector3(0, 0, 0));

  // Create a few enemies spread around
  createEnemyShip(world, 'scout', new Vector3(100, 20, -200));
  createEnemyShip(world, 'scout', new Vector3(-80, -10, -150));
  createEnemyShip(world, 'interceptor', new Vector3(50, 30, -300));
}

/** Show a message overlay */
function showMessage(text: string, color: string): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 64px;
    font-family: monospace;
    font-weight: bold;
    color: ${color};
    text-shadow: 0 0 20px ${color};
    z-index: 1000;
    pointer-events: none;
  `;
  overlay.textContent = text;
  document.body.appendChild(overlay);

  // Add restart hint
  const hint = document.createElement('div');
  hint.style.cssText = `
    position: fixed;
    top: 60%;
    left: 50%;
    transform: translateX(-50%);
    font-size: 20px;
    font-family: monospace;
    color: white;
    z-index: 1000;
  `;
  hint.textContent = 'Refresh page to restart';
  document.body.appendChild(hint);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
