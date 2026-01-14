/**
 * Campaign Settings Integration Tests
 *
 * Tests that:
 * 1. Settings integrate correctly with campaign state helpers
 * 2. Ironman mode combinations work
 * 3. Multiple campaigns have independent settings
 * 4. Autoaim boundary values are valid
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
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
