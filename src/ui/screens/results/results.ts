/**
 * Results screen - displays mission outcome, combat debrief, and rewards.
 *
 * Layout:
 * - Results tab bar (Debrief / Rewards) with status display
 * - Scrollable content area
 * - Fixed continue button at bottom
 */

import type { SalvageResult } from '../../../campaign/salvage';
import type { CampaignState, Contract } from '../../../campaign/types';
import type { World } from '../../../core/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import {
  collectDebriefData,
  type MissionDebriefData,
  renderDebrief,
} from './debrief';
import { renderSalvageSection } from './results-salvage';

/** Results tab type */
export type ResultsTab = 'debrief' | 'rewards';

/** Results screen state */
interface ResultsState {
  selectedTab: ResultsTab;
}

/** Results screen props */
interface ResultsProps {
  victory: boolean;
  contract: Contract | null;
  campaignState: CampaignState;
  debriefData: MissionDebriefData | null;
  salvage: SalvageResult | null;
  onContinue: () => void;
}

/** Legacy UI interface for backwards compatibility */
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

/** Results screen component */
const ResultsScreenComponent: Screen<ResultsState, ResultsProps> = {
  render(state, props) {
    const { victory, contract, campaignState, debriefData, salvage } = props;

    const tabBar = renderResultsTabBar(
      state.selectedTab,
      campaignState.credits,
      campaignState.currentSector,
    );

    // Tab content
    const tabContent =
      state.selectedTab === 'debrief'
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
  },

  bind(api: ScreenAPI<ResultsState>, props: ResultsProps) {
    // Continue button
    api.on('#btn-continue', 'click', () => {
      props.onContinue();
    });

    // Tab buttons
    api.on('.results-tab', 'click', (_e, el) => {
      const tab = el.dataset.tab as ResultsTab;
      if (tab) {
        const state = api.getState();
        if (tab !== state.selectedTab) {
          api.setState({ selectedTab: tab });
        }
      }
    });
  },
};

/** Screen handle for external control */
let resultsScreenHandle: ScreenHandle<ResultsState, ResultsProps> | null = null;

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
  // Clean up previous handle
  resultsScreenHandle?.destroy();

  const debriefData = world ? collectDebriefData(world) : null;
  const initialState: ResultsState = { selectedTab: 'debrief' };
  const props: ResultsProps = {
    victory,
    contract,
    campaignState: state,
    debriefData,
    salvage: salvage ?? null,
    onContinue,
  };

  resultsScreenHandle = createScreen(
    ResultsScreenComponent,
    element,
    initialState,
    props,
  );

  // Return legacy UI object for compatibility
  return {
    element,
    onContinue,
    selectedTab: 'debrief',
  };
}

/** Game over state (empty - no interactive state) */
interface GameOverState {
  _placeholder: boolean;
}

/** Game over props */
interface GameOverProps {
  campaignState: CampaignState;
  onRestart: () => void;
}

/** Game over screen component */
const GameOverScreenComponent: Screen<GameOverState, GameOverProps> = {
  render(_state, props) {
    const { campaignState } = props;

    return `
      <div class="results-screen game-over-screen">
        <div class="game-over-content">
          <h1 class="game-over-title">GAME OVER</h1>
          <div class="game-over-stats">
            <div class="game-over-message">Your ship was destroyed.</div>
            <div class="game-over-stat">
              <span class="stat-label">Final Credits</span>
              <span class="stat-value">${campaignState.credits.toLocaleString()}</span>
            </div>
            <div class="game-over-stat">
              <span class="stat-label">Missions Completed</span>
              <span class="stat-value">${campaignState.missionCount}</span>
            </div>
            <div class="game-over-stat">
              <span class="stat-label">Sector Reached</span>
              <span class="stat-value">${campaignState.currentSector}</span>
            </div>
          </div>
          <button class="btn btn-xl btn-danger" id="btn-restart">
            Start New Campaign
          </button>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<GameOverState>, props: GameOverProps) {
    api.on('#btn-restart', 'click', () => {
      props.onRestart();
    });
  },
};

/** Screen handle for game over */
let gameOverScreenHandle: ScreenHandle<GameOverState, GameOverProps> | null =
  null;

/** Create game over UI */
export function createGameOverUI(
  element: HTMLElement,
  state: CampaignState,
  onRestart: () => void,
): void {
  // Clean up previous handle
  gameOverScreenHandle?.destroy();

  const initialState: GameOverState = { _placeholder: true };
  const props: GameOverProps = {
    campaignState: state,
    onRestart,
  };

  gameOverScreenHandle = createScreen(
    GameOverScreenComponent,
    element,
    initialState,
    props,
  );
}
