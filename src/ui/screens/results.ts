/**
 * Results screen - displays mission outcome, combat debrief, and rewards.
 *
 * Layout:
 * - Results tab bar (Debrief / Rewards) with status display
 * - Scrollable content area
 * - Fixed continue button at bottom
 */

import type { SalvageResult } from '../../campaign/salvage';
import type { CampaignState, Contract } from '../../campaign/types';
import type { World } from '../../core/types';
import {
  collectDebriefData,
  type MissionDebriefData,
  renderDebrief,
} from './debrief';

/** Results tab type */
export type ResultsTab = 'debrief' | 'rewards';

/** Results UI state */
export interface ResultsUI {
  element: HTMLElement;
  onContinue: () => void;
  selectedTab: ResultsTab;
}

/** Render the results tab bar */
function renderResultsTabBar(
  selectedTab: ResultsTab,
  credits: number,
  sector: number,
): string {
  const tabs: { id: ResultsTab; label: string; icon: string }[] = [
    { id: 'debrief', label: 'DEBRIEF', icon: '◆' },
    { id: 'rewards', label: 'REWARDS', icon: '★' },
  ];

  const tabsHtml = tabs
    .map(
      (tab) => `
      <button
        class="results-tab ${selectedTab === tab.id ? 'active' : ''}"
        data-tab="${tab.id}"
        role="tab"
        aria-selected="${selectedTab === tab.id}"
        tabindex="${selectedTab === tab.id ? '0' : '-1'}"
      >
        <span class="results-tab-icon" aria-hidden="true">${tab.icon}</span>
        <span class="results-tab-label">${tab.label}</span>
      </button>
    `,
    )
    .join('');

  return `
    <nav class="results-tab-bar" role="navigation" aria-label="Results navigation">
      <div class="results-tabs-group" role="tablist" aria-label="Results sections">
        ${tabsHtml}
      </div>
      <div class="results-status" role="status" aria-label="Player status">
        <div class="results-status-item">
          <span class="results-status-label">SECTOR</span>
          <span class="results-status-value">${sector}</span>
        </div>
        <div class="results-status-item">
          <span class="results-status-label">CREDITS</span>
          <span class="results-status-value results-credits">${credits.toLocaleString()}</span>
        </div>
      </div>
    </nav>
  `;
}

/** Render the rewards tab content */
function renderRewards(
  victory: boolean,
  contract: Contract | null,
  salvage: SalvageResult | null,
): string {
  const titleClass = victory ? 'victory' : 'defeat';
  const titleText = victory ? 'VICTORY' : 'DEFEAT';

  // Contract reward section
  const baseReward = victory && contract ? contract.reward : 0;
  const contractRewardHtml = contract
    ? `
      <div class="rewards-contract">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">▶</span>
          <span class="rewards-section-title">CONTRACT REWARD</span>
        </div>
        <div class="rewards-contract-details">
          <div class="rewards-contract-name">${contract.name}</div>
          <div class="rewards-contract-amount ${victory ? 'earned' : 'failed'}">
            ${victory ? `+${baseReward.toLocaleString()} cr` : 'Mission Failed'}
          </div>
        </div>
      </div>
    `
    : '';

  // Salvage section
  const salvageHtml = renderSalvageSection(salvage);

  return `
    <div class="rewards-content">
      <div class="rewards-title ${titleClass}">${titleText}</div>
      ${contractRewardHtml}
      ${salvageHtml}
    </div>
  `;
}

/** Render salvage section within rewards */
function renderSalvageSection(salvage: SalvageResult | null): string {
  if (!salvage) {
    return `
      <div class="rewards-salvage">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">◈</span>
          <span class="rewards-section-title">SALVAGE</span>
        </div>
        <div class="salvage-empty">No salvage collected</div>
      </div>
    `;
  }

  const scrapEntries = Object.entries(salvage.scrap);
  const hasScrap = scrapEntries.length > 0;
  const hasWeapons = salvage.weapons.length > 0;
  const hasAmmo = salvage.ammo.length > 0;

  if (!hasScrap && !hasWeapons && !hasAmmo) {
    return `
      <div class="rewards-salvage">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">◈</span>
          <span class="rewards-section-title">SALVAGE</span>
        </div>
        <div class="salvage-empty">No salvage collected</div>
      </div>
    `;
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
    <div class="rewards-salvage">
      <div class="rewards-section-header">
        <span class="rewards-section-icon" aria-hidden="true">◈</span>
        <span class="rewards-section-title">SALVAGE</span>
        <span class="rewards-section-value">Est. Value: ~${totalValueStr} cr</span>
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
  selectedTab: ResultsTab,
): string {
  const tabBar = renderResultsTabBar(
    selectedTab,
    state.credits,
    state.currentSector,
  );

  // Tab content
  const tabContent =
    selectedTab === 'debrief'
      ? debriefData
        ? renderDebrief(debriefData)
        : '<div class="empty-state-panel">No debrief data available</div>'
      : renderRewards(victory, contract, salvage);

  const buttonText = victory ? 'Return to Hangar' : 'Continue';

  return `
    <div class="results-screen">
      ${tabBar}
      <main class="results-main" aria-label="Mission results">
        <div class="results-content-scroll">
          ${tabContent}
        </div>
      </main>
      <footer class="results-footer">
        <button class="btn btn-xl btn-primary" id="btn-continue">
          ${buttonText}
        </button>
      </footer>
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
    element.querySelectorAll('.results-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const tab = (tabBtn as HTMLElement).dataset.tab as ResultsTab;
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
    <div class="results-screen game-over-screen">
      <div class="game-over-content">
        <h1 class="game-over-title">GAME OVER</h1>
        <div class="game-over-stats">
          <div class="game-over-message">Your ship was destroyed.</div>
          <div class="game-over-stat">
            <span class="stat-label">Final Credits</span>
            <span class="stat-value">${state.credits.toLocaleString()}</span>
          </div>
          <div class="game-over-stat">
            <span class="stat-label">Missions Completed</span>
            <span class="stat-value">${state.missionCount}</span>
          </div>
          <div class="game-over-stat">
            <span class="stat-label">Sector Reached</span>
            <span class="stat-value">${state.currentSector}</span>
          </div>
        </div>
        <button class="btn btn-xl btn-danger" id="btn-restart">
          Start New Campaign
        </button>
      </div>
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
