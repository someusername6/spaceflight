/**
 * Retirement Modal - End-game screen for completing the campaign.
 *
 * Shows the player's accumulated credits, retirement tier, and allows
 * them to confirm retirement (ending the campaign and saving to leaderboard).
 */

import {
  getCreditsToNextTier,
  getNextTier,
  getRetirementTier,
  getTierIndex,
  RETIREMENT_TIERS,
} from '../../campaign/retirement';
import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';

/** Result of the retirement modal */
export interface RetirementResult {
  confirmed: boolean;
}

/** Modal state (no state needed) */
type RetirementModalState = Record<string, never>;

/** Modal props */
interface RetirementModalProps extends ModalProps<RetirementResult> {
  credits: number;
  isIronman: boolean;
}

/** Render the tier progress bar */
function renderTierBar(credits: number): string {
  const currentTierIndex = getTierIndex(credits);
  const segments = RETIREMENT_TIERS.map((tier, index) => {
    const isReached = index <= currentTierIndex;
    const isCurrent = index === currentTierIndex;
    return `
      <div class="tier-segment ${isReached ? 'reached' : ''} ${isCurrent ? 'current' : ''}"
           title="${tier.name}: ${tier.minCredits.toLocaleString()}+ cr">
      </div>
    `;
  }).join('');

  const labels = RETIREMENT_TIERS.map((tier, index) => {
    const isReached = index <= currentTierIndex;
    return `
      <div class="tier-label ${isReached ? 'reached' : ''}">
        ${tier.name}
      </div>
    `;
  }).join('');

  return `
    <div class="tier-bar-container">
      <div class="tier-bar">${segments}</div>
      <div class="tier-labels">${labels}</div>
    </div>
  `;
}

/** Retirement modal screen component */
const RetirementModalScreen: Screen<
  RetirementModalState,
  RetirementModalProps
> = {
  render(_state, props) {
    const { credits, isIronman } = props;
    const currentTier = getRetirementTier(credits);
    const nextTier = getNextTier(credits);
    const creditsToNext = getCreditsToNextTier(credits);

    const nextTierHint = nextTier
      ? `<div class="retirement-next-tier">
           ${creditsToNext.toLocaleString()} more credits to reach <strong>${nextTier.name}</strong>
         </div>`
      : '<div class="retirement-next-tier max-tier">Maximum tier achieved!</div>';

    const leaderboardNote = isIronman
      ? '<div class="retirement-leaderboard-note">Your score will be saved to the leaderboard.</div>'
      : '';

    return `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="retire-title">
        <div class="modal-panel retirement-modal">
          <h2 id="retire-title" class="modal-title">Retire Squadron?</h2>

          <div class="retirement-info">
            <div class="retirement-credits">
              <span class="retirement-label">Final Credits</span>
              <span class="retirement-value">${credits.toLocaleString()} cr</span>
            </div>

            <div class="retirement-tier">
              <span class="retirement-label">Retirement Tier</span>
              <span class="retirement-value retirement-tier-name tier-${currentTier.id}">${currentTier.name}</span>
            </div>

            ${renderTierBar(credits)}
            ${nextTierHint}
          </div>

          <div class="retirement-narrative">
            <p class="retirement-description">"${currentTier.description}"</p>
            <p class="retirement-story">${currentTier.narrative}</p>
          </div>

          ${leaderboardNote}

          <div class="retirement-warning">
            This will end your campaign. This action cannot be undone.
          </div>

          <div class="modal-buttons">
            <button class="btn btn-large" id="btn-retire-cancel">Keep Flying</button>
            <button class="btn btn-large btn-primary" id="btn-retire-confirm">
              Retire
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<RetirementModalState>, props: RetirementModalProps) {
    // Cancel button
    api.on('#btn-retire-cancel', 'click', () => {
      props.onComplete({ confirmed: false });
    });

    // Confirm button
    api.on('#btn-retire-confirm', 'click', () => {
      props.onComplete({ confirmed: true });
    });

    // Escape key to cancel
    api.onGlobal('keydown', (e) => {
      if ((e as KeyboardEvent).code === 'Escape') {
        e.preventDefault();
        props.onComplete({ confirmed: false });
      }
    });
  },
};

/**
 * Show the retirement confirmation modal.
 * @param credits - Player's current credits
 * @param isIronman - Whether this is an ironman campaign (affects leaderboard)
 * @returns Promise resolving to whether the user confirmed
 */
export function showRetirementModal(
  credits: number,
  isIronman: boolean,
): Promise<RetirementResult> {
  const initialState: RetirementModalState = {};

  return showModal<
    RetirementModalState,
    RetirementModalProps,
    RetirementResult
  >(RetirementModalScreen, initialState, { credits, isIronman });
}
