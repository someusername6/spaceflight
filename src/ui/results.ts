/**
 * Results screen - displays mission outcome and combat debrief.
 */

import type { SalvageResult } from '../campaign/salvage';
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
  selectedTab: 'debrief' | 'salvage';
}

/** Render salvage section */
function renderSalvage(salvage: SalvageResult | null): string {
  if (!salvage) {
    return '<div class="salvage-empty">No salvage collected</div>';
  }

  const scrapEntries = Object.entries(salvage.scrap);
  const hasScrap = scrapEntries.length > 0;
  const hasWeapons = salvage.weapons.length > 0;
  const hasAmmo = salvage.ammo.length > 0;

  if (!hasScrap && !hasWeapons && !hasAmmo) {
    return '<div class="salvage-empty">No salvage collected</div>';
  }

  // Render scrap
  const scrapHtml = hasScrap
    ? `
      <div class="salvage-category">
        <h3>Scrap</h3>
        ${scrapEntries
          .map(
            ([shipClass, count]) => `
          <div class="salvage-item">
            <span class="item-name">${shipClass.charAt(0).toUpperCase() + shipClass.slice(1)} Scrap</span>
            <span class="item-count">×${count}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    `
    : '';

  // Render weapons
  const weaponHtml = hasWeapons
    ? `
      <div class="salvage-category">
        <h3>Weapons</h3>
        ${salvage.weapons
          .map(
            (w) => `
          <div class="salvage-item">
            <span class="item-name">${w.weaponType}</span>
            <span class="item-category">${w.category}</span>
            ${w.count > 1 ? `<span class="item-count">×${w.count}</span>` : ''}
          </div>
        `,
          )
          .join('')}
      </div>
    `
    : '';

  // Render ammo
  const ammoHtml = hasAmmo
    ? `
      <div class="salvage-category">
        <h3>Ammo</h3>
        ${salvage.ammo
          .map(
            (a) => `
          <div class="salvage-item">
            <span class="item-name">${a.weaponType} Ammo</span>
            <span class="item-count">×${a.count}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    `
    : '';

  const totalValueStr = Math.floor(salvage.totalValue).toLocaleString();

  return `
    <div class="salvage-section">
      <div class="salvage-header">
        <h2>Salvage Collected</h2>
        <div class="salvage-value">Est. Value: ~${totalValueStr} cr</div>
      </div>
      <div class="salvage-items">
        ${scrapHtml}
        ${weaponHtml}
        ${ammoHtml}
      </div>
    </div>
  `;
}

/** Render results screen */
function renderResults(
  victory: boolean,
  contract: Contract | null,
  state: CampaignState,
  debriefData: MissionDebriefData | null,
  salvage: SalvageResult | null,
  selectedTab: 'debrief' | 'salvage',
): string {
  const title = victory ? 'VICTORY' : 'DEFEAT';
  const titleClass = victory ? 'victory' : 'defeat';
  const baseReward = victory && contract ? contract.reward : 0;

  // Build credits breakdown
  let creditsHtml = '';
  if (baseReward > 0) {
    creditsHtml = `<div class="credits-breakdown">
      <div style="color: #44cc66;">+ ${baseReward} mission reward</div>
    </div>`;
  }

  // Tab content
  const tabContent =
    selectedTab === 'debrief'
      ? debriefData
        ? renderDebrief(debriefData)
        : ''
      : renderSalvage(salvage);

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

      <div class="results-tabs">
        <button class="tab-btn ${selectedTab === 'debrief' ? 'active' : ''}" data-tab="debrief">
          Debrief
        </button>
        <button class="tab-btn ${selectedTab === 'salvage' ? 'active' : ''}" data-tab="salvage">
          Salvage
        </button>
      </div>

      <div class="results-tab-content">
        ${tabContent}
      </div>

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
  salvage?: SalvageResult | null,
): ResultsUI {
  const debriefData = world ? collectDebriefData(world) : null;

  const ui: ResultsUI = {
    element,
    onContinue,
    selectedTab: 'debrief',
  };

  // Internal render and bind
  const renderAndBind = () => {
    element.innerHTML = renderResults(
      victory,
      contract,
      state,
      debriefData,
      salvage ?? null,
      ui.selectedTab,
    );

    // Bind continue button
    const btn = element.querySelector('#btn-continue');
    if (btn) {
      btn.addEventListener('click', onContinue);
    }

    // Bind tab buttons
    element.querySelectorAll('.tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const tab = (tabBtn as HTMLElement).dataset.tab as
          | 'debrief'
          | 'salvage';
        if (tab && tab !== ui.selectedTab) {
          ui.selectedTab = tab;
          renderAndBind();
        }
      });
    });
  };

  renderAndBind();
  return ui;
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
