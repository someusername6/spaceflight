/**
 * E2E Tests - Spectator Mode
 *
 * Tests for spectator functionality in multiplayer missions.
 *
 * Tests include:
 * 1. Pilots see correct HUD (not spectator HUD)
 * 2. Spectator mode activates when player has no ship
 * 3. Spectator controls work (Tab to cycle, C to change mode)
 */

// Import spectator mode tests (actual spectator functionality)
import {
  testSpectatorCameraMode,
  testSpectatorModeActivates,
  testSpectatorTabCyclesShips,
} from './spectator-mode-tests.mjs';

// Import pilot tests (verify normal players are NOT spectators)
import {
  testMissionHUDElementsComplete,
  testPilotsHaveNormalHUD,
  testTargetCyclingWorks,
  testWingmanDisplayShowsBothPlayers,
} from './spectator-pilot-tests.mjs';
import { isMainModule, runTestSuite } from './utils.mjs';

// =============================================================================
// Test Suite Runner
// =============================================================================

/** All spectator mode tests */
const ALL_TESTS = [
  // Pilot HUD tests (verify normal HUD for assigned players)
  {
    name: 'Pilots have normal HUD (not spectator)',
    fn: testPilotsHaveNormalHUD,
  },
  {
    name: 'Wingman display shows both players',
    fn: testWingmanDisplayShowsBothPlayers,
  },
  { name: 'Mission HUD elements complete', fn: testMissionHUDElementsComplete },
  { name: 'Target cycling works', fn: testTargetCyclingWorks },

  // Spectator mode tests (players without ships)
  {
    name: 'Spectator mode activates when no ship',
    fn: testSpectatorModeActivates,
  },
  {
    name: 'Spectator Tab cycles through ships',
    fn: testSpectatorTabCyclesShips,
  },
  { name: 'Spectator C toggles camera mode', fn: testSpectatorCameraMode },
];

// Run if invoked directly
if (isMainModule(import.meta.url)) {
  runTestSuite('E2E Tests - Spectator Mode', ALL_TESTS);
}
