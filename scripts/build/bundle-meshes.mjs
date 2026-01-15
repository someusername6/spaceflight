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

import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';

const MESH_DIR = 'src/assets/meshes';
const SVG_DIR = 'src/assets/icons/ships';
const OUTPUT_FILE = 'src/rendering/ship-geometries.ts';

/**
 * Parse an SVG path and extract the bounding box of its content.
 * Handles M, L, H, V, Z commands (absolute only - our SVGs use these).
 */
function parseSvgPathBounds(pathData) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let currentX = 0,
    currentY = 0;

  // Tokenize path: split on commands while keeping command letters
  const tokens = pathData.match(/[MLHVZ]|[-]?\d+\.?\d*/gi) || [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i].toUpperCase();

    if (token === 'M' || token === 'L') {
      // Move/Line: two coordinates follow
      currentX = parseFloat(tokens[++i]);
      currentY = parseFloat(tokens[++i]);
      minX = Math.min(minX, currentX);
      maxX = Math.max(maxX, currentX);
      minY = Math.min(minY, currentY);
      maxY = Math.max(maxY, currentY);
    } else if (token === 'H') {
      // Horizontal line: one X coordinate
      currentX = parseFloat(tokens[++i]);
      minX = Math.min(minX, currentX);
      maxX = Math.max(maxX, currentX);
    } else if (token === 'V') {
      // Vertical line: one Y coordinate
      currentY = parseFloat(tokens[++i]);
      minY = Math.min(minY, currentY);
      maxY = Math.max(maxY, currentY);
    } else if (token === 'Z') {
      // Close path - no coordinates
    } else if (!Number.isNaN(parseFloat(token))) {
      // Implicit lineto (coordinates without command letter)
      currentX = parseFloat(token);
      currentY = parseFloat(tokens[++i]);
      minX = Math.min(minX, currentX);
      maxX = Math.max(maxX, currentX);
      minY = Math.min(minY, currentY);
      maxY = Math.max(maxY, currentY);
    }
    i++;
  }

  if (!Number.isFinite(minX)) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Read an SVG file and extract combined bounding box from all paths.
 */
async function extractSvgBounds(svgPath) {
  try {
    const content = await readFile(svgPath, 'utf-8');

    // Extract all path d attributes
    const pathMatches = content.matchAll(/<path[^>]*d="([^"]+)"/g);
    let combinedBounds = null;

    for (const match of pathMatches) {
      const pathBounds = parseSvgPathBounds(match[1]);
      if (!pathBounds) continue;

      if (!combinedBounds) {
        combinedBounds = { ...pathBounds };
      } else {
        // Expand bounds to include this path
        combinedBounds.minX = Math.min(combinedBounds.minX, pathBounds.minX);
        combinedBounds.maxX = Math.max(combinedBounds.maxX, pathBounds.maxX);
        combinedBounds.minY = Math.min(combinedBounds.minY, pathBounds.minY);
        combinedBounds.maxY = Math.max(combinedBounds.maxY, pathBounds.maxY);
      }
    }

    return combinedBounds;
  } catch {
    return null;
  }
}

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

      geometries[shipClass] = {
        positions: Array.from(positions),
        normals: normals ? Array.from(normals) : null,
        indices: indices ? Array.from(indices) : null,
        bounds: { minX, maxX, minZ, maxZ },
        svgBounds: svgBounds,
      };

      const posCount = positions.length / 3;
      const idxCount = indices ? indices.length : 0;
      const svgInfo = svgBounds
        ? `svg: ${svgBounds.minX}-${svgBounds.maxX} x ${svgBounds.minY}-${svgBounds.maxY}`
        : 'no svg';
      console.log(
        `  ${file}: ${posCount} vertices, ${idxCount} indices (${svgInfo})`,
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

/** Raw geometry data for a ship mesh */
export interface ShipGeometryData {
  positions: number[];
  normals: number[] | null;
  indices: number[] | null;
  bounds: MeshBounds;
  svgBounds: SvgBounds | null;
}

/** Embedded geometry data for all ship classes */
export const SHIP_GEOMETRIES: Record<ShipClass, ShipGeometryData> = {\n`;

  for (const shipClass of shipClasses) {
    const geo = geometries[shipClass];
    const b = geo.bounds;
    const s = geo.svgBounds;
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
