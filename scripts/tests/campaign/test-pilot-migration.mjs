/**
 * Pilot Migration Unit Tests
 *
 * Tests for migrating legacy pilots from single skill to ship-specific skills.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  migrateCampaignPilots,
  migrateCampaignRecruits,
  migratePilotToShipSkills,
  migrateRecruit,
} from '../../../src/campaign/storage/campaign-utils.ts';

// =============================================================================
// Tests: migratePilotToShipSkills
// =============================================================================

describe('Pilot Migration - migratePilotToShipSkills', () => {
  it('migrates legacy skill to all ship classes', () => {
    const legacyPilot = {
      id: 'pilot-1',
      name: 'Alpha',
      skill: 'veteran', // Legacy field
      shipSkills: {},
      kills: 10,
      assists: 5,
      missionsFlown: 15,
      missionsWon: 12,
      damageDealt: 50000,
      damageReceived: 20000,
      ejectionCount: 1,
      injuredMissionsLeft: 0,
      xp: 100,
    };

    const migrated = migratePilotToShipSkills(legacyPilot, 'commander');

    // Should have skill for all ship classes
    assert.strictEqual(migrated.shipSkills.fighter, 'veteran');
    assert.strictEqual(migrated.shipSkills.bomber, 'veteran');
    assert.strictEqual(migrated.shipSkills.interceptor, 'veteran');
    assert.strictEqual(migrated.shipSkills.striker, 'veteran');
    assert.strictEqual(migrated.shipSkills.defender, 'veteran');

    // Legacy field should be removed
    assert.strictEqual(migrated.skill, undefined);
  });

  it('preserves already-migrated pilots', () => {
    const newPilot = {
      id: 'pilot-1',
      name: 'Alpha',
      shipSkills: { fighter: 'ace', bomber: 'rookie' },
      kills: 10,
      assists: 5,
      missionsFlown: 15,
      missionsWon: 12,
      damageDealt: 50000,
      damageReceived: 20000,
      ejectionCount: 0,
      injuredMissionsLeft: 0,
      xp: 100,
    };

    const migrated = migratePilotToShipSkills(newPilot, 'commander');

    // Should not add interceptor or other ships
    assert.strictEqual(migrated.shipSkills.fighter, 'ace');
    assert.strictEqual(migrated.shipSkills.bomber, 'rookie');
    assert.strictEqual(migrated.shipSkills.interceptor, undefined);
    assert.strictEqual(migrated.shipSkills.striker, undefined);
    assert.strictEqual(migrated.shipSkills.defender, undefined);
  });

  it('commander gets empty shipSkills', () => {
    const legacyCommander = {
      id: 'commander',
      name: 'Commander',
      skill: 'ace', // Legacy field
      shipSkills: {},
      kills: 50,
      assists: 10,
      missionsFlown: 100,
      missionsWon: 95,
      damageDealt: 500000,
      damageReceived: 100000,
      ejectionCount: 0,
      injuredMissionsLeft: 0,
      xp: 0,
    };

    const migrated = migratePilotToShipSkills(legacyCommander, 'commander');

    // Commander should have empty shipSkills
    assert.deepStrictEqual(migrated.shipSkills, {});

    // Legacy field should be removed
    assert.strictEqual(migrated.skill, undefined);
  });

  it('adds injuredMissionsLeft if missing', () => {
    const legacyPilot = {
      id: 'pilot-1',
      name: 'Alpha',
      skill: 'veteran',
      shipSkills: {},
      kills: 10,
      assists: 5,
      missionsFlown: 15,
      missionsWon: 12,
      damageDealt: 50000,
      damageReceived: 20000,
      ejectionCount: 0,
      xp: 100,
      // No injuredMissionsLeft field
    };

    const migrated = migratePilotToShipSkills(legacyPilot, 'commander');

    assert.strictEqual(migrated.injuredMissionsLeft, 0);
  });

  it('preserves all other pilot fields', () => {
    const legacyPilot = {
      id: 'pilot-1',
      name: 'Alpha',
      skill: 'veteran',
      shipSkills: {},
      kills: 10,
      assists: 5,
      missionsFlown: 15,
      missionsWon: 12,
      damageDealt: 50000,
      damageReceived: 20000,
      ejectionCount: 2,
      injuredMissionsLeft: 1,
      xp: 100,
    };

    const migrated = migratePilotToShipSkills(legacyPilot, 'commander');

    assert.strictEqual(migrated.id, 'pilot-1');
    assert.strictEqual(migrated.name, 'Alpha');
    assert.strictEqual(migrated.kills, 10);
    assert.strictEqual(migrated.assists, 5);
    assert.strictEqual(migrated.missionsFlown, 15);
    assert.strictEqual(migrated.missionsWon, 12);
    assert.strictEqual(migrated.damageDealt, 50000);
    assert.strictEqual(migrated.damageReceived, 20000);
    assert.strictEqual(migrated.ejectionCount, 2);
    assert.strictEqual(migrated.xp, 100);
  });

  it('handles pilot with no skill data gracefully', () => {
    const brokenPilot = {
      id: 'pilot-1',
      name: 'Alpha',
      // No skill or shipSkills
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

    const migrated = migratePilotToShipSkills(brokenPilot, 'commander');

    // Should have empty shipSkills
    assert.deepStrictEqual(migrated.shipSkills, {});
  });
});

// =============================================================================
// Tests: migrateCampaignPilots
// =============================================================================

describe('Pilot Migration - migrateCampaignPilots', () => {
  it('migrates all pilots in campaign', () => {
    const legacyPilots = [
      {
        id: 'commander',
        name: 'Commander',
        skill: 'ace',
        shipSkills: {},
        kills: 50,
        assists: 10,
        missionsFlown: 100,
        missionsWon: 95,
        damageDealt: 500000,
        damageReceived: 100000,
        ejectionCount: 0,
        injuredMissionsLeft: 0,
        xp: 0,
      },
      {
        id: 'pilot-1',
        name: 'Alpha',
        skill: 'veteran',
        shipSkills: {},
        kills: 10,
        assists: 5,
        missionsFlown: 15,
        missionsWon: 12,
        damageDealt: 50000,
        damageReceived: 20000,
        ejectionCount: 0,
        injuredMissionsLeft: 0,
        xp: 100,
      },
      {
        id: 'pilot-2',
        name: 'Beta',
        skill: 'rookie',
        shipSkills: {},
        kills: 2,
        assists: 1,
        missionsFlown: 5,
        missionsWon: 3,
        damageDealt: 10000,
        damageReceived: 15000,
        ejectionCount: 1,
        injuredMissionsLeft: 0,
        xp: 25,
      },
    ];

    const migrated = migrateCampaignPilots(legacyPilots, 'commander');

    assert.strictEqual(migrated.length, 3);

    // Commander should have empty shipSkills
    assert.deepStrictEqual(migrated[0].shipSkills, {});

    // Other pilots should have skills for all ships
    assert.strictEqual(migrated[1].shipSkills.fighter, 'veteran');
    assert.strictEqual(migrated[1].shipSkills.bomber, 'veteran');
    assert.strictEqual(migrated[2].shipSkills.fighter, 'rookie');
    assert.strictEqual(migrated[2].shipSkills.bomber, 'rookie');
  });
});

// =============================================================================
// Tests: migrateRecruit
// =============================================================================

describe('Pilot Migration - migrateRecruit', () => {
  it('adds startingShip to legacy recruit', () => {
    const legacyRecruit = {
      id: 'recruit-1',
      name: 'Test',
      skill: 'veteran',
      price: 400,
      // No startingShip or bonusXP
    };

    const migrated = migrateRecruit(legacyRecruit);

    assert.strictEqual(migrated.startingShip, 'fighter');
  });

  it('adds bonusXP to legacy recruit based on skill', () => {
    const rookieRecruit = {
      id: 'recruit-1',
      name: 'Test1',
      skill: 'rookie',
      price: 75,
    };

    const veteranRecruit = {
      id: 'recruit-2',
      name: 'Test2',
      skill: 'veteran',
      price: 400,
    };

    const aceRecruit = {
      id: 'recruit-3',
      name: 'Test3',
      skill: 'ace',
      price: 700,
    };

    assert.strictEqual(migrateRecruit(rookieRecruit).bonusXP, 25);
    assert.strictEqual(migrateRecruit(veteranRecruit).bonusXP, 75);
    assert.strictEqual(migrateRecruit(aceRecruit).bonusXP, 100);
  });

  it('preserves already-migrated recruit', () => {
    const newRecruit = {
      id: 'recruit-1',
      name: 'Test',
      skill: 'veteran',
      startingShip: 'bomber',
      bonusXP: 150, // Custom value
      price: 400,
    };

    const migrated = migrateRecruit(newRecruit);

    // Should preserve existing values
    assert.strictEqual(migrated.startingShip, 'bomber');
    assert.strictEqual(migrated.bonusXP, 150);
  });

  it('preserves all recruit fields', () => {
    const legacyRecruit = {
      id: 'recruit-1',
      name: 'Test',
      skill: 'regular',
      price: 200,
    };

    const migrated = migrateRecruit(legacyRecruit);

    assert.strictEqual(migrated.id, 'recruit-1');
    assert.strictEqual(migrated.name, 'Test');
    assert.strictEqual(migrated.skill, 'regular');
    assert.strictEqual(migrated.price, 200);
  });
});

// =============================================================================
// Tests: migrateCampaignRecruits
// =============================================================================

describe('Pilot Migration - migrateCampaignRecruits', () => {
  it('migrates all recruits in campaign', () => {
    const legacyRecruits = [
      { id: 'recruit-1', name: 'Alpha', skill: 'rookie', price: 75 },
      { id: 'recruit-2', name: 'Beta', skill: 'veteran', price: 400 },
      { id: 'recruit-3', name: 'Gamma', skill: 'ace', price: 700 },
    ];

    const migrated = migrateCampaignRecruits(legacyRecruits);

    assert.strictEqual(migrated.length, 3);

    // All should have startingShip and bonusXP
    assert.strictEqual(migrated[0].startingShip, 'fighter');
    assert.strictEqual(migrated[0].bonusXP, 25); // rookie
    assert.strictEqual(migrated[1].startingShip, 'fighter');
    assert.strictEqual(migrated[1].bonusXP, 75); // veteran
    assert.strictEqual(migrated[2].startingShip, 'fighter');
    assert.strictEqual(migrated[2].bonusXP, 100); // ace
  });
});
