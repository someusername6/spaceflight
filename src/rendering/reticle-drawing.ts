/**
 * Reticle drawing functions - canvas primitives for target indicators.
 */

/** Constants */
export const CORNER_SIZE = 12;
export const CORNER_THICKNESS = 2;
export const RETICLE_PADDING = 8;
export const MIN_RETICLE_SIZE = 40;
export const ARROW_SIZE = 12;
export const FONT_SIZE = 18;
export const FONT_FAMILY = '"Lucida Console", "Consolas", monospace';
export const EDGE_MARGIN = 12;
export const LEAD_INDICATOR_SIZE = 6;
export const CENTER_CROSSHAIR_SIZE = 8;
export const CENTER_CROSSHAIR_GAP = 3;

/** Draw text with black outline for readability (uses strokeText for efficiency) */
export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  const upperText = text.toUpperCase();
  ctx.font = `bold ${FONT_SIZE}px ${FONT_FAMILY}`;

  // Draw black outline using strokeText (more efficient than 8 fillText calls)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(upperText, x, y);

  // Draw colored text on top
  ctx.fillStyle = color;
  ctx.fillText(upperText, x, y);
}

/** Draw center crosshair (fixed aiming point at screen center) */
export function drawCenterCrosshair(
  ctx: CanvasRenderingContext2D,
  screenWidth: number,
  screenHeight: number,
): void {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;
  const size = CENTER_CROSSHAIR_SIZE;
  const gap = CENTER_CROSSHAIR_GAP;

  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  // Horizontal lines with gap in center
  ctx.moveTo(centerX - size, centerY);
  ctx.lineTo(centerX - gap, centerY);
  ctx.moveTo(centerX + gap, centerY);
  ctx.lineTo(centerX + size, centerY);

  // Vertical lines with gap in center
  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX, centerY - gap);
  ctx.moveTo(centerX, centerY + gap);
  ctx.lineTo(centerX, centerY + size);

  ctx.stroke();
}

/** Draw on-screen reticle with corner brackets */
export function drawOnScreenReticle(
  ctx: CanvasRenderingContext2D,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  distance: number,
  color: string,
): void {
  // Calculate box dimensions with padding
  let width = bounds.maxX - bounds.minX + RETICLE_PADDING * 2;
  let height = bounds.maxY - bounds.minY + RETICLE_PADDING * 2;
  let left = bounds.minX - RETICLE_PADDING;
  let top = bounds.minY - RETICLE_PADDING;

  // Enforce minimum size
  if (width < MIN_RETICLE_SIZE) {
    const diff = MIN_RETICLE_SIZE - width;
    left -= diff / 2;
    width = MIN_RETICLE_SIZE;
  }
  if (height < MIN_RETICLE_SIZE) {
    const diff = MIN_RETICLE_SIZE - height;
    top -= diff / 2;
    height = MIN_RETICLE_SIZE;
  }

  const right = left + width;
  const bottom = top + height;

  ctx.strokeStyle = color;
  ctx.lineWidth = CORNER_THICKNESS;
  ctx.beginPath();

  // Top-left corner
  ctx.moveTo(left, top + CORNER_SIZE);
  ctx.lineTo(left, top);
  ctx.lineTo(left + CORNER_SIZE, top);

  // Top-right corner
  ctx.moveTo(right - CORNER_SIZE, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + CORNER_SIZE);

  // Bottom-left corner
  ctx.moveTo(left, bottom - CORNER_SIZE);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + CORNER_SIZE, bottom);

  // Bottom-right corner
  ctx.moveTo(right - CORNER_SIZE, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - CORNER_SIZE);

  ctx.stroke();

  // Distance text below
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawOutlinedText(
    ctx,
    `${Math.round(distance)}`,
    left + width / 2,
    bottom + 4,
    color,
  );
}

/** Draw lock-on progress indicator (arc around target) */
export function drawLockIndicator(
  ctx: CanvasRenderingContext2D,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  progress: number, // 0-1
  color: string,
): void {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  // Apply same sizing logic as drawOnScreenReticle (padding + minimum size)
  const rawWidth = bounds.maxX - bounds.minX + RETICLE_PADDING * 2;
  const rawHeight = bounds.maxY - bounds.minY + RETICLE_PADDING * 2;
  const width = Math.max(rawWidth, MIN_RETICLE_SIZE);
  const height = Math.max(rawHeight, MIN_RETICLE_SIZE);
  const radius = Math.max(width, height) / 2 + 4;

  // Draw progress arc (starts at top, goes clockwise)
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + progress * Math.PI * 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.stroke();

  // When fully locked, draw a complete bright ring
  if (progress >= 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Draw lead indicator (pip showing where to aim) */
export function drawLeadIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  outOfRange: boolean = false,
  weaponLabel?: string,
): void {
  // Set up styling (dimmer and dashed if out of range)
  if (outOfRange) {
    ctx.strokeStyle = dimColor(color);
    ctx.setLineDash([3, 3]);
  } else {
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
  }
  ctx.lineWidth = 2;

  // Draw a small circle/pip
  ctx.beginPath();
  ctx.arc(x, y, LEAD_INDICATOR_SIZE, 0, Math.PI * 2);
  ctx.stroke();

  // Draw crosshair lines through the pip
  const half = LEAD_INDICATOR_SIZE + 3;
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x - LEAD_INDICATOR_SIZE - 1, y);
  ctx.moveTo(x + LEAD_INDICATOR_SIZE + 1, y);
  ctx.lineTo(x + half, y);
  ctx.moveTo(x, y - half);
  ctx.lineTo(x, y - LEAD_INDICATOR_SIZE - 1);
  ctx.moveTo(x, y + LEAD_INDICATOR_SIZE + 1);
  ctx.lineTo(x, y + half);
  ctx.stroke();

  // Reset line dash
  ctx.setLineDash([]);

  // Draw weapon label if provided (for linked mode with multiple indicators)
  if (weaponLabel) {
    ctx.font = `bold 9px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = outOfRange ? dimColor(color) : color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(weaponLabel, x, y + LEAD_INDICATOR_SIZE + 4);
    ctx.fillText(weaponLabel, x, y + LEAD_INDICATOR_SIZE + 4);
  }
}

/** Dim a color for out-of-range indicators */
function dimColor(color: string): string {
  // Handle common hex colors
  if (color === '#ff0000' || color === '#f00') return '#660000';
  if (color === '#00ff00' || color === '#0f0') return '#006600';
  if (color === '#ffff00' || color === '#ff0') return '#666600';
  // Default: just return a darker shade
  return `${color}80`; // Add alpha if not handled
}

/** Draw off-screen arrow pointing to target */
export function drawOffScreenArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  distance: number,
  color: string,
  behindCamera: boolean,
  screenWidth: number,
  screenHeight: number,
): void {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;
  let dirX = x - centerX;
  let dirY = y - centerY;
  if (behindCamera) {
    dirX = -dirX;
    dirY = -dirY;
  }

  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len > 0.001) {
    dirX /= len;
    dirY /= len;
  } else {
    // Target at screen center or directly behind - default to pointing up
    dirX = 0;
    dirY = -1;
  }

  // Find arrow position on screen edge
  const maxX = screenWidth / 2 - EDGE_MARGIN;
  const maxY = screenHeight / 2 - EDGE_MARGIN;

  let scale = maxY; // Default for pure vertical
  if (Math.abs(dirX) > 0.001) scale = Math.min(scale, maxX / Math.abs(dirX));
  if (Math.abs(dirY) > 0.001) scale = Math.min(scale, maxY / Math.abs(dirY));

  const arrowX = centerX + dirX * scale;
  const arrowY = centerY + dirY * scale;
  const angle = Math.atan2(dirY, dirX);

  // Draw arrow triangle
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(ARROW_SIZE, 0);
  ctx.lineTo(-ARROW_SIZE / 2, -ARROW_SIZE / 2);
  ctx.lineTo(-ARROW_SIZE / 2, ARROW_SIZE / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Distance text - position based on which edge
  const distText = `${Math.round(distance)}`;

  const distToLeft = arrowX;
  const distToRight = screenWidth - arrowX;
  const distToTop = arrowY;
  const distToBottom = screenHeight - arrowY;
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

  const textOffset = ARROW_SIZE + 8;

  if (minDist === distToLeft) {
    // Left edge - text to the right
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    drawOutlinedText(ctx, distText, arrowX + textOffset, arrowY, color);
  } else if (minDist === distToRight) {
    // Right edge - text to the left
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    drawOutlinedText(ctx, distText, arrowX - textOffset, arrowY, color);
  } else if (minDist === distToTop) {
    // Top edge - text below
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    drawOutlinedText(ctx, distText, arrowX, arrowY + textOffset, color);
  } else {
    // Bottom edge - text above
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    drawOutlinedText(ctx, distText, arrowX, arrowY - textOffset, color);
  }
}
