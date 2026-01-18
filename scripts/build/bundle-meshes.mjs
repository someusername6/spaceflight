/**
 * Bundle GLB mesh files as embedded geometry data.
 *
 * Parses GLB files and extracts raw geometry (positions, normals, indices).
 * Also parses corresponding SVG files to extract content bounding boxes
 * for accurate hardpoint coordinate mapping.
 *
 * Outputs a TypeScript module that can be imported directly - no runtime
 * loading required.
 *
 * Reads from src/assets/meshes/ and src/assets/icons/ships/
 * Writes to src/rendering/ship-geometries.ts
 */

import { access, readdir } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { generateGeometryOutput } from './geometry-output.mjs';
import {
  computeBoundingRadius,
  computeConvexHull,
  computeHullVolume,
  decomposeWithCoACD,
} from './hull-utils.mjs';
import { extractSvgBounds } from './svg-utils.mjs';

const MESH_DIR = 'src/assets/meshes';
const SVG_DIR = 'src/assets/icons/ships';

async function bundleMeshes() {
  // Check source directories exist
  try {
    await access(MESH_DIR);
  } catch {
    console.error(`Mesh directory not found: ${MESH_DIR}`);
    process.exit(1);
  }

  try {
    await access(SVG_DIR);
  } catch {
    console.error(`SVG directory not found: ${SVG_DIR}`);
    process.exit(1);
  }

  const io = new NodeIO();
  const files = await readdir(MESH_DIR);
  const glbFiles = files.filter((f) => f.endsWith('.glb'));

  if (glbFiles.length === 0) {
    console.error(`No GLB files found in ${MESH_DIR}`);
    process.exit(1);
  }

  console.log(`Extracting geometry from ${glbFiles.length} GLB files...`);

  const geometries = {};

  for (const file of glbFiles) {
    const shipClass = file.replace('.glb', '');
    const meshPath = `${MESH_DIR}/${file}`;
    const svgPath = `${SVG_DIR}/${shipClass}.svg`;

    try {
      const document = await io.read(meshPath);
      const root = document.getRoot();
      const meshes = root.listMeshes();

      if (meshes.length === 0) {
        console.warn(`  ${file}: No meshes found, skipping`);
        continue;
      }

      if (meshes.length > 1) {
        console.warn(`  ${file}: Multiple meshes found, using first only`);
      }

      // Get first mesh, first primitive
      const mesh = meshes[0];
      const primitives = mesh.listPrimitives();

      if (primitives.length === 0) {
        console.warn(`  ${file}: No primitives found, skipping`);
        continue;
      }

      // Merge all primitives into combined arrays
      const allPositions = [];
      const allNormals = [];
      const allIndices = [];
      let vertexOffset = 0;
      let skipMesh = false;

      for (const primitive of primitives) {
        const positionAccessor = primitive.getAttribute('POSITION');
        const normalAccessor = primitive.getAttribute('NORMAL');
        const indicesAccessor = primitive.getIndices();

        if (!positionAccessor) {
          console.warn(
            `  ${file}: Primitive missing position data, skipping primitive`,
          );
          continue;
        }

        const positions = positionAccessor.getArray();
        const normals = normalAccessor?.getArray();
        const indices = indicesAccessor?.getArray();

        // Validate geometry integrity
        if (positions.length % 3 !== 0) {
          console.error(
            `  ${file}: Position count not divisible by 3, skipping`,
          );
          skipMesh = true;
          break;
        }

        if (normals && normals.length !== positions.length) {
          console.error(`  ${file}: Normals count mismatch, skipping`);
          skipMesh = true;
          break;
        }

        const primVertexCount = positions.length / 3;
        if (indices) {
          const maxIndex = Math.max(...indices);
          if (maxIndex >= primVertexCount) {
            console.error(
              `  ${file}: Index ${maxIndex} out of bounds (${primVertexCount} vertices), skipping`,
            );
            skipMesh = true;
            break;
          }
        }

        // Add positions
        allPositions.push(...positions);

        // Add normals if present
        if (normals) {
          allNormals.push(...normals);
        }

        // Add indices with offset adjustment
        if (indices) {
          for (const idx of indices) {
            allIndices.push(idx + vertexOffset);
          }
        }

        vertexOffset += primVertexCount;
      }

      if (skipMesh) {
        continue;
      }

      if (allPositions.length === 0) {
        console.warn(`  ${file}: No position data extracted, skipping`);
        continue;
      }

      const positions = new Float32Array(allPositions);
      // Only include normals if we have exactly one per vertex (handles mixed primitive cases)
      const normals =
        allNormals.length === allPositions.length
          ? new Float32Array(allNormals)
          : null;
      // Only include indices if we collected any
      const indices =
        allIndices.length > 0 ? new Uint32Array(allIndices) : null;

      // Compute bounding box for coordinate mapping
      let minX = Infinity,
        maxX = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }

      // Extract SVG bounds for coordinate mapping
      const svgBounds = await extractSvgBounds(svgPath);
      if (!svgBounds) {
        console.warn(`  ${file}: No matching SVG found at ${svgPath}`);
      }

      // Compute convex hull for collision detection
      // Use hash of ship class name as seed for deterministic jitter
      const seed = shipClass
        .split('')
        .reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);

      // Structure meshes need convex decomposition to handle holes/concavities
      const STRUCTURE_MESHES = new Set([
        'waypoint',
        'mining',
        'refinery',
        'military',
      ]);
      const isStructure = STRUCTURE_MESHES.has(shipClass);
      let subHulls = null;

      if (isStructure && indices) {
        // Use CoACD (Collision-Aware Convex Decomposition) for proper handling
        // of non-convex geometry like rings with holes
        try {
          console.log(`    Running CoACD convex decomposition...`);
          const convexParts = await decomposeWithCoACD(
            Array.from(positions),
            Array.from(indices),
          );

          if (convexParts.length > 0) {
            console.log(
              `    Decomposed into ${convexParts.length} convex parts`,
            );
            subHulls = [];

            for (let ci = 0; ci < convexParts.length; ci++) {
              const part = convexParts[ci];
              const partSeed = seed + ci;
              const partHull = computeConvexHull(part.positions, partSeed);

              if (partHull) {
                const partPlanes = partHull.planes.map((p) => ({
                  nx: p.normal[0],
                  ny: p.normal[1],
                  nz: p.normal[2],
                  d: p.distance,
                }));
                const partBoundingRadius = computeBoundingRadius(partHull);

                subHulls.push({
                  planes: partPlanes,
                  boundingRadius: partBoundingRadius,
                });

                console.log(
                  `      Part ${ci + 1}: ${partHull.planes.length} hull faces, radius: ${partBoundingRadius.toFixed(2)}`,
                );
              }
            }
          }
        } catch (err) {
          console.warn(`    CoACD failed: ${err.message}`);
          console.warn(`    Falling back to single convex hull`);
        }
      }

      const hull = computeConvexHull(Array.from(positions), seed);
      const hullVolume = computeHullVolume(hull);
      const hullBoundingRadius = computeBoundingRadius(hull);

      // Extract hull planes for runtime collision (compact representation)
      const hullPlanes = hull
        ? hull.planes.map((p) => ({
            nx: p.normal[0],
            ny: p.normal[1],
            nz: p.normal[2],
            d: p.distance,
          }))
        : null;

      geometries[shipClass] = {
        positions: Array.from(positions),
        normals: normals ? Array.from(normals) : null,
        indices: indices ? Array.from(indices) : null,
        bounds: { minX, maxX, minZ, maxZ },
        svgBounds: svgBounds,
        hull: hullPlanes,
        hullVolume,
        hullBoundingRadius,
        subHulls,
      };

      const posCount = positions.length / 3;
      const idxCount = indices ? indices.length : 0;
      const hullInfo = hull
        ? `hull: ${hull.planes.length} faces, vol: ${hullVolume.toFixed(1)}`
        : 'no hull';
      const svgInfo = svgBounds
        ? `svg: ${svgBounds.minX}-${svgBounds.maxX} x ${svgBounds.minY}-${svgBounds.maxY}`
        : 'no svg';
      console.log(
        `  ${file}: ${posCount} vertices, ${idxCount} indices (${hullInfo}, ${svgInfo})`,
      );
    } catch (error) {
      console.error(`  ${file}: Failed to parse -`, error.message);
    }
  }

  // Generate output file
  await generateGeometryOutput(geometries);
}

bundleMeshes().catch((err) => {
  console.error('Failed to bundle meshes:', err);
  process.exit(1);
});
