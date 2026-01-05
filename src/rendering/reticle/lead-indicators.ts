/**
 * Lead indicator rendering - shows where to aim for each weapon.
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

    if (!interceptPoint) continue;

    // Check if target is in range
    const distance = playerTransform.position.distanceTo(targetPosition);
    const inRange = distance <= info.range;

    // Check if intercept point is in front of camera
    leadVec3.copy(interceptPoint).sub(camera.position);
    if (leadVec3.dot(cameraForward) <= 0) continue;

    // Project intercept point to screen coordinates
    leadVec3.copy(interceptPoint).project(camera);
    const screenX = (leadVec3.x + 1) * 0.5 * screenWidth;
    const screenY = (1 - leadVec3.y) * 0.5 * screenHeight;

    // Only draw if on screen
    if (
      screenX >= 0 &&
      screenX <= screenWidth &&
      screenY >= 0 &&
      screenY <= screenHeight
    ) {
      const label = uniqueSpeeds.size > 1 ? info.name : undefined;
      drawLeadIndicator(ctx, screenX, screenY, color, !inRange, label);
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
): void {
  const interceptPoint = calculateInterceptPoint(
    playerTransform.position,
    playerVelocity,
    targetPosition,
    targetVelocity,
    weapon.speed,
  );

  if (!interceptPoint) return;

  // Check if intercept is within weapon range
  const interceptDistance = playerTransform.position.distanceTo(interceptPoint);
  const outOfRange = interceptDistance > weapon.range;

  // Check if intercept point is in front of camera
  leadVec3.copy(interceptPoint).sub(camera.position);
  const interceptBehind = leadVec3.dot(cameraForward) < 0;
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
    // Use a distinct style for missile lead - diamond shape with label
    drawMissileLeadMarker(ctx, leadX, leadY, color, outOfRange, weapon.name);
  }
}
