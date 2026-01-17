/**
 * SVG parsing utilities for mesh bundling.
 * Extracts bounding boxes from SVG path data.
 */

import { readFile } from 'node:fs/promises';

/**
 * Parse an SVG path and extract the bounding box of its content.
 * Handles M, L, H, V, Z commands (absolute only - our SVGs use these).
 */
export function parseSvgPathBounds(pathData) {
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
export async function extractSvgBounds(svgPath) {
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
