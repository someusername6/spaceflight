/**
 * Lead indicator rendering - shows where to aim for each weapon.
 */

import * as THREE from 'three';
import type { Transform } from '../components/transform';
import type { PrimaryWeapons } from '../components/weapons';
import { getCurrentPrimary } from '../components/weapons';
import { calculateInterceptPoint } from './lead-calculation';
import { drawLeadIndicator } from './reticle-drawing';

// Reusable vectors for lead calculation
const leadVec3 = new THREE.Vector3();
const leadCalcVec = new THREE.Vector3();

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
    if (!weapon || weapon.projectileSpeed <= 0) return; // Beams don't need lead

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
  // Collect unique projectile speeds and their weapon names
  // (beams have speed 0 and don't need lead indicators)
  const uniqueSpeeds = new Map<number, { name: string; range: number }>();

  for (const w of weapons.weapons) {
    if (w.projectileSpeed <= 0) continue; // Skip beams
    if (!uniqueSpeeds.has(w.projectileSpeed)) {
      uniqueSpeeds.set(w.projectileSpeed, { name: w.name, range: w.range });
    }
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
