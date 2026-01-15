/**
 * Mesh to SVG conversion utilities.
 *
 * Provides functions to extract triangles from GLB files, render silhouettes,
 * trace contours, and generate SVG paths.
 */

import { NodeIO } from '@gltf-transform/core';
import { createCanvas } from 'canvas';

// Re-export simplification functions
export {
  removeDuplicates,
  simplifyClosedContour,
  simplifyOpenContour,
  transformContour,
} from './contour-simplify.mjs';

/**
 * Extract all triangles from a GLB file, projected to XZ plane.
 */
export async function extractTriangles(glbPath) {
  const io = new NodeIO();
  const document = await io.read(glbPath);
  const triangles = [];

  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positionAccessor = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices();
      if (!positionAccessor) continue;

      const positions = positionAccessor.getArray();
      const indexArray = indices?.getArray();

      if (indexArray) {
        for (let i = 0; i < indexArray.length; i += 3) {
          const i0 = indexArray[i] * 3;
          const i1 = indexArray[i + 1] * 3;
          const i2 = indexArray[i + 2] * 3;
          triangles.push([
            { x: positions[i0], y: positions[i0 + 2] },
            { x: positions[i1], y: positions[i1 + 2] },
            { x: positions[i2], y: positions[i2 + 2] },
          ]);
        }
      } else {
        for (let i = 0; i < positions.length; i += 9) {
          triangles.push([
            { x: positions[i], y: positions[i + 2] },
            { x: positions[i + 3], y: positions[i + 5] },
            { x: positions[i + 6], y: positions[i + 8] },
          ]);
        }
      }
    }
  }

  return triangles;
}

/**
 * Compute bounds of all triangles.
 */
export function computeBounds(triangles) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const tri of triangles) {
    for (const p of tri) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Render triangles to canvas and return binary grid.
 */
export function renderToGrid(triangles, size, padding) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  if (triangles.length === 0) return { grid: new Uint8Array(size * size) };

  const bounds = computeBounds(triangles);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const availableSize = size - padding * 2;
  const scale = availableSize / Math.max(width, height);

  const offsetX = padding + (availableSize - width * scale) / 2;
  const offsetY = padding + (availableSize - height * scale) / 2;

  ctx.fillStyle = 'black';
  for (const tri of triangles) {
    ctx.beginPath();
    ctx.moveTo(
      (tri[0].x - bounds.minX) * scale + offsetX,
      (tri[0].y - bounds.minY) * scale + offsetY,
    );
    ctx.lineTo(
      (tri[1].x - bounds.minX) * scale + offsetX,
      (tri[1].y - bounds.minY) * scale + offsetY,
    );
    ctx.lineTo(
      (tri[2].x - bounds.minX) * scale + offsetX,
      (tri[2].y - bounds.minY) * scale + offsetY,
    );
    ctx.closePath();
    ctx.fill();
  }

  // Convert to binary grid
  const imageData = ctx.getImageData(0, 0, size, size);
  const grid = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    grid[i] = imageData.data[i * 4 + 3] > 128 ? 1 : 0;
  }

  return { grid };
}

/**
 * Moore neighborhood contour tracing.
 * Traces the outer boundary of connected components.
 */
export function traceContours(grid, width, height) {
  const contours = [];
  const visited = new Uint8Array(width * height);

  const getPixel = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return grid[y * width + x];
  };

  // Moore neighborhood: 8 directions starting from right, going clockwise
  const mooreX = [1, 1, 0, -1, -1, -1, 0, 1];
  const mooreY = [0, 1, 1, 1, 0, -1, -1, -1];

  // Find starting points: filled pixels with empty pixel to the left
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        getPixel(x, y) === 1 &&
        getPixel(x - 1, y) === 0 &&
        !visited[y * width + x]
      ) {
        // Trace contour starting here
        const contour = [];
        let cx = x,
          cy = y;
        let dir = 0; // Start looking right

        const startX = x,
          startY = y;
        let iterations = 0;
        const maxIterations = width * height * 2;

        do {
          contour.push({ x: cx, y: cy });
          visited[cy * width + cx] = 1;

          // Look for next boundary pixel
          // Start from the direction we came from + 1 (counterclockwise)
          let found = false;
          const backDir = (dir + 4) % 8;

          for (let i = 0; i < 8; i++) {
            const checkDir = (backDir + 1 + i) % 8;
            const nx = cx + mooreX[checkDir];
            const ny = cy + mooreY[checkDir];

            if (getPixel(nx, ny) === 1) {
              // Before moving, check the pixel counterclockwise from our move direction
              // should be empty (ensures we stay on boundary)
              const prevDir = (checkDir + 7) % 8;
              const px = cx + mooreX[prevDir];
              const py = cy + mooreY[prevDir];

              if (getPixel(px, py) === 0 || (nx === startX && ny === startY)) {
                cx = nx;
                cy = ny;
                dir = checkDir;
                found = true;
                break;
              }
            }
          }

          if (!found) break;
          iterations++;
        } while (
          (cx !== startX || cy !== startY) &&
          iterations < maxIterations
        );

        if (contour.length >= 3) {
          contours.push(contour);
        }

        // Flood fill to mark all pixels in this component as visited
        const stack = [[x, y]];
        while (stack.length > 0) {
          const [fx, fy] = stack.pop();
          if (fx < 0 || fx >= width || fy < 0 || fy >= height) continue;
          const idx = fy * width + fx;
          if (visited[idx] || getPixel(fx, fy) === 0) continue;
          visited[idx] = 1;
          stack.push([fx + 1, fy], [fx - 1, fy], [fx, fy + 1], [fx, fy - 1]);
        }
      }
    }
  }

  return contours;
}

/**
 * Convert contours to SVG path string.
 */
export function contoursToSvgPath(contours) {
  return contours
    .map((contour) => {
      if (contour.length < 3) return '';
      const parts = [`M${contour[0].x} ${contour[0].y}`];
      for (let i = 1; i < contour.length; i++) {
        parts.push(`L${contour[i].x} ${contour[i].y}`);
      }
      parts.push('Z');
      return parts.join(' ');
    })
    .filter((p) => p)
    .join(' ');
}

/**
 * Generate SVG content.
 */
export function generateSvg(pathData, shipName) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- ${shipName}: Auto-generated from mesh silhouette -->
  <path d="${pathData}"/>
</svg>
`;
}
