/**
 * Lead indicator rendering - shows where to aim for each weapon.
 *
 * Uses exponential smoothing to prevent jitter when target velocity changes.
 * Formula: pos += (target - pos) * (1 - exp(-speed * dt))
 */

import * as THREE from 'three';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapons,
  SecondaryWeapon,
  SecondaryWeapons,
} from '../../components/weapons';
import {
  getCurrentSecondary,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { calculateInterceptPoint } from './lead-calculation';
import { drawLeadIndicator, drawMissileLeadMarker } from './reticle-drawing';

// Reusable vector for lead calculation
const leadVec3 = new THREE.Vector3();

// --- Exponential smoothing for lead indicators ---
// Smoothing speed: higher = more responsive, lower = smoother
// 20 means position moves ~86% toward target per second
const SMOOTHING_SPEED = 20;

/** Smoothed position state */
interface SmoothedPos {
  x: number;
  y: number;
  initialized: boolean;
}

// Smoothed positions keyed by projectile speed (for primary weapons)
const smoothedPrimaryPositions = new Map<number, SmoothedPos>();

// Smoothed position for missile lead indicator
const smoothedMissilePos: SmoothedPos = { x: 0, y: 0, initialized: false };

/** Apply exponential smoothing to a position */
function smoothPosition(
  smoothed: SmoothedPos,
  targetX: number,
  targetY: number,
  dt: number,
): void {
  if (!smoothed.initialized) {
    // First frame: snap to target
    smoothed.x = targetX;
    smoothed.y = targetY;
    smoothed.initialized = true;
  } else {
    // Exponential smoothing: pos += (target - pos) * (1 - exp(-speed * dt))
    const factor = 1 - Math.exp(-SMOOTHING_SPEED * dt);
    smoothed.x += (targetX - smoothed.x) * factor;
    smoothed.y += (targetY - smoothed.y) * factor;
  }
}

/** Reset smoothing when target changes or becomes invalid */
export function resetLeadIndicatorSmoothing(): void {
  for (const pos of smoothedPrimaryPositions.values()) {
    pos.initialized = false;
  }
  smoothedMissilePos.initialized = false;
}

/** Full reset for game restart - clears all cached state */
export function resetLeadIndicatorState(): void {
  smoothedPrimaryPositions.clear();
  smoothedMissilePos.x = 0;
  smoothedMissilePos.y = 0;
  smoothedMissilePos.initialized = false;
}

// Pool of reusable value objects for uniqueSpeeds Map (avoid per-frame allocations)
interface SpeedInfo {
  name: string;
  range: number;
}
const speedInfoPool: SpeedInfo[] = [];
let speedInfoPoolIndex = 0;

/** Get a SpeedInfo from pool, expanding if needed */
function getSpeedInfo(name: string, range: number): SpeedInfo {
  if (speedInfoPoolIndex >= speedInfoPool.length) {
    speedInfoPool.push({ name: '', range: 0 });
  }
  const info = speedInfoPool[speedInfoPoolIndex++] as SpeedInfo;
  info.name = name;
  info.range = range;
  return info;
}

// Reusable Map for linked weapon speeds (avoid per-frame allocations)
const uniqueSpeeds = new Map<number, SpeedInfo>();

/** Draw lead indicator(s) based on weapon mode */
export function drawLeadIndicators(
  ctx: CanvasRenderingContext2D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform,
  playerVelocity: THREE.Vector3,
  targetPosition: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  weapons: PrimaryWeapons,
  color: string,
  cameraForward: THREE.Vector3,
  dt: number,
): void {
  // Show lead indicators for all weapons in current link mode
  drawLinkModeLeadIndicators(
    ctx,
    camera,
    screenWidth,
    screenHeight,
    playerTransform,
    playerVelocity,
    targetPosition,
    targetVelocity,
    weapons,
    color,
    cameraForward,
    dt,
  );
}

/** Draw lead indicators for weapons in current link mode */
function drawLinkModeLeadIndicators(
  ctx: CanvasRenderingContext2D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform,
  playerVelocity: THREE.Vector3,
  targetPosition: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  weapons: PrimaryWeapons,
  color: string,
  cameraForward: THREE.Vector3,
  dt: number,
): void {
  const indices = getWeaponIndicesForCurrentMode(weapons);
  if (indices.length === 0) return;

  // Collect unique projectile speeds from weapons in current mode
  speedInfoPoolIndex = 0;
  uniqueSpeeds.clear();

  for (const i of indices) {
    const weapon = weapons.weapons[i];
    if (!weapon || weapon.projectileSpeed <= 0) continue; // Skip beams

    const speed = weapon.projectileSpeed;
    if (!uniqueSpeeds.has(speed)) {
      uniqueSpeeds.set(speed, getSpeedInfo(weapon.name, weapon.range));
    }
  }

  // Draw lead indicator for each unique speed
  for (const [speed, info] of uniqueSpeeds) {
    const interceptPoint = calculateInterceptPoint(
      playerTransform.position,
      playerVelocity,
      targetPosition,
      targetVelocity,
      speed,
    );

    if (!interceptPoint) {
      // No valid intercept - mark smoothing as uninitialized for next valid frame
      const smoothed = smoothedPrimaryPositions.get(speed);
      if (smoothed) smoothed.initialized = false;
      continue;
    }

    // Check if target is in range
    const distance = playerTransform.position.distanceTo(targetPosition);
    const inRange = distance <= info.range;

    // Check if intercept point is in front of camera
    leadVec3.copy(interceptPoint).sub(camera.position);
    if (leadVec3.dot(cameraForward) <= 0) {
      const smoothed = smoothedPrimaryPositions.get(speed);
      if (smoothed) smoothed.initialized = false;
      continue;
    }

    // Project intercept point to screen coordinates
    leadVec3.copy(interceptPoint).project(camera);
    const rawScreenX = (leadVec3.x + 1) * 0.5 * screenWidth;
    const rawScreenY = (1 - leadVec3.y) * 0.5 * screenHeight;

    // Get or create smoothed position for this projectile speed
    let smoothed = smoothedPrimaryPositions.get(speed);
    if (!smoothed) {
      smoothed = { x: 0, y: 0, initialized: false };
      smoothedPrimaryPositions.set(speed, smoothed);
    }

    // Apply exponential smoothing
    smoothPosition(smoothed, rawScreenX, rawScreenY, dt);

    // Only draw if smoothed position is on screen
    if (
      smoothed.x >= 0 &&
      smoothed.x <= screenWidth &&
      smoothed.y >= 0 &&
      smoothed.y <= screenHeight
    ) {
      const label = uniqueSpeeds.size > 1 ? info.name : undefined;
      drawLeadIndicator(ctx, smoothed.x, smoothed.y, color, !inRange, label);
    }
  }
}

/** Draw lead indicator for dumbfire missiles (turnRate === 0) */
export function drawDumbfireMissileLeadIndicator(
  ctx: CanvasRenderingContext2D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform,
  playerVelocity: THREE.Vector3,
  targetPosition: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  weapons: SecondaryWeapons,
  color: string,
  cameraForward: THREE.Vector3,
  dt: number,
): void {
  const weapon = getCurrentSecondary(weapons);
  if (!weapon) return;

  // Only show lead indicator for dumbfire missiles (turnRate === 0)
  // Tracking missiles lock on and follow, so lead isn't needed
  if (weapon.turnRate !== 0) return;

  // Skip decoys
  if (weapon.isDecoy) return;

  drawMissileLeadIndicator(
    ctx,
    camera,
    screenWidth,
    screenHeight,
    playerTransform,
    playerVelocity,
    targetPosition,
    targetVelocity,
    weapon,
    color,
    cameraForward,
    dt,
  );
}

/** Draw a single missile lead indicator */
function drawMissileLeadIndicator(
  ctx: CanvasRenderingContext2D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform,
  playerVelocity: THREE.Vector3,
  targetPosition: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  weapon: SecondaryWeapon,
  color: string,
  cameraForward: THREE.Vector3,
  dt: number,
): void {
  const interceptPoint = calculateInterceptPoint(
    playerTransform.position,
    playerVelocity,
    targetPosition,
    targetVelocity,
    weapon.speed,
  );

  if (!interceptPoint) {
    smoothedMissilePos.initialized = false;
    return;
  }

  // Check if intercept is within weapon range
  const interceptDistance = playerTransform.position.distanceTo(interceptPoint);
  const outOfRange = interceptDistance > weapon.range;

  // Check if intercept point is in front of camera
  leadVec3.copy(interceptPoint).sub(camera.position);
  const interceptBehind = leadVec3.dot(cameraForward) < 0;
  if (interceptBehind) {
    smoothedMissilePos.initialized = false;
    return;
  }

  // Project intercept point to screen
  leadVec3.copy(interceptPoint).project(camera);
  const rawLeadX = (leadVec3.x + 1) * 0.5 * screenWidth;
  const rawLeadY = (1 - leadVec3.y) * 0.5 * screenHeight;

  // Apply exponential smoothing
  smoothPosition(smoothedMissilePos, rawLeadX, rawLeadY, dt);

  // Only draw if smoothed position is on screen
  if (
    smoothedMissilePos.x >= 0 &&
    smoothedMissilePos.x <= screenWidth &&
    smoothedMissilePos.y >= 0 &&
    smoothedMissilePos.y <= screenHeight
  ) {
    // Use a distinct style for missile lead - diamond shape
    drawMissileLeadMarker(
      ctx,
      smoothedMissilePos.x,
      smoothedMissilePos.y,
      color,
      outOfRange,
    );
  }
}
