/**
 * Generate SVG ship icons from GLB mesh files.
 *
 * Projects all mesh triangles to XZ plane (top-down view), renders
 * the shadow, then traces contours to SVG paths.
 *
 * Usage: node scripts/generate-ship-icons.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  contoursToSvgPath,
  extractTriangles,
  generateSvg,
  removeDuplicates,
  renderToGrid,
  simplifyClosedContour,
  traceContours,
  transformContour,
} from './lib/mesh-to-svg.mjs';

const MESH_DIR = 'src/assets/meshes';
const OUTPUT_DIR = 'src/assets/icons/ships';
const RENDER_SIZE = 512;
const SVG_SIZE = 64;
const PADDING = 4;

/**
 * Process a single mesh file.
 */
async function processMesh(meshPath, outputPath, shipName) {
  console.log(`Processing ${shipName}...`);

  const triangles = await extractTriangles(meshPath);
  console.log(`  Triangles: ${triangles.length}`);

  if (triangles.length === 0) {
    console.warn(`  Warning: No triangles found`);
    return;
  }

  // Render to grid
  const renderPadding = PADDING * (RENDER_SIZE / SVG_SIZE);
  const { grid } = renderToGrid(triangles, RENDER_SIZE, renderPadding);

  // Trace contours
  let contours = traceContours(grid, RENDER_SIZE, RENDER_SIZE);
  console.log(`  Contours: ${contours.length}`);

  // Simplify and transform each contour
  const epsilon = RENDER_SIZE / 50;
  const centerX = RENDER_SIZE / 2;
  contours = contours
    .map((c) => simplifyClosedContour(c, epsilon, centerX))
    .map((c) => transformContour(c, RENDER_SIZE, SVG_SIZE, PADDING))
    .map((c) => removeDuplicates(c))
    .filter((c) => c.length >= 3);

  console.log(
    `  After simplification: ${contours.length} contours, points: ${contours.map((c) => c.length).join(', ')}`,
  );

  // Generate SVG
  const pathData = contoursToSvgPath(contours);
  const svg = generateSvg(pathData, shipName);

  fs.writeFileSync(outputPath, svg);
  console.log(`  Wrote ${outputPath}`);
}

async function main() {
  const meshFiles = fs
    .readdirSync(MESH_DIR)
    .filter((f) => f.endsWith('.glb'))
    .map((f) => ({
      name: path.basename(f, '.glb'),
      meshPath: path.join(MESH_DIR, f),
      outputPath: path.join(OUTPUT_DIR, `${path.basename(f, '.glb')}.svg`),
    }));

  console.log(`Found ${meshFiles.length} mesh files\n`);

  for (const file of meshFiles) {
    await processMesh(file.meshPath, file.outputPath, file.name);
    console.log();
  }

  console.log('Done!');
}

main().catch(console.error);
