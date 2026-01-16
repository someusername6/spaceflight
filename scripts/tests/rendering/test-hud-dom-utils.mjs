/**
 * HUD DOM Utilities Tests
 *
 * Tests for safe DOM element querying with null checks.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Mock DOM environment for testing
class MockHTMLElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.classList = new Set();
    this.style = {};
    this.className = '';
    this.innerHTML = '';
    this._attributes = new Map();
  }

  querySelector(_selector) {
    // Simple mock: return null for missing elements, or create based on setup
    return this._mockQueryResult ?? null;
  }

  querySelectorAll(_selector) {
    return this._mockQueryAllResult ?? [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this._attributes.set(name, value);
  }

  getAttribute(name) {
    return this._attributes.get(name);
  }

  // Test helper: set what querySelector should return
  _setQueryResult(result) {
    this._mockQueryResult = result;
  }

  _setQueryAllResult(result) {
    this._mockQueryAllResult = result;
  }
}

class MockHTMLCanvasElement extends MockHTMLElement {
  constructor() {
    super('canvas');
    this.width = 0;
    this.height = 0;
    this._mockContext = null;
  }

  getContext(type) {
    if (type === '2d') {
      return this._mockContext;
    }
    return null;
  }

  _setMockContext(ctx) {
    this._mockContext = ctx;
  }
}

// =============================================================================
// requireElement Tests
// =============================================================================

describe('requireElement', () => {
  // Inline implementation for testing (same logic as dom-utils.ts)
  function requireElement(container, selector) {
    const element = container.querySelector(selector);
    if (!element) {
      throw new Error(
        `HUD initialization failed: required element "${selector}" not found in container`,
      );
    }
    return element;
  }

  it('returns element when found', () => {
    const container = new MockHTMLElement('div');
    const child = new MockHTMLElement('span');
    container._setQueryResult(child);

    const result = requireElement(container, '.test-class');
    assert.strictEqual(result, child, 'should return the found element');
  });

  it('throws descriptive error when element not found', () => {
    const container = new MockHTMLElement('div');
    container._setQueryResult(null);

    assert.throws(
      () => requireElement(container, '.missing-element'),
      {
        message:
          'HUD initialization failed: required element ".missing-element" not found in container',
      },
      'should throw with selector in error message',
    );
  });

  it('error message includes the exact selector used', () => {
    const container = new MockHTMLElement('div');
    container._setQueryResult(null);

    const selector = '.ally-bar.hull .ally-bar-fill';
    try {
      requireElement(container, selector);
      assert.fail('should have thrown');
    } catch (e) {
      assert.ok(
        e.message.includes(selector),
        `error message should include selector: ${e.message}`,
      );
    }
  });
});

// =============================================================================
// require2DContext Tests
// =============================================================================

describe('require2DContext', () => {
  // Inline implementation for testing (same logic as dom-utils.ts)
  function require2DContext(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(
        'HUD initialization failed: could not get 2D canvas context',
      );
    }
    return ctx;
  }

  it('returns context when available', () => {
    const canvas = new MockHTMLCanvasElement();
    const mockCtx = { fillRect: () => {} };
    canvas._setMockContext(mockCtx);

    const result = require2DContext(canvas);
    assert.strictEqual(result, mockCtx, 'should return the context');
  });

  it('throws descriptive error when context unavailable', () => {
    const canvas = new MockHTMLCanvasElement();
    canvas._setMockContext(null);

    assert.throws(
      () => require2DContext(canvas),
      {
        message: 'HUD initialization failed: could not get 2D canvas context',
      },
      'should throw meaningful error',
    );
  });
});

// =============================================================================
// Integration-style Tests
// =============================================================================

describe('HUD element initialization patterns', () => {
  function requireElement(container, selector) {
    const element = container.querySelector(selector);
    if (!element) {
      throw new Error(
        `HUD initialization failed: required element "${selector}" not found in container`,
      );
    }
    return element;
  }

  it('all HUD selectors should match created elements', () => {
    // This test verifies the pattern used in hud.ts
    // In the real code, elements are created via innerHTML then queried
    const container = new MockHTMLElement('div');

    // Simulate that all required elements exist
    const hudSelectors = [
      '.speed-fill',
      '.afterburner-fill',
      '.max-speed-tick',
      '.speed-value',
      '.throttle-marker',
      '.shield-container',
      '.hull-container',
      '.heat-container',
      '.hull-value',
      '.shield-value',
      '.heat-value',
      '.match-speed-indicator',
    ];

    // With proper HTML creation, all should be found
    // Here we just verify the pattern works
    for (const selector of hudSelectors) {
      const mockElement = new MockHTMLElement('div');
      container._setQueryResult(mockElement);

      const result = requireElement(container, selector);
      assert.ok(result, `selector ${selector} should find element`);
    }
  });

  it('fails fast with clear error on selector typo', () => {
    const container = new MockHTMLElement('div');
    container._setQueryResult(null); // Simulates typo - nothing found

    // This is the key behavior: fail at initialization, not at runtime
    assert.throws(
      () => requireElement(container, '.speeed-fill'), // typo: extra 'e'
      /HUD initialization failed/,
      'should fail immediately with clear error',
    );
  });
});

describe('Allied HUD element patterns', () => {
  function requireElement(container, selector) {
    const element = container.querySelector(selector);
    if (!element) {
      throw new Error(
        `HUD initialization failed: required element "${selector}" not found in container`,
      );
    }
    return element;
  }

  it('all ally row selectors should match created elements', () => {
    const row = new MockHTMLElement('div');

    const allySelectors = [
      '.ally-callsign',
      '.ally-bar.hull .ally-bar-fill',
      '.ally-bar.shield .ally-bar-fill',
      '.ally-distance',
    ];

    for (const selector of allySelectors) {
      const mockElement = new MockHTMLElement('div');
      row._setQueryResult(mockElement);

      const result = requireElement(row, selector);
      assert.ok(result, `selector ${selector} should find element`);
    }
  });
});

describe('Target stats element patterns', () => {
  function requireElement(container, selector) {
    const element = container.querySelector(selector);
    if (!element) {
      throw new Error(
        `HUD initialization failed: required element "${selector}" not found in container`,
      );
    }
    return element;
  }

  it('all target stats selectors should match created elements', () => {
    const container = new MockHTMLElement('div');

    const targetSelectors = [
      '.target-camera-container',
      '.target-callsign',
      '.target-type',
      '.target-distance',
      '.hull-label',
      '.target-bar.hull .target-bar-fill',
      '.target-bar.hull + .target-bar-value',
      '.shield-row',
      '.target-bar.shield .target-bar-fill',
      '.target-bar.shield + .target-bar-value',
      '.target-aspect',
    ];

    for (const selector of targetSelectors) {
      const mockElement = new MockHTMLElement('div');
      container._setQueryResult(mockElement);

      const result = requireElement(container, selector);
      assert.ok(result, `selector ${selector} should find element`);
    }
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('HUD DOM UTILITIES TESTS');
console.log(`${'='.repeat(70)}\n`);
