/**
 * Measure ship mesh bounds to calculate proportional scales.
 *
 * Usage: node scripts/measure-ship-meshes.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const MESH_DIR = 'src/assets/meshes';

/**
 * Get bounding box dimensions from a GLB file.
 */
async function getMeshBounds(glbPath) {
  const io = new NodeIO();
  const document = await io.read(glbPath);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positionAccessor = primitive.getAttribute('POSITION');
      if (!positionAccessor) continue;

      const positions = positionAccessor.getArray();
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
  }

  const width = maxX - minX; // X axis (left-right)
  const height = maxY - minY; // Y axis (up in Blender, forward in game after rotation)
  const depth = maxZ - minZ; // Z axis (forward in Blender, up in game after rotation)

  return {
    width,
    height,
    depth,
    // Max dimension in the XZ plane (top-down view, which becomes XY in game)
    maxPlanarSize: Math.max(width, height),
    // Diagonal for a more representative "size"
    diagonal: Math.sqrt(width * width + height * height),
  };
}

async function main() {
  const meshFiles = fs
    .readdirSync(MESH_DIR)
    .filter((f) => f.endsWith('.glb'))
    .sort();

  console.log('Ship Mesh Measurements\n');
  console.log(
    'Ship         | Width   | Height  | Depth   | Max XY  | Diagonal',
  );
  console.log(
    '-------------|---------|---------|---------|---------|----------',
  );

  const measurements = {};

  for (const file of meshFiles) {
    const name = path.basename(file, '.glb');
    const bounds = await getMeshBounds(path.join(MESH_DIR, file));
    measurements[name] = bounds;

    console.log(
      `${name.padEnd(12)} | ` +
        `${bounds.width.toFixed(3).padStart(7)} | ` +
        `${bounds.height.toFixed(3).padStart(7)} | ` +
        `${bounds.depth.toFixed(3).padStart(7)} | ` +
        `${bounds.maxPlanarSize.toFixed(3).padStart(7)} | ` +
        `${bounds.diagonal.toFixed(3).padStart(8)}`,
    );
  }

  // Calculate scales relative to patrol
  const patrol = measurements.patrol;
  if (!patrol) {
    console.error('\nError: patrol mesh not found');
    return;
  }

  console.log('\n\nScale Factors (relative to patrol)\n');
  console.log('Using max planar size (XY) as the reference dimension.\n');

  const patrolSize = patrol.maxPlanarSize;
  console.log(`Patrol reference size: ${patrolSize.toFixed(3)}\n`);

  console.log(
    'Ship         | Mesh Size | Scale Factor | Suggested collisionRadius',
  );
  console.log(
    '-------------|-----------|--------------|---------------------------',
  );

  // Current collision radii from ships.ts
  const currentRadii = {
    patrol: 5,
    scout: 4,
    fighter: 5,
    interceptor: 5,
    striker: 6,
    bomber: 7,
    defender: 7,
    raider: 5,
    sentinel: 6,
  };

  const patrolRadius = currentRadii.patrol;

  for (const [name, bounds] of Object.entries(measurements)) {
    const scale = bounds.maxPlanarSize / patrolSize;
    const suggestedRadius = Math.round(patrolRadius * scale * 10) / 10;

    console.log(
      `${name.padEnd(12)} | ` +
        `${bounds.maxPlanarSize.toFixed(3).padStart(9)} | ` +
        `${scale.toFixed(3).padStart(12)} | ` +
        `${suggestedRadius.toFixed(1).padStart(25)}`,
    );
  }

  // Output as code
  console.log('\n\n// Suggested ship scales (add to ships.ts or constants)');
  console.log('export const SHIP_MESH_SCALES: Record<string, number> = {');
  for (const [name, bounds] of Object.entries(measurements)) {
    const scale = bounds.maxPlanarSize / patrolSize;
    console.log(`  ${name}: ${scale.toFixed(3)},`);
  }
  console.log('};');

  console.log('\n// Suggested collision radii (proportional to mesh size)');
  console.log('// collisionRadius values for ships.ts:');
  for (const [name, bounds] of Object.entries(measurements)) {
    const scale = bounds.maxPlanarSize / patrolSize;
    const suggestedRadius = Math.round(patrolRadius * scale * 10) / 10;
    console.log(`//   ${name}: ${suggestedRadius},`);
  }
}

main().catch(console.error);
