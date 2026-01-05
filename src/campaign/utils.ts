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
