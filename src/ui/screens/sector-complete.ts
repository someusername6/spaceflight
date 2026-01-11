/**
 * Sector Complete Screen - shown when player completes enough missions to advance.
 *
 * Displays sector completion celebration and advancement button.
 */

import {
  MAX_SECTOR,
  MISSIONS_PER_SECTOR,
  SECTOR_NAMES,
} from '../../campaign/types';
import {
  createScreen,
  type Screen,
  type ScreenAPI,
  type ScreenHandle,
} from '../framework/screen';

/** Sector complete screen state (minimal - no interactive state needed) */
interface SectorCompleteState {
  _placeholder: boolean;
}

/** Sector complete screen props */
interface SectorCompleteProps {
  currentSector: number;
  missionsCompleted: number;
  totalCredits: number;
  onAdvance: () => void;
}

/** Sector complete screen component */
const SectorCompleteScreenComponent: Screen<
  SectorCompleteState,
  SectorCompleteProps
> = {
  render(_state, props) {
    const { currentSector, missionsCompleted, totalCredits } = props;

    const currentSectorName =
      SECTOR_NAMES[currentSector] || `Sector ${currentSector}`;
    const nextSector = currentSector + 1;
    const nextSectorName = SECTOR_NAMES[nextSector] || `Sector ${nextSector}`;
    const isEndless = nextSector >= MAX_SECTOR;

    // Build stats display
    const statsHtml = `
      <div class="sector-complete-stats">
        <div class="sector-stat">
          <span class="sector-stat-label">Missions Completed</span>
          <span class="sector-stat-value">${missionsCompleted}</span>
        </div>
        <div class="sector-stat">
          <span class="sector-stat-label">Credits Earned</span>
          <span class="sector-stat-value">${totalCredits.toLocaleString()}</span>
        </div>
      </div>
    `;

    // Next sector preview
    const nextSectorHtml = isEndless
      ? `
        <div class="sector-complete-next">
          <div class="next-sector-label">ENTERING</div>
          <div class="next-sector-name endless">ENDLESS MODE</div>
          <div class="next-sector-desc">No limits. No retreat. Fight until the end.</div>
        </div>
      `
      : `
        <div class="sector-complete-next">
          <div class="next-sector-label">NEXT DESTINATION</div>
          <div class="next-sector-name">${nextSectorName}</div>
          <div class="next-sector-desc">Sector ${nextSector} - Tougher enemies, better rewards</div>
        </div>
      `;

    const buttonText = isEndless
      ? 'Enter Endless Mode'
      : `Advance to ${nextSectorName}`;

    return `
      <div class="sector-complete-screen">
        <div class="sector-complete-content">
          <div class="sector-complete-header">
            <div class="sector-complete-badge">SECTOR COMPLETE</div>
            <h1 class="sector-complete-title">${currentSectorName}</h1>
            <div class="sector-complete-subtitle">Area Secured</div>
          </div>

          ${statsHtml}
          ${nextSectorHtml}

          <div class="sector-complete-actions">
            <button class="btn btn-xl btn-success" id="btn-advance-sector">
              ${buttonText}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<SectorCompleteState>, props: SectorCompleteProps) {
    api.on('#btn-advance-sector', 'click', () => {
      props.onAdvance();
    });
  },
};

/** Screen handle for sector complete */
let sectorCompleteHandle: ScreenHandle<
  SectorCompleteState,
  SectorCompleteProps
> | null = null;

/** Create sector complete UI */
export function createSectorCompleteUI(
  element: HTMLElement,
  currentSector: number,
  missionsCompleted: number,
  totalCredits: number,
  onAdvance: () => void,
): void {
  // Clean up previous handle
  sectorCompleteHandle?.destroy();

  const initialState: SectorCompleteState = { _placeholder: true };
  const props: SectorCompleteProps = {
    currentSector,
    missionsCompleted,
    totalCredits,
    onAdvance,
  };

  sectorCompleteHandle = createScreen(
    SectorCompleteScreenComponent,
    element,
    initialState,
    props,
  );
}

/** Check if sector complete screen should be shown */
export function shouldShowSectorComplete(
  sectorMissionsCompleted: number,
  currentSector: number,
): boolean {
  return (
    sectorMissionsCompleted >= MISSIONS_PER_SECTOR && currentSector < MAX_SECTOR
  );
}
