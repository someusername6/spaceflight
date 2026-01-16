/**
 * Popover DOM Mocks
 *
 * Shared DOM mocking infrastructure for popover tests.
 * Provides DOMElement and DOMDocument classes that properly simulate
 * contains(), closest(), event bubbling, and other DOM behaviors.
 */

/** More complete DOM mock that properly simulates contains() and event flow */
export class DOMElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this._listeners = new Map();
    this._rect = {
      left: 100,
      top: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50,
    };
  }

  getBoundingClientRect() {
    return this._rect;
  }

  addEventListener(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this._listeners.get(event.type);
    if (handlers) {
      for (const h of handlers) {
        h(event);
      }
    }
    // Bubble if the event bubbles
    if (event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx >= 0) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
  }

  /**
   * Critical: proper contains() implementation
   * This is key to testing the 3-way click behavior
   */
  contains(node) {
    if (node === this) return true;
    if (!node) return false;
    for (const child of this.children) {
      if (child.contains(node)) return true;
    }
    return false;
  }

  /**
   * Find closest ancestor matching selector (or self)
   */
  closest(selector) {
    // Check if selector is a class selector
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.className.split(' ').includes(cls)) {
        return this;
      }
    }
    // Traverse up the tree
    if (this.parentNode?.closest) {
      return this.parentNode.closest(selector);
    }
    return null;
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (
        selector.startsWith('.') &&
        child.className.includes(selector.slice(1))
      ) {
        return child;
      }
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const check = (el) => {
      if (
        selector.startsWith('.') &&
        el.className.includes(selector.slice(1))
      ) {
        results.push(el);
      }
      for (const child of el.children) {
        check(child);
      }
    };
    check(this);
    return results;
  }

  get classList() {
    const self = this;
    return {
      add(cls) {
        if (!self.className.includes(cls)) {
          self.className = `${self.className} ${cls}`.trim();
        }
      },
      remove(cls) {
        self.className = self.className
          .replace(cls, '')
          .replace(/\s+/g, ' ')
          .trim();
      },
      contains(cls) {
        return self.className.split(' ').includes(cls);
      },
      toggle(cls, force) {
        if (force === undefined) {
          if (this.contains(cls)) this.remove(cls);
          else this.add(cls);
        } else if (force) {
          this.add(cls);
        } else {
          this.remove(cls);
        }
      },
    };
  }
}

export class DOMDocument {
  constructor() {
    this.body = new DOMElement('body');
    this._listeners = new Map();
  }

  createElement(tag) {
    return new DOMElement(tag);
  }

  addEventListener(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this._listeners.get(event.type);
    if (handlers) {
      for (const h of handlers) {
        h(event);
      }
    }
  }

  getClickListenerCount() {
    return (this._listeners.get('click') || new Set()).size;
  }
}

/**
 * Setup mock DOM environment for tests
 * Returns cleanup function to restore originals
 */
export function setupMockDOM() {
  const mockDocument = new DOMDocument();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  globalThis.document = mockDocument;
  globalThis.window = { innerWidth: 1920, innerHeight: 1080 };

  return {
    mockDocument,
    cleanup: () => {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}
