/**
 * Battle Canvas Utility - Shared canvas re-attachment for screens with
 * battle simulation backgrounds (settings, load campaign).
 */

/** Module-level canvas reference for re-attachment across re-renders */
let battleCanvas: HTMLCanvasElement | null = null;

/** Store canvas reference for re-attachment */
export function storeBattleCanvas(canvas: HTMLCanvasElement): void {
  battleCanvas = canvas;
}

/** Clear canvas reference on screen cleanup */
export function clearBattleCanvas(): void {
  battleCanvas = null;
}

/** Re-attach battle canvas to a container after re-render */
export function reattachBattleCanvas(
  containerId: string,
  screenSelector: string,
): void {
  if (!battleCanvas) return;
  const bgContainer = document.getElementById(containerId);
  const screen = document.querySelector(screenSelector);
  if (bgContainer) {
    if (battleCanvas.parentElement !== bgContainer) {
      bgContainer.appendChild(battleCanvas);
    }
    screen?.classList.add('with-battle-bg');
  }
}
