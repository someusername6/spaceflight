/**
 * Lobby Screen - Main multiplayer lobby UI.
 *
 * Features:
 * - Two-column layout: players (left), chat (right)
 * - Room code header (host only, with copy button)
 * - Ready/Unready button
 * - Leave button
 * - Host popover on guest hover (UI only)
 */

import { clearAllRateLimits } from '../../../multiplayer/chat-validation';
import type { LobbyState } from '../../../multiplayer/lobby-state';
import type { Permission } from '../../../multiplayer/protocol/types';
import { bindNavBar, type NavDestination } from '../../common/nav-bar';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import { copyToClipboard } from '../../utils/clipboard';
import { bindCallsignPopover } from './callsign-popover';
import { scrollChatToBottom } from './chat-panel';
import { positionPopover, renderHostPopover } from './host-popover';
import { type LobbyViewState, renderLobbyView } from './lobby-render';

// =============================================================================
// Types
// =============================================================================

/** Callbacks for lobby screen */
export interface LobbyCallbacks {
  onReady: (ready: boolean) => void;
  onSendChat: (text: string) => void;
  onBack: () => void;
  /** Called when host changes a player's permissions (host only) */
  onPermissionChange?: (playerId: string, permissions: Permission) => void;
  /** Called when navigating to another campaign screen */
  onNavigate?: (destination: NavDestination) => void;
  /** Called when player changes their own callsign. Returns success/error. */
  onCallsignChange?: (newCallsign: string) => {
    success: boolean;
    error?: string;
  };
  /** Returns true if a launch countdown is currently active */
  isCountdownActive?: () => boolean;
  /** Called when host kicks a player (host only) */
  onKick?: (playerId: string) => void;
}

// =============================================================================
// Screen Component
// =============================================================================

/** Lobby screen component */
const LobbyScreenComponent: Screen<LobbyViewState, LobbyCallbacks> = {
  render(state) {
    return renderLobbyView(state);
  },

  bind(api: ScreenAPI<LobbyViewState>, props: LobbyCallbacks) {
    const state = api.getState();

    // Copy button (host only)
    api.on('#btn-copy', 'click', async () => {
      const currentState = api.getState();
      await copyToClipboard(currentState.roomCode);
      api.setState({ copied: true });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        api.updateState({ copied: false });
      }, 2000);
    });

    // Ready button
    api.on('#btn-ready', 'click', () => {
      const currentState = api.getState();
      const localPlayer = currentState.players.find(
        (p) => p.playerId === currentState.localPlayerId,
      );
      const isReady = localPlayer?.isReady ?? false;
      props.onReady(!isReady);
    });

    // Leave button
    api.on('#btn-back', 'click', () => {
      props.onBack();
    });

    // Chat form submit
    api.on('#chat-form', 'submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input') as HTMLInputElement;
      const text = input?.value.trim() ?? '';
      if (text.length > 0) {
        props.onSendChat(text);
        input.value = '';
      }
    });

    // Error dismiss button
    api.on('#btn-error-dismiss', 'click', () => {
      api.setState({ errorMessage: null });
    });

    // Nav bar navigation
    if (props.onNavigate) {
      bindNavBar(api, props.onNavigate);
    }

    // Host popover on guest row hover
    if (state.isHost) {
      let activePopover: HTMLElement | null = null;

      // Permission change handler (checkboxes and select)
      api.onGlobal('change', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest?.('.host-popover')) return;

        const playerId = target.getAttribute('data-player');
        const permissionType = target.getAttribute('data-permission');
        if (!playerId || !permissionType) return;

        const currentState = api.getState();
        const player = currentState.players.find(
          (p) => p.playerId === playerId,
        );
        if (!player) return;

        const newPermissions: Permission = { ...player.permissions };
        if (permissionType === 'canBuy') {
          newPermissions.canBuy = (target as HTMLInputElement).checked;
        } else if (permissionType === 'canSell') {
          newPermissions.canSell = (target as HTMLInputElement).checked;
        } else if (permissionType === 'canConvertScrap') {
          newPermissions.canConvertScrap = (target as HTMLInputElement).checked;
        } else if (permissionType === 'shipEdit') {
          // shipEdit uses a select element with 'none' | 'own' | 'any' values
          const value = (target as HTMLSelectElement).value;
          newPermissions.shipEdit = value as 'none' | 'own' | 'any';
        }

        props.onPermissionChange?.(playerId, newPermissions);
      });

      // Kick button handler
      api.onGlobal('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id !== 'btn-kick') return;

        const popover = target.closest('.host-popover');
        const playerId = popover?.getAttribute('data-target-player');
        if (playerId && props.onKick) {
          props.onKick(playerId);
          // Remove the popover after kick
          activePopover?.remove();
          activePopover = null;
        }
      });

      api.onDirect('.player-row[data-player-id]', 'mouseenter', (_e, el) => {
        const playerId = el.getAttribute('data-player-id');
        if (!playerId) return;

        const currentState = api.getState();
        const player = currentState.players.find(
          (p) => p.playerId === playerId,
        );
        if (!player) return;

        // Don't show popover for host (self)
        if (player.isHost) return;

        // Remove any existing popover
        activePopover?.remove();

        // Create new popover with current permissions
        const popoverHtml = renderHostPopover({
          playerId: player.playerId,
          callsign: player.callsign,
          permissions: player.permissions,
        });
        const popoverContainer = document.createElement('div');
        popoverContainer.innerHTML = popoverHtml;
        const popoverEl = popoverContainer.firstElementChild as HTMLElement;

        document.body.appendChild(popoverEl);
        positionPopover(popoverEl, el);
        activePopover = popoverEl;
      });

      api.onDirect('.player-row[data-player-id]', 'mouseleave', () => {
        // Small delay to allow moving to the popover
        setTimeout(() => {
          if (
            activePopover &&
            !activePopover.matches(':hover') &&
            !document.querySelector('.player-row:hover')
          ) {
            activePopover.remove();
            activePopover = null;
          }
        }, 100);
      });

      // Close popover when clicking outside
      api.onGlobal('click', (e) => {
        const target = e.target as HTMLElement;
        if (
          activePopover &&
          !activePopover.contains(target) &&
          !target.closest('.player-row[data-player-id]')
        ) {
          activePopover.remove();
          activePopover = null;
        }
      });
    }

    // Callsign change popover for self row
    if (props.onCallsignChange) {
      bindCallsignPopover(api, props.onCallsignChange);
    }

    // Keyboard navigation
    api.onGlobal('keydown', (e) => {
      const key = (e as KeyboardEvent).code;

      if (key === 'Escape') {
        e.preventDefault();

        // During countdown, Escape makes player unready (aborts countdown)
        // instead of opening the pause menu
        if (props.isCountdownActive?.()) {
          const currentState = api.getState();
          const localPlayer = currentState.players.find(
            (p) => p.playerId === currentState.localPlayerId,
          );
          if (localPlayer?.isReady) {
            props.onReady(false);
            return;
          }
        }

        // Otherwise, dismiss error message if present
        const currentState = api.getState();
        if (currentState.errorMessage) {
          api.setState({ errorMessage: null });
        }
      }
    });

    // Auto-scroll chat to bottom
    requestAnimationFrame(() => {
      scrollChatToBottom();
    });
  },
};

// =============================================================================
// Public API
// =============================================================================

/** Screen handle for external control */
let screenHandle: ScreenHandle<LobbyViewState, LobbyCallbacks> | null = null;

/** Render the lobby screen */
export function renderLobbyScreen(element: HTMLElement): void {
  const initialState: LobbyViewState = {
    roomCode: '',
    localPlayerId: '',
    isHost: false,
    players: [],
    chatMessages: [],
    errorMessage: null,
    copied: false,
    credits: 0,
    currentSector: 1,
  };

  element.innerHTML = LobbyScreenComponent.render(initialState, {
    onReady: () => {},
    onSendChat: () => {},
    onBack: () => {},
    onPermissionChange: () => {},
  });
}

/** Bind lobby screen event handlers */
export function bindLobbyScreen(
  element: HTMLElement,
  initialState: LobbyState,
  callbacks: LobbyCallbacks,
  campaignInfo?: { credits: number; currentSector: number },
): void {
  // Clean up previous handle if exists
  screenHandle?.destroy();

  const viewState: LobbyViewState = {
    ...initialState,
    copied: false,
    credits: campaignInfo?.credits ?? 0,
    currentSector: campaignInfo?.currentSector ?? 1,
  };

  screenHandle = createScreen(
    LobbyScreenComponent,
    element,
    viewState,
    callbacks,
  );
}

/** Update lobby state */
export function updateLobbyState(state: LobbyState): void {
  if (!screenHandle) return;

  const currentState = screenHandle.getState();
  screenHandle.setState({
    ...state,
    copied: currentState.copied,
    credits: currentState.credits,
    currentSector: currentState.currentSector,
  });

  // Auto-scroll chat
  requestAnimationFrame(() => {
    scrollChatToBottom();
  });
}

/** Update campaign info (credits/sector) displayed in the lobby nav bar */
export function updateLobbyCampaignInfo(
  credits: number,
  currentSector: number,
): void {
  screenHandle?.setState({ credits, currentSector });
}

/** Show error message */
export function showLobbyError(message: string): void {
  screenHandle?.setState({ errorMessage: message });
}

/** Force the lobby screen to re-render (after navigating back to it). */
export function forceRenderLobbyScreen(): void {
  if (!screenHandle) return;
  const state = screenHandle.getState();
  // setState triggers render(); works because the element is now visible
  screenHandle.setState(state);
}

/** Cleanup lobby screen */
export function cleanupLobbyScreen(): void {
  // Remove any orphaned popovers
  const hostPopovers = document.querySelectorAll('.host-popover');
  for (const popover of hostPopovers) {
    popover.remove();
  }
  const callsignPopovers = document.querySelectorAll('.callsign-popover');
  for (const popover of callsignPopovers) {
    popover.remove();
  }

  // Clear chat rate limit tracking
  clearAllRateLimits();

  screenHandle?.destroy();
  screenHandle = null;
}

/** Get current lobby screen handle (for testing) */
export function getLobbyScreenHandle(): ScreenHandle<
  LobbyViewState,
  LobbyCallbacks
> | null {
  return screenHandle;
}
