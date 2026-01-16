/**
 * Lightning Line Rendering - Line creation, pooling, and management for
 * lightning bolt visual effects.
 */

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/** Rendered line pair (glow + core) */
export interface RenderedLine {
  glow: Line2;
  core: Line2;
  glowGeometry: LineGeometry;
  coreGeometry: LineGeometry;
}

// Module-level resolution (set by renderer on init and resize)
const resolution = new THREE.Vector2(1, 1);

/** Update resolution for lightning line materials */
export function setLightningResolution(width: number, height: number): void {
  resolution.set(width, height);
}

// Colors
const GLOW_COLOR = 0x6688ff; // Blue-white glow
const CORE_COLOR = 0xffffff; // Bright white core
const BRANCH_GLOW_COLOR = 0x5577dd; // Slightly dimmer blue for branches

// Line widths (in pixels)
const MAIN_GLOW_WIDTH = 8;
const MAIN_CORE_WIDTH = 2.5;
const BRANCH_GLOW_WIDTH = 5;
const BRANCH_CORE_WIDTH = 1.5;

// Opacity
const GLOW_OPACITY = 0.35;
const CORE_OPACITY = 1.0;
const BRANCH_OPACITY_SCALE = 0.7; // Branches are dimmer

// Reusable array for position data (avoids per-call allocation)
const reusablePositions: number[] = [];

// Placeholder vectors for new line creation (avoids allocation when pool is empty)
const PLACEHOLDER_START = new THREE.Vector3(0, 0, 0);
const PLACEHOLDER_END = new THREE.Vector3(1, 0, 0);

/** Create a dual-layer line (glow + core) from points */
function createDualLayerLine(
  points: THREE.Vector3[],
  count: number,
  isMainBolt: boolean,
  opacity: number,
): RenderedLine {
  // Convert points to flat array for LineGeometry (reuse array)
  reusablePositions.length = 0;
  for (let i = 0; i < count; i++) {
    const p = points[i] as THREE.Vector3;
    reusablePositions.push(p.x, p.y, p.z);
  }

  // Glow layer (wide, dim, additive)
  const glowGeometry = new LineGeometry();
  glowGeometry.setPositions(reusablePositions);

  const glowMaterial = new LineMaterial({
    color: isMainBolt ? GLOW_COLOR : BRANCH_GLOW_COLOR,
    linewidth: isMainBolt ? MAIN_GLOW_WIDTH : BRANCH_GLOW_WIDTH,
    opacity: GLOW_OPACITY * opacity * (isMainBolt ? 1.0 : BRANCH_OPACITY_SCALE),
    transparent: true,
    resolution,
    depthWrite: false,
  });
  glowMaterial.blending = THREE.AdditiveBlending;

  const glow = new Line2(glowGeometry, glowMaterial);

  // Core layer (thin, bright, additive)
  const coreGeometry = new LineGeometry();
  coreGeometry.setPositions(reusablePositions);

  const coreMaterial = new LineMaterial({
    color: CORE_COLOR,
    linewidth: isMainBolt ? MAIN_CORE_WIDTH : BRANCH_CORE_WIDTH,
    opacity: CORE_OPACITY * opacity * (isMainBolt ? 1.0 : BRANCH_OPACITY_SCALE),
    transparent: true,
    resolution,
    depthWrite: false,
  });
  coreMaterial.blending = THREE.AdditiveBlending;

  const core = new Line2(coreGeometry, coreMaterial);

  return { glow, core, glowGeometry, coreGeometry };
}

/** Dispose of a rendered line pair */
export function disposeRenderedLine(line: RenderedLine): void {
  line.glowGeometry.dispose();
  line.coreGeometry.dispose();
  (line.glow.material as LineMaterial).dispose();
  (line.core.material as LineMaterial).dispose();
}

/** Hide a rendered line pair (for pooling) */
export function hideRenderedLine(line: RenderedLine): void {
  line.glow.visible = false;
  line.core.visible = false;
}

/** Update a rendered line's positions and opacity */
export function updateRenderedLine(
  line: RenderedLine,
  points: THREE.Vector3[],
  count: number,
  opacity: number,
  isMainBolt: boolean,
): void {
  // Convert points to flat array (reuse array)
  reusablePositions.length = 0;
  for (let i = 0; i < count; i++) {
    const p = points[i] as THREE.Vector3;
    reusablePositions.push(p.x, p.y, p.z);
  }

  // Update geometries
  line.glowGeometry.setPositions(reusablePositions);
  line.coreGeometry.setPositions(reusablePositions);

  // Update material opacity
  const glowMat = line.glow.material as LineMaterial;
  const coreMat = line.core.material as LineMaterial;
  glowMat.opacity =
    GLOW_OPACITY * opacity * (isMainBolt ? 1.0 : BRANCH_OPACITY_SCALE);
  coreMat.opacity =
    CORE_OPACITY * opacity * (isMainBolt ? 1.0 : BRANCH_OPACITY_SCALE);

  // Show the lines
  line.glow.visible = true;
  line.core.visible = true;
}

// Reusable placeholder array for new line creation
const placeholderPoints = [PLACEHOLDER_START, PLACEHOLDER_END];

/** Acquire a line from pool or create new */
export function acquireLine(
  pool: RenderedLine[],
  scene: THREE.Scene,
  isMainBolt: boolean,
): RenderedLine {
  const pooled = pool.pop();

  if (pooled) {
    return pooled;
  }

  // Create new line with placeholder geometry (will be updated immediately)
  const line = createDualLayerLine(placeholderPoints, 2, isMainBolt, 1.0);
  scene.add(line.glow);
  scene.add(line.core);
  return line;
}

/** Release a line back to pool */
export function releaseLine(pool: RenderedLine[], line: RenderedLine): void {
  hideRenderedLine(line);
  pool.push(line);
}
