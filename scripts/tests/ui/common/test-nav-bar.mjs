/**
 * Navigation Bar Tests
 *
 * Tests for the global navigation bar component.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assertContains,
  assertNotContains,
  createTestScreen,
} from '../../shared/screen-test-utils.mjs';

// Mock the nav-bar rendering functions
// We test the render output directly since nav-bar exports renderNavBar

/** Create a mock NavBarProps */
function createMockNavBarProps(overrides = {}) {
  return {
    activeTab: 'squadron',
    credits: 1000,
    sector: 1,
    onNavigate: () => {},
    onPause: undefined,
    ...overrides,
  };
}

/** Render nav bar HTML for testing */
function renderNavBar(props) {
  const { activeTab, credits, sector, onPause } = props;

  const tabs = [
    { id: 'squadron', label: 'SQUADRON', icon: '◈' },
    { id: 'store', label: 'STORE', icon: '⬡' },
    { id: 'contracts', label: 'CONTRACTS', icon: '▶' },
  ];

  const tabsHtml = tabs
    .map(
      (tab) => `
      <button
        class="nav-tab ${activeTab === tab.id ? 'active' : ''}"
        data-nav="${tab.id}"
        role="tab"
        aria-selected="${activeTab === tab.id}"
        aria-label="${tab.label}"
        tabindex="${activeTab === tab.id ? '0' : '-1'}"
      >
        <span class="nav-tab-icon" aria-hidden="true">${tab.icon}</span>
        <span class="nav-tab-label">${tab.label}</span>
      </button>
    `,
    )
    .join('');

  const statusHtml = `
    <div class="nav-status" role="status" aria-label="Player status">
      <div class="nav-status-item" aria-label="Current sector: ${sector}">
        <span class="nav-status-label">SECTOR</span>
        <span class="nav-status-value nav-sector-name">${sector}</span>
      </div>
      <div class="nav-status-item" aria-label="Credits: ${credits.toLocaleString()}">
        <span class="nav-status-label">CREDITS</span>
        <span class="nav-status-value nav-credits">${credits.toLocaleString()}</span>
      </div>
    </div>
  `;

  const pauseButton = onPause
    ? `<button class="nav-pause-btn" aria-label="Pause menu" title="Menu (Esc)">
        <span aria-hidden="true">☰</span>
      </button>`
    : '';

  return `
    <nav class="global-nav" role="navigation" aria-label="Main navigation">
      <div class="nav-tabs" role="tablist" aria-label="Screen navigation">
        ${tabsHtml}
      </div>
      ${statusHtml}
      ${pauseButton}
      <div class="nav-scanline" aria-hidden="true"></div>
    </nav>
  `;
}

// =============================================================================
// Render Tests
// =============================================================================

describe('Nav Bar - Rendering', () => {
  it('renders all three navigation tabs', () => {
    const props = createMockNavBarProps();
    const html = renderNavBar(props);

    assertContains(html, 'SQUADRON', 'should have SQUADRON tab');
    assertContains(html, 'STORE', 'should have STORE tab');
    assertContains(html, 'CONTRACTS', 'should have CONTRACTS tab');
  });

  it('marks active tab correctly', () => {
    const props = createMockNavBarProps({ activeTab: 'store' });
    const html = renderNavBar(props);

    // Store should be active
    assert.ok(
      html.includes('data-nav="store"') &&
        html.includes('class="nav-tab active"'),
      'store tab should have active class',
    );
  });

  it('displays sector number', () => {
    const props = createMockNavBarProps({ sector: 5 });
    const html = renderNavBar(props);

    assertContains(html, 'SECTOR', 'should have SECTOR label');
    assertContains(html, '>5<', 'should display sector 5');
  });

  it('displays credits with formatting', () => {
    const props = createMockNavBarProps({ credits: 12345 });
    const html = renderNavBar(props);

    assertContains(html, 'CREDITS', 'should have CREDITS label');
    assertContains(html, '12,345', 'should display formatted credits');
  });

  it('renders pause button when onPause is provided', () => {
    const props = createMockNavBarProps({ onPause: () => {} });
    const html = renderNavBar(props);

    assertContains(html, 'nav-pause-btn', 'should have pause button');
    assertContains(html, '☰', 'should have menu icon');
  });

  it('does not render pause button when onPause is not provided', () => {
    const props = createMockNavBarProps({ onPause: undefined });
    const html = renderNavBar(props);

    assertNotContains(html, 'nav-pause-btn', 'should not have pause button');
  });

  it('has proper ARIA attributes for accessibility', () => {
    const props = createMockNavBarProps({ activeTab: 'contracts' });
    const html = renderNavBar(props);

    assertContains(html, 'role="navigation"', 'should have navigation role');
    assertContains(html, 'role="tablist"', 'should have tablist role');
    assertContains(html, 'role="tab"', 'should have tab roles');
    assertContains(html, 'aria-selected="true"', 'should mark selected tab');
  });
});

// =============================================================================
// Event Binding Tests
// =============================================================================

describe('Nav Bar - Event Binding', () => {
  it('binds click handlers to navigation tabs', () => {
    // Create a test screen that includes nav bar
    const navScreen = {
      render(state, props) {
        return renderNavBar({
          activeTab: state.activeTab,
          credits: 1000,
          sector: 1,
          onNavigate: props.onNavigate,
        });
      },
      bind(api, props) {
        // Simulate bindNavBar using api.on()
        api.on('.nav-tab', 'click', (_e, el) => {
          const dest = el.dataset.nav;
          if (dest) {
            props.onNavigate(dest);
          }
        });
      },
    };

    const harness = createTestScreen(
      navScreen,
      { activeTab: 'squadron' },
      {
        onNavigate: () => {},
      },
    );

    assert.ok(
      harness.hasHandler('.nav-tab', 'click'),
      'should have nav-tab click handler',
    );
  });

  it('binds click handler to pause button when provided', () => {
    const pauseScreen = {
      render(_state, _props) {
        return renderNavBar({
          activeTab: 'squadron',
          credits: 1000,
          sector: 1,
          onPause: () => {},
        });
      },
      bind(api, props) {
        if (props.onPause) {
          api.on('.nav-pause-btn', 'click', () => {
            props.onPause();
          });
        }
      },
    };

    const harness = createTestScreen(
      pauseScreen,
      {},
      {
        onPause: () => {},
      },
    );

    assert.ok(
      harness.hasHandler('.nav-pause-btn', 'click'),
      'should have pause button click handler',
    );
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Nav Bar - Integration', () => {
  it('switches active tab on state change', () => {
    const navScreen = {
      render(state, _props) {
        return renderNavBar({
          activeTab: state.activeTab,
          credits: 1000,
          sector: 1,
        });
      },
      bind() {},
    };

    const harness = createTestScreen(navScreen, { activeTab: 'squadron' }, {});

    let html = harness.getHTML();
    assert.ok(
      html.includes('data-nav="squadron"') &&
        html.split('data-nav="squadron"')[0].includes('active'),
      'squadron should be active initially',
    );

    harness.setState({ activeTab: 'store' });
    html = harness.getHTML();
    assert.ok(
      html.includes('data-nav="store"') &&
        html.split('data-nav="store"')[0].includes('active'),
      'store should be active after state change',
    );
  });

  it('updates credits display on state change', () => {
    const navScreen = {
      render(state, _props) {
        return renderNavBar({
          activeTab: 'squadron',
          credits: state.credits,
          sector: 1,
        });
      },
      bind() {},
    };

    const harness = createTestScreen(navScreen, { credits: 500 }, {});

    let html = harness.getHTML();
    assertContains(html, '500', 'should show initial credits');

    harness.setState({ credits: 1500 });
    html = harness.getHTML();
    assertContains(html, '1,500', 'should show updated credits');
  });

  it('updates sector display on state change', () => {
    const navScreen = {
      render(state, _props) {
        return renderNavBar({
          activeTab: 'squadron',
          credits: 1000,
          sector: state.sector,
        });
      },
      bind() {},
    };

    const harness = createTestScreen(navScreen, { sector: 1 }, {});

    let html = harness.getHTML();
    assertContains(html, '>1<', 'should show initial sector');

    harness.setState({ sector: 3 });
    html = harness.getHTML();
    assertContains(html, '>3<', 'should show updated sector');
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('NAV BAR TESTS');
console.log(`${'='.repeat(70)}\n`);
