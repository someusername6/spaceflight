/**
 * Reticle rendering - canvas-based target brackets, distance, and off-screen arrows.
 */

import * as THREE from 'three';
import { Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapons,
  SecondaryWeapons,
} from '../../components/weapons';
import { getCurrentSecondary } from '../../components/weapons';
import { getComponent, hasComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { getMissilesTargetingPlayer } from '../hud/missile-warning';
import { getInterpolatedPosition } from '../renderer';
import {
  drawDumbfireMissileLeadIndicator,
  drawLeadIndicators,
  resetLeadIndicatorSmoothing,
  resetLeadIndicatorState,
} from './lead-indicators';
import {
  drawCenterCrosshair,
  drawLockIndicator,
  drawOffScreenArrow,
  drawOnScreenReticle,
} from './reticle-drawing';
import {
  compareTargetsForRendering,
  computeScreenBounds,
  getTargetInfo,
  resetTargetPool,
  type TargetInfo,
  zeroVec3,
} from './reticle-helpers';

/** Reticle canvas state */
export interface ReticleCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
}

// Reusable objects to avoid per-frame allocations
const tempVec3 = new THREE.Vector3();
const toTarget = new THREE.Vector3();
const cameraForward = new THREE.Vector3();

// Track previous target to detect target changes (for lead indicator smoothing reset)
let previousTarget: Entity | undefined;

// Reusable targets array (stores references from pool, cleared each frame)
const targets: TargetInfo[] = [];

/** Reset all reticle state - call on game restart */
export function resetReticleState(): void {
  previousTarget = undefined;
  targets.length = 0;
  resetLeadIndicatorState();
}

/** Create the reticle canvas */
export function createReticleCanvas(parent: HTMLElement): ReticleCanvas {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  parent.appendChild(canvas);

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;

  // Initial size
  resizeReticleCanvas(
    { canvas, ctx, dpr },
    parent.clientWidth,
    parent.clientHeight,
  );

  return { canvas, ctx, dpr };
}

/** Resize canvas for current container size */
export function resizeReticleCanvas(
  rc: ReticleCanvas,
  width: number,
  height: number,
): void {
  rc.dpr = window.devicePixelRatio || 1;
  rc.canvas.width = width * rc.dpr;
  rc.canvas.height = height * rc.dpr;
  rc.ctx.scale(rc.dpr, rc.dpr);
}

/** Update all target reticles */
export function updateReticles(
  rc: ReticleCanvas,
  world: World,
  player: Entity,
  playerTransform: Transform | undefined,
  playerVelocity: THREE.Vector3 | undefined,
  camera: THREE.Camera,
  entityMeshes: Map<Entity, THREE.Object3D>,
  screenWidth: number,
  screenHeight: number,
): void {
  const { ctx, dpr } = rc;

  // Clear canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, rc.canvas.width, rc.canvas.height);
  ctx.scale(dpr, dpr);

  // Draw center crosshair (fixed aiming point)
  drawCenterCrosshair(ctx, screenWidth, screenHeight);

  const targeting = getComponent(world, player, 'targeting');
  const currentTarget = targeting?.currentTarget;

  // Reset lead indicator smoothing when target changes (snap to new target)
  if (currentTarget !== previousTarget) {
    resetLeadIndicatorSmoothing();
    previousTarget = currentTarget;
  }

  // Get player's weapons for lead calculation
  const playerWeapons = getComponent(world, player, 'primaryWeapons');

  // Get lock-on progress for secondary weapons
  const secondaryWeapons = getComponent(world, player, 'secondaryWeapons');
  const lockProgress = secondaryWeapons?.lockProgress ?? 0;
  const lockTarget = secondaryWeapons?.lockTarget;

  // Reset pool index and clear targets array (avoids allocation each frame)
  resetTargetPool();
  targets.length = 0;

  // Get missiles targeting player for threat highlighting
  const threatMissiles = new Set(getMissilesTargetingPlayer(world, player));

  // Collect all targetable entities
  for (const entity of queryEntities(world, [
    'transform',
    'health',
    'faction',
  ])) {
    if (entity === player) continue;

    // Skip projectiles (they don't need reticles)
    // Note: Decoys ARE rendered with faction colors to appear as ships
    if (hasComponent(world, entity, 'projectile')) continue;

    // Skip dead or dying entities (no reticle drawn for them)
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent(world, entity, 'transform');
    const faction = getComponent(world, entity, 'faction');
    if (!transform || !faction) continue;
    const physics = getComponent(world, entity, 'physics');
    const mesh = entityMeshes.get(entity);
    const distance =
      playerTransform?.position.distanceTo(transform.position) ?? 0;

    const isLockTarget = entity === lockTarget;
    const isMissile = hasComponent(world, entity, 'missile');
    const isConvoy = hasComponent(world, entity, 'convoyShip');

    // Check if this is a missile targeting the player
    const isThreatMissile = isMissile && threatMissiles.has(entity);

    // Get reusable object from pool (avoids per-frame allocation)
    const target = getTargetInfo();
    target.entity = entity;
    target.transform = transform;
    // Use interpolated position for smooth rendering (fall back to tick position)
    const interpPos = getInterpolatedPosition(entity);
    if (interpPos) {
      target.interpolatedPosition.copy(interpPos);
    } else {
      target.interpolatedPosition.copy(transform.position);
    }
    target.velocity = physics?.velocity ?? zeroVec3;
    target.mesh = mesh;
    target.distance = distance;
    target.isSelected = entity === currentTarget;
    target.isEnemy = faction.faction === Faction.Enemy;
    target.isNeutral = faction.faction === Faction.Neutral;
    target.isConvoy = isConvoy;
    target.isLockTarget = isLockTarget;
    target.lockProgress = isLockTarget ? lockProgress : 0;
    target.isMissile = isMissile;
    target.isThreatMissile = isThreatMissile;
    targets.push(target);
  }

  // Sort: selected last (so it renders on top), then by distance descending (far first)
  targets.sort(compareTargetsForRendering);

  // Render all targets
  for (const t of targets) {
    renderTarget(
      ctx,
      t,
      camera,
      screenWidth,
      screenHeight,
      playerTransform,
      playerVelocity,
      playerWeapons,
      secondaryWeapons,
    );
  }
}

/** Render a single target */
function renderTarget(
  ctx: CanvasRenderingContext2D,
  target: TargetInfo,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform | undefined,
  playerVelocity: THREE.Vector3 | undefined,
  playerWeapons: PrimaryWeapons | undefined,
  secondaryWeapons: SecondaryWeapons | undefined,
): void {
  // Colors matching radar: dim for non-selected, bright for selected
  // Threat missiles are red, other missiles grey, convoys yellow, ships use faction
  let color: string;
  if (target.isThreatMissile) {
    color = '#ff0000'; // Red for missiles targeting player
  } else if (target.isMissile) {
    color = '#888888';
  } else if (target.isConvoy) {
    // Convoys always yellow regardless of faction (escort=Player, ambush=Enemy)
    color = target.isSelected ? '#ffff00' : '#888800';
  } else if (target.isNeutral) {
    color = target.isSelected ? '#ffff00' : '#888800';
  } else if (target.isEnemy) {
    color = target.isSelected ? '#ff0000' : '#880000';
  } else {
    color = target.isSelected ? '#00ff00' : '#008800';
  }

  // Check if target is behind camera using dot product (works at any distance)
  // Use interpolated position for smooth off-screen arrow movement
  toTarget.copy(target.interpolatedPosition).sub(camera.position);
  cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const behindCamera = toTarget.dot(cameraForward) < 0;

  // Project center position to screen space (use interpolated position)
  tempVec3.copy(target.interpolatedPosition).project(camera);
  const centerX = (tempVec3.x + 1) * 0.5 * screenWidth;
  const centerY = (1 - tempVec3.y) * 0.5 * screenHeight;

  // Compute screen bounds from mesh (only used if target is in front of camera)
  let bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null = null;
  if (target.mesh && !behindCamera) {
    bounds = computeScreenBounds(
      target.mesh,
      camera,
      screenWidth,
      screenHeight,
    );
  }

  // Check if on screen
  const margin = 50;
  const onScreen =
    !behindCamera &&
    centerX >= -margin &&
    centerX <= screenWidth + margin &&
    centerY >= -margin &&
    centerY <= screenHeight + margin;

  if (onScreen && bounds) {
    drawOnScreenReticle(ctx, bounds, target.distance, color);

    // Draw lock-on progress indicator for targets being locked
    // Only show for weapons that require lock (not dumbfire)
    const currentSecondary = secondaryWeapons
      ? getCurrentSecondary(secondaryWeapons)
      : undefined;
    const weaponRequiresLock = currentSecondary?.requiresLock ?? false;
    if (target.isLockTarget && target.lockProgress > 0 && weaponRequiresLock) {
      drawLockIndicator(ctx, bounds, target.lockProgress, color);
    }

    // Draw lead indicator(s) for selected target (not for missiles)
    if (
      target.isSelected &&
      !target.isMissile &&
      playerTransform &&
      playerWeapons
    ) {
      drawLeadIndicators(
        ctx,
        camera,
        screenWidth,
        screenHeight,
        playerTransform,
        playerVelocity ?? zeroVec3,
        target.interpolatedPosition,
        target.velocity,
        playerWeapons,
        color,
        cameraForward,
      );
    }

    // Draw dumbfire missile lead indicator for selected target (not for missiles)
    if (
      target.isSelected &&
      !target.isMissile &&
      playerTransform &&
      secondaryWeapons
    ) {
      drawDumbfireMissileLeadIndicator(
        ctx,
        camera,
        screenWidth,
        screenHeight,
        playerTransform,
        playerVelocity ?? zeroVec3,
        target.interpolatedPosition,
        target.velocity,
        secondaryWeapons,
        color,
        cameraForward,
      );
    }
  } else {
    drawOffScreenArrow(
      ctx,
      centerX,
      centerY,
      target.distance,
      color,
      behindCamera,
      screenWidth,
      screenHeight,
    );
  }
}
