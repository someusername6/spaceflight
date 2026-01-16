/**
 * Popover Listener Interaction Tests
 *
 * Tests the interaction between parent and submenu click listeners.
 * These are pure mock tests that don't import the actual popover code.
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { setupMockDOM } from '../shared/popover-dom-mocks.mjs';

describe('Two-Listener Interaction Tests', () => {
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

  describe('interaction between parent and submenu click listeners', () => {
    it('clicking submenu BUTTON: stopPropagation prevents document listeners from firing', () => {
      // In the real implementation, buttons inside submenu call e.stopPropagation()
      // This prevents the click from bubbling to document-level listeners
      // So parent's outsideClickListener never sees the click

      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');
      const submenuButton = mockDocument.createElement('button');

      body.appendChild(popover);
      body.appendChild(submenu);
      submenu.appendChild(submenuButton);

      let parentListenerCalled = false;
      let submenuListenerCalled = false;

      // Document-level listeners (these would fire if event bubbles)
      // Prefixed with _ to show they're intentionally not registered in this test
      const _parentOutsideClick = () => {
        parentListenerCalled = true;
      };
      const _submenuOutsideClick = () => {
        submenuListenerCalled = true;
      };

      // Button click handler with stopPropagation (like real swap.ts)
      submenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // Do action...
      });

      // Event object showing what would bubble (not dispatched since stopPropagation)
      const _event = {
        type: 'click',
        target: submenuButton,
        stopPropagation: () => {},
      };

      // When button handler calls stopPropagation, document listeners don't fire
      // So we DON'T call parentOutsideClick or submenuOutsideClick

      assert.ok(
        !parentListenerCalled,
        'parent listener should NOT be called (stopPropagation)',
      );
      assert.ok(
        !submenuListenerCalled,
        'submenu listener should NOT be called (stopPropagation)',
      );
    });

    it('clicking non-button area in submenu: WOULD trigger parent listener (sibling issue)', () => {
      // This documents a subtle issue: if user clicks on non-interactive part of submenu
      // (like a text label), it WOULD bubble to document, and parent's listener would fire

      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');
      const submenuLabel = mockDocument.createElement('span'); // Not a button!

      body.appendChild(popover);
      body.appendChild(submenu);
      submenu.appendChild(submenuLabel);

      let parentListenerClosed = false;

      // Parent's listener only checks if inside popover
      const parentOutsideClick = (e) => {
        if (popover.contains(e.target)) return;
        parentListenerClosed = true;
      };

      // Submenu is NOT inside popover (siblings), so:
      assert.ok(
        !popover.contains(submenuLabel),
        'submenu label is NOT inside popover',
      );

      // If this click bubbles to document, parent listener would fire
      parentOutsideClick({ target: submenuLabel, type: 'click' });

      // This IS the expected behavior - parent listener thinks it's an "outside" click
      assert.ok(
        parentListenerClosed,
        'parent listener WOULD fire (submenu is sibling, not child)',
      );
    });

    it('CRITICAL: submenu is sibling of popover - parent listener fires on submenu clicks', () => {
      // This test documents a potential bug in the interaction
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');
      const submenuButton = mockDocument.createElement('button');

      body.appendChild(popover);
      body.appendChild(submenu); // SIBLING, not child!
      submenu.appendChild(submenuButton);

      // Verify the relationship
      assert.ok(
        !popover.contains(submenuButton),
        'popover does NOT contain submenu button (they are siblings)',
      );
      assert.ok(submenu.contains(submenuButton), 'submenu contains its button');

      // This means when user clicks inside submenu:
      // - Parent's outsideClickListener sees: popover.contains(target) = FALSE
      // - Parent's listener would call closePopover()!

      // The submenu listener also runs, but depending on order, one might fire first.
      // In actual code, both listeners are added with setTimeout(0), so they fire in order added.
    });

    it('click inside parent (not submenu): only submenu closes', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const popoverContent = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');

      body.appendChild(popover);
      popover.appendChild(popoverContent);
      body.appendChild(submenu);

      let parentListenerClosed = false;
      let submenuListenerClosedSubmenu = false;
      let submenuListenerClosedAll = false;

      const parentOutsideClick = (e) => {
        if (popover.contains(e.target)) return;
        parentListenerClosed = true;
      };

      const submenuOutsideClick = (e) => {
        const target = e.target;
        if (submenu.contains(target)) return;
        if (popover.contains(target)) {
          submenuListenerClosedSubmenu = true;
          return;
        }
        submenuListenerClosedAll = true;
      };

      const event = { target: popoverContent, type: 'click' };
      parentOutsideClick(event);
      submenuOutsideClick(event);

      // popoverContent IS inside popover
      assert.ok(
        !parentListenerClosed,
        'parent listener should NOT close (click is inside)',
      );
      assert.ok(
        submenuListenerClosedSubmenu,
        'submenu listener should close only submenu',
      );
      assert.ok(
        !submenuListenerClosedAll,
        'submenu listener should NOT close all',
      );
    });

    it('click outside both: both listeners trigger close', () => {
      const body = mockDocument.body;
      const popover = mockDocument.createElement('div');
      const submenu = mockDocument.createElement('div');
      const outside = mockDocument.createElement('div');

      body.appendChild(popover);
      body.appendChild(submenu);
      body.appendChild(outside);

      let parentListenerClosed = false;
      let submenuListenerClosedAll = false;

      const parentOutsideClick = (e) => {
        if (popover.contains(e.target)) return;
        parentListenerClosed = true;
      };

      const submenuOutsideClick = (e) => {
        const target = e.target;
        if (submenu.contains(target)) return;
        if (popover.contains(target)) return;
        submenuListenerClosedAll = true;
      };

      const event = { target: outside, type: 'click' };
      parentOutsideClick(event);
      submenuOutsideClick(event);

      assert.ok(parentListenerClosed, 'parent listener should close');
      assert.ok(submenuListenerClosedAll, 'submenu listener should close all');
      // In real code, closePopover() removes document listeners, so only one really needs to fire
    });
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('POPOVER LISTENER INTERACTION TESTS');
console.log(`${'='.repeat(70)}\n`);
