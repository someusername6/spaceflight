/**
 * Retirement Screen - displayed when player retires in sector 5.
 *
 * Shows the player's final credits, retirement tier, and campaign summary.
 * This is a "victory" ending screen, distinct from game over.
 */

import {
  getRetirementTier,
  getTierIndex,
  RETIREMENT_TIERS,
} from '../../../campaign/retirement';
import type { CampaignState } from '../../../campaign/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';

/** Retirement screen state (empty - no interactive state) */
interface RetirementScreenState {
  _placeholder: boolean;
}

/** Retirement screen props */
interface RetirementScreenProps {
  campaignState: CampaignState;
  onRestart: () => void;
}

/** Render the tier achievement bar */
function renderTierAchievementBar(credits: number): string {
  const currentTierIndex = getTierIndex(credits);

  const segments = RETIREMENT_TIERS.map((tier, index) => {
    const isReached = index <= currentTierIndex;
    const isCurrent = index === currentTierIndex;
    return `
      <div class="retirement-screen-tier-segment ${isReached ? 'reached' : ''} ${isCurrent ? 'current' : ''}"
           title="${tier.name}: ${tier.minCredits.toLocaleString()}+ cr">
      </div>
    `;
  }).join('');

  const labels = RETIREMENT_TIERS.map((tier, index) => {
    const isReached = index <= currentTierIndex;
    return `
      <div class="retirement-screen-tier-label ${isReached ? 'reached' : ''}">
        ${tier.name}
      </div>
    `;
  }).join('');

  return `
    <div class="retirement-screen-tier-bar-container">
      <div class="retirement-screen-tier-bar">${segments}</div>
      <div class="retirement-screen-tier-labels">${labels}</div>
    </div>
  `;
}

/** Retirement screen component */
const RetirementScreenComponent: Screen<
  RetirementScreenState,
  RetirementScreenProps
> = {
  render(_state, props) {
    const { campaignState } = props;
    const tier = getRetirementTier(campaignState.credits);
    const isIronman = campaignState.settings?.ironmanMode ?? false;

    const leaderboardNote = isIronman
      ? '<div class="retirement-screen-leaderboard">Your score has been recorded in the leaderboard.</div>'
      : '';

    return `
      <div class="results-screen retirement-screen">
        <div class="retirement-screen-header">
          <h1 class="retirement-screen-title">SQUADRON RETIRED</h1>
          <div class="retirement-screen-tier-display">
            <span class="retirement-screen-tier-label-main">Retirement Tier</span>
            <span class="retirement-screen-tier-name tier-${tier.id}">${tier.name}</span>
          </div>
        </div>

        <div class="retirement-screen-content">
          <div class="retirement-screen-stats">
            <div class="retirement-screen-stat">
              <span class="stat-value">${campaignState.missionCount}</span>
              <span class="stat-label">Missions</span>
            </div>
            <div class="retirement-screen-stat highlight">
              <span class="stat-value">${campaignState.credits.toLocaleString()}</span>
              <span class="stat-label">Final Credits</span>
            </div>
            <div class="retirement-screen-stat">
              <span class="stat-value">${campaignState.currentSector}</span>
              <span class="stat-label">Sector</span>
            </div>
          </div>

          ${renderTierAchievementBar(campaignState.credits)}

          <div class="retirement-screen-narrative">
            <p class="retirement-screen-description">"${tier.description}"</p>
            <p class="retirement-screen-story">${tier.narrative}</p>
          </div>

          ${leaderboardNote}
        </div>

        <footer class="retirement-screen-footer">
          <button class="btn btn-xl btn-primary" id="btn-return-title">
            Return to Title
          </button>
        </footer>
      </div>
    `;
  },

  bind(api: ScreenAPI<RetirementScreenState>, props: RetirementScreenProps) {
    api.on('#btn-return-title', 'click', () => {
      props.onRestart();
    });
  },
};

/** Screen handle for retirement screen */
let retirementScreenHandle: ScreenHandle<
  RetirementScreenState,
  RetirementScreenProps
> | null = null;

/** Create retirement UI */
export function createRetirementUI(
  element: HTMLElement,
  state: CampaignState,
  onRestart: () => void,
): void {
  // Clean up previous handle
  retirementScreenHandle?.destroy();

  const initialState: RetirementScreenState = { _placeholder: true };
  const props: RetirementScreenProps = {
    campaignState: state,
    onRestart,
  };

  retirementScreenHandle = createScreen(
    RetirementScreenComponent,
    element,
    initialState,
    props,
  );
}
