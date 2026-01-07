/**
 * Connector Lines - Draw lines from weapon slots to ship hardpoints.
 *
 * Uses 45-degree diagonals for a clean schematic look.
 * Lines are drawn in an SVG overlay and update continuously during resize.
 */

/** Point in 2D space */
interface Point {
  x: number;
  y: number;
}

/** Connector path from slot to hardpoint */
interface ConnectorPath {
  points: Point[];
  slotType: 'primary' | 'secondary';
  filled: boolean;
}

/**
 * Calculate connector path using 45-degree diagonals.
 *
 * Algorithm:
 * - If |Δy| ≥ |Δx|: Vertical first, then 45° diagonal
 * - If |Δx| > |Δy|: 45° diagonal first, then horizontal
 *
 * This ensures all diagonal segments are exactly 45 degrees.
 */
function calculatePath(start: Point, end: Point): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // If points are very close, just draw direct line
  if (adx < 2 && ady < 2) {
    return [start, end];
  }

  // If nearly vertical, just go straight
  if (adx < 2) {
    return [start, end];
  }

  // If nearly horizontal, just go straight
  if (ady < 2) {
    return [start, end];
  }

  const points: Point[] = [start];

  if (ady >= adx) {
    // More vertical than horizontal: VERTICAL → DIAGONAL
    const verticalDist = ady - adx;

    if (verticalDist > 2) {
      // Add midpoint at end of vertical segment
      const midY = start.y + Math.sign(dy) * verticalDist;
      points.push({ x: start.x, y: midY });
    }

    // Diagonal to target
    points.push(end);
  } else {
    // More horizontal than vertical: DIAGONAL → HORIZONTAL
    const diagDist = ady;
    const midX = start.x + Math.sign(dx) * diagDist;

    // Add midpoint at end of diagonal segment
    points.push({ x: midX, y: end.y });

    // Horizontal to target
    points.push(end);
  }

  return points;
}

/**
 * Convert points array to SVG path d attribute.
 */
function pointsToPath(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

/**
 * Get slot center position relative to container.
 */
function getSlotPosition(
  slot: Element,
  container: Element,
  slotType: 'primary' | 'secondary',
): Point {
  const slotRect = slot.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Center X of slot
  const x = slotRect.left + slotRect.width / 2 - containerRect.left;

  // For primary: bottom edge (connecting down to ship)
  // For secondary: top edge (connecting up to ship)
  const y =
    slotType === 'primary'
      ? slotRect.bottom - containerRect.top
      : slotRect.top - containerRect.top;

  return { x, y };
}

/**
 * Get hardpoint position on ship icon relative to container.
 * Accounts for object-fit: contain which may letterbox/pillarbox the image.
 */
function getHardpointPosition(
  shipIcon: Element,
  container: Element,
  svgXPercent: number,
  svgYPercent: number,
): Point {
  const iconRect = shipIcon.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Ship SVGs are 64x64 (1:1 aspect ratio)
  // With object-fit: contain, the image is scaled and centered with letterboxing
  const intrinsicRatio = 1; // 64/64
  const containerRatio = iconRect.width / iconRect.height;

  let renderedWidth: number;
  let renderedHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (containerRatio > intrinsicRatio) {
    // Container is wider than image - pillarboxing (horizontal padding)
    renderedHeight = iconRect.height;
    renderedWidth = iconRect.height * intrinsicRatio;
    offsetX = (iconRect.width - renderedWidth) / 2;
    offsetY = 0;
  } else {
    // Container is taller than image - letterboxing (vertical padding)
    renderedWidth = iconRect.width;
    renderedHeight = iconRect.width / intrinsicRatio;
    offsetX = 0;
    offsetY = (iconRect.height - renderedHeight) / 2;
  }

  // Map percentage to position within the actual rendered image area
  const x =
    iconRect.left +
    offsetX +
    renderedWidth * (svgXPercent / 100) -
    containerRect.left;
  const y =
    iconRect.top +
    offsetY +
    renderedHeight * (svgYPercent / 100) -
    containerRect.top;

  return { x, y };
}

/**
 * Calculate all connector paths for a ship viewer.
 */
function calculateConnectors(diagram: Element): ConnectorPath[] {
  const connectors: ConnectorPath[] = [];

  // Find the ship icon
  const shipIcon = diagram.querySelector('.ship-icon-svg');
  if (!shipIcon) return connectors;

  // Find all slots
  const slots = diagram.querySelectorAll('.schematic-slot');

  for (const slot of slots) {
    const slotType = slot.getAttribute('data-type') as 'primary' | 'secondary';
    const svgXAttr = slot.getAttribute('style')?.match(/--svg-x:\s*([\d.]+)%/);
    const svgYAttr = slot.getAttribute('style')?.match(/--svg-y:\s*([\d.]+)%/);

    if (!slotType || !svgXAttr?.[1] || !svgYAttr?.[1]) continue;

    const svgXPercent = parseFloat(svgXAttr[1]);
    const svgYPercent = parseFloat(svgYAttr[1]);

    const slotPos = getSlotPosition(slot, diagram, slotType);
    const hardpointPos = getHardpointPosition(
      shipIcon,
      diagram,
      svgXPercent,
      svgYPercent,
    );

    const filled = slot.classList.contains('filled');
    const points = calculatePath(slotPos, hardpointPos);

    connectors.push({ points, slotType, filled });
  }

  return connectors;
}

/**
 * Render connector paths as SVG elements.
 */
function renderConnectorsSVG(
  connectors: ConnectorPath[],
  width: number,
  height: number,
): string {
  const paths = connectors
    .map((c) => {
      const d = pointsToPath(c.points);
      const colorClass =
        c.slotType === 'primary' ? 'connector-primary' : 'connector-secondary';
      const filledClass = c.filled ? 'filled' : '';
      return `<path d="${d}" class="connector-line ${colorClass} ${filledClass}" />`;
    })
    .join('\n');

  return `
    <svg class="connector-overlay" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      ${paths}
    </svg>
  `;
}

/**
 * Update connectors for a ship viewer element.
 * Call this on initial render and on resize.
 */
export function updateShipConnectors(viewer: Element): void {
  const diagram = viewer.querySelector('.schematic-diagram');
  if (!diagram) return;

  // Get container dimensions
  const rect = diagram.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  // Calculate connector paths
  const connectors = calculateConnectors(diagram);

  // Find or create SVG overlay
  let svg = diagram.querySelector('.connector-overlay');
  if (!svg) {
    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = renderConnectorsSVG(
      connectors,
      rect.width,
      rect.height,
    );
    svg = svgContainer.firstElementChild;
    if (svg) {
      diagram.appendChild(svg);
    }
  } else {
    // Update existing SVG
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    const paths = connectors
      .map((c) => {
        const d = pointsToPath(c.points);
        const colorClass =
          c.slotType === 'primary'
            ? 'connector-primary'
            : 'connector-secondary';
        const filledClass = c.filled ? 'filled' : '';
        return `<path d="${d}" class="connector-line ${colorClass} ${filledClass}" />`;
      })
      .join('\n');
    svg.innerHTML = paths;
  }
}

/** Store for active ResizeObservers to prevent duplicates */
const observerMap = new WeakMap<Element, ResizeObserver>();

/**
 * Initialize connector line updates for a ship viewer.
 * Sets up ResizeObserver for continuous updates during resize.
 */
export function initShipConnectors(viewer: Element): void {
  // Clean up existing observer if any
  destroyShipConnectors(viewer);

  const diagram = viewer.querySelector('.schematic-diagram');
  if (!diagram) return;

  // Initial update
  updateShipConnectors(viewer);

  // Set up ResizeObserver for continuous updates
  const observer = new ResizeObserver(() => {
    updateShipConnectors(viewer);
  });

  observer.observe(diagram);
  observerMap.set(viewer, observer);
}

/**
 * Clean up connector observers when viewer is destroyed.
 */
export function destroyShipConnectors(viewer: Element): void {
  const observer = observerMap.get(viewer);
  if (observer) {
    observer.disconnect();
    observerMap.delete(viewer);
  }

  // Remove SVG overlay
  const svg = viewer.querySelector('.connector-overlay');
  if (svg) {
    svg.remove();
  }
}
