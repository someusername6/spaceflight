/**
 * Contour simplification utilities.
 *
 * Provides Ramer-Douglas-Peucker simplification and symmetry-preserving
 * simplification for closed contours.
 */

/**
 * Simplify contour using Ramer-Douglas-Peucker algorithm.
 */
export function simplifyOpenContour(points, epsilon) {
  if (points.length < 3) return points;

  const sqDist = (p1, p2) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

  const perpendicularDist = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt(sqDist(p, a));
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / mag;
  };

  const rdp = (start, end) => {
    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDist(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      const left = rdp(start, maxIdx);
      const right = rdp(maxIdx, end);
      return [...left.slice(0, -1), ...right];
    }

    return [points[start], points[end]];
  };

  const result = rdp(0, points.length - 1);
  return result;
}

/**
 * Simplify a closed contour, preserving vertical symmetry if present.
 * Only simplifies one half and mirrors it to guarantee symmetry.
 */
export function simplifyClosedContour(contour, epsilon, centerX) {
  if (contour.length < 4) return contour;

  const tolerance = 2;

  // Find points near the center line
  const centerLinePoints = contour
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => Math.abs(p.x - centerX) <= tolerance);

  if (centerLinePoints.length < 2) {
    return simplifyOpenContour(contour, epsilon);
  }

  // Find topmost and bottommost center points
  centerLinePoints.sort((a, b) => a.p.y - b.p.y);
  const topIdx = centerLinePoints[0].i;
  const bottomIdx = centerLinePoints[centerLinePoints.length - 1].i;

  // Extract halves by walking from top to bottom in each direction
  function extractHalf(startIdx, endIdx, direction) {
    const half = [];
    let idx = startIdx;
    while (true) {
      half.push({ ...contour[idx] });
      if (idx === endIdx) break;
      idx = (idx + direction + contour.length) % contour.length;
    }
    return half;
  }

  const halfA = extractHalf(topIdx, bottomIdx, 1);
  const halfB = extractHalf(topIdx, bottomIdx, -1);

  // Determine which is right half (higher average x)
  const avgA = halfA.reduce((s, p) => s + p.x, 0) / halfA.length;
  const avgB = halfB.reduce((s, p) => s + p.x, 0) / halfB.length;
  const rightHalf = avgA > avgB ? halfA : halfB;
  const leftHalf = avgA > avgB ? halfB : halfA;

  // Verify symmetry: left should mirror right
  let isSymmetric = rightHalf.length === leftHalf.length;
  if (isSymmetric) {
    for (let i = 0; i < rightHalf.length; i++) {
      const rp = rightHalf[i];
      const lp = leftHalf[leftHalf.length - 1 - i];
      const expectedLX = 2 * centerX - rp.x;
      if (
        Math.abs(lp.x - expectedLX) > tolerance ||
        Math.abs(lp.y - rp.y) > tolerance
      ) {
        isSymmetric = false;
        break;
      }
    }
  }

  if (!isSymmetric) {
    return simplifyOpenContour(contour, epsilon);
  }

  // Force endpoints to exact center for perfect symmetry
  rightHalf[0].x = centerX;
  rightHalf[rightHalf.length - 1].x = centerX;

  // Simplify only the right half
  const simplifiedRight = simplifyOpenContour(rightHalf, epsilon);

  // Mirror to create left half
  const simplifiedLeft = simplifiedRight.map((p) => ({
    x: 2 * centerX - p.x,
    y: p.y,
  }));

  // Combine: right (without bottom) + reversed left (without top)
  const reversedLeft = [...simplifiedLeft].reverse();
  return [...simplifiedRight.slice(0, -1), ...reversedLeft.slice(0, -1)];
}

/**
 * Scale and transform contour to SVG coordinates.
 */
export function transformContour(contour, fromSize, toSize, padding) {
  const fromPadding = padding * (fromSize / toSize);
  const scale = (toSize - padding * 2) / (fromSize - fromPadding * 2);

  return contour.map((p) => ({
    x: Math.round((p.x - fromPadding) * scale + padding),
    y: Math.round((p.y - fromPadding) * scale + padding),
  }));
}

/**
 * Remove duplicate consecutive points and close the loop cleanly.
 */
export function removeDuplicates(contour) {
  if (contour.length < 2) return contour;
  const result = [contour[0]];
  for (let i = 1; i < contour.length; i++) {
    const prev = result[result.length - 1];
    const curr = contour[i];
    if (curr.x !== prev.x || curr.y !== prev.y) {
      result.push(curr);
    }
  }
  // Remove last point if it's close to first (Z command will close the path)
  if (result.length > 2) {
    const first = result[0];
    const last = result[result.length - 1];
    const dx = Math.abs(last.x - first.x);
    const dy = Math.abs(last.y - first.y);
    if (dx <= 1 && dy <= 1) {
      result.pop();
    }
  }
  return result;
}
