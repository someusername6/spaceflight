/**
 * Campaign utilities - small helper functions.
 */

/** Create victory/defeat overlay element */
export function createMissionResultOverlay(isDefeat: boolean): HTMLDivElement {
  const overlay = document.createElement('div');
  const color = isDefeat ? '#ff0000' : '#00ff00';
  overlay.style.cssText = `
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 72px;
    font-weight: bold;
    font-family: sans-serif;
    text-shadow: 0 0 20px ${color}, 0 0 40px ${color};
    color: ${color};
    pointer-events: none;
    z-index: 1000;
  `;
  overlay.textContent = isDefeat ? 'DEFEAT' : 'VICTORY';
  return overlay;
}
