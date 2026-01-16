/**
 * Screen Framework Tests - State & Props
 *
 * Tests for state management, props callbacks, and edge cases.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assertContains,
  createMockElement,
  createTestScreen,
} from '../../shared/screen-test-utils.mjs';
import {
  conditionalScreen,
  counterScreen,
  propsScreen,
} from './test-screens.mjs';

// =============================================================================
// State Management Tests
// =============================================================================

describe('Screen Framework - State Management', () => {
  it('getState returns current state', () => {
    const harness = createTestScreen(counterScreen, { count: 42 }, {});
    assert.strictEqual(harness.getState().count, 42);
  });

  it('setState merges partial state', () => {
    const harness = createTestScreen(
      conditionalScreen,
      { showDetails: false, details: 'original' },
      {},
    );

    harness.setState({ showDetails: true });
    const state = harness.getState();

    assert.strictEqual(state.showDetails, true, 'should update changed field');
    assert.strictEqual(
      state.details,
      'original',
      'should preserve unchanged field',
    );
  });

  it('handler can update state', () => {
    const harness = createTestScreen(counterScreen, { count: 0 }, {});

    harness.triggerHandler('.btn-increment', 'click');

    assert.strictEqual(
      harness.getState().count,
      1,
      'count should be incremented',
    );
  });

  it('multiple state updates work correctly', () => {
    const harness = createTestScreen(counterScreen, { count: 0 }, {});

    harness.triggerHandler('.btn-increment', 'click');
    harness.triggerHandler('.btn-increment', 'click');
    harness.triggerHandler('.btn-increment', 'click');
    harness.triggerHandler('.btn-decrement', 'click');

    assert.strictEqual(harness.getState().count, 2, 'count should be 2');
  });
});

// =============================================================================
// Props Callback Tests
// =============================================================================

describe('Screen Framework - Props and Callbacks', () => {
  it('handler can call prop callbacks', () => {
    let receivedValue = null;
    const harness = createTestScreen(
      propsScreen,
      { value: 'test-value' },
      {
        title: 'Test',
        action: 'submit',
        onAction: (val) => {
          receivedValue = val;
        },
      },
    );

    harness.triggerHandler('.btn-action', 'click');

    assert.strictEqual(
      receivedValue,
      'test-value',
      'callback should receive value',
    );
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Screen Framework - Edge Cases', () => {
  it('handles empty state', () => {
    const emptyScreen = {
      render(_state, _props) {
        return '<div class="empty">Empty</div>';
      },
      bind() {},
    };

    const harness = createTestScreen(emptyScreen, {}, {});
    assertContains(harness.getHTML(), 'Empty');
  });

  it('handles complex nested state', () => {
    const nestedScreen = {
      render(state, _props) {
        return `<div>${state.user?.name ?? 'Guest'}: ${state.items?.length ?? 0} items</div>`;
      },
      bind() {},
    };

    const harness = createTestScreen(
      nestedScreen,
      {
        user: { name: 'Alice', email: 'alice@test.com' },
        items: [1, 2, 3],
      },
      {},
    );

    assertContains(harness.getHTML(), 'Alice');
    assertContains(harness.getHTML(), '3 items');
  });

  it('handler receives element with dataset', () => {
    let receivedElement = null;
    const datasetScreen = {
      render(_state, _props) {
        return '<button class="btn" data-id="123" data-action="test">Click</button>';
      },
      bind(api, _props) {
        api.on('.btn', 'click', (_e, el) => {
          receivedElement = el;
        });
      },
    };

    const harness = createTestScreen(datasetScreen, {}, {});
    const mockBtn = createMockElement('button', {
      class: 'btn',
      'data-id': '123',
      'data-action': 'test',
    });

    harness.triggerHandler('.btn', 'click', mockBtn);

    assert.ok(receivedElement, 'should receive element');
    assert.strictEqual(
      receivedElement.dataset.id,
      '123',
      'should have data-id',
    );
    assert.strictEqual(
      receivedElement.dataset.action,
      'test',
      'should have data-action',
    );
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('SCREEN FRAMEWORK TESTS - STATE & PROPS');
console.log(`${'='.repeat(70)}\n`);
