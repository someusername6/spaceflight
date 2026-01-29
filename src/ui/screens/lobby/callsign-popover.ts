/**
 * Callsign Popover - Popover for changing player callsign.
 *
 * Features:
 * - Input field pre-filled with current callsign
 * - Save/Cancel buttons
 * - Validation feedback
 */

import { validateCallsign } from '../../../multiplayer/callsign-storage';
import type { ScreenAPI } from '../../framework/screen';
import { escapeHtml } from '../../utils';
import type { LobbyViewState } from './lobby-render';

// =============================================================================
// Types
// =============================================================================

/** Options for rendering the callsign popover */
export interface CallsignPopoverOptions {
  currentCallsign: string;
}

/** Callback for callsign change */
export type OnCallsignChange = (newCallsign: string) => {
  success: boolean;
  error?: string;
};

// =============================================================================
// Rendering
// =============================================================================

/** Render the callsign change popover */
export function renderCallsignPopover(options: CallsignPopoverOptions): string {
  const { currentCallsign } = options;

  return `
    <div class="callsign-popover">
      <div class="popover-header">
        <span class="popover-title">Change Callsign</span>
      </div>
      <div class="popover-body">
        <input type="text"
               id="callsign-input"
               class="callsign-input"
               value="${escapeHtml(currentCallsign)}"
               maxlength="16"
               autocomplete="off"
               spellcheck="false" />
        <span class="callsign-error" id="callsign-error"></span>
      </div>
      <div class="popover-actions">
        <button class="btn btn-sm btn-secondary" id="btn-callsign-cancel">
          Cancel
        </button>
        <button class="btn btn-sm btn-primary" id="btn-callsign-save">
          Save
        </button>
      </div>
    </div>
  `;
}

// =============================================================================
// Positioning
// =============================================================================

/** Position callsign popover near the player row */
export function positionCallsignPopover(
  popoverEl: HTMLElement,
  targetRow: HTMLElement,
): void {
  const rect = targetRow.getBoundingClientRect();
  const popoverWidth = 220;
  const popoverHeight = 140;

  // Position to the right of the row
  let left = rect.right + 8;

  // If it would go off screen, position to the left instead
  if (left + popoverWidth > window.innerWidth) {
    left = rect.left - popoverWidth - 8;
  }

  // Vertical positioning - try to center on the row
  let top = rect.top + rect.height / 2 - popoverHeight / 2;

  // Keep within viewport bounds
  if (top < 8) {
    top = 8;
  } else if (top + popoverHeight > window.innerHeight - 8) {
    top = window.innerHeight - popoverHeight - 8;
  }

  popoverEl.style.position = 'fixed';
  popoverEl.style.left = `${left}px`;
  popoverEl.style.top = `${top}px`;
}

// =============================================================================
// Validation
// =============================================================================

/** Validate and show/hide error in the popover */
export function validateCallsignInput(input: HTMLInputElement): boolean {
  const errorEl = document.getElementById('callsign-error');
  if (!errorEl) return false;

  const validation = validateCallsign(input.value);
  if (!validation.valid) {
    errorEl.textContent = validation.error ?? 'Invalid callsign';
    errorEl.style.display = 'block';
    input.classList.add('invalid');
    return false;
  }

  errorEl.style.display = 'none';
  input.classList.remove('invalid');
  return true;
}

// =============================================================================
// Event Binding
// =============================================================================

/**
 * Bind callsign popover event handlers.
 * Call this from the lobby screen's bind function.
 */
export function bindCallsignPopover(
  api: ScreenAPI<LobbyViewState>,
  onCallsignChange: OnCallsignChange,
): void {
  let callsignPopover: HTMLElement | null = null;

  const closeCallsignPopover = () => {
    callsignPopover?.remove();
    callsignPopover = null;
  };

  const handleSaveCallsign = () => {
    const input = document.getElementById('callsign-input') as HTMLInputElement;
    if (!input) return;

    if (validateCallsignInput(input)) {
      const result = onCallsignChange(input.value.trim());
      if (!result.success) {
        // Show error from server-side validation (e.g., conflict)
        const errorEl = document.getElementById('callsign-error');
        if (errorEl) {
          errorEl.textContent = result.error ?? 'Failed to change callsign';
          errorEl.style.display = 'block';
          input.classList.add('invalid');
        }
        return;
      }
      closeCallsignPopover();
    }
  };

  // Click on self row to show callsign popover
  api.onDirect('.player-row.self', 'click', (_e, el) => {
    closeCallsignPopover();

    const currentState = api.getState();
    const localPlayer = currentState.players.find(
      (p) => p.playerId === currentState.localPlayerId,
    );
    if (!localPlayer) return;

    // Create popover
    const popoverHtml = renderCallsignPopover({
      currentCallsign: localPlayer.callsign,
    });
    const popoverContainer = document.createElement('div');
    popoverContainer.innerHTML = popoverHtml;
    const popoverEl = popoverContainer.firstElementChild as HTMLElement;

    document.body.appendChild(popoverEl);
    positionCallsignPopover(popoverEl, el);
    callsignPopover = popoverEl;

    // Focus input and select text
    const input = document.getElementById('callsign-input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  });

  // Callsign popover button clicks (event delegation)
  api.onGlobal('click', (e) => {
    const target = e.target as HTMLElement;

    // Handle save button
    if (
      target.id === 'btn-callsign-save' ||
      target.closest('#btn-callsign-save')
    ) {
      handleSaveCallsign();
      return;
    }

    // Handle cancel button
    if (
      target.id === 'btn-callsign-cancel' ||
      target.closest('#btn-callsign-cancel')
    ) {
      closeCallsignPopover();
      return;
    }

    // Close popover when clicking outside
    if (
      callsignPopover &&
      !callsignPopover.contains(target) &&
      !target.closest('.player-row.self')
    ) {
      closeCallsignPopover();
    }
  });

  // Callsign input keyboard handling (event delegation)
  api.onGlobal('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.id !== 'callsign-input') return;

    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key === 'Enter') {
      keyEvent.preventDefault();
      handleSaveCallsign();
    } else if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault();
      closeCallsignPopover();
    }
  });

  // Live validation on input (event delegation)
  api.onGlobal('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.id !== 'callsign-input') return;
    validateCallsignInput(target);
  });
}
