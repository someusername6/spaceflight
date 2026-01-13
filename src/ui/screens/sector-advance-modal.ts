/**
 * Sector Advance Modal - Confirmation dialog for advancing to next sector.
 *
 * Shows current sector, target sector, and enemy difficulty warning.
 * Allows player to "skip ahead" without completing all missions.
 */

import { MAX_SECTOR, SECTOR_NAMES } from '../../campaign/types';
import {
  type ModalProps,
  type Screen,
  type ScreenAPI,
  showModal,
} from '../framework/screen';

/** Result of the sector advance modal */
export interface SectorAdvanceResult {
  confirmed: boolean;
}

/** Threat descriptions per sector (for display) */
const SECTOR_THREAT_LEVELS: Record<number, string> = {
  1: 'Light patrols, rookie pilots',
  2: 'Coordinated squads, veteran pilots',
  3: 'Heavy ordnance, ace pilots',
  4: 'Elite ships, specialized weapons',
  5: 'Maximum threat, no mercy',
};

/** Modal state (no state needed for this simple modal) */
type AdvanceModalState = Record<string, never>;

/** Modal props */
interface AdvanceModalProps extends ModalProps<SectorAdvanceResult> {
  currentSector: number;
}

/** Get sector name for display */
function getSectorName(sector: number): string {
  return SECTOR_NAMES[sector] ?? `Sector ${sector}`;
}

/** Sector advance modal screen component */
const SectorAdvanceModalScreen: Screen<AdvanceModalState, AdvanceModalProps> = {
  render(_state, props) {
    const { currentSector } = props;
    const targetSector = currentSector + 1;
    const targetName = getSectorName(targetSector);
    const targetThreat = SECTOR_THREAT_LEVELS[targetSector] ?? 'Unknown';
    const isEndless = targetSector >= MAX_SECTOR;

    return `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="advance-title">
        <div class="modal-panel sector-advance-modal">
          <h2 id="advance-title" class="modal-title">Advance to Sector ${targetSector}?</h2>

          <div class="advance-info">
            <div class="advance-destination">
              <span class="advance-label">Destination</span>
              <span class="advance-value">${targetName}</span>
            </div>

            <div class="advance-warning">
              <span class="advance-label">Threat Level</span>
              <span class="advance-value advance-skills">${targetThreat}</span>
            </div>

            ${isEndless ? '<div class="advance-endless-note">Endless mode - no further sectors</div>' : ''}
          </div>

          <div class="advance-notes">
            Higher sectors have tougher enemies and better rewards.
            The store will restock with new equipment.
            ${currentSector < MAX_SECTOR - 1 ? 'You can always advance again later.' : ''}
          </div>

          <div class="modal-buttons">
            <button class="btn btn-large" id="btn-advance-cancel">Cancel</button>
            <button class="btn btn-large btn-primary" id="btn-advance-confirm">
              Advance to Sector ${targetSector}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bind(api: ScreenAPI<AdvanceModalState>, props: AdvanceModalProps) {
    // Cancel button
    api.on('#btn-advance-cancel', 'click', () => {
      props.onComplete({ confirmed: false });
    });

    // Confirm button
    api.on('#btn-advance-confirm', 'click', () => {
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
 * Show the sector advance confirmation modal.
 * @param currentSector - Current sector number (1-4)
 * @returns Promise resolving to whether the user confirmed
 */
export function showSectorAdvanceModal(
  currentSector: number,
): Promise<SectorAdvanceResult> {
  const initialState: AdvanceModalState = {};

  return showModal<AdvanceModalState, AdvanceModalProps, SectorAdvanceResult>(
    SectorAdvanceModalScreen,
    initialState,
    { currentSector },
  );
}
