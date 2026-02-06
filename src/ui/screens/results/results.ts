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
import type { ChatEntry } from '../../../multiplayer/lobby-state';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import { renderChatFooter, scrollChatFooterToBottom } from './chat-footer';
import {
  collectDebriefData,
  type MissionDebriefData,
  renderDebrief,
} from './debrief';
import {
  type AmbushResultsDisplay,
  type AttackStationResultsDisplay,
  type EscortResultsDisplay,
  renderRewards,
  type SalaryInfo,
  type StationDefenseResultsDisplay,
} from './results-rewards';

// Re-export result display types for external use
export type {
  AmbushResultsDisplay,
  AttackStationResultsDisplay,
  EscortResultsDisplay,
  StationDefenseResultsDisplay,
} from './results-rewards';

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
  /** Salary breakdown for display */
  salaryInfo: SalaryInfo | undefined;
  // Multiplayer props (optional)
  /** Whether this is a multiplayer session */
  isMultiplayer?: boolean;
  /** Whether local player is the host */
  isHost?: boolean;
  /** Chat messages for debrief chat footer */
  chatMessages?: ChatEntry[];
  /** Callback to send chat message */
  onSendChat?: (text: string) => void;
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

/** Render the footer for singleplayer or multiplayer */
function renderResultsFooter(
  victory: boolean,
  isMultiplayer?: boolean,
  isHost?: boolean,
  chatMessages?: ChatEntry[],
): string {
  // Singleplayer: just the continue button
  if (!isMultiplayer) {
    const buttonText = victory ? 'Return to Hangar' : 'Continue';
    return `
      <footer class="results-footer">
        <button class="btn btn-xl btn-primary" id="btn-continue">
          ${buttonText}
        </button>
      </footer>
    `;
  }

  // Multiplayer: chat footer + action area
  const chatHtml = renderChatFooter(chatMessages ?? []);

  // Host gets Continue button, guest gets waiting message
  const actionHtml = isHost
    ? `<button class="btn btn-xl btn-primary" id="btn-continue">Continue</button>`
    : `<div class="results-waiting">Waiting for host to continue...</div>`;

  return `
    <footer class="results-footer results-footer-multiplayer">
      ${chatHtml}
      <div class="results-footer-action">
        ${actionHtml}
      </div>
    </footer>
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
      salaryInfo,
      isMultiplayer,
      isHost,
      chatMessages,
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
            salaryInfo,
          );

    const footerHtml = renderResultsFooter(
      victory,
      isMultiplayer,
      isHost,
      chatMessages,
    );

    return `
      <div class="results-screen${isMultiplayer ? ' results-screen-multiplayer' : ''}">
        ${tabBar}
        <main class="results-main" aria-label="Mission results">
          <div class="results-content-scroll">
            ${tabContent}
          </div>
        </main>
        ${footerHtml}
      </div>
    `;
  },

  bind(api: ScreenAPI<ResultsState>, props: ResultsProps) {
    // Continue button (only enabled for host in multiplayer, always enabled in singleplayer)
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

    // Multiplayer chat form
    if (props.isMultiplayer && props.onSendChat) {
      api.on('#chat-footer-form', 'submit', (e) => {
        e.preventDefault();
        const input = document.getElementById(
          'chat-footer-input',
        ) as HTMLInputElement | null;
        if (input?.value.trim()) {
          props.onSendChat?.(input.value.trim());
          input.value = '';
        }
      });

      // Scroll chat to bottom after render
      scrollChatFooterToBottom();
    }
  },
};

/** Screen handle for external control */
let resultsScreenHandle: ScreenHandle<ResultsState, ResultsProps> | null = null;

/** Multiplayer options for results UI */
export interface ResultsMultiplayerOptions {
  isMultiplayer: boolean;
  isHost: boolean;
  chatMessages: ChatEntry[];
  onSendChat: (text: string) => void;
}

/** Options for createResultsUI optional parameters */
export interface CreateResultsOptions {
  world?: World | undefined;
  salvage?: SalvageResult | null | undefined;
  earnedReward?: number | undefined;
  escortResults?: EscortResultsDisplay | undefined;
  ambushResults?: AmbushResultsDisplay | undefined;
  stationDefenseResults?: StationDefenseResultsDisplay | undefined;
  attackStationResults?: AttackStationResultsDisplay | undefined;
  multiplayerOptions?: ResultsMultiplayerOptions | undefined;
  salaryInfo?: SalaryInfo | undefined;
}

/** Create results UI */
export function createResultsUI(
  element: HTMLElement,
  victory: boolean,
  contract: Contract | null,
  state: CampaignState,
  onContinue: () => void,
  options?: CreateResultsOptions,
): ResultsUI {
  // Clean up previous handle
  resultsScreenHandle?.destroy();

  const {
    world,
    salvage,
    earnedReward,
    escortResults,
    ambushResults,
    stationDefenseResults,
    attackStationResults,
    multiplayerOptions,
    salaryInfo,
  } = options ?? {};
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
    salaryInfo,
    // Multiplayer props - only set if options provided
    ...(multiplayerOptions && {
      isMultiplayer: multiplayerOptions.isMultiplayer,
      isHost: multiplayerOptions.isHost,
      chatMessages: multiplayerOptions.chatMessages,
      onSendChat: multiplayerOptions.onSendChat,
    }),
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

/**
 * Update chat messages in the results screen.
 * Called when lobby state changes to keep chat up to date.
 */
export function updateResultsChatMessages(messages: ChatEntry[]): void {
  if (!resultsScreenHandle) return;

  // Get current props, update messages, and re-render
  const currentProps = resultsScreenHandle.getProps();
  resultsScreenHandle.setProps({
    ...currentProps,
    chatMessages: messages,
  });
}
