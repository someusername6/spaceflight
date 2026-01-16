/**
 * Ship Picker Tests
 *
 * Tests for the ship picker popover component.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assertContains,
  assertNotContains,
  createMockElement,
  createTestScreen,
} from '../../shared/screen-test-utils.mjs';
import {
  createMockCampaignState,
  ShipPickerScreenMock,
} from './ship-picker-mock.mjs';

// =============================================================================
// Render Tests
// =============================================================================

describe('Ship Picker - Rendering', () => {
  it('renders available ships section when empty ships exist', () => {
    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      { onStateUpdate: () => {}, onClose: () => {} },
    );

    const html = harness.getHTML();
    assertContains(
      html,
      'Available Ships',
      'should show available ships section',
    );
    assertContains(
      html,
      'data-action="swap-to-ship"',
      'should have swap buttons',
    );
    assertContains(
      html,
      'data-ship-id="ship2"',
      'should show empty ship (ship2)',
    );
  });

  it('renders stored ships section with grouping', () => {
    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      { onStateUpdate: () => {}, onClose: () => {} },
    );

    const html = harness.getHTML();
    assertContains(html, 'Stored Ships', 'should show stored ships section');
    assertContains(html, 'Patrol', 'should show Patrol ship type');
    assertContains(html, '×2', 'should show count badge for grouped ships');
    assertContains(
      html,
      'data-action="swap-to-stored-ship"',
      'should have stored ship buttons',
    );
  });

  it('renders unassign button', () => {
    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      { onStateUpdate: () => {}, onClose: () => {} },
    );

    const html = harness.getHTML();
    assertContains(html, 'Unassign Pilot', 'should show unassign button');
    assertContains(
      html,
      'data-action="unassign"',
      'should have unassign action',
    );
  });

  it('renders empty message when no ships available', () => {
    const campaignState = createMockCampaignState({
      ships: [{ id: 'ship1', shipClass: 'Fighter', pilot: 'pilot1' }],
      storedShips: [],
    });
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      { onStateUpdate: () => {}, onClose: () => {} },
    );

    const html = harness.getHTML();
    assertContains(
      html,
      'No other ships available',
      'should show empty message',
    );
  });

  it('excludes current ship from available ships', () => {
    const campaignState = createMockCampaignState({
      ships: [
        { id: 'ship1', shipClass: 'Fighter', pilot: null },
        { id: 'ship2', shipClass: 'Scout', pilot: null },
      ],
      storedShips: [],
    });
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      { onStateUpdate: () => {}, onClose: () => {} },
    );

    const html = harness.getHTML();
    assertNotContains(
      html,
      'data-ship-id="ship1"',
      'should not show current ship',
    );
    assertContains(
      html,
      'data-ship-id="ship2"',
      'should show other empty ship',
    );
  });
});

// =============================================================================
// Event Binding Tests
// =============================================================================

describe('Ship Picker - Event Binding', () => {
  it('binds click handler for action buttons', () => {
    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      { onStateUpdate: () => {}, onClose: () => {} },
    );

    assert.ok(
      harness.hasHandler('[data-action]', 'click'),
      'should have action button click handler',
    );
  });
});

// =============================================================================
// Action Handler Tests
// =============================================================================

describe('Ship Picker - Actions', () => {
  it('calls onStateUpdate when swapping to ship', () => {
    let updateResult = null;
    let closeCalled = false;

    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      {
        onStateUpdate: (result) => {
          updateResult = result;
        },
        onClose: () => {
          closeCalled = true;
        },
      },
    );

    const mockBtn = createMockElement('button', {
      'data-action': 'swap-to-ship',
      'data-ship-id': 'ship2',
    });

    harness.triggerHandler('[data-action]', 'click', mockBtn);

    assert.deepStrictEqual(
      updateResult,
      { swappedTo: 'ship2' },
      'should call with ship id',
    );
    assert.ok(closeCalled, 'should call onClose');
  });

  it('calls onStateUpdate when swapping to stored ship', () => {
    let updateResult = null;
    let closeCalled = false;

    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      {
        onStateUpdate: (result) => {
          updateResult = result;
        },
        onClose: () => {
          closeCalled = true;
        },
      },
    );

    const mockBtn = createMockElement('button', {
      'data-action': 'swap-to-stored-ship',
      'data-stored-ship-index': '0',
    });

    harness.triggerHandler('[data-action]', 'click', mockBtn);

    assert.deepStrictEqual(
      updateResult,
      { swappedToStoredIndex: 0 },
      'should call with index',
    );
    assert.ok(closeCalled, 'should call onClose');
  });

  it('calls onStateUpdate when unassigning pilot', () => {
    let updateResult = null;
    let closeCalled = false;

    const campaignState = createMockCampaignState();
    const harness = createTestScreen(
      ShipPickerScreenMock,
      { currentShipId: 'ship1', pilotId: 'pilot1', campaignState },
      {
        onStateUpdate: (result) => {
          updateResult = result;
        },
        onClose: () => {
          closeCalled = true;
        },
      },
    );

    const mockBtn = createMockElement('button', {
      'data-action': 'unassign',
    });

    harness.triggerHandler('[data-action]', 'click', mockBtn);

    assert.deepStrictEqual(
      updateResult,
      { unassigned: true },
      'should call with unassigned flag',
    );
    assert.ok(closeCalled, 'should call onClose');
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('SHIP PICKER TESTS');
console.log(`${'='.repeat(70)}\n`);
