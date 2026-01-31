/**
 * Main entry point - initializes game and starts the campaign loop.
 */

// Import campaign UI styles (must be before component imports)
import './ui/styles/index.css';

import { startCampaign } from './campaign/controller';
import { installTestUtilities } from './multiplayer/test-utilities';

// Install test utilities for E2E tests
installTestUtilities();

/** Maximum time to wait for fonts before proceeding with fallbacks */
const FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * Wait for critical fonts to load before rendering UI.
 * Uses Font Loading API with a timeout to avoid blocking forever.
 */
async function waitForFonts(): Promise<void> {
  try {
    const fontLoadPromise = Promise.all([
      document.fonts.load('400 1em "Orbitron"'),
      document.fonts.load('400 1em "JetBrains Mono"'),
      document.fonts.load('400 1em "Rajdhani"'),
    ]);

    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, FONT_LOAD_TIMEOUT_MS),
    );

    // Wait for fonts or timeout, whichever comes first
    await Promise.race([fontLoadPromise, timeoutPromise]);
  } catch {
    // Font loading failed (network error, etc.) - proceed with fallback fonts
  }
}

/** Initialize and start the campaign */
async function main(): Promise<void> {
  // Get container
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container not found');
  }

  // Wait for fonts to load before rendering UI (prevents FOUT)
  await waitForFonts();

  // Start the campaign
  startCampaign(container);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => main());
} else {
  main();
}
