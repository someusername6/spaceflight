/**
 * Mock DOM Infrastructure
 *
 * Provides mock Element and Document classes for testing UI components
 * without a browser environment.
 */

/**
 * Simple mock Element with event handling and DOM tree support.
 */
export class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.innerHTML = '';
    this.children = [];
    this.parent = null;
    this.className = '';
    this.classList = new MockClassList(this);
    this.style = {};
    this._attributes = new Map();
    this._eventListeners = new Map();
    this._dataset = {};
  }

  get dataset() {
    return this._dataset;
  }

  setAttribute(name, value) {
    this._attributes.set(name, value);
    if (name === 'class') {
      this.className = value;
    }
    // Parse data-* attributes
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this._dataset[key] = value;
    }
  }

  getAttribute(name) {
    return this._attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this._attributes.has(name);
  }

  removeAttribute(name) {
    this._attributes.delete(name);
  }

  addEventListener(event, handler, options) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event).push({ handler, options });
  }

  removeEventListener(event, handler) {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex((l) => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    const listeners = this._eventListeners.get(event.type) ?? [];
    for (const { handler } of listeners) {
      handler(event);
    }
    return true;
  }

  appendChild(child) {
    this.children.push(child);
    child.parent = this;
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return child;
  }

  remove() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  contains(element) {
    if (element === this) return true;
    for (const child of this.children) {
      if (child.contains(element)) return true;
    }
    return false;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current._matchesSelector(selector)) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  querySelector(selector) {
    if (this._matchesSelector(selector)) {
      return this;
    }
    for (const child of this.children) {
      const result = child.querySelector(selector);
      if (result) return result;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    if (this._matchesSelector(selector)) {
      results.push(this);
    }
    for (const child of this.children) {
      results.push(...child.querySelectorAll(selector));
    }
    return results;
  }

  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100,
    };
  }

  _matchesSelector(selector) {
    if (selector.startsWith('.')) {
      const className = selector.slice(1).split('.')[0];
      return (
        this.className.split(' ').includes(className) ||
        this.classList.contains(className)
      );
    }
    if (selector.startsWith('#')) {
      return this.getAttribute('id') === selector.slice(1);
    }
    if (selector === this.tagName.toLowerCase()) {
      return true;
    }
    return false;
  }

  getRegisteredEvents() {
    return Array.from(this._eventListeners.keys());
  }

  getListenerCount(event) {
    return this._eventListeners.get(event)?.length ?? 0;
  }
}

class MockClassList {
  constructor(element) {
    this._element = element;
    this._classes = new Set();
  }

  add(className) {
    this._classes.add(className);
  }

  remove(className) {
    this._classes.delete(className);
  }

  toggle(className, force) {
    if (force === undefined) {
      if (this._classes.has(className)) {
        this._classes.delete(className);
        return false;
      } else {
        this._classes.add(className);
        return true;
      }
    } else if (force) {
      this._classes.add(className);
      return true;
    } else {
      this._classes.delete(className);
      return false;
    }
  }

  contains(className) {
    return this._classes.has(className);
  }

  [Symbol.iterator]() {
    return this._classes[Symbol.iterator]();
  }
}

/**
 * Mock document for testing.
 */
export class MockDocument extends MockElement {
  constructor() {
    super('document');
    this.body = new MockElement('body');
    this.head = new MockElement('head');
    this.children = [this.head, this.body];
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  getElementById(id) {
    return this.querySelector(`#${id}`);
  }
}
