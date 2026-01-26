/**
 * Room Created Screen - Display room code for host to share.
 *
 * Temporary screen until Phase 7 lobby implementation.
 * Shows:
 * - Room code with copy button
 * - Waiting status
 * - Connected peer count
 * - Cancel button
 */

import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';
import { copyToClipboard } from '../utils/clipboard';
import {
  type RoomCreatedState,
  renderErrorView,
  renderWaitingView,
} from './room-created-render';

/** Callbacks for room created screen */
export interface RoomCreatedCallbacks {
  onCancel: () => void;
}

/** Room created screen component */
const RoomCreatedScreenComponent: Screen<
  RoomCreatedState,
  RoomCreatedCallbacks
> = {
  render(state) {
    let content: string;

    switch (state.view) {
      case 'waiting':
        content = renderWaitingView(state);
        break;
      case 'error':
        content = renderErrorView(state);
        break;
    }

    return `
      <div class="room-created-screen scanline-overlay-screen">
        <div class="room-created-wrapper">
          ${content}
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<RoomCreatedState>, props: RoomCreatedCallbacks) {
    // Copy button
    api.on('#btn-copy', 'click', async () => {
      const state = api.getState();
      await copyToClipboard(state.roomCode);
      api.setState({ copied: true });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        api.updateState({ copied: false });
      }, 2000);
    });

    // Cancel button
    api.on('#btn-cancel', 'click', () => {
      cleanupRoomCreatedScreen();
      props.onCancel();
    });

    // Back button (error view)
    api.on('#btn-back', 'click', () => {
      cleanupRoomCreatedScreen();
      props.onCancel();
    });

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;

      if (key === 'Escape') {
        e.preventDefault();
        cleanupRoomCreatedScreen();
        props.onCancel();
      }
    });
  },
};

/** Screen handle for external control */
let screenHandle: ScreenHandle<RoomCreatedState, RoomCreatedCallbacks> | null =
  null;

/** Active connection flow reference */
let activeConnectionFlow: ConnectionFlow | null = null;

/** Render the room created screen */
export function renderRoomCreatedScreen(element: HTMLElement): void {
  const initialState: RoomCreatedState = {
    view: 'waiting',
    roomCode: '',
    peerCount: 1,
    copied: false,
    errorMessage: null,
  };

  element.innerHTML = RoomCreatedScreenComponent.render(initialState, {
    onCancel: () => {},
  });
}

/** Bind room created screen event handlers */
export function bindRoomCreatedScreen(
  element: HTMLElement,
  roomCode: string,
  connectionFlow: ConnectionFlow,
  callbacks: RoomCreatedCallbacks,
): void {
  // Clean up previous handle if exists
  screenHandle?.destroy();

  activeConnectionFlow = connectionFlow;

  const initialState: RoomCreatedState = {
    view: 'waiting',
    roomCode,
    peerCount: 1,
    copied: false,
    errorMessage: null,
  };

  screenHandle = createScreen(
    RoomCreatedScreenComponent,
    element,
    initialState,
    callbacks,
  );
}

/** Update peer count display */
export function updateRoomPeerCount(count: number): void {
  screenHandle?.setState({ peerCount: count });
}

/** Show error on room created screen */
export function showRoomError(message: string): void {
  screenHandle?.setState({ view: 'error', errorMessage: message });
}

/** Cleanup room created screen */
export function cleanupRoomCreatedScreen(): void {
  if (activeConnectionFlow) {
    activeConnectionFlow.disconnect().catch(() => {
      // Ignore disconnect errors
    });
    activeConnectionFlow.dispose();
    activeConnectionFlow = null;
  }

  screenHandle?.destroy();
  screenHandle = null;
}
