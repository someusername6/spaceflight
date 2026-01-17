/**
 * Screen Framework - Component abstraction for UI screens.
 *
 * Provides automatic event cleanup, event delegation, and standardized
 * render/bind lifecycle for all UI screens.
 */

/** Event handler with element context */
type EventHandler = (event: Event, element: HTMLElement) => void;

/**
 * API passed to bind function for event registration.
 * All events registered through this API are automatically cleaned up on re-render.
 */
export interface ScreenAPI<State> {
  /** Delegate event to elements matching selector within the screen */
  on(selector: string, event: string, handler: EventHandler): void;

  /**
   * Bind event directly to elements matching selector (no delegation).
   * Use this for events that don't bubble (mouseenter, mouseleave, etc.)
   */
  onDirect(selector: string, event: string, handler: EventHandler): void;

  /** Bind event directly to the root element */
  onRoot(event: string, handler: (e: Event) => void): void;

  /** Bind event to document (auto-cleaned on unmount)
   * @param capture - Use capture phase (default: false)
   */
  onGlobal(event: string, handler: (e: Event) => void, capture?: boolean): void;

  /** Update state and trigger re-render */
  setState(partial: Partial<State>): void;

  /** Update state WITHOUT re-rendering (for direct DOM manipulation) */
  updateState(partial: Partial<State>): void;

  /** Get current state (use in async handlers to get latest) */
  getState(): State;

  /** Get the root element for direct DOM access */
  getRoot(): HTMLElement;
}

/**
 * Screen component definition.
 * Separates pure rendering from event binding.
 */
export interface Screen<State, Props> {
  /** Render state and props to HTML string */
  render(state: State, props: Props): string;

  /** Bind event handlers using the API */
  bind(api: ScreenAPI<State>, props: Props): void;
}

/**
 * Handle returned by createScreen for external control.
 */
export interface ScreenHandle<State, Props> {
  /** Update state and re-render */
  setState(partial: Partial<State>): void;

  /** Update state WITHOUT re-rendering */
  updateState(partial: Partial<State>): void;

  /** Replace entire state and re-render */
  replaceState(state: State): void;

  /** Get current state */
  getState(): State;

  /** Update props and re-render */
  setProps(props: Props): void;

  /** Get current props */
  getProps(): Props;

  /** Cleanup all event listeners and unmount */
  destroy(): void;
}

/**
 * Mount a screen component to a DOM element.
 */
export function createScreen<S, P>(
  screen: Screen<S, P>,
  element: HTMLElement,
  initialState: S,
  initialProps: P,
): ScreenHandle<S, P> {
  let state = initialState;
  let props = initialProps;

  // Event delegation: one listener per event type
  const delegations = new Map<string, Map<string, EventHandler>>();
  const delegationListeners = new Map<string, (e: Event) => void>();

  // Direct listeners for cleanup
  const rootListeners: Array<{ event: string; handler: (e: Event) => void }> =
    [];
  const globalListeners: Array<{
    event: string;
    handler: (e: Event) => void;
    capture: boolean;
  }> = [];
  // Direct element listeners (for non-bubbling events like mouseenter/mouseleave)
  const directListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: (e: Event) => void;
  }> = [];

  /** Create the API object for bind() */
  const createAPI = (): ScreenAPI<S> => ({
    on(selector, event, handler) {
      if (!delegations.has(event)) {
        delegations.set(event, new Map());

        // Create delegation listener for this event type
        const listener = (e: Event) => {
          // e.target is EventTarget|null; assertion needed (no generic available)
          const target = e.target as HTMLElement | null;
          if (!target) return;

          const handlers = delegations.get(event);
          if (!handlers) return;

          for (const [sel, h] of handlers) {
            const matched = target.closest<HTMLElement>(sel);
            if (matched && element.contains(matched)) {
              h(e, matched);
            }
          }
        };

        element.addEventListener(event, listener);
        delegationListeners.set(event, listener);
      }

      delegations.get(event)?.set(selector, handler);
    },

    onDirect(selector, event, handler) {
      const elements = element.querySelectorAll<HTMLElement>(selector);
      for (const el of elements) {
        const wrappedHandler = (e: Event) => handler(e, el);
        el.addEventListener(event, wrappedHandler);
        directListeners.push({ element: el, event, handler: wrappedHandler });
      }
    },

    onRoot(event, handler) {
      element.addEventListener(event, handler);
      rootListeners.push({ event, handler });
    },

    onGlobal(event, handler, capture = false) {
      document.addEventListener(event, handler, capture);
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
      return element;
    },
  });

  /**
   * Clear registered handlers before re-render or destroy.
   *
   * @param fullCleanup - If true, explicitly remove direct listeners (for destroy).
   *   On re-render, innerHTML replacement orphans child elements anyway, so
   *   removeEventListener is unnecessary - we just clear references for GC.
   */
  const clearHandlers = (fullCleanup = false) => {
    // Clear handler maps (delegation listeners stay attached to root)
    delegations.forEach((map) => {
      map.clear();
    });

    // Direct listeners are bound to child elements that get destroyed by innerHTML.
    // On re-render: just clear references (elements are orphaned anyway)
    // On destroy: explicitly remove for completeness
    if (fullCleanup) {
      for (const { element: el, event, handler } of directListeners) {
        el.removeEventListener(event, handler);
      }
    }
    directListeners.length = 0;

    // Root listeners must always be removed (root element persists across renders)
    for (const { event, handler } of rootListeners) {
      element.removeEventListener(event, handler);
    }
    rootListeners.length = 0;

    // Global listeners must always be removed (document persists)
    for (const { event, handler, capture } of globalListeners) {
      document.removeEventListener(event, handler, capture);
    }
    globalListeners.length = 0;
  };

  /** Render and bind */
  const render = () => {
    clearHandlers();
    element.innerHTML = screen.render(state, props);
    screen.bind(createAPI(), props);
  };

  /** Full cleanup including delegation listeners */
  const destroy = () => {
    clearHandlers(true); // Full cleanup: explicitly remove direct listeners

    // Remove delegation listeners
    for (const [event, listener] of delegationListeners) {
      element.removeEventListener(event, listener);
    }
    delegationListeners.clear();
    delegations.clear();
  };

  // Initial render
  render();

  return {
    setState(partial) {
      state = { ...state, ...partial };
      render();
    },

    updateState(partial) {
      state = { ...state, ...partial };
    },

    replaceState(newState) {
      state = newState;
      render();
    },

    getState() {
      return state;
    },

    setProps(newProps) {
      props = newProps;
      render();
    },

    getProps() {
      return props;
    },

    destroy,
  };
}

/**
 * Result from a modal screen.
 */
export interface ModalResult<R> {
  result: R;
}

/**
 * Props extension for modal screens.
 * Modal screens receive an onComplete callback to close themselves.
 */
export interface ModalProps<R> {
  onComplete: (result: R) => void;
}

/**
 * Show a modal screen and return a promise that resolves when closed.
 * Creates a container div, mounts the screen, and cleans up on completion.
 *
 * The container has the 'modal-container' class which can be used for
 * entry animations that shouldn't replay on re-renders.
 */
export function showModal<S, P extends ModalProps<R>, R>(
  screen: Screen<S, P>,
  initialState: S,
  props: Omit<P, 'onComplete'>,
): Promise<R> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.className = 'modal-container';
    document.body.appendChild(container);

    let handle: ScreenHandle<S, P> | null = null;

    const onComplete = (result: R) => {
      handle?.destroy();
      container.remove();
      resolve(result);
    };

    const fullProps = { ...props, onComplete } as P;
    handle = createScreen(screen, container, initialState, fullProps);
  });
}
