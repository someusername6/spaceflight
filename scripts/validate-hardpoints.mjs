/**
 * Validate hardpoint positions against mesh bounds.
 *
 * Reads mesh bounds and SVG bounds from generated ship-geometries.ts and
 * hardpoint positions from ships.ts, then outputs a visual comparison to
 * verify the coordinate mapping is correct.
 *
 * The coordinate mapping correctly accounts for:
 * - SVG content bounds (actual ship silhouette within 64x64 viewBox)
 * - 3D mesh bounds (geometry extent in world space before scaling)
 *
 * Run: node scripts/validate-hardpoints.mjs
 */

import { readFileSync } from 'node:fs';

const SHIP_MODEL_SCALE = 1.5;

// Parse ship-geometries.ts to extract mesh bounds and SVG bounds
function parseGeometryData() {
  const content = readFileSync('src/rendering/ship-geometries.ts', 'utf-8');
  const data = {};

  // Match ship blocks with bounds and svgBounds
  const shipBlockRegex =
    /(\w+):\s*\{[\s\S]*?bounds:\s*\{\s*minX:\s*([-\d.]+),\s*maxX:\s*([-\d.]+),\s*minZ:\s*([-\d.]+),\s*maxZ:\s*([-\d.]+)\s*\}[\s\S]*?svgBounds:\s*(?:\{\s*minX:\s*(\d+),\s*maxX:\s*(\d+),\s*minY:\s*(\d+),\s*maxY:\s*(\d+)\s*\}|null)/g;

  const matches = content.matchAll(shipBlockRegex);
  for (const match of matches) {
    data[match[1]] = {
      meshBounds: {
        minX: parseFloat(match[2]),
        maxX: parseFloat(match[3]),
        minZ: parseFloat(match[4]),
        maxZ: parseFloat(match[5]),
      },
      svgBounds: match[6]
        ? {
            minX: parseInt(match[6], 10),
            maxX: parseInt(match[7], 10),
            minY: parseInt(match[8], 10),
            maxY: parseInt(match[9], 10),
          }
        : null,
    };
  }
  return data;
}

// Parse ships.ts to extract hardpoints
function parseHardpoints() {
  const content = readFileSync('src/data/ships.ts', 'utf-8');
  const ships = {};

  // Find ship class keys followed by primaryHardpoints arrays
  // Match pattern: "shipClass: {" ... "primaryHardpoints: [" ... "]"
  const lines = content.split('\n');
  let currentShip = null;
  let inPrimaryHardpoints = false;

  for (const line of lines) {
    // Detect ship class definition (e.g., "  fighter: {")
    const shipMatch = line.match(/^\s+(\w+):\s*\{/);
    if (shipMatch && !line.includes('primaryHardpoints')) {
      currentShip = shipMatch[1];
      ships[currentShip] = { primary: [] };
    }

    // Detect primaryHardpoints array start
    if (line.includes('primaryHardpoints:')) {
      inPrimaryHardpoints = true;
    }

    // Extract hardpoint entries while inside primaryHardpoints
    if (inPrimaryHardpoints && currentShip) {
      const hpMatch = line.match(/svgX:\s*(\d+),\s*svgY:\s*(\d+)/);
      if (hpMatch) {
        ships[currentShip].primary.push({
          svgX: parseInt(hpMatch[1], 10),
          svgY: parseInt(hpMatch[2], 10),
        });
      }
      // End of primaryHardpoints array
      if (line.includes('],')) {
        inPrimaryHardpoints = false;
      }
    }
  }

  return ships;
}

/**
 * Convert SVG viewport coordinates to 3D world coordinates.
 *
 * SVG: 64x64 viewBox, (0,0) top-left, Y increases downward
 *      Ship silhouette has its own bounds within the viewBox
 * 3D: X = right, Y = up, Z = backward (after -90° X rotation)
 *     Mesh nose points -Z, tail points +Z
 *
 * Mapping:
 * 1. Hardpoint (svgX, svgY) is in 64x64 viewport coordinates
 * 2. Find relative position within SVG content bounds (0 to 1)
 * 3. Map that relative position to mesh bounds, then scale
 */
function svgTo3D(svgX, svgY, meshBounds, svgBounds) {
  if (!svgBounds) {
    // Fallback: assume SVG fills the 64x64 viewport
    svgBounds = { minX: 0, maxX: 64, minY: 0, maxY: 64 };
  }

  // Hardpoint position relative to SVG content bounds (0 to 1)
  const relativeX = (svgX - svgBounds.minX) / (svgBounds.maxX - svgBounds.minX);
  const relativeY = (svgY - svgBounds.minY) / (svgBounds.maxY - svgBounds.minY);

  // Map to mesh bounds, then apply scale
  const x =
    (meshBounds.minX + relativeX * (meshBounds.maxX - meshBounds.minX)) *
    SHIP_MODEL_SCALE;
  const z =
    (meshBounds.minZ + relativeY * (meshBounds.maxZ - meshBounds.minZ)) *
    SHIP_MODEL_SCALE;

  return { x, z };
}

// Generate ASCII visualization of hardpoint placement
function visualize(meshBounds, svgBounds, hardpoints) {
  const width = 40;
  const height = 20;
  const grid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Draw mesh outline (rectangle for simplicity)
  for (let x = 0; x < width; x++) {
    grid[0][x] = '-';
    grid[height - 1][x] = '-';
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = '|';
    grid[y][width - 1] = '|';
  }

  // Plot hardpoints
  for (let i = 0; i < hardpoints.length; i++) {
    const hp = hardpoints[i];
    const pos3d = svgTo3D(hp.svgX, hp.svgY, meshBounds, svgBounds);

    // Map 3D position to grid (mesh coords -> 0-1 -> grid)
    const normX =
      (pos3d.x / SHIP_MODEL_SCALE - meshBounds.minX) /
      (meshBounds.maxX - meshBounds.minX);
    const normZ =
      (pos3d.z / SHIP_MODEL_SCALE - meshBounds.minZ) /
      (meshBounds.maxZ - meshBounds.minZ);
    const gridX = Math.round(normX * (width - 3)) + 1;
    const gridY = Math.round(normZ * (height - 3)) + 1;

    if (gridX > 0 && gridX < width - 1 && gridY > 0 && gridY < height - 1) {
      grid[gridY][gridX] = String(i + 1);
    }
  }

  // Add center marker
  const centerX = Math.round(0.5 * (width - 3)) + 1;
  const centerY = Math.round(0.5 * (height - 3)) + 1;
  grid[centerY][centerX] = '+';

  // Add nose marker (front = -Z = top of grid)
  grid[1][centerX] = '^';

  return grid.map((row) => row.join('')).join('\n');
}

// Main
console.log('=== Hardpoint Position Validation ===\n');
console.log(`SHIP_MODEL_SCALE: ${SHIP_MODEL_SCALE}`);
console.log('SVG viewBox: 64x64, hardpoints in viewport coordinates\n');

const geometryData = parseGeometryData();
const shipHardpoints = parseHardpoints();

for (const shipClass of Object.keys(geometryData).sort()) {
  const { meshBounds, svgBounds } = geometryData[shipClass];
  const hardpoints = shipHardpoints[shipClass]?.primary || [];

  console.log(`${'='.repeat(50)}`);
  console.log(`${shipClass.toUpperCase()}`);
  console.log(`${'='.repeat(50)}`);

  console.log(`\nMesh bounds (before scale):`);
  console.log(
    `  X: ${meshBounds.minX.toFixed(2)} to ${meshBounds.maxX.toFixed(2)} (width: ${(meshBounds.maxX - meshBounds.minX).toFixed(2)})`,
  );
  console.log(
    `  Z: ${meshBounds.minZ.toFixed(2)} to ${meshBounds.maxZ.toFixed(2)} (length: ${(meshBounds.maxZ - meshBounds.minZ).toFixed(2)})`,
  );

  if (svgBounds) {
    console.log(`\nSVG content bounds (within 64x64 viewport):`);
    console.log(
      `  X: ${svgBounds.minX} to ${svgBounds.maxX} (width: ${svgBounds.maxX - svgBounds.minX})`,
    );
    console.log(
      `  Y: ${svgBounds.minY} to ${svgBounds.maxY} (height: ${svgBounds.maxY - svgBounds.minY})`,
    );
  } else {
    console.log(`\nSVG content bounds: [not available]`);
  }

  const scaledWidth = (meshBounds.maxX - meshBounds.minX) * SHIP_MODEL_SCALE;
  const scaledLength = (meshBounds.maxZ - meshBounds.minZ) * SHIP_MODEL_SCALE;
  console.log(
    `\nScaled mesh dimensions: ${scaledWidth.toFixed(2)} x ${scaledLength.toFixed(2)}`,
  );

  if (hardpoints.length > 0) {
    console.log(`\nPrimary hardpoints (${hardpoints.length}):`);
    console.log('  #   SVG (x,y)  →  3D (X, Z)');
    for (let i = 0; i < hardpoints.length; i++) {
      const hp = hardpoints[i];
      const pos3d = svgTo3D(hp.svgX, hp.svgY, meshBounds, svgBounds);
      console.log(
        `  ${i + 1}   (${hp.svgX.toString().padStart(2)}, ${hp.svgY.toString().padStart(2)})   →  (${pos3d.x.toFixed(2).padStart(6)}, ${pos3d.z.toFixed(2).padStart(6)})`,
      );
    }

    console.log(
      `\nVisualization (^ = nose, + = center, 1-${hardpoints.length} = hardpoints):`,
    );
    console.log(visualize(meshBounds, svgBounds, hardpoints));
  } else {
    console.log('\n  [No hardpoints defined in ships.ts]');
  }

  console.log('');
}

console.log('=== Summary ===');
console.log(
  'If hardpoints appear symmetrically placed on wings (for primary weapons),',
);
console.log('the coordinate mapping is working correctly.');
