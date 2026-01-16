/**
 * Popover Contains & Click Logic Tests
 *
 * Tests for DOM contains() behavior and basic click handler logic.
 * These are pure mock tests that don't import the actual popover code.
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { DOMElement, setupMockDOM } from '../shared/popover-dom-mocks.mjs';

describe('DOM Event Flow Tests', () => {
  let mockDocument;
  let cleanup;

  beforeEach(() => {
    const setup = setupMockDOM();
    mockDocument = setup.mockDocument;
    cleanup = setup.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // contains() Behavior Tests - Critical for click handling
  // ==========================================================================

  describe('contains() behavior (critical for click handling)', () => {
    it('parent.contains(childElement) returns true', () => {
      const parent = new DOMElement('div');
      const child = new DOMElement('button');
      parent.appendChild(child);

      assert.ok(parent.contains(child), 'parent should contain child');
    });

    it('parent.contains(outsideElement) returns false', () => {
      const parent = new DOMElement('div');
      const outside = new DOMElement('span');

      assert.ok(
        !parent.contains(outside),
        'parent should not contain outside element',
      );
    });

    it('parent.contains(deeplyNestedChild) returns true', () => {
      const parent = new DOMElement('div');
      const inner = new DOMElement('div');
      const deepChild = new DOMElement('button');
      parent.appendChild(inner);
      inner.appendChild(deepChild);

      assert.ok(
        parent.contains(deepChild),
        'parent should contain deeply nested child',
      );
    });

    it('sibling elements do not contain each other', () => {
      const body = new DOMElement('body');
      const popover = new DOMElement('div');
      const submenu = new DOMElement('div');
      body.appendChild(popover);
      body.appendChild(submenu);

      assert.ok(
        !popover.contains(submenu),
        'popover should not contain submenu sibling',
      );
      assert.ok(
        !submenu.contains(popover),
        'submenu should not contain popover sibling',
      );
    });
  });

  // ==========================================================================
  // 3-Way Click Handler Logic Tests
  // ==========================================================================

  describe('3-way click handler logic (submenu behavior)', () => {
    it('click inside submenu: both stay open', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');
      const submenuButton = mockDocument.createElement('button');

      body.appendChild(popover);
      body.appendChild(submenu);
      submenu.appendChild(submenuButton);

      let submenuClosed = false;
      let popoverClosed = false;

      // Simulate the 3-way click handler from swap.ts
      const closeOnOutsideClick = (e) => {
        const target = e.target;
        if (submenu.contains(target)) {
          // Case 1: click inside submenu - do nothing
          return;
        }
        if (popover.contains(target)) {
          // Case 2: click inside parent - close submenu only
          submenuClosed = true;
          return;
        }
        // Case 3: click outside both - close everything
        popoverClosed = true;
        submenuClosed = true;
      };

      // Click inside submenu
      closeOnOutsideClick({ target: submenuButton, type: 'click' });

      assert.ok(!submenuClosed, 'submenu should NOT be closed');
      assert.ok(!popoverClosed, 'popover should NOT be closed');
    });

    it('click inside parent (not submenu): submenu closes, parent stays', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const popoverContent = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');

      body.appendChild(popover);
      popover.appendChild(popoverContent);
      body.appendChild(submenu);

      let submenuClosed = false;
      let popoverClosed = false;

      const closeOnOutsideClick = (e) => {
        const target = e.target;
        if (submenu.contains(target)) return;
        if (popover.contains(target)) {
          submenuClosed = true;
          return;
        }
        popoverClosed = true;
        submenuClosed = true;
      };

      // Click inside parent popover
      closeOnOutsideClick({ target: popoverContent, type: 'click' });

      assert.ok(submenuClosed, 'submenu SHOULD be closed');
      assert.ok(!popoverClosed, 'popover should NOT be closed');
    });

    it('click outside both: everything closes', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');
      const outsideElement = mockDocument.createElement('div');

      body.appendChild(popover);
      body.appendChild(submenu);
      body.appendChild(outsideElement);

      let submenuClosed = false;
      let popoverClosed = false;

      const closeOnOutsideClick = (e) => {
        const target = e.target;
        if (submenu.contains(target)) return;
        if (popover.contains(target)) {
          submenuClosed = true;
          return;
        }
        popoverClosed = true;
        submenuClosed = true;
      };

      // Click outside both
      closeOnOutsideClick({ target: outsideElement, type: 'click' });

      assert.ok(submenuClosed, 'submenu SHOULD be closed');
      assert.ok(popoverClosed, 'popover SHOULD be closed');
    });
  });

  // ==========================================================================
  // Parent Outside Click Listener Tests
  // ==========================================================================

  describe('parent outside click listener (state.ts)', () => {
    it('click inside parent: listener does NOT close', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const popoverContent = mockDocument.createElement('div');

      body.appendChild(popover);
      popover.appendChild(popoverContent);

      let closed = false;

      // Simulate the parent's outsideClickListener from state.ts
      const outsideClickListener = (e) => {
        if (popover.contains(e.target)) {
          // Click is inside - do nothing
          return;
        }
        closed = true;
      };

      outsideClickListener({ target: popoverContent, type: 'click' });

      assert.ok(!closed, 'should NOT close when click is inside');
    });

    it('click outside parent: listener closes', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const outside = mockDocument.createElement('div');

      body.appendChild(popover);
      body.appendChild(outside);

      let closed = false;

      const outsideClickListener = (e) => {
        if (popover.contains(e.target)) return;
        closed = true;
      };

      outsideClickListener({ target: outside, type: 'click' });

      assert.ok(closed, 'SHOULD close when click is outside');
    });
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('POPOVER CONTAINS & CLICK LOGIC TESTS');
console.log(`${'='.repeat(70)}\n`);
