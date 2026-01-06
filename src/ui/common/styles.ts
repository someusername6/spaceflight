/**
 * Campaign UI Styles - "Tactical Command Interface"
 *
 * Military spacecraft aesthetic:
 * - Amber/cyan color scheme (cockpit instruments)
 * - Angular, beveled panels
 * - Scan line effects and technical patterns
 * - Holographic-style glows
 *
 * This file composes all style modules into a single injection.
 */

import { getDebriefStyles } from '../screens/debrief-styles';
import { getHangarStyles } from '../screens/hangar-styles';
import { getLoadoutStyles } from '../screens/loadout-styles';
import { getResultsStyles } from '../screens/results-styles';
import { getRosterStyles } from '../screens/roster-styles';
import { getSalvageStyles } from '../screens/salvage-styles';
import { getShipCardStyles } from '../ship/card-styles';
import { getViewerActionsStyles } from '../ship/viewer-actions-styles';
import { getViewerStyles } from '../ship/viewer-styles';
import { getStoreDetailStyles } from '../store/detail-styles';
import { getStoreStorageStyles } from '../store/storage-styles';
import { getStoreStyles } from '../store/styles';
import { getBaseStyles } from './base-styles';
import { getButtonStyles } from './button-styles';
import { getListStyles } from './list-styles';
import { getNavBarStyles } from './nav-bar';
import { getPickerStyles } from './picker-styles';
import { getTooltipStyles } from './tooltip-styles';

export const UI_STYLE_ID = 'campaign-ui-styles';

/** Get all campaign styles */
export function getCampaignStyles(): string {
  return `
    ${getBaseStyles()}
    ${getButtonStyles()}
    ${getListStyles()}
    ${getNavBarStyles()}
    ${getResultsStyles()}
    ${getHangarStyles()}
    ${getRosterStyles()}
    ${getShipCardStyles()}
    ${getLoadoutStyles()}
    ${getStoreStyles()}
    ${getStoreDetailStyles()}
    ${getStoreStorageStyles()}
    ${getDebriefStyles()}
    ${getSalvageStyles()}
    ${getTooltipStyles()}
    ${getViewerStyles()}
    ${getViewerActionsStyles()}
    ${getPickerStyles()}
  `;
}

/** Inject styles if not already present */
export function injectCampaignStyles(): void {
  if (!document.getElementById(UI_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = UI_STYLE_ID;
    style.textContent = getCampaignStyles();
    document.head.appendChild(style);
  }
}
