/**
 * Spectator HUD - Overlay for spectator mode.
 *
 * Displays information about what ship the spectator is following,
 * the current camera mode, and control hints.
 */

import { getComponent } from '../../core/ecs';
import type { World } from '../../core/types';
import type { SpectatorState } from '../../multiplayer/spectator-state';
import {
  CameraMode,
  getModeDisplayName,
} from '../../ui/screens/replay/replay-camera';

// =============================================================================
// Types
// =============================================================================

/** Spectator HUD elements */
export interface SpectatorHUD {
  container: HTMLElement;
  labelElement: HTMLElement;
  callsignElement: HTMLElement;
  modeElement: HTMLElement;
  hintElement: HTMLElement;
}

// =============================================================================
// Styles
// =============================================================================

/** Style ID for deduplication */
export const SPECTATOR_HUD_STYLE_ID = 'spectator-hud-styles';

/** Get spectator HUD CSS styles */
export function getSpectatorHUDStyles(): string {
  return `
    .spectator-hud {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: rgba(0, 0, 0, 0.7);
      padding: 12px 20px;
      border: 1px solid #0af;
      font-family: "Lucida Console", "Consolas", monospace;
      font-weight: bold;
      text-transform: uppercase;
      pointer-events: none;
    }
    .spectator-label {
      font-size: 12px;
      color: #0af;
      letter-spacing: 2px;
    }
    .spectator-callsign {
      font-size: 18px;
      color: #fff;
    }
    .spectator-mode {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
    .spectator-hint {
      font-size: 10px;
      color: #666;
      margin-top: 6px;
      letter-spacing: 1px;
    }
    .spectator-hud.all-lost {
      border-color: #f80;
    }
    .spectator-hud.all-lost .spectator-label {
      color: #f80;
    }
    .spectator-hud.all-lost .spectator-callsign {
      color: #f80;
    }
  `;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create the spectator HUD elements.
 *
 * @param container - Parent element (typically the mission container)
 */
export function createSpectatorHUD(container: HTMLElement): SpectatorHUD {
  // Add styles if not already present
  if (!document.getElementById(SPECTATOR_HUD_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = SPECTATOR_HUD_STYLE_ID;
    style.textContent = getSpectatorHUDStyles();
    document.head.appendChild(style);
  }

  // Create HUD container
  const hudContainer = document.createElement('div');
  hudContainer.className = 'spectator-hud';

  // Create elements
  const labelElement = document.createElement('div');
  labelElement.className = 'spectator-label';
  labelElement.textContent = 'Spectating';

  const callsignElement = document.createElement('div');
  callsignElement.className = 'spectator-callsign';
  callsignElement.textContent = '---';

  const modeElement = document.createElement('div');
  modeElement.className = 'spectator-mode';
  modeElement.textContent = 'Chase';

  const hintElement = document.createElement('div');
  hintElement.className = 'spectator-hint';
  hintElement.textContent = 'TAB: Next | C: Mode';

  // Assemble
  hudContainer.appendChild(labelElement);
  hudContainer.appendChild(callsignElement);
  hudContainer.appendChild(modeElement);
  hudContainer.appendChild(hintElement);

  container.appendChild(hudContainer);

  return {
    container: hudContainer,
    labelElement,
    callsignElement,
    modeElement,
    hintElement,
  };
}

/**
 * Update spectator HUD with current state.
 *
 * @param hud - The spectator HUD instance
 * @param state - Current spectator state
 * @param world - Game world
 */
export function updateSpectatorHUD(
  hud: SpectatorHUD,
  state: SpectatorState,
  world: World,
): void {
  const { cameraState } = state;

  // Get callsign of followed entity
  let callsign = '---';
  if (cameraState.targetEntity !== null) {
    const identity = getComponent(
      world,
      cameraState.targetEntity,
      'shipIdentity',
    );
    callsign = identity?.callsign ?? `Ship ${cameraState.entityIndex + 1}`;
  }

  // Check if all allies are lost
  const allLost = cameraState.entityList.length === 0;

  // Update display
  hud.callsignElement.textContent = allLost ? 'All Allies Lost' : callsign;
  hud.modeElement.textContent = getModeDisplayName(cameraState.mode);

  // Update hint based on mode
  if (allLost) {
    hud.hintElement.textContent = 'Free Camera: WASD to move';
    hud.modeElement.textContent = 'Free';
  } else if (cameraState.mode === CameraMode.Free) {
    hud.hintElement.textContent = 'TAB: Follow | WASD: Move';
  } else {
    hud.hintElement.textContent = 'TAB: Next | C: Mode';
  }

  // Toggle all-lost styling
  hud.container.classList.toggle('all-lost', allLost);
}

/**
 * Dispose spectator HUD.
 */
export function disposeSpectatorHUD(hud: SpectatorHUD): void {
  hud.container.remove();
}
