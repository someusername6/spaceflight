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

/** Escort mission results for display */
export interface EscortResultsDisplay {
  convoySurvived: number;
  convoyTotal: number;
}

/** Ambush mission results for display */
export interface AmbushResultsDisplay {
  convoyDestroyed: number;
  convoyStopped: number;
  convoyEscaped: number;
  totalConvoy: number;
}

/** Station defense mission results for display */
export interface StationDefenseResultsDisplay {
  stationHealthPercent: number;
  reinforcementsArrived: boolean;
}

/** Attack station mission results for display */
export interface AttackStationResultsDisplay {
  stationDestroyed: boolean;
  stationDamagePercent: number;
  reinforcementsReceived: number;
  totalReinforcements: number;
  overwhelmed: boolean;
}

/** Results screen props */
interface ResultsProps {
  victory: boolean;
  contract: Contract | null;
  campaignState: CampaignState;
  debriefData: MissionDebriefData | null;
  salvage: SalvageResult | null;
  onContinue: () => void;
  /** Actual reward earned (with multipliers applied) */
  earnedReward: number | undefined;
  /** Convoy survival results for escort missions */
  escortResults: EscortResultsDisplay | undefined;
  /** Convoy results for ambush missions */
  ambushResults: AmbushResultsDisplay | undefined;
  /** Station defense results */
  stationDefenseResults: StationDefenseResultsDisplay | undefined;
  /** Attack station results */
  attackStationResults: AttackStationResultsDisplay | undefined;
}

/** Legacy UI interface for backwards compatibility */
export interface ResultsUI {
  element: HTMLElement;
  onContinue: () => void;
  selectedTab: ResultsTab;
}

// Re-export createGameOverUI from game-over module
export { createGameOverUI } from './game-over';

// Re-export createRetirementUI from retirement-screen module
export { createRetirementUI } from './retirement-screen';

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
  earnedReward?: number,
  escortResults?: EscortResultsDisplay,
  ambushResults?: AmbushResultsDisplay,
  stationDefenseResults?: StationDefenseResultsDisplay,
  attackStationResults?: AttackStationResultsDisplay,
): string {
  const titleClass = victory ? 'victory' : 'defeat';
  const titleText = victory ? 'VICTORY' : 'DEFEAT';

  // Use actual earned reward if provided, otherwise fall back to contract base
  const displayReward =
    earnedReward ?? (victory && contract ? contract.reward : 0);

  // Escort mission details
  const escortHtml = escortResults
    ? `
      <div class="rewards-escort-details">
        <span class="escort-survival">Convoy: ${escortResults.convoySurvived}/${escortResults.convoyTotal} survived</span>
        ${
          escortResults.convoySurvived < escortResults.convoyTotal
            ? `<span class="escort-penalty">(${Math.round((escortResults.convoySurvived / escortResults.convoyTotal) * 100)}% reward)</span>`
            : ''
        }
      </div>
    `
    : '';

  // Ambush mission details
  let ambushHtml = '';
  if (ambushResults) {
    const destroyed = ambushResults.convoyDestroyed;
    const stopped = ambushResults.convoyStopped;
    const escaped = ambushResults.convoyEscaped;
    const total = ambushResults.totalConvoy;
    const neutralized = destroyed + stopped;
    const rewardPct = Math.round(((stopped + destroyed * 0.5) / total) * 100);
    ambushHtml = `
      <div class="rewards-ambush-details">
        <span class="ambush-result">${neutralized}/${total} targets neutralized</span>
        <span class="ambush-breakdown">(${stopped} stopped, ${destroyed} destroyed${escaped > 0 ? `, ${escaped} escaped` : ''})</span>
        ${rewardPct < 100 ? `<span class="ambush-reward">(${rewardPct}% reward)</span>` : ''}
      </div>
    `;
  }

  // Station defense mission details
  let stationDefenseHtml = '';
  if (stationDefenseResults) {
    // stationHealthPercent is already 0-100, no multiplication needed
    const healthPct = Math.round(stationDefenseResults.stationHealthPercent);
    const reinforced = stationDefenseResults.reinforcementsArrived;
    const statusText = reinforced
      ? 'Reinforcements arrived'
      : 'Enemies repelled';
    stationDefenseHtml = `
      <div class="rewards-station-details">
        <span class="station-health">Station: ${healthPct}% hull remaining</span>
        <span class="station-reinforcements">${statusText}</span>
      </div>
    `;
  }

  // Attack station mission details
  let attackStationHtml = '';
  if (attackStationResults) {
    const destroyed = attackStationResults.stationDestroyed;
    const damagePct = attackStationResults.stationDamagePercent;
    const reinforcements = attackStationResults.reinforcementsReceived;
    const totalReinforcements = attackStationResults.totalReinforcements;
    const overwhelmed = attackStationResults.overwhelmed;
    attackStationHtml = `
      <div class="rewards-attack-station-details">
        <span class="attack-result">${destroyed ? 'Station Destroyed' : `Station Damage: ${damagePct}%`}</span>
        <span class="attack-reinforcements">Reinforcements: ${reinforcements}/${totalReinforcements} waves</span>
        ${overwhelmed ? '<span class="attack-overwhelmed">Overwhelming force deployed</span>' : ''}
      </div>
    `;
  }

  const contractRewardHtml = contract
    ? `
      <div class="rewards-contract">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">▶</span>
          <span class="rewards-section-title">CONTRACT REWARD</span>
        </div>
        <div class="rewards-contract-details">
          <div class="rewards-contract-name">${contract.name}</div>
          ${escortHtml}
          ${ambushHtml}
          ${stationDefenseHtml}
          ${attackStationHtml}
          <div class="rewards-contract-amount ${victory ? 'earned' : 'failed'}">
            ${victory ? `+${displayReward.toLocaleString()} cr` : 'Mission Failed'}
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
    const {
      victory,
      contract,
      campaignState,
      debriefData,
      salvage,
      earnedReward,
      escortResults,
      ambushResults,
      stationDefenseResults,
      attackStationResults,
    } = props;

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
        : renderRewards(
            victory,
            contract,
            salvage,
            earnedReward,
            escortResults,
            ambushResults,
            stationDefenseResults,
            attackStationResults,
          );

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
  earnedReward?: number,
  escortResults?: EscortResultsDisplay,
  ambushResults?: AmbushResultsDisplay,
  stationDefenseResults?: StationDefenseResultsDisplay,
  attackStationResults?: AttackStationResultsDisplay,
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
    earnedReward,
    escortResults,
    ambushResults,
    stationDefenseResults,
    attackStationResults,
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
