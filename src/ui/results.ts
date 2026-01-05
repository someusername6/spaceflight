/**
 * Results screen - displays mission outcome and combat debrief.
 */

import { calculateSalvageBonus } from '../campaign/state';
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
  salvageBonus: number,
): string {
  const title = victory ? 'VICTORY' : 'DEFEAT';
  const titleClass = victory ? 'victory' : 'defeat';
  const baseReward = victory && contract ? contract.reward : 0;
  const totalEarned = baseReward + salvageBonus;

  const debriefSection = debriefData ? renderDebrief(debriefData) : '';

  // Build credits breakdown
  let creditsHtml = '';
  if (totalEarned > 0) {
    creditsHtml = '<div class="credits-breakdown">';
    if (baseReward > 0) {
      creditsHtml += `<div style="color: #44cc66;">+ ${baseReward} mission reward</div>`;
    }
    if (salvageBonus > 0) {
      creditsHtml += `<div style="color: #66aacc;">+ ${salvageBonus} salvage bonus</div>`;
    }
    creditsHtml += '</div>';
  }

  return `
    <h1 class="result-title ${titleClass}">${title}</h1>

    <div class="screen-panel results-panel">
      <div class="result-stats">
        ${contract ? `<div>Mission: ${contract.name}</div>` : ''}
        ${creditsHtml}
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

  // Calculate salvage bonus from destroyed ships
  const matchStats = world?.systemState.matchStats;
  const salvageBonus = matchStats
    ? calculateSalvageBonus(matchStats.destroyedShips)
    : 0;

  element.innerHTML = renderResults(
    victory,
    contract,
    state,
    debriefData,
    salvageBonus,
  );

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
