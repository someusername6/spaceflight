/**
 * Main entry point - initializes game and starts the campaign loop.
 */

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

  console.log('Spaceflight - Campaign Mode');
  console.log(
    'Flight: WASD = Pitch/Yaw, QE = Roll, Shift = Accelerate, Ctrl = Decelerate, Z = Afterburner',
  );
  console.log(
    'Combat: Space = Fire, T = Target nearest, [ ] = Cycle targets, < > = Cycle weapons',
  );
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
