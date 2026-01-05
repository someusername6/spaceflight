/**
 * Campaign utilities - small helper functions.
 */

/** Get seed from URL or generate random */
export function getGameSeed(): number {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  if (seedParam === null || seedParam === 'random') {
    return performance.now() | 0;
  }

  const parsed = Number.parseInt(seedParam, 10);
  return Number.isNaN(parsed) ? 12345 : parsed;
}

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
