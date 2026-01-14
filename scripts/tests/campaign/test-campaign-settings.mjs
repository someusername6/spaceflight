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
import { createNewCampaign } from '../../../src/campaign/state.ts';
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
      false,
      'Default should be standard mode (not ironman)',
    );
    assert.strictEqual(
      DEFAULT_CAMPAIGN_SETTINGS.autoaimDegrees,
      2.5,
      'Default autoaim should be 2.5 degrees',
    );
  });
});

// Settings Integration and Autoaim Boundary tests moved to test-settings-integration.mjs
