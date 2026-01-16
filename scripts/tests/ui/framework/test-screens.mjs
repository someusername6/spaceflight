/**
 * Test Screen Definitions
 *
 * Reusable test screens for Screen framework tests.
 */

/** Simple counter screen for basic functionality */
export const counterScreen = {
  render(state, _props) {
    return `
      <div class="counter">
        <span class="count">${state.count}</span>
        <button class="btn-increment">+</button>
        <button class="btn-decrement">-</button>
      </div>
    `;
  },
  bind(api, _props) {
    api.on('.btn-increment', 'click', () => {
      const state = api.getState();
      api.setState({ count: state.count + 1 });
    });
    api.on('.btn-decrement', 'click', () => {
      const state = api.getState();
      api.setState({ count: state.count - 1 });
    });
  },
};

/** Screen with global event handling */
export const keyboardScreen = {
  render(state, _props) {
    return `<div class="keyboard-test">${state.lastKey || 'Press a key'}</div>`;
  },
  bind(api, _props) {
    api.onGlobal('keydown', (e) => {
      api.setState({ lastKey: e.key });
    });
  },
};

/** Screen with root event handling */
export const hoverScreen = {
  render(state, _props) {
    return `<div class="hover-test">${state.isHovered ? 'Hovered!' : 'Not hovered'}</div>`;
  },
  bind(api, _props) {
    api.onRoot('mouseenter', () => {
      api.setState({ isHovered: true });
    });
    api.onRoot('mouseleave', () => {
      api.setState({ isHovered: false });
    });
  },
};

/** Screen with conditional rendering */
export const conditionalScreen = {
  render(state, _props) {
    if (state.showDetails) {
      return `
        <div class="conditional">
          <h1>Details</h1>
          <p>${state.details}</p>
          <button class="btn-hide">Hide</button>
        </div>
      `;
    }
    return `
      <div class="conditional">
        <button class="btn-show">Show Details</button>
      </div>
    `;
  },
  bind(api, _props) {
    if (api.getState().showDetails) {
      api.on('.btn-hide', 'click', () => {
        api.setState({ showDetails: false });
      });
    } else {
      api.on('.btn-show', 'click', () => {
        api.setState({ showDetails: true });
      });
    }
  },
};

/** Screen with props */
export const propsScreen = {
  render(state, props) {
    return `
      <div class="props-test">
        <span class="title">${props.title}</span>
        <span class="value">${state.value}</span>
        <button class="btn-action" data-action="${props.action}">Action</button>
      </div>
    `;
  },
  bind(api, props) {
    api.on('.btn-action', 'click', () => {
      if (props.onAction) {
        props.onAction(api.getState().value);
      }
    });
  },
};
