/**
 * HUD rendering - HTML/CSS overlay for game UI.
 */

import * as THREE from 'three';
import type { World, Entity } from '../core/types';
import { getComponent, findEntity } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { Health } from '../components/health';
import type { Shields } from '../components/shields';
import type { Heat } from '../components/heat';
import type { Physics } from '../components/physics';
import type { Targeting } from '../components/targeting';

/** HUD state */
export interface HUD {
  container: HTMLElement;
  speedEl: HTMLElement;
  hullBar: HTMLElement;
  shieldBar: HTMLElement;
  heatBar: HTMLElement;
  targetReticle: HTMLElement;
}

/** Create HUD elements */
export function createHUD(parent: HTMLElement): HUD {
  // Create container
  const container = document.createElement('div');
  container.id = 'hud';
  container.innerHTML = `
    <div class="status-panel">
      <div class="speed-display"><span class="speed-value">0</span> m/s</div>
      <div class="bar-container">
        <div class="bar-label">HULL</div>
        <div class="bar hull-bar"><div class="bar-fill"></div></div>
      </div>
      <div class="bar-container">
        <div class="bar-label">SHLD</div>
        <div class="bar shield-bar"><div class="bar-fill"></div></div>
      </div>
      <div class="bar-container">
        <div class="bar-label">HEAT</div>
        <div class="bar heat-bar"><div class="bar-fill"></div></div>
      </div>
    </div>
    <div class="target-reticle"></div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #hud {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      color: #0f0;
    }
    .status-panel {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border: 1px solid #0f0;
    }
    .speed-display {
      text-align: center;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bar-label {
      width: 40px;
      font-size: 12px;
    }
    .bar {
      width: 150px;
      height: 12px;
      background: rgba(0, 50, 0, 0.5);
      border: 1px solid #0a0;
    }
    .bar-fill {
      height: 100%;
      transition: width 0.1s;
    }
    .hull-bar .bar-fill { background: #0f0; }
    .shield-bar .bar-fill { background: #0af; }
    .heat-bar .bar-fill { background: #f80; }
    .target-reticle {
      position: absolute;
      width: 40px;
      height: 40px;
      border: 2px solid #f00;
      display: none;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
  parent.appendChild(container);

  return {
    container,
    speedEl: container.querySelector('.speed-value')!,
    hullBar: container.querySelector('.hull-bar .bar-fill')!,
    shieldBar: container.querySelector('.shield-bar .bar-fill')!,
    heatBar: container.querySelector('.heat-bar .bar-fill')!,
    targetReticle: container.querySelector('.target-reticle')!,
  };
}

/** Update HUD with current game state */
export function updateHUD(
  hud: HUD,
  world: World,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number
): void {
  // Find player
  const player = findEntity(world, ['playerControlled', 'transform']);
  if (player === undefined) return;

  // Update speed
  const physics = getComponent<Physics>(world, player, 'physics');
  if (physics) {
    hud.speedEl.textContent = Math.round(physics.currentSpeed).toString();
  }

  // Update hull bar
  const health = getComponent<Health>(world, player, 'health');
  if (health) {
    const pct = (health.hull / health.maxHull) * 100;
    hud.hullBar.style.width = `${pct}%`;
  }

  // Update shield bar
  const shields = getComponent<Shields>(world, player, 'shields');
  if (shields) {
    const pct = (shields.current / shields.max) * 100;
    hud.shieldBar.style.width = `${pct}%`;
  }

  // Update heat bar
  const heat = getComponent<Heat>(world, player, 'heat');
  if (heat) {
    const pct = (heat.current / heat.max) * 100;
    hud.heatBar.style.width = `${pct}%`;
  }

  // Update target reticle
  const targeting = getComponent<Targeting>(world, player, 'targeting');
  if (targeting?.currentTarget !== undefined) {
    updateTargetReticle(hud, world, targeting.currentTarget, camera, screenWidth, screenHeight);
  } else {
    hud.targetReticle.style.display = 'none';
  }
}

/** Update target reticle position */
function updateTargetReticle(
  hud: HUD,
  world: World,
  target: Entity,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number
): void {
  const transform = getComponent<Transform>(world, target, 'transform');
  if (!transform) {
    hud.targetReticle.style.display = 'none';
    return;
  }

  // Project 3D position to screen
  const pos = transform.position.clone().project(camera);

  // Check if behind camera
  if (pos.z > 1) {
    hud.targetReticle.style.display = 'none';
    return;
  }

  // Convert to screen coordinates
  const x = (pos.x + 1) * 0.5 * screenWidth;
  const y = (1 - pos.y) * 0.5 * screenHeight;

  // Check if on screen
  if (x < -20 || x > screenWidth + 20 || y < -20 || y > screenHeight + 20) {
    hud.targetReticle.style.display = 'none';
    return;
  }

  // Update reticle position
  hud.targetReticle.style.display = 'block';
  hud.targetReticle.style.left = `${x - 20}px`;
  hud.targetReticle.style.top = `${y - 20}px`;
}
