/**
 * Game Over screen - displayed when commander dies in battle.
 *
 * Shows campaign summary statistics and final mission debrief.
 */

import type { CampaignState } from '../../../campaign/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../../framework/screen';
import { type MissionDebriefData, renderDebrief } from './debrief';

/** Game over state (empty - no interactive state) */
interface GameOverState {
  _placeholder: boolean;
}

/** Game over props */
interface GameOverProps {
  campaignState: CampaignState;
  onRestart: () => void;
  debriefData: MissionDebriefData | null;
}

/** Game over screen component */
const GameOverScreenComponent: Screen<GameOverState, GameOverProps> = {
  render(_state, props) {
    const { campaignState, debriefData } = props;

    // Render debrief section if available
    const debriefHtml = debriefData
      ? renderDebrief(debriefData)
      : '<div class="game-over-no-debrief">No combat data available</div>';

    return `
      <div class="results-screen game-over-screen">
        <div class="game-over-header">
          <h1 class="game-over-title">GAME OVER</h1>
          <div class="game-over-summary">
            <div class="game-over-message">Your commander was killed in action.</div>
            <div class="game-over-campaign-stats">
              <div class="game-over-stat">
                <span class="stat-value">${campaignState.missionCount}</span>
                <span class="stat-label">Missions</span>
              </div>
              <div class="game-over-stat">
                <span class="stat-value">${campaignState.currentSector}</span>
                <span class="stat-label">Sector</span>
              </div>
              <div class="game-over-stat">
                <span class="stat-value">${campaignState.credits.toLocaleString()}</span>
                <span class="stat-label">Credits</span>
              </div>
            </div>
          </div>
        </div>
        <div class="game-over-debrief">
          ${debriefHtml}
        </div>
        <footer class="game-over-footer">
          <button class="btn btn-xl btn-danger" id="btn-restart">
            Start New Campaign
          </button>
        </footer>
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
  debriefData?: MissionDebriefData | null,
): void {
  // Clean up previous handle
  gameOverScreenHandle?.destroy();

  const initialState: GameOverState = { _placeholder: true };
  const props: GameOverProps = {
    campaignState: state,
    onRestart,
    debriefData: debriefData ?? null,
  };

  gameOverScreenHandle = createScreen(
    GameOverScreenComponent,
    element,
    initialState,
    props,
  );
}
