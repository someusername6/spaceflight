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
const toTarget = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
const tempBox3 = new THREE.Box3();
const boxCorners: THREE.Vector3[] = [];
for (let i = 0; i < 8; i++) boxCorners.push(new THREE.Vector3());

// Reusable targets array (cleared each frame, avoids allocation)
const targets: TargetInfo[] = [];

// Cache bounding boxes to avoid traverse() every frame (auto-cleaned via WeakMap)
const boundingBoxCache = new WeakMap<THREE.Object3D, THREE.Box3>();

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

  // Check if target is behind camera using dot product (works at any distance)
  toTarget.copy(target.transform.position).sub(camera.position);
  cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const behindCamera = toTarget.dot(cameraForward) < 0;

  // Project center position to screen space
  tempVec3.copy(target.transform.position).project(camera);
  const centerX = (tempVec3.x + 1) * 0.5 * screenWidth;
  const centerY = (1 - tempVec3.y) * 0.5 * screenHeight;

  // Compute screen bounds from mesh (only used if target is in front of camera)
  let bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  if (target.mesh && !behindCamera) {
    bounds = computeScreenBounds(target.mesh, camera, screenWidth, screenHeight);
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

/** Get or compute cached bounding box for a mesh (in local space) */
function getCachedBoundingBox(mesh: THREE.Object3D): THREE.Box3 | null {
  let cached = boundingBoxCache.get(mesh);
  if (!cached) {
    cached = new THREE.Box3().setFromObject(mesh);
    if (cached.isEmpty()) return null;
    boundingBoxCache.set(mesh, cached);
  }
  return cached;
}

/** Compute screen bounds from mesh bounding box */
function computeScreenBounds(
  mesh: THREE.Object3D,
  camera: THREE.Camera,
  screenWidth: number,
  screenHeight: number
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  // Use cached world-space bounding box (handles hierarchies correctly)
  const cachedBox = getCachedBoundingBox(mesh);
  if (!cachedBox) return null;

  // Copy to temp and transform to current world position
  tempBox3.copy(cachedBox);

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

  for (const c of boxCorners) {
    tempVec3.copy(c);
    tempVec3.project(camera);

    // x/y projection is valid at any distance (only z is affected by far plane)
    const sx = (tempVec3.x + 1) * 0.5 * screenWidth;
    const sy = (1 - tempVec3.y) * 0.5 * screenHeight;

    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }

  return { minX, maxX, minY, maxY };
}
