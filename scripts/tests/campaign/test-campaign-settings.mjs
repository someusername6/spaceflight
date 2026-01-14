/**
 * Campaign Settings Tests
 *
 * Tests that:
 * 1. Campaign settings are created correctly with defaults
 * 2. Custom settings are applied during campaign creation
 * 3. Commander name is used for the commander pilot
 * 4. Settings survive serialization round-trip
 * 5. Autoaim validation covers all edge cases
 * 6. Settings integrate correctly with campaign state helpers
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { slotArrayFromJSON } from '../../../src/campaign/slot-array.ts';
import {
  createNewCampaign,
  getCommanderShip,
  getWingmanShips,
  isCommanderShip,
  isGameOver,
} from '../../../src/campaign/state.ts';
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../../src/campaign/types.ts';
import {
  isValidPlayerAutoaim,
  PLAYER_AUTOAIM_OPTIONS,
} from '../../../src/settings/game-settings.ts';

// ============================================================================
// Campaign Settings Creation Tests
// ============================================================================

describe('Campaign Settings', () => {
  describe('createNewCampaign with default settings', () => {
    it('creates campaign with default settings when no settings provided', () => {
      const campaign = createNewCampaign();

      assert.ok(campaign.settings, 'Campaign should have settings');
      assert.strictEqual(
        campaign.settings.commanderName,
        DEFAULT_CAMPAIGN_SETTINGS.commanderName,
        'Should use default commander name',
      );
      assert.strictEqual(
        campaign.settings.ironmanMode,
        DEFAULT_CAMPAIGN_SETTINGS.ironmanMode,
        'Should use default ironman mode',
      );
      assert.strictEqual(
        campaign.settings.autoaimDegrees,
        DEFAULT_CAMPAIGN_SETTINGS.autoaimDegrees,
        'Should use default autoaim',
      );
    });

    it('commander pilot has default name', () => {
      const campaign = createNewCampaign();
      const commander = campaign.pilots.find(
        (p) => p.id === campaign.commanderId,
      );

      assert.ok(commander, 'Commander pilot should exist');
      assert.strictEqual(
        commander.name,
        DEFAULT_CAMPAIGN_SETTINGS.commanderName,
        'Commander pilot should have default name',
      );
    });
  });

  describe('createNewCampaign with custom settings', () => {
    it('creates campaign with custom commander name', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: 'Maverick',
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(
        campaign.settings.commanderName,
        'Maverick',
        'Should use custom commander name',
      );

      const commander = campaign.pilots.find(
        (p) => p.id === campaign.commanderId,
      );
      assert.strictEqual(
        commander.name,
        'Maverick',
        'Commander pilot should have custom name',
      );
    });

    it('creates campaign with ironman mode disabled', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        ironmanMode: false,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(
        campaign.settings.ironmanMode,
        false,
        'Should use non-ironman mode',
      );
    });

    it('creates campaign with custom autoaim', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        autoaimDegrees: 5,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(
        campaign.settings.autoaimDegrees,
        5,
        'Should use custom autoaim degrees',
      );
    });

    it('creates campaign with all custom settings', () => {
      const settings = {
        commanderName: 'Ace',
        ironmanMode: false,
        autoaimDegrees: 1,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.commanderName, 'Ace');
      assert.strictEqual(campaign.settings.ironmanMode, false);
      assert.strictEqual(campaign.settings.autoaimDegrees, 1);
    });
  });

  describe('settings validation', () => {
    it('validates autoaim values', () => {
      // Valid values
      assert.ok(isValidPlayerAutoaim(0), '0 is valid');
      assert.ok(isValidPlayerAutoaim(0.5), '0.5 is valid');
      assert.ok(isValidPlayerAutoaim(1), '1 is valid');
      assert.ok(isValidPlayerAutoaim(2.5), '2.5 is valid');
      assert.ok(isValidPlayerAutoaim(5), '5 is valid');

      // Invalid values
      assert.ok(!isValidPlayerAutoaim(6), '6 is not valid');
      assert.ok(!isValidPlayerAutoaim(-1), '-1 is not valid');
      assert.ok(!isValidPlayerAutoaim('1'), 'string "1" is not valid');
      assert.ok(!isValidPlayerAutoaim(null), 'null is not valid');
      assert.ok(!isValidPlayerAutoaim(undefined), 'undefined is not valid');
    });

    it('validates all PLAYER_AUTOAIM_OPTIONS values', () => {
      // Every option in the list should be valid
      for (const option of PLAYER_AUTOAIM_OPTIONS) {
        assert.ok(
          isValidPlayerAutoaim(option.value),
          `${option.value} from PLAYER_AUTOAIM_OPTIONS should be valid`,
        );
      }
    });

    it('rejects values between valid autoaim steps', () => {
      // Values between the 0.5 steps should be invalid
      assert.ok(!isValidPlayerAutoaim(0.25), '0.25 is not valid');
      assert.ok(!isValidPlayerAutoaim(0.75), '0.75 is not valid');
      assert.ok(!isValidPlayerAutoaim(1.25), '1.25 is not valid');
      assert.ok(!isValidPlayerAutoaim(2.75), '2.75 is not valid');
      assert.ok(!isValidPlayerAutoaim(4.75), '4.75 is not valid');
    });

    it('rejects edge case invalid values', () => {
      assert.ok(!isValidPlayerAutoaim(NaN), 'NaN is not valid');
      assert.ok(!isValidPlayerAutoaim(Infinity), 'Infinity is not valid');
      assert.ok(!isValidPlayerAutoaim(-Infinity), '-Infinity is not valid');
      assert.ok(!isValidPlayerAutoaim({}), 'object is not valid');
      assert.ok(!isValidPlayerAutoaim([]), 'array is not valid');
      assert.ok(!isValidPlayerAutoaim(true), 'boolean is not valid');
      assert.ok(!isValidPlayerAutoaim(-0.5), '-0.5 is not valid');
      assert.ok(!isValidPlayerAutoaim(5.5), '5.5 is not valid');
    });
  });

  describe('commander name edge cases', () => {
    it('accepts unicode characters in commander name', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: '指揮官',
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.commanderName, '指揮官');
      const commander = campaign.pilots.find(
        (p) => p.id === campaign.commanderId,
      );
      assert.strictEqual(commander.name, '指揮官');
    });

    it('accepts emoji in commander name', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: 'Ace 🚀',
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.commanderName, 'Ace 🚀');
    });

    it('accepts special characters in commander name', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: "O'Neill-Smith",
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.commanderName, "O'Neill-Smith");
    });

    it('preserves whitespace in commander name', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: '  Ace  ',
      };
      const campaign = createNewCampaign(settings);

      // Note: Trimming happens in UI, not in state creation
      assert.strictEqual(campaign.settings.commanderName, '  Ace  ');
    });

    it('accepts maximum length names', () => {
      const longName = 'A'.repeat(20); // maxlength="20" in UI
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: longName,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.commanderName, longName);
      assert.strictEqual(campaign.settings.commanderName.length, 20);
    });
  });
});

// ============================================================================
// Settings Serialization Tests
// ============================================================================

describe('Campaign Settings Serialization', () => {
  it('settings survive JSON round-trip', () => {
    const settings = {
      commanderName: 'Phoenix',
      ironmanMode: false,
      autoaimDegrees: 3.5,
    };
    const original = createNewCampaign(settings);

    // Serialize
    const jsonString = JSON.stringify(original);

    // Deserialize
    const parsed = JSON.parse(jsonString);

    // Reconstitute (settings don't need special handling)
    const restored = {
      ...parsed,
      ships: parsed.ships.map((ship) => ({
        ...ship,
        primaryWeapons: slotArrayFromJSON(ship.primaryWeapons),
        secondaryWeapons: slotArrayFromJSON(ship.secondaryWeapons),
      })),
    };

    // Verify settings survived
    assert.deepStrictEqual(
      restored.settings,
      original.settings,
      'Settings should be identical after round-trip',
    );
    assert.strictEqual(restored.settings.commanderName, 'Phoenix');
    assert.strictEqual(restored.settings.ironmanMode, false);
    assert.strictEqual(restored.settings.autoaimDegrees, 3.5);
  });

  it('commander pilot name survives round-trip', () => {
    const settings = {
      commanderName: 'Viper',
      ironmanMode: true,
      autoaimDegrees: 2,
    };
    const original = createNewCampaign(settings);

    // Serialize and deserialize
    const parsed = JSON.parse(JSON.stringify(original));
    const restored = {
      ...parsed,
      ships: parsed.ships.map((ship) => ({
        ...ship,
        primaryWeapons: slotArrayFromJSON(ship.primaryWeapons),
        secondaryWeapons: slotArrayFromJSON(ship.secondaryWeapons),
      })),
    };

    // Find commander in restored state
    const commander = restored.pilots.find(
      (p) => p.id === restored.commanderId,
    );
    assert.ok(commander, 'Commander pilot should exist after restore');
    assert.strictEqual(
      commander.name,
      'Viper',
      'Commander name should be preserved',
    );
  });
});

// ============================================================================
// Default Settings Constants Tests
// ============================================================================

describe('Default Campaign Settings', () => {
  it('DEFAULT_CAMPAIGN_SETTINGS has valid values', () => {
    assert.ok(
      typeof DEFAULT_CAMPAIGN_SETTINGS.commanderName === 'string',
      'commanderName should be a string',
    );
    assert.ok(
      DEFAULT_CAMPAIGN_SETTINGS.commanderName.length > 0,
      'commanderName should not be empty',
    );
    assert.ok(
      typeof DEFAULT_CAMPAIGN_SETTINGS.ironmanMode === 'boolean',
      'ironmanMode should be a boolean',
    );
    assert.ok(
      isValidPlayerAutoaim(DEFAULT_CAMPAIGN_SETTINGS.autoaimDegrees),
      'autoaimDegrees should be valid',
    );
  });

  it('DEFAULT_CAMPAIGN_SETTINGS values match documentation', () => {
    assert.strictEqual(
      DEFAULT_CAMPAIGN_SETTINGS.commanderName,
      'Commander',
      'Default commander name should be "Commander"',
    );
    assert.strictEqual(
      DEFAULT_CAMPAIGN_SETTINGS.ironmanMode,
      true,
      'Default should be ironman mode',
    );
    assert.strictEqual(
      DEFAULT_CAMPAIGN_SETTINGS.autoaimDegrees,
      2.5,
      'Default autoaim should be 2.5 degrees',
    );
  });
});

// ============================================================================
// Settings Integration with Campaign State Helpers
// ============================================================================

describe('Settings Integration', () => {
  describe('settings and state helpers', () => {
    it('getCommanderShip works with custom commander name', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: 'Phoenix',
      };
      const campaign = createNewCampaign(settings);

      const commanderShip = getCommanderShip(campaign);
      assert.ok(commanderShip, 'Commander ship should exist');
      assert.strictEqual(
        commanderShip.pilot?.name,
        'Phoenix',
        'Commander ship pilot should have custom name',
      );
    });

    it('isCommanderShip correctly identifies commander', () => {
      const settings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: 'Maverick',
      };
      const campaign = createNewCampaign(settings);

      const commanderShip = getCommanderShip(campaign);
      assert.ok(commanderShip, 'Commander ship should exist');
      assert.ok(
        isCommanderShip(campaign, commanderShip),
        'isCommanderShip should return true for commander',
      );

      // Wingman should not be commander
      const wingmen = getWingmanShips(campaign);
      assert.ok(wingmen.length > 0, 'Should have wingmen');
      assert.ok(
        !isCommanderShip(campaign, wingmen[0]),
        'isCommanderShip should return false for wingman',
      );
    });

    it('isGameOver returns false for new campaign', () => {
      const campaign = createNewCampaign();
      assert.strictEqual(
        isGameOver(campaign),
        false,
        'New campaign should not be game over',
      );
    });

    it('isGameOver returns true when commander removed', () => {
      const campaign = createNewCampaign();

      // Simulate commander death by removing from ships
      const commanderShipId = getCommanderShip(campaign)?.id;
      const modifiedCampaign = {
        ...campaign,
        ships: campaign.ships.filter((s) => s.id !== commanderShipId),
      };

      assert.strictEqual(
        isGameOver(modifiedCampaign),
        true,
        'Should be game over when commander ship removed',
      );
    });

    it('settings survive isGameOver check on modified state', () => {
      const settings = {
        commanderName: 'Viper',
        ironmanMode: false,
        autoaimDegrees: 3,
      };
      const campaign = createNewCampaign(settings);

      // Remove commander
      const commanderShipId = getCommanderShip(campaign)?.id;
      const modifiedCampaign = {
        ...campaign,
        ships: campaign.ships.filter((s) => s.id !== commanderShipId),
      };

      // Settings should still be accessible
      assert.strictEqual(modifiedCampaign.settings.commanderName, 'Viper');
      assert.strictEqual(modifiedCampaign.settings.ironmanMode, false);
      assert.strictEqual(modifiedCampaign.settings.autoaimDegrees, 3);
    });
  });

  describe('ironman mode combinations', () => {
    it('ironman true with max autoaim', () => {
      const settings = {
        commanderName: 'Test',
        ironmanMode: true,
        autoaimDegrees: 5,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.ironmanMode, true);
      assert.strictEqual(campaign.settings.autoaimDegrees, 5);
    });

    it('ironman true with no autoaim', () => {
      const settings = {
        commanderName: 'Test',
        ironmanMode: true,
        autoaimDegrees: 0,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.ironmanMode, true);
      assert.strictEqual(campaign.settings.autoaimDegrees, 0);
    });

    it('ironman false with custom settings', () => {
      const settings = {
        commanderName: 'Casual Player',
        ironmanMode: false,
        autoaimDegrees: 5,
      };
      const campaign = createNewCampaign(settings);

      assert.strictEqual(campaign.settings.ironmanMode, false);
      assert.strictEqual(campaign.settings.autoaimDegrees, 5);
      assert.strictEqual(campaign.settings.commanderName, 'Casual Player');
    });
  });

  describe('multiple campaigns independence', () => {
    it('different campaigns have independent settings', () => {
      const settings1 = {
        commanderName: 'Alpha',
        ironmanMode: true,
        autoaimDegrees: 0,
      };
      const settings2 = {
        commanderName: 'Beta',
        ironmanMode: false,
        autoaimDegrees: 5,
      };

      const campaign1 = createNewCampaign(settings1);
      const campaign2 = createNewCampaign(settings2);

      // Verify independence
      assert.strictEqual(campaign1.settings.commanderName, 'Alpha');
      assert.strictEqual(campaign2.settings.commanderName, 'Beta');
      assert.strictEqual(campaign1.settings.ironmanMode, true);
      assert.strictEqual(campaign2.settings.ironmanMode, false);
      assert.strictEqual(campaign1.settings.autoaimDegrees, 0);
      assert.strictEqual(campaign2.settings.autoaimDegrees, 5);

      // Verify settings objects are different references
      assert.notStrictEqual(
        campaign1.settings,
        campaign2.settings,
        'Settings should be different objects',
      );
    });

    it('modifying one campaign does not affect another', () => {
      const campaign1 = createNewCampaign({
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: 'One',
      });
      const campaign2 = createNewCampaign({
        ...DEFAULT_CAMPAIGN_SETTINGS,
        commanderName: 'Two',
      });

      // Create modified version of campaign1
      const modified1 = {
        ...campaign1,
        credits: 9999,
      };

      // Original campaign2 should be unchanged
      assert.strictEqual(campaign2.credits, 1000);
      assert.strictEqual(modified1.credits, 9999);
    });
  });
});

// ============================================================================
// Autoaim Boundary Tests
// ============================================================================

describe('Autoaim Boundary Values', () => {
  it('creates campaigns with each valid autoaim value', () => {
    const validValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

    for (const value of validValues) {
      const campaign = createNewCampaign({
        ...DEFAULT_CAMPAIGN_SETTINGS,
        autoaimDegrees: value,
      });
      assert.strictEqual(
        campaign.settings.autoaimDegrees,
        value,
        `Campaign should have autoaim ${value}`,
      );
    }
  });

  it('minimum autoaim (0) works correctly', () => {
    const campaign = createNewCampaign({
      ...DEFAULT_CAMPAIGN_SETTINGS,
      autoaimDegrees: 0,
    });
    assert.strictEqual(campaign.settings.autoaimDegrees, 0);
    assert.ok(isValidPlayerAutoaim(campaign.settings.autoaimDegrees));
  });

  it('maximum autoaim (5) works correctly', () => {
    const campaign = createNewCampaign({
      ...DEFAULT_CAMPAIGN_SETTINGS,
      autoaimDegrees: 5,
    });
    assert.strictEqual(campaign.settings.autoaimDegrees, 5);
    assert.ok(isValidPlayerAutoaim(campaign.settings.autoaimDegrees));
  });

  it('PLAYER_AUTOAIM_OPTIONS contains exactly 11 values', () => {
    assert.strictEqual(
      PLAYER_AUTOAIM_OPTIONS.length,
      11,
      'Should have 11 autoaim options (0 to 5 in 0.5 steps)',
    );
  });

  it('PLAYER_AUTOAIM_OPTIONS are in ascending order', () => {
    for (let i = 1; i < PLAYER_AUTOAIM_OPTIONS.length; i++) {
      assert.ok(
        PLAYER_AUTOAIM_OPTIONS[i].value > PLAYER_AUTOAIM_OPTIONS[i - 1].value,
        `Option ${i} should be greater than option ${i - 1}`,
      );
    }
  });
});
