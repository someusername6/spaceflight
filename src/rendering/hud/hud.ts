/**
 * HUD rendering - HTML/CSS overlay for game UI.
 */

import type { Camera } from 'three';
import { getHeatPercentCapped } from '../../components/heat';
import { isIonized } from '../../components/shields';
import { getComponent } from '../../core/ecs';
import { findLocalPlayer } from '../../core/player-utils';
import type { Entity, World } from '../../core/types';
import type { Renderer } from '../renderer';
import {
  createReticleCanvas,
  type ReticleCanvas,
  resizeReticleCanvas,
  updateReticles,
} from '../reticle/reticles';
import {
  createWeaponDisplay,
  getWeaponDisplayStyles,
  updateWeaponDisplay,
  type WeaponDisplay,
} from '../weapon-display/weapon-display';
import {
  type AlliedDisplay,
  createAlliedDisplay,
  getAlliedDisplayStyles,
  updateAlliedDisplay,
} from './allied-hud';
import { requireElement } from './dom-utils';
import { getHUDStyles, HUD_STYLE_ID } from './hud-styles';
import { getMissileThreatState } from './missile-warning';
import {
  createRadar,
  getRadarStyles,
  type RadarDisplay,
  updateRadar,
} from './radar';
import {
  createTargetCamera,
  disposeTargetCamera,
  getTargetCameraStyles,
  type TargetCamera,
} from './target-camera';
import {
  createTargetStats,
  getTargetStatsStyles,
  type TargetStatsDisplay,
  updateTargetStats,
} from './target-stats';

/** HUD state */
export interface HUD {
  container: HTMLElement;
  speedFill: HTMLElement;
  afterburnerFill: HTMLElement;
  maxSpeedTick: HTMLElement;
  speedValue: HTMLElement;
  throttleMarker: HTMLElement;
  // Cached segment elements (avoid DOM recreation every frame)
  shieldSegments: HTMLElement[];
  hullSegments: HTMLElement[];
  heatSegments: HTMLElement[];
  // Cached container refs (avoid .closest() every frame)
  shieldContainer: HTMLElement;
  hullContainer: HTMLElement;
  heatContainer: HTMLElement;
  // Value display elements
  hullValue: HTMLElement;
  shieldValue: HTMLElement;
  heatValue: HTMLElement;
  reticleCanvas: ReticleCanvas;
  // Weapon display (bottom-right)
  weaponDisplay: WeaponDisplay;
  // Radar display (bottom-left)
  radarDisplay: RadarDisplay;
  // Target stats (top-right)
  targetStats: TargetStatsDisplay;
  // Target camera (picture-in-picture view of target)
  targetCamera: TargetCamera;
  // Allied display (top-left)
  alliedDisplay: AlliedDisplay;
  // Match speed indicator
  matchSpeedIndicator: HTMLElement;
  // Missile warning indicator
  missileWarning: HTMLElement;
  // Cleanup function
  dispose: () => void;
}

/** Number of segments per bar */
const SEGMENT_COUNT = 10;

/** Create segment HTML for bars */
function createSegmentHTML(): string {
  return Array(SEGMENT_COUNT).fill('<div class="segment"></div>').join('');
}

/** Create HUD elements */
export function createHUD(parent: HTMLElement): HUD {
  const container = document.createElement('div');
  container.id = 'hud';
  container.innerHTML = `
    <div class="match-speed-indicator" style="display: none;">[MATCH SPEED]</div>
    <div class="missile-warning"></div>
    <div class="status-panel">
      <div class="bar-row speed-row">
        <div class="bar-label">SPD</div>
        <div class="speed-bar">
          <div class="speed-fill"></div>
          <div class="afterburner-fill"></div>
          <div class="max-speed-tick"></div>
          <div class="throttle-marker">▲</div>
        </div>
        <div class="bar-value speed-value">0</div>
      </div>
      <div class="bar-container shield-container">
        <div class="bar-label">SHLD</div>
        <div class="bar shield-bar"><div class="bar-segments">${createSegmentHTML()}</div></div>
        <div class="bar-value shield-value">100</div>
      </div>
      <div class="bar-container hull-container">
        <div class="bar-label">HULL</div>
        <div class="bar hull-bar"><div class="bar-segments">${createSegmentHTML()}</div></div>
        <div class="bar-value hull-value">100</div>
      </div>
      <div class="bar-container heat-container">
        <div class="bar-label">HEAT</div>
        <div class="bar heat-bar"><div class="bar-segments">${createSegmentHTML()}</div></div>
        <div class="bar-value heat-value">0</div>
      </div>
    </div>
  `;

  // Add styles only once (prevent duplicates)
  if (!document.getElementById(HUD_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = HUD_STYLE_ID;
    style.textContent =
      getHUDStyles() +
      getWeaponDisplayStyles() +
      getRadarStyles() +
      getTargetStatsStyles() +
      getTargetCameraStyles() +
      getAlliedDisplayStyles();
    document.head.appendChild(style);
  }
  parent.appendChild(container);

  // Create canvas for reticles
  const reticleCanvas = createReticleCanvas(container);

  // Create weapon display (bottom-right)
  const weaponDisplay = createWeaponDisplay(container);

  // Create radar display (bottom-left)
  const radarDisplay = createRadar(container);

  // Create target stats (top-right)
  const targetStats = createTargetStats(container);

  // Create target camera and append to target stats
  const targetCamera = createTargetCamera();
  targetStats.cameraContainer.appendChild(targetCamera.canvas);

  // Create allied display (top-left)
  const alliedDisplay = createAlliedDisplay(container);

  // Handle resize
  const onResize = () => {
    resizeReticleCanvas(reticleCanvas, parent.clientWidth, parent.clientHeight);
  };
  window.addEventListener('resize', onResize);

  // Cache segment elements (convert NodeList to array)
  const shieldSegments = Array.from(
    container.querySelectorAll<HTMLElement>('.shield-bar .segment'),
  );
  const hullSegments = Array.from(
    container.querySelectorAll<HTMLElement>('.hull-bar .segment'),
  );
  const heatSegments = Array.from(
    container.querySelectorAll<HTMLElement>('.heat-bar .segment'),
  );

  // Cleanup function
  const dispose = () => {
    window.removeEventListener('resize', onResize);
    disposeTargetCamera(targetCamera);
    container.remove();
  };

  // These elements are created in createStatusBarHTML above
  // Use requireElement for safe querying with meaningful errors
  return {
    container,
    speedFill: requireElement(container, '.speed-fill'),
    afterburnerFill: requireElement(container, '.afterburner-fill'),
    maxSpeedTick: requireElement(container, '.max-speed-tick'),
    speedValue: requireElement(container, '.speed-value'),
    throttleMarker: requireElement(container, '.throttle-marker'),
    shieldSegments,
    hullSegments,
    heatSegments,
    shieldContainer: requireElement(container, '.shield-container'),
    hullContainer: requireElement(container, '.hull-container'),
    heatContainer: requireElement(container, '.heat-container'),
    hullValue: requireElement(container, '.hull-value'),
    shieldValue: requireElement(container, '.shield-value'),
    heatValue: requireElement(container, '.heat-value'),
    reticleCanvas,
    weaponDisplay,
    radarDisplay,
    targetStats,
    targetCamera,
    alliedDisplay,
    matchSpeedIndicator: requireElement(container, '.match-speed-indicator'),
    missileWarning: requireElement(container, '.missile-warning'),
    dispose,
  };
}

/**
 * Update HUD with current game state.
 *
 * @param hud - HUD instance
 * @param world - Game world
 * @param camera - Active camera
 * @param renderer - Renderer instance for interpolation data
 * @param screenWidth - Screen width for reticles
 * @param screenHeight - Screen height for reticles
 * @param playerEntity - Optional player entity (if not provided, finds local player)
 */
export function updateHUD(
  hud: HUD,
  world: World,
  camera: Camera,
  renderer: Renderer,
  screenWidth: number,
  screenHeight: number,
  dt: number,
  playerEntity?: Entity,
): void {
  const player = playerEntity ?? findLocalPlayer(world);
  if (player === null) return;

  updatePlayerStatus(hud, world, player);
  updateMissileWarning(hud, world, player);
  updateWeaponDisplay(hud.weaponDisplay, world, player);
  updateRadar(hud.radarDisplay, world, player);
  updateTargetStats(hud.targetStats, world, player);
  updateAlliedDisplay(hud.alliedDisplay, world, player);

  const playerTransform = getComponent(world, player, 'transform');
  const playerPhysics = getComponent(world, player, 'physics');
  updateReticles(
    hud.reticleCanvas,
    world,
    player,
    playerTransform,
    playerPhysics?.velocity,
    camera,
    renderer.entityMeshes,
    screenWidth,
    screenHeight,
    renderer,
    dt,
  );
}

/** Update player status bars */
function updatePlayerStatus(hud: HUD, world: World, player: Entity): void {
  // Update match speed indicator
  const playerComp = getComponent(world, player, 'playerControlled');
  if (playerComp) {
    hud.matchSpeedIndicator.style.display = playerComp.matchSpeed
      ? 'block'
      : 'none';
  }

  const physics = getComponent(world, player, 'physics');
  if (physics) {
    const actualSpeed = physics.velocity.length();
    const afterburnerMax = physics.maxSpeed * physics.afterburnerMultiplier;

    // Position the max-speed tick mark (shows where normal max is on the full bar)
    const tickPosition = (physics.maxSpeed / afterburnerMax) * 100;
    hud.maxSpeedTick.style.left = `${tickPosition}%`;

    // Speed fill: green portion up to maxSpeed
    const normalSpeedPct = Math.min(
      (actualSpeed / afterburnerMax) * 100,
      tickPosition,
    );
    hud.speedFill.style.width = `${normalSpeedPct}%`;

    // Afterburner fill: orange portion beyond maxSpeed
    if (actualSpeed > physics.maxSpeed) {
      const abSpeedPct =
        ((actualSpeed - physics.maxSpeed) /
          (afterburnerMax - physics.maxSpeed)) *
        (100 - tickPosition);
      hud.afterburnerFill.style.width = `${abSpeedPct}%`;
      hud.afterburnerFill.style.left = `${tickPosition}%`;
    } else {
      hud.afterburnerFill.style.width = '0%';
    }

    hud.speedValue.textContent = Math.round(actualSpeed).toString();

    // Throttle marker position (0-100% throttle maps to 0 to maxSpeed, which is 0 to tickPosition% of bar)
    const throttlePct = (physics.currentSpeed / afterburnerMax) * 100;
    hud.throttleMarker.style.left = `${Math.min(throttlePct, 100)}%`;
  }

  const health = getComponent(world, player, 'health');
  if (health) {
    const pct = (health.hull / health.maxHull) * 100;
    updateSegmentedBar(hud.hullSegments, pct);
    hud.hullValue.textContent = Math.round(health.hull).toString();

    // Warning state: hull 30-50%
    hud.hullContainer.classList.toggle('hull-warning', pct >= 30 && pct < 50);
    // Critical state: hull < 30%
    hud.hullContainer.classList.toggle('critical', pct < 30);
  }

  const shields = getComponent(world, player, 'shields');
  if (shields) {
    const pct = (shields.current / shields.max) * 100;
    updateSegmentedBar(hud.shieldSegments, pct);
    hud.shieldValue.textContent = Math.round(shields.current).toString();

    // Warning state: shields at 0
    hud.shieldContainer.classList.toggle('warning', shields.current <= 0);
    // Ionized state: shield regen suppressed (purple color)
    const ionized = isIonized(shields, world.systemState.gameTime);
    hud.shieldContainer.classList.toggle('ionized', ionized);
  }

  const heat = getComponent(world, player, 'heat');
  if (heat) {
    // Cap display at 100% (actual heat can exceed max from Torch weapon)
    const pct = getHeatPercentCapped(heat) * 100;
    updateSegmentedBar(hud.heatSegments, pct);
    // Show actual heat value (can exceed max)
    hud.heatValue.textContent = Math.round(heat.current).toString();

    // Danger state: heat > 80%
    hud.heatContainer.classList.toggle('danger', pct > 80);
  }
}

/** Update segmented bar display by toggling classes (no DOM recreation) */
function updateSegmentedBar(segments: HTMLElement[], percentage: number): void {
  const filledCount = Math.round(percentage / SEGMENT_COUNT);
  // Use for loop instead of .forEach() to avoid per-call callback allocation
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment) segment.classList.toggle('filled', i < filledCount);
  }
}

/** Update missile warning indicator */
function updateMissileWarning(hud: HUD, world: World, player: Entity): void {
  const threat = getMissileThreatState(world, player);

  // Priority: Incoming missiles > Lock achieved > Being locked
  if (threat.incomingCount > 0) {
    // Missiles incoming - highest priority warning
    const text =
      threat.incomingCount === 1
        ? '[MISSILE INCOMING]'
        : `[MISSILE INCOMING x${threat.incomingCount}]`;
    hud.missileWarning.textContent = text;
    hud.missileWarning.classList.add('active');
    hud.missileWarning.classList.remove('lock-warning');
  } else if (threat.hasEnemyLock) {
    // Enemy has achieved full lock
    hud.missileWarning.textContent = '[MISSILE LOCK]';
    hud.missileWarning.classList.add('active');
    hud.missileWarning.classList.remove('lock-warning');
  } else if (threat.maxEnemyLockProgress > 0) {
    // Being locked - show warning in orange
    hud.missileWarning.textContent = '[MISSILE LOCK]';
    hud.missileWarning.classList.add('active', 'lock-warning');
  } else {
    // No threat
    hud.missileWarning.classList.remove('active', 'lock-warning');
  }
}
