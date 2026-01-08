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

  /** Bind event directly to the root element */
  onRoot(event: string, handler: (e: Event) => void): void;

  /** Bind event to document (auto-cleaned on unmount) */
  onGlobal(event: string, handler: (e: Event) => void): void;

  /** Update state and trigger re-render */
  setState(partial: Partial<State>): void;

  /** Get current state (use in async handlers to get latest) */
  getState(): State;
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

  /** Replace entire state and re-render */
  replaceState(state: State): void;

  /** Get current state */
  getState(): State;

  /** Update props and re-render */
  setProps(props: Props): void;

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
  const globalListeners: Array<{ event: string; handler: (e: Event) => void }> =
    [];

  /** Create the API object for bind() */
  const createAPI = (): ScreenAPI<S> => ({
    on(selector, event, handler) {
      if (!delegations.has(event)) {
        delegations.set(event, new Map());

        // Create delegation listener for this event type
        const listener = (e: Event) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;

          const handlers = delegations.get(event);
          if (!handlers) return;

          for (const [sel, h] of handlers) {
            const matched = target.closest(sel);
            if (matched && element.contains(matched)) {
              h(e, matched as HTMLElement);
            }
          }
        };

        element.addEventListener(event, listener);
        delegationListeners.set(event, listener);
      }

      delegations.get(event)?.set(selector, handler);
    },

    onRoot(event, handler) {
      element.addEventListener(event, handler);
      rootListeners.push({ event, handler });
    },

    onGlobal(event, handler) {
      document.addEventListener(event, handler);
      globalListeners.push({ event, handler });
    },

    setState(partial) {
      state = { ...state, ...partial };
      render();
    },

    getState() {
      return state;
    },
  });

  /** Clear all registered handlers (but keep delegation listeners) */
  const clearHandlers = () => {
    // Clear handler maps (delegation listeners stay attached)
    delegations.forEach((map) => {
      map.clear();
    });

    // Remove root listeners
    for (const { event, handler } of rootListeners) {
      element.removeEventListener(event, handler);
    }
    rootListeners.length = 0;

    // Remove global listeners
    for (const { event, handler } of globalListeners) {
      document.removeEventListener(event, handler);
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
    clearHandlers();

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
 */
export function showModal<S, P extends ModalProps<R>, R>(
  screen: Screen<S, P>,
  initialState: S,
  props: Omit<P, 'onComplete'>,
): Promise<R> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
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
