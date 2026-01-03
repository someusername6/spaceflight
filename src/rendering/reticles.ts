/**
 * Reticle rendering - canvas-based target brackets, distance, and off-screen arrows.
 */

import * as THREE from 'three';
import type { World, Entity } from '../core/types';
import { getComponent, queryEntities } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { Targeting } from '../components/targeting';
import { Faction, type FactionComponent } from '../components/faction';
import { drawOnScreenReticle, drawOffScreenArrow } from './reticle-drawing';

/** Reticle canvas state */
export interface ReticleCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
}

// Reusable objects to avoid per-frame allocations
const tempVec3 = new THREE.Vector3();
const tempBox3 = new THREE.Box3();
const boxCorners: THREE.Vector3[] = [];
for (let i = 0; i < 8; i++) boxCorners.push(new THREE.Vector3());

// Reusable targets array (cleared each frame, avoids allocation)
const targets: TargetInfo[] = [];

/** Target info for rendering */
interface TargetInfo {
  entity: Entity;
  transform: Transform;
  mesh: THREE.Object3D | undefined;
  distance: number;
  isSelected: boolean;
  isEnemy: boolean;
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

  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  // Initial size
  resizeReticleCanvas({ canvas, ctx, dpr }, parent.clientWidth, parent.clientHeight);

  return { canvas, ctx, dpr };
}

/** Resize canvas for current container size */
export function resizeReticleCanvas(rc: ReticleCanvas, width: number, height: number): void {
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
  camera: THREE.Camera,
  entityMeshes: Map<Entity, THREE.Object3D>,
  screenWidth: number,
  screenHeight: number
): void {
  const { ctx, dpr } = rc;

  // Clear canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, rc.canvas.width, rc.canvas.height);
  ctx.scale(dpr, dpr);

  const targeting = getComponent<Targeting>(world, player, 'targeting');
  const currentTarget = targeting?.currentTarget;

  // Clear and reuse targets array (avoids allocation each frame)
  targets.length = 0;

  // Collect all targetable entities
  for (const entity of queryEntities(world, ['transform', 'health', 'faction'])) {
    if (entity === player) continue;

    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction')!;
    const mesh = entityMeshes.get(entity);
    const distance = playerTransform?.position.distanceTo(transform.position) ?? 0;

    targets.push({
      entity,
      transform,
      mesh,
      distance,
      isSelected: entity === currentTarget,
      isEnemy: faction.faction === Faction.Enemy,
    });
  }

  // Sort: selected first, then by distance
  targets.sort((a, b) => {
    if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
    return a.distance - b.distance;
  });

  // Render all targets
  for (const t of targets) {
    renderTarget(ctx, t, camera, screenWidth, screenHeight);
  }
}

/** Render a single target */
function renderTarget(
  ctx: CanvasRenderingContext2D,
  target: TargetInfo,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number
): void {
  const baseColor = target.isEnemy ? '#ff0000' : '#00ff00';
  const dimColor = target.isEnemy ? '#880000' : '#008800';
  const color = target.isSelected ? baseColor : dimColor;

  // Project center position to screen space
  tempVec3.copy(target.transform.position).project(camera);
  const centerX = (tempVec3.x + 1) * 0.5 * screenWidth;
  const centerY = (1 - tempVec3.y) * 0.5 * screenHeight;
  // In NDC, z > 1 means the point is behind the camera (beyond far plane)
  const behindCamera = tempVec3.z > 1;

  // Try to compute bounds from mesh (already stored in target.mesh)
  let bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  if (target.mesh) {
    const result = computeScreenBounds(target.mesh, camera, screenWidth, screenHeight);
    if (result && !result.behind) {
      bounds = result;
    }
  }

  // Check if on screen
  const margin = 50;
  const onScreen = !behindCamera &&
    centerX >= -margin && centerX <= screenWidth + margin &&
    centerY >= -margin && centerY <= screenHeight + margin;

  if (onScreen && bounds) {
    drawOnScreenReticle(ctx, bounds, target.distance, color);
  } else {
    drawOffScreenArrow(ctx, centerX, centerY, target.distance, color, behindCamera, screenWidth, screenHeight);
  }
}

/** Compute screen bounds from mesh bounding box */
function computeScreenBounds(
  mesh: THREE.Object3D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number
): { minX: number; maxX: number; minY: number; maxY: number; behind: boolean } | null {
  tempBox3.makeEmpty();
  let hasGeometry = false;

  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }
      if (child.geometry.boundingBox) {
        if (!hasGeometry) {
          tempBox3.copy(child.geometry.boundingBox);
          hasGeometry = true;
        } else {
          tempBox3.union(child.geometry.boundingBox);
        }
      }
    }
  });

  if (!hasGeometry) return null;

  const { min, max } = tempBox3;
  boxCorners[0]!.set(min.x, min.y, min.z);
  boxCorners[1]!.set(min.x, min.y, max.z);
  boxCorners[2]!.set(min.x, max.y, min.z);
  boxCorners[3]!.set(min.x, max.y, max.z);
  boxCorners[4]!.set(max.x, min.y, min.z);
  boxCorners[5]!.set(max.x, min.y, max.z);
  boxCorners[6]!.set(max.x, max.y, min.z);
  boxCorners[7]!.set(max.x, max.y, max.z);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let allBehind = true;

  for (const c of boxCorners) {
    tempVec3.copy(c);
    tempVec3.applyMatrix4(mesh.matrixWorld);
    tempVec3.project(camera);

    if (tempVec3.z <= 1) {
      allBehind = false;
    }

    const sx = (tempVec3.x + 1) * 0.5 * screenWidth;
    const sy = (1 - tempVec3.y) * 0.5 * screenHeight;

    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }

  return { minX, maxX, minY, maxY, behind: allBehind };
}
