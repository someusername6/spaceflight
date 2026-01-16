/**
 * Screen Framework Tests - Rendering & Event Binding
 *
 * Tests for render lifecycle and event binding functionality.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assertContains,
  assertHandlerBound,
  assertNotContains,
  createTestScreen,
} from '../../shared/screen-test-utils.mjs';
import {
  conditionalScreen,
  counterScreen,
  hoverScreen,
  keyboardScreen,
  propsScreen,
} from './test-screens.mjs';

// =============================================================================
// Render Tests
// =============================================================================

describe('Screen Framework - Rendering', () => {
  it('renders initial state correctly', () => {
    const harness = createTestScreen(counterScreen, { count: 0 }, {});
    const html = harness.getHTML();

    assertContains(html, 'counter', 'should have counter class');
    assertContains(html, '<span class="count">0</span>', 'should show count');
    assertContains(html, 'btn-increment', 'should have increment button');
    assertContains(html, 'btn-decrement', 'should have decrement button');
  });

  it('re-renders on state change', () => {
    const harness = createTestScreen(counterScreen, { count: 5 }, {});

    harness.setState({ count: 10 });
    const html = harness.getHTML();

    assertContains(
      html,
      '<span class="count">10</span>',
      'should show updated count',
    );
  });

  it('renders with props', () => {
    const harness = createTestScreen(
      propsScreen,
      { value: 42 },
      { title: 'Test Title', action: 'submit' },
    );
    const html = harness.getHTML();

    assertContains(html, 'Test Title', 'should render title from props');
    assertContains(html, '42', 'should render value from state');
    assertContains(
      html,
      'data-action="submit"',
      'should render action attribute',
    );
  });

  it('updates on props change', () => {
    const harness = createTestScreen(
      propsScreen,
      { value: 1 },
      { title: 'Original', action: 'go' },
    );

    harness.setProps({ title: 'Updated', action: 'go' });
    const html = harness.getHTML();

    assertContains(html, 'Updated', 'should render new title');
    assertNotContains(html, 'Original', 'should not have old title');
  });

  it('conditional rendering based on state', () => {
    const harness = createTestScreen(
      conditionalScreen,
      { showDetails: false, details: 'Secret info' },
      {},
    );

    let html = harness.getHTML();
    assertContains(html, 'btn-show', 'should show Show button');
    assertNotContains(html, 'Secret info', 'should not show secret details');

    harness.setState({ showDetails: true });
    html = harness.getHTML();
    assertContains(html, 'btn-hide', 'should show Hide button');
    assertContains(html, 'Secret info', 'should show details');
  });
});

// =============================================================================
// Event Binding Tests
// =============================================================================

describe('Screen Framework - Event Binding', () => {
  it('binds delegated click handlers', () => {
    const harness = createTestScreen(counterScreen, { count: 0 }, {});

    assertHandlerBound(harness, '.btn-increment', 'click');
    assertHandlerBound(harness, '.btn-decrement', 'click');
  });

  it('rebinds handlers on re-render', () => {
    const harness = createTestScreen(
      conditionalScreen,
      { showDetails: false, details: '' },
      {},
    );

    assertHandlerBound(harness, '.btn-show', 'click');
    assert.ok(
      !harness.hasHandler('.btn-hide', 'click'),
      'should not have hide handler initially',
    );

    harness.setState({ showDetails: true });
    assertHandlerBound(harness, '.btn-hide', 'click');
    assert.ok(
      !harness.hasHandler('.btn-show', 'click'),
      'should not have show handler after toggle',
    );
  });

  it('binds root event handlers', () => {
    const harness = createTestScreen(hoverScreen, { isHovered: false }, {});
    const rootListeners = harness.getRootListeners();

    assert.strictEqual(rootListeners.length, 2, 'should have 2 root listeners');

    const events = rootListeners.map((l) => l.event);
    assert.ok(events.includes('mouseenter'), 'should have mouseenter listener');
    assert.ok(events.includes('mouseleave'), 'should have mouseleave listener');
  });

  it('binds global (document) event handlers', () => {
    const harness = createTestScreen(keyboardScreen, { lastKey: null }, {});
    const globalListeners = harness.getGlobalListeners();

    assert.strictEqual(
      globalListeners.length,
      1,
      'should have 1 global listener',
    );
    assert.strictEqual(
      globalListeners[0].event,
      'keydown',
      'should be keydown',
    );
  });

  it('binds direct (non-bubbling) event handlers via onDirect', () => {
    const directEventScreen = {
      render(_state, _props) {
        return `<div class="container"><div class="hoverable">Hover me</div></div>`;
      },
      bind(api, _props) {
        api.onDirect('.hoverable', 'mouseenter', () => {
          api.updateState({ hovered: true });
        });
        api.onDirect('.hoverable', 'mouseleave', () => {
          api.updateState({ hovered: false });
        });
      },
    };

    const harness = createTestScreen(directEventScreen, { hovered: false }, {});

    assert.ok(
      harness.hasHandler('.hoverable', 'mouseenter', 'direct'),
      'should have mouseenter direct handler',
    );
    assert.ok(
      harness.hasHandler('.hoverable', 'mouseleave', 'direct'),
      'should have mouseleave direct handler',
    );
  });

  it('clears handlers on re-render', () => {
    const harness = createTestScreen(counterScreen, { count: 0 }, {});
    const initialCount = harness.getHandlerCount();

    harness.forceRender();

    assert.strictEqual(
      harness.getHandlerCount(),
      initialCount,
      'handler count should be same after re-render',
    );
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('SCREEN FRAMEWORK TESTS - RENDERING & EVENTS');
console.log(`${'='.repeat(70)}\n`);
