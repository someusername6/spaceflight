/**
 * Screen Framework Test Utilities
 *
 * Provides testing infrastructure for the Screen framework.
 * Used for testing UI screens without a browser environment.
 */

import { MockDocument, MockElement } from './mock-dom.mjs';

// Re-export for convenience
export { MockDocument, MockElement };

/**
 * Create a test harness for a screen component.
 *
 * @param {Object} screen - The screen component (with render and bind methods)
 * @param {Object} initialState - Initial state for the screen
 * @param {Object} initialProps - Props for the screen
 * @returns {Object} Test harness with methods to interact with the screen
 */
export function createTestScreen(screen, initialState, initialProps) {
  const root = new MockElement('div');
  const mockDocument = new MockDocument();

  let state = { ...initialState };
  let props = { ...initialProps };
  const boundHandlers = new Map();
  let rootListeners = [];
  let globalListeners = [];

  const createAPI = () => ({
    on(selector, event, handler) {
      const key = `${selector}:${event}`;
      boundHandlers.set(key, handler);
    },

    onDirect(selector, event, handler) {
      const key = `${selector}:${event}:direct`;
      boundHandlers.set(key, handler);
    },

    onRoot(event, handler) {
      root.addEventListener(event, handler);
      rootListeners.push({ event, handler });
    },

    onGlobal(event, handler, capture = false) {
      mockDocument.addEventListener(event, handler, capture);
      globalListeners.push({ event, handler, capture });
    },

    setState(partial) {
      state = { ...state, ...partial };
      render();
    },

    updateState(partial) {
      state = { ...state, ...partial };
    },

    getState() {
      return state;
    },

    getRoot() {
      return root;
    },
  });

  const render = () => {
    boundHandlers.clear();
    rootListeners.forEach(({ event, handler }) => {
      root.removeEventListener(event, handler);
    });
    rootListeners = [];
    globalListeners.forEach(({ event, handler }) => {
      mockDocument.removeEventListener(event, handler);
    });
    globalListeners = [];

    root.innerHTML = screen.render(state, props);
    screen.bind(createAPI(), props);
  };

  render();

  return {
    getState: () => state,
    getHTML: () => root.innerHTML,
    getRoot: () => root,
    getDocument: () => mockDocument,

    setState(partial) {
      state = { ...state, ...partial };
      render();
    },

    setProps(newProps) {
      props = { ...props, ...newProps };
      render();
    },

    hasHandler(selector, event, isDirect) {
      const key =
        isDirect === 'direct'
          ? `${selector}:${event}:direct`
          : `${selector}:${event}`;
      return boundHandlers.has(key);
    },

    getBoundHandlers: () => new Map(boundHandlers),
    getHandlerCount: () => boundHandlers.size,

    triggerHandler(selector, event, mockElement = null) {
      const key = `${selector}:${event}`;
      const handler = boundHandlers.get(key);
      if (handler) {
        const element = mockElement || new MockElement();
        element._matchesSelector = () => true;
        const mockEvent = createMockEvent(event, element);
        handler(mockEvent, element);
        return true;
      }
      return false;
    },

    getRootListeners: () => [...rootListeners],
    getGlobalListeners: () => [...globalListeners],

    triggerRootEvent(eventType, eventData = {}) {
      const event = createMockEvent(eventType, root, eventData);
      root.dispatchEvent(event);
    },

    triggerGlobalEvent(eventType, eventData = {}) {
      const event = createMockEvent(eventType, mockDocument, eventData);
      mockDocument.dispatchEvent(event);
    },

    forceRender() {
      render();
    },
  };
}

/**
 * Create a mock event for testing.
 */
export function createMockEvent(type, target, options = {}) {
  return {
    type,
    target,
    currentTarget: target,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    stopPropagation() {
      this._propagationStopped = true;
    },
    preventDefault() {
      this.defaultPrevented = true;
    },
    _propagationStopped: false,
    ...options,
  };
}

/**
 * Create a mock element with specific attributes for handler testing.
 */
export function createMockElement(tagName, attributes = {}) {
  const element = new MockElement(tagName);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class' || key === 'className') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  }
  return element;
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that rendered HTML contains expected text/markup.
 */
export function assertContains(html, expected, message) {
  if (!html.includes(expected)) {
    throw new Error(
      message ||
        `Expected HTML to contain "${expected}" but got:\n${html.slice(0, 500)}...`,
    );
  }
}

/**
 * Assert that rendered HTML does not contain expected text/markup.
 */
export function assertNotContains(html, unexpected, message) {
  if (html.includes(unexpected)) {
    throw new Error(
      message ||
        `Expected HTML to NOT contain "${unexpected}" but it did:\n${html.slice(0, 500)}...`,
    );
  }
}

/**
 * Assert that a handler is bound for the given selector + event.
 */
export function assertHandlerBound(harness, selector, event, message) {
  if (!harness.hasHandler(selector, event)) {
    const handlers = Array.from(harness.getBoundHandlers().keys()).join(', ');
    throw new Error(
      message ||
        `Expected handler for "${selector}" on "${event}" but found: [${handlers}]`,
    );
  }
}
