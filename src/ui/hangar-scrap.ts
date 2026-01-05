/**
 * Hangar scrap conversion - UI for converting scrap to hulls.
 */

import {
  canConvertScrapToHull,
  convertScrapToHull,
  getScrapConversionFee,
} from '../campaign/store';
import type { CampaignState } from '../campaign/types';
import { SCRAP_PER_HULL } from '../data/prices';

/** Render scrap conversion section */
export function renderScrapConversion(state: CampaignState): string {
  // Get all scrap types the player has
  const scrapEntries = Object.entries(state.storedScrap).filter(
    ([_, count]) => count > 0,
  );

  if (scrapEntries.length === 0) {
    return '';
  }

  const conversionRows = scrapEntries
    .map(([shipClass, count]) => {
      const fee = getScrapConversionFee(shipClass);
      const canConvert = canConvertScrapToHull(state, shipClass);
      const displayName =
        shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
      const disabled = canConvert ? '' : 'disabled';

      return `
      <div class="scrap-row">
        <span class="scrap-info">
          <strong>${displayName}</strong>: ${count} scrap
        </span>
        <span class="scrap-conversion">
          ${SCRAP_PER_HULL} scrap + ${fee} cr → Hull
        </span>
        <button class="btn-small btn-convert" data-ship-class="${shipClass}" ${disabled}>
          Convert
        </button>
      </div>
    `;
    })
    .join('');

  return `
    <div class="screen-panel scrap-panel">
      <div class="screen-panel-header">Scrap Conversion</div>
      <div class="scrap-note">Convert salvaged scrap into fully repaired hulls</div>
      ${conversionRows}
    </div>
  `;
}

/** Bind scrap conversion button events */
export function bindScrapConversionEvents(
  element: HTMLElement,
  state: CampaignState,
  onStateUpdate: (newState: CampaignState) => void,
  rerender: () => void,
): void {
  element.querySelectorAll('.btn-convert').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shipClass = target.dataset.shipClass;
      if (!shipClass) return;

      const newState = convertScrapToHull(state, shipClass);
      if (newState !== state) {
        onStateUpdate(newState);
        rerender();
      }
    });
  });
}
