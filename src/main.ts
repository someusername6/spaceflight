/**
 * Main entry point - initializes game and starts the campaign loop.
 */

// Import campaign UI styles (must be before component imports)
import './ui/styles/index.css';

import { startCampaign } from './campaign/controller';

/** Initialize and start the campaign */
function main(): void {
  // Get container
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container not found');
  }

  // Start the campaign
  startCampaign(container);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
