/**
 * Squadron Render Helpers - rendering functions for the squadron screen.
 */

import {
  estimateShipResupplyCost,
  needsAmmoResupply,
} from '../../campaign/resupply/resupply-constrained';
import type { CampaignState, OwnedShip } from '../../campaign/types';
import { renderShipStatsRows } from '../ship/stats';
import { renderShipViewer } from '../ship/viewer';

/** Sort ships with commander's ship first */
export function sortShipsCommanderFirst(
  ships: OwnedShip[],
  commanderId: string,
): OwnedShip[] {
  return [...ships].sort((a, b) => {
    const aIsCommander = a.pilot?.id === commanderId;
    const bIsCommander = b.pilot?.id === commanderId;
    if (aIsCommander && !bIsCommander) return -1;
    if (!aIsCommander && bIsCommander) return 1;
    return 0;
  });
}

/** Check if any ships need ammo/missile resupply (not just empty slots) */
export function anyShipsNeedAmmoResupply(ships: OwnedShip[]): boolean {
  return ships.some((ship) => needsAmmoResupply(ship));
}

/** Render ship details panel */
export function renderShipDetails(ship: OwnedShip): string {
  const statsRows = renderShipStatsRows(ship.shipClass, {
    classPrefix: 'detail',
  });

  if (!statsRows) return '<div class="ship-details">Unknown ship class</div>';

  return `
    <div class="ship-details">
      <div class="ship-details-header">
        <span class="panel-icon">▦</span> Ship Stats
      </div>
      <div class="ship-details-stats">
        ${statsRows}
      </div>
    </div>
  `;
}

/** Render ship viewer with action buttons */
export function renderShipViewerWithActions(
  ship: OwnedShip,
  state: CampaignState,
): string {
  let viewerHtml = renderShipViewer(ship, state);

  // Build header right content with buttons (resupply only for ammo/missiles, not empty slots)
  const showResupply = needsAmmoResupply(ship);
  let resupplyBtn = '';
  if (showResupply) {
    const estimate = estimateShipResupplyCost(state, ship.id);
    const costLabel = estimate.cost > 0 ? ` (${estimate.cost} cr)` : '';
    resupplyBtn = `<button class="btn btn-small btn-resupply-ship" data-ship="${ship.id}">Resupply${costLabel}</button>`;
  }

  const headerButtons = ship.pilot
    ? `<div class="schematic-header-right">
        ${resupplyBtn}
        <button class="btn btn-small btn-change-ship" data-pilot="${ship.pilot.id}" data-ship="${ship.id}">Change Ship</button>
       </div>`
    : '';

  viewerHtml = viewerHtml.replace(
    '<div class="schematic-header-right"></div>',
    headerButtons,
  );

  return viewerHtml;
}
