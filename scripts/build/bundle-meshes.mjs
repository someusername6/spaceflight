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

import { access, readdir, writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import {
  computeBoundingRadius,
  computeConvexHull,
  computeHullVolume,
} from './hull-utils.mjs';
import { extractSvgBounds } from './svg-utils.mjs';

const MESH_DIR = 'src/assets/meshes';
const SVG_DIR = 'src/assets/icons/ships';
const OUTPUT_FILE = 'src/rendering/ship-geometries.ts';

/**
 * Convert a TypedArray to a string representation for embedding in JS.
 * Uses array literal for readability and smaller output than JSON.
 */
function typedArrayToString(arr) {
  // For small arrays, inline the values
  const values = Array.from(arr).map((v) => {
    // Round floats to reduce file size
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(6).replace(/\.?0+$/, '');
  });
  return `[${values.join(',')}]`;
}

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

  // Check at least one geometry was extracted
  const shipClasses = Object.keys(geometries).sort();
  if (shipClasses.length === 0) {
    console.error('No valid geometries extracted');
    process.exit(1);
  }

  // Generate union type for compile-time safety
  const shipClassType = shipClasses.map((c) => `'${c}'`).join(' | ');

  let output = `/**
 * Embedded ship geometry data.
 * Auto-generated by scripts/build/bundle-meshes.mjs - do not edit manually.
 */

/** Valid ship class names (generated from GLB filenames) */
export type ShipClass = ${shipClassType};

/** Mesh bounding box (X and Z extents for hardpoint mapping) */
export interface MeshBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** SVG content bounding box (actual ship silhouette within 64x64 viewBox) */
export interface SvgBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * A plane in the convex hull (normal + distance from origin).
 *
 * Note: This type is intentionally duplicated from hull-collider.ts to avoid
 * circular dependencies (ship-geometries.ts is imported by rendering code,
 * hull-collider.ts is imported by ECS code). Both definitions are identical.
 */
export interface HullPlane {
  nx: number;
  ny: number;
  nz: number;
  d: number;
}

/** Raw geometry data for a ship mesh */
export interface ShipGeometryData {
  positions: number[];
  normals: number[] | null;
  indices: number[] | null;
  bounds: MeshBounds;
  svgBounds: SvgBounds | null;
  /** Convex hull face planes for collision detection */
  hull: HullPlane[] | null;
  /** Volume of convex hull (for mass derivation) */
  hullVolume: number;
  /** Bounding radius of hull (for fast early-out checks) */
  hullBoundingRadius: number;
}

/** Embedded geometry data for all ship classes */
export const SHIP_GEOMETRIES: Record<ShipClass, ShipGeometryData> = {\n`;

  for (const shipClass of shipClasses) {
    const geo = geometries[shipClass];
    const b = geo.bounds;
    const s = geo.svgBounds;
    const h = geo.hull;
    output += `  ${shipClass}: {\n`;
    output += `    positions: ${typedArrayToString(geo.positions)},\n`;
    output += `    normals: ${geo.normals ? typedArrayToString(geo.normals) : 'null'},\n`;
    output += `    indices: ${geo.indices ? typedArrayToString(geo.indices) : 'null'},\n`;
    output += `    bounds: { minX: ${b.minX.toFixed(4)}, maxX: ${b.maxX.toFixed(4)}, minZ: ${b.minZ.toFixed(4)}, maxZ: ${b.maxZ.toFixed(4)} },\n`;
    if (s) {
      output += `    svgBounds: { minX: ${s.minX}, maxX: ${s.maxX}, minY: ${s.minY}, maxY: ${s.maxY} },\n`;
    } else {
      output += `    svgBounds: null,\n`;
    }
    // Hull data for collision
    if (h) {
      const hullStr = h
        .map(
          (p) =>
            `{nx:${p.nx.toFixed(6).replace(/\.?0+$/, '')},ny:${p.ny.toFixed(6).replace(/\.?0+$/, '')},nz:${p.nz.toFixed(6).replace(/\.?0+$/, '')},d:${p.d.toFixed(6).replace(/\.?0+$/, '')}}`,
        )
        .join(',');
      output += `    hull: [${hullStr}],\n`;
    } else {
      output += `    hull: null,\n`;
    }
    output += `    hullVolume: ${geo.hullVolume.toFixed(4)},\n`;
    output += `    hullBoundingRadius: ${geo.hullBoundingRadius.toFixed(4)},\n`;
    output += `  },\n`;
  }

  output += `};\n`;

  await writeFile(OUTPUT_FILE, output);

  // Calculate output size
  const outputSize = Buffer.byteLength(output, 'utf8');
  console.log(
    `\nGenerated ${OUTPUT_FILE} (${(outputSize / 1024).toFixed(1)} KB)`,
  );
  console.log(`Embedded ${shipClasses.length} ship geometries`);
}

bundleMeshes().catch((err) => {
  console.error('Failed to bundle meshes:', err);
  process.exit(1);
});
