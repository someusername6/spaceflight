/**
 * Ship Assignment Test Helpers
 *
 * Test fixtures for ship assignment tests.
 */

import { createSlotArray } from '../../../../src/campaign/slot-array.ts';

// =============================================================================
// Test Fixtures
// =============================================================================

export function createTestPilot(
  id,
  name = 'Test Pilot',
  skill = 'regular',
  shipClass = 'fighter',
) {
  return {
    id,
    name,
    // Ship-specific skills
    shipSkills: { [shipClass]: skill },
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
    xp: 0,
  };
}

export function createTestShip(id, shipClass, pilot = null) {
  return {
    id,
    shipClass,
    pilot,
    primaryWeapons: createSlotArray([null, null]),
    secondaryWeapons: createSlotArray([null, null]),
  };
}

export function createTestCampaignState(options = {}) {
  // Commander has empty shipSkills (can fly any ship via commanderId check)
  const commanderPilot = {
    id: 'commander',
    name: 'Commander',
    shipSkills: {},
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
    xp: 0,
  };
  const wingmanPilot = createTestPilot(
    'wingman1',
    'Wingman',
    'regular',
    'striker',
  );

  const commanderShip = createTestShip('ship1', 'interceptor', commanderPilot);
  const wingmanShip = createTestShip('ship2', 'striker', wingmanPilot);
  const unassignedShip = createTestShip('ship3', 'bomber', null);

  return {
    settings: {
      commanderName: 'Commander',
      ironmanMode: false,
      autoaimDegrees: 2.5,
    },
    seed: 12345,
    nextId: 100,
    credits: 10000,
    commanderId: 'commander',
    ships: options.ships ?? [commanderShip, wingmanShip, unassignedShip],
    pilots: options.pilots ?? [commanderPilot, wingmanPilot],
    storedShips: [],
    storedWeapons: [],
    storedAmmo: [],
    storedScrap: {},
    storeStock: {},
    availableRecruits: [],
    currentSector: 1,
    sectorMissionsCompleted: 0,
    completedContracts: [],
    attemptedContracts: [],
    contractRefreshCount: 0,
    missionCount: 0,
    stateVersion: 0,
    ...options,
  };
}
