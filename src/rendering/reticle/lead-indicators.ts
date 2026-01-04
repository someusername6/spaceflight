/**
 * Lead indicator rendering - shows where to aim for each weapon.
 */

import * as THREE from 'three';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapons } from '../../components/weapons';
import { getCurrentPrimary } from '../../components/weapons';
import { calculateInterceptPoint } from './lead-calculation';
import { drawLeadIndicator } from './reticle-drawing';

// Reusable vectors for lead calculation
const leadVec3 = new THREE.Vector3();
const leadCalcVec = new THREE.Vector3();

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
): void {
  if (weapons.linked) {
    // Linked mode: show lead indicators for each unique projectile speed
    drawLinkedLeadIndicators(
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
    );
  } else {
    // Single mode: show one lead indicator for current weapon
    const weapon = getCurrentPrimary(weapons);
    if (!weapon) return;

    if (weapon.projectileSpeed <= 0) {
      // Beam weapon: indicator at target center (instant hit, no lead needed)
      drawBeamIndicator(
        ctx,
        camera,
        screenWidth,
        screenHeight,
        playerTransform,
        targetPosition,
        weapon.range,
        color,
        cameraForward,
      );
    } else {
      // Projectile weapon: calculate intercept point
      drawSingleLeadIndicator(
        ctx,
        camera,
        screenWidth,
        screenHeight,
        playerTransform,
        playerVelocity,
        targetPosition,
        targetVelocity,
        weapon.projectileSpeed,
        weapon.range,
        weapon.name,
        color,
        cameraForward,
        false, // Don't show label in single mode
      );
    }
  }
}

/** Draw beam weapon indicator at target center (beams are instant hit, no lead needed) */
function drawBeamIndicator(
  ctx: CanvasRenderingContext2D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform,
  targetPosition: THREE.Vector3,
  weaponRange: number,
  color: string,
  cameraForward: THREE.Vector3,
): void {
  // Check if target is within weapon range
  const distance = playerTransform.position.distanceTo(targetPosition);
  const outOfRange = distance > weaponRange;

  // Check if target is in front of camera
  leadCalcVec.copy(targetPosition).sub(camera.position);
  const targetBehind = leadCalcVec.dot(cameraForward) < 0;
  if (targetBehind) return;

  // Project target position to screen
  leadVec3.copy(targetPosition).project(camera);
  const screenX = (leadVec3.x + 1) * 0.5 * screenWidth;
  const screenY = (1 - leadVec3.y) * 0.5 * screenHeight;

  // Only draw if on screen
  if (
    screenX >= 0 &&
    screenX <= screenWidth &&
    screenY >= 0 &&
    screenY <= screenHeight
  ) {
    drawLeadIndicator(ctx, screenX, screenY, color, outOfRange, undefined);
  }
}

/** Draw a single lead indicator */
function drawSingleLeadIndicator(
  ctx: CanvasRenderingContext2D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number,
  playerTransform: Transform,
  playerVelocity: THREE.Vector3,
  targetPosition: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  projectileSpeed: number,
  weaponRange: number,
  weaponName: string,
  color: string,
  cameraForward: THREE.Vector3,
  showLabel: boolean,
): void {
  const interceptPoint = calculateInterceptPoint(
    playerTransform.position,
    playerVelocity,
    targetPosition,
    targetVelocity,
    projectileSpeed,
  );

  if (!interceptPoint) return;

  // Check if intercept is within weapon range
  const interceptDistance = playerTransform.position.distanceTo(interceptPoint);
  const outOfRange = interceptDistance > weaponRange;

  // Check if intercept point is in front of camera
  leadCalcVec.copy(interceptPoint).sub(camera.position);
  const interceptBehind = leadCalcVec.dot(cameraForward) < 0;
  if (interceptBehind) return;

  // Project intercept point to screen
  leadVec3.copy(interceptPoint).project(camera);
  const leadX = (leadVec3.x + 1) * 0.5 * screenWidth;
  const leadY = (1 - leadVec3.y) * 0.5 * screenHeight;

  // Only draw if on screen
  if (
    leadX >= 0 &&
    leadX <= screenWidth &&
    leadY >= 0 &&
    leadY <= screenHeight
  ) {
    const label = showLabel ? weaponName : undefined;
    drawLeadIndicator(ctx, leadX, leadY, color, outOfRange, label);
  }
}

/** Draw multiple lead indicators for linked weapons */
function drawLinkedLeadIndicators(
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
): void {
  // Reset pool index and clear Map (avoid per-frame allocations)
  speedInfoPoolIndex = 0;
  uniqueSpeeds.clear();

  // Track beam with longest range for beam indicator
  let longestBeamRange = 0;

  for (const w of weapons.weapons) {
    if (w.projectileSpeed <= 0) {
      // Beam weapon: track longest range for single beam indicator
      if (w.range > longestBeamRange) {
        longestBeamRange = w.range;
      }
    } else {
      // Projectile weapon: collect unique speeds (use pool to avoid allocation)
      if (!uniqueSpeeds.has(w.projectileSpeed)) {
        uniqueSpeeds.set(w.projectileSpeed, getSpeedInfo(w.name, w.range));
      }
    }
  }

  // Draw beam indicator if any beams equipped (uses longest range)
  if (longestBeamRange > 0) {
    drawBeamIndicator(
      ctx,
      camera,
      screenWidth,
      screenHeight,
      playerTransform,
      targetPosition,
      longestBeamRange,
      color,
      cameraForward,
    );
  }

  // If only one unique speed, don't show labels
  const showLabels = uniqueSpeeds.size > 1;

  // Draw a lead indicator for each unique speed
  for (const [speed, { name, range }] of uniqueSpeeds) {
    drawSingleLeadIndicator(
      ctx,
      camera,
      screenWidth,
      screenHeight,
      playerTransform,
      playerVelocity,
      targetPosition,
      targetVelocity,
      speed,
      range,
      name,
      color,
      cameraForward,
      showLabels,
    );
  }
}
