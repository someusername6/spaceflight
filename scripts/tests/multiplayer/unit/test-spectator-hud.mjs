/**
 * Spectator HUD Unit Tests
 *
 * Tests for spectator HUD styles (no DOM manipulation needed).
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getSpectatorHUDStyles,
  SPECTATOR_HUD_STYLE_ID,
} from '../../../../src/rendering/hud/spectator-hud.ts';

// =============================================================================
// Tests: Styles
// =============================================================================

describe('Spectator HUD - Styles', () => {
  it('getSpectatorHUDStyles returns CSS string', () => {
    const styles = getSpectatorHUDStyles();

    assert.ok(typeof styles === 'string');
    assert.ok(styles.length > 0);
  });

  it('includes spectator-hud class', () => {
    const styles = getSpectatorHUDStyles();
    assert.ok(styles.includes('.spectator-hud'));
  });

  it('includes spectator-label class', () => {
    const styles = getSpectatorHUDStyles();
    assert.ok(styles.includes('.spectator-label'));
  });

  it('includes spectator-callsign class', () => {
    const styles = getSpectatorHUDStyles();
    assert.ok(styles.includes('.spectator-callsign'));
  });

  it('includes spectator-mode class', () => {
    const styles = getSpectatorHUDStyles();
    assert.ok(styles.includes('.spectator-mode'));
  });

  it('includes spectator-hint class', () => {
    const styles = getSpectatorHUDStyles();
    assert.ok(styles.includes('.spectator-hint'));
  });

  it('includes all-lost styling', () => {
    const styles = getSpectatorHUDStyles();
    assert.ok(styles.includes('.spectator-hud.all-lost'));
  });

  it('has correct style ID constant', () => {
    assert.strictEqual(SPECTATOR_HUD_STYLE_ID, 'spectator-hud-styles');
  });
});
