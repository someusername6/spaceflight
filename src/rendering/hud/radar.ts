/**
 * 2D Radar display - top-down view relative to ship orientation.
 * Position: bottom-left of screen
 *
 * Features:
 * - Full 6DOF ship-relative orientation (pitch/yaw/roll)
 * - Logarithmic range scaling (more detail for close targets)
 * - Colors match reticle dim/bright pattern
 * - Y-axis (height) is compressed into the 2D plane
 */

import * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import type { Health } from '../../components/health';
import { isDead } from '../../components/health';
import type { Targeting } from '../../components/targeting';
import type { Transform } from '../../components/transform';
import { getComponent, hasComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Faction } from '../../core/types';

/** Radar display state */
export interface RadarDisplay {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/** Radar configuration */
const RADAR_SIZE = 150;
const RADAR_RANGE = 3000; // Max world units visible on radar
const BLIP_SIZE = 3;
const TARGET_BLIP_SIZE = 4;

/** Logarithmic ring distances (world units) */
const RING_DISTANCES = [500, 1000, 2000];

/** Pre-computed log denominator for distance scaling */
const LOG_SCALE_DENOM = Math.log(1 + RADAR_RANGE / 500);

/** Colors matching reticle dim/bright pattern */
const COLORS = {
  enemyDim: '#a00',
  enemyBright: '#f00',
  allyDim: '#0a0',
  allyBright: '#0f0',
  neutralDim: '#aa0',
  neutralBright: '#ff0',
  player: '#0f0',
  missile: '#888',
};

// Reusable vector for ship-local transformation
const localPos = new THREE.Vector3();
const inverseQuat = new THREE.Quaternion();

/** Create radar display */
export function createRadar(parent: HTMLElement): RadarDisplay {
  const container = document.createElement('div');
  container.className = 'radar-container';

  const canvas = document.createElement('canvas');
  canvas.className = 'radar-canvas';
  canvas.width = RADAR_SIZE;
  canvas.height = RADAR_SIZE;

  const label = document.createElement('div');
  label.className = 'radar-label';
  label.textContent = 'RADAR';
  container.appendChild(label);
  container.appendChild(canvas);

  parent.appendChild(container);

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  return { canvas, ctx };
}

/** Convert world distance to radar radius using logarithmic scaling */
function distanceToRadar(distance: number, maxRadius: number): number {
  if (distance <= 0) return 0;
  const logScale = Math.log(1 + distance / 500) / LOG_SCALE_DENOM;
  return Math.min(logScale * maxRadius, maxRadius);
}

/** Update radar with current game state */
export function updateRadar(
  radar: RadarDisplay,
  world: World,
  player: Entity,
): void {
  const { ctx, canvas } = radar;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = centerX - 4;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw radar background
  ctx.fillStyle = 'rgba(0, 20, 0, 0.7)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = '#0a0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw logarithmic range rings with labels
  ctx.font = '8px "Lucida Console", monospace';
  ctx.fillStyle = 'rgba(0, 100, 0, 0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const ringDist of RING_DISTANCES) {
    const ringRadius = distanceToRadar(ringDist, maxRadius);
    ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Label on right side of ring
    const label = ringDist >= 1000 ? `${ringDist / 1000}k` : `${ringDist}`;
    ctx.fillText(label, centerX + ringRadius - 10, centerY - 3);
  }

  // Draw crosshairs
  ctx.strokeStyle = 'rgba(0, 100, 0, 0.4)';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - maxRadius);
  ctx.lineTo(centerX, centerY + maxRadius);
  ctx.moveTo(centerX - maxRadius, centerY);
  ctx.lineTo(centerX + maxRadius, centerY);
  ctx.stroke();

  // Get player transform and faction
  const playerTransform = getComponent<Transform>(world, player, 'transform');
  const playerFaction = getComponent<FactionComponent>(
    world,
    player,
    'faction',
  );
  const targeting = getComponent<Targeting>(world, player, 'targeting');
  if (!playerTransform || !playerFaction) return;

  // Compute inverse quaternion for ship-local transformation
  inverseQuat.copy(playerTransform.rotation).invert();

  // Draw player at center (triangle pointing up = forward)
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 5);
  ctx.lineTo(centerX - 4, centerY + 4);
  ctx.lineTo(centerX + 4, centerY + 4);
  ctx.closePath();
  ctx.fill();

  // Draw all other ships
  for (const entity of queryEntities(world, [
    'transform',
    'faction',
    'health',
  ])) {
    if (entity === player) continue;

    // Skip projectiles and missiles
    if (hasComponent(world, entity, 'projectile')) continue;
    if (hasComponent(world, entity, 'missile')) continue;

    const health = getComponent<Health>(world, entity, 'health');
    if (!health || isDead(health)) continue;

    const transform = getComponent<Transform>(world, entity, 'transform');
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    if (!transform || !faction) continue;

    // Transform to ship-local coordinates (full 6DOF)
    localPos.copy(transform.position).sub(playerTransform.position);
    localPos.applyQuaternion(inverseQuat);
    // Now: localPos.x = right, localPos.y = up, localPos.z = forward (ship space)

    // Check total 3D distance for range limit
    const totalDist = Math.sqrt(
      localPos.x * localPos.x +
        localPos.y * localPos.y +
        localPos.z * localPos.z,
    );
    if (totalDist > RADAR_RANGE) continue;

    // Calculate horizontal distance for radar position (Y/height is compressed)
    const horizDist = Math.sqrt(
      localPos.x * localPos.x + localPos.z * localPos.z,
    );

    // Convert to radar coordinates with logarithmic scaling
    const radarDist = distanceToRadar(horizDist, maxRadius);
    const angle = Math.atan2(localPos.x, -localPos.z); // -z because forward is negative z in Three.js
    const blipX = centerX + Math.sin(angle) * radarDist;
    const blipY = centerY - Math.cos(angle) * radarDist; // Negative because screen Y is inverted

    // Determine colors based on faction and target status
    const isEnemy =
      faction.faction !== playerFaction.faction &&
      faction.faction !== Faction.Neutral;
    const isNeutral = faction.faction === Faction.Neutral;
    const isTarget = targeting?.currentTarget === entity;

    let color: string;
    if (isNeutral) {
      color = isTarget ? COLORS.neutralBright : COLORS.neutralDim;
    } else if (isEnemy) {
      color = isTarget ? COLORS.enemyBright : COLORS.enemyDim;
    } else {
      color = isTarget ? COLORS.allyBright : COLORS.allyDim;
    }

    // Draw blip
    ctx.fillStyle = color;
    const size = isTarget ? TARGET_BLIP_SIZE : BLIP_SIZE;
    if (isTarget) {
      // Diamond shape for target
      ctx.beginPath();
      ctx.moveTo(blipX, blipY - size);
      ctx.lineTo(blipX + size, blipY);
      ctx.lineTo(blipX, blipY + size);
      ctx.lineTo(blipX - size, blipY);
      ctx.closePath();
      ctx.fill();
    } else {
      // Circle for non-targets
      ctx.beginPath();
      ctx.arc(blipX, blipY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw missiles as grey Xs
  drawMissiles(
    ctx,
    world,
    playerTransform,
    inverseQuat,
    centerX,
    centerY,
    maxRadius,
  );
}

/** Draw missiles on radar as grey Xs */
function drawMissiles(
  ctx: CanvasRenderingContext2D,
  world: World,
  playerTransform: Transform,
  invQuat: THREE.Quaternion,
  centerX: number,
  centerY: number,
  maxRadius: number,
): void {
  ctx.strokeStyle = COLORS.missile;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (const entity of queryEntities(world, [
    'transform',
    'missile',
    'health',
  ])) {
    const health = getComponent<Health>(world, entity, 'health');
    if (!health || isDead(health)) continue;

    const transform = getComponent<Transform>(world, entity, 'transform');
    if (!transform) continue;

    // Transform to ship-local coordinates
    localPos.copy(transform.position).sub(playerTransform.position);
    localPos.applyQuaternion(invQuat);

    // Check range
    const totalDist = localPos.length();
    if (totalDist > RADAR_RANGE) continue;

    // Calculate radar position
    const horizDist = Math.sqrt(
      localPos.x * localPos.x + localPos.z * localPos.z,
    );
    const radarDist = distanceToRadar(horizDist, maxRadius);
    const angle = Math.atan2(localPos.x, -localPos.z);
    const blipX = centerX + Math.sin(angle) * radarDist;
    const blipY = centerY - Math.cos(angle) * radarDist;

    // Draw X shape (batched into single path)
    const xSize = 2;
    ctx.moveTo(blipX - xSize, blipY - xSize);
    ctx.lineTo(blipX + xSize, blipY + xSize);
    ctx.moveTo(blipX + xSize, blipY - xSize);
    ctx.lineTo(blipX - xSize, blipY + xSize);
  }

  ctx.stroke();
}

/** Get CSS styles for radar */
export function getRadarStyles(): string {
  return `
    .radar-container {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #0a0;
      padding: 6px;
    }
    .radar-label {
      font-size: 10px;
      color: #0a0;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .radar-canvas {
      display: block;
    }
  `;
}
