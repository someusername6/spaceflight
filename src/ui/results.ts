/**
 * Results screen - displays mission outcome and combat debrief.
 */

import type { CampaignState, Contract } from '../campaign/types';
import type { World } from '../core/types';
import {
  collectDebriefData,
  type MissionDebriefData,
  renderDebrief,
} from './debrief';

/** Results UI state */
export interface ResultsUI {
  element: HTMLElement;
  onContinue: () => void;
}

/** Render results screen */
function renderResults(
  victory: boolean,
  contract: Contract | null,
  state: CampaignState,
  debriefData: MissionDebriefData | null,
): string {
  const title = victory ? 'VICTORY' : 'DEFEAT';
  const titleClass = victory ? 'victory' : 'defeat';
  const creditsEarned = victory && contract ? contract.reward : 0;

  const debriefSection = debriefData ? renderDebrief(debriefData) : '';

  return `
    <h1 class="result-title ${titleClass}">${title}</h1>

    <div class="screen-panel results-panel">
      <div class="result-stats">
        ${contract ? `<div>Mission: ${contract.name}</div>` : ''}
        ${victory ? `<div style="color: #44cc66;">+ ${creditsEarned} credits</div>` : ''}
        <div style="margin-top: 10px;">
          Total Credits: ${state.credits}
        </div>
        <div>
          Ships Remaining: ${state.ships.length}
        </div>
        <div>
          Missions Completed: ${state.missionCount}
        </div>
      </div>

      ${debriefSection}

      <button class="btn btn-primary" id="btn-continue" style="margin-top: 20px;">
        ${victory ? 'Return to Hangar' : 'Continue'}
      </button>
    </div>
  `;
}

/** Create results UI */
export function createResultsUI(
  element: HTMLElement,
  victory: boolean,
  contract: Contract | null,
  state: CampaignState,
  onContinue: () => void,
  world?: World,
): ResultsUI {
  const debriefData = world ? collectDebriefData(world) : null;
  element.innerHTML = renderResults(victory, contract, state, debriefData);

  // Bind continue button
  const btn = element.querySelector('#btn-continue');
  if (btn) {
    btn.addEventListener('click', onContinue);
  }

  return {
    element,
    onContinue,
  };
}

/** Render game over screen */
function renderGameOver(state: CampaignState): string {
  return `
    <h1 class="game-over-title">GAME OVER</h1>

    <div class="screen-panel">
      <div class="game-over-stats">
        <div>Your ship was destroyed.</div>
        <div style="margin-top: 20px;">
          Final Credits: ${state.credits}
        </div>
        <div>
          Missions Completed: ${state.missionCount}
        </div>
        <div>
          Sector Reached: ${state.currentSector}
        </div>
      </div>

      <button class="btn btn-primary" id="btn-restart">
        Start New Campaign
      </button>
    </div>
  `;
}

/** Create game over UI */
export function createGameOverUI(
  element: HTMLElement,
  state: CampaignState,
  onRestart: () => void,
): void {
  element.innerHTML = renderGameOver(state);

  // Bind restart button
  const btn = element.querySelector('#btn-restart');
  if (btn) {
    btn.addEventListener('click', onRestart);
  }
}
