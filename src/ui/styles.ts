/**
 * Campaign UI styles - shared styles for hangar, contracts, results screens.
 */

import { getDebriefStyles } from './debrief';

export const UI_STYLE_ID = 'campaign-ui-styles';

export function getCampaignStyles(): string {
  return `
    /* Base screen styles */
    .game-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .game-screen h1 {
      color: #4da6ff;
      font-size: 2.5em;
      margin-bottom: 0.5em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .game-screen h2 {
      color: #8ab4f8;
      font-size: 1.5em;
      margin-bottom: 1em;
    }

    /* Panel containers */
    .screen-panel {
      background: rgba(20, 30, 50, 0.9);
      border: 1px solid #3a5a8a;
      border-radius: 4px;
      padding: 20px;
      margin: 10px;
      max-width: 800px;
      width: 90%;
    }

    .screen-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #3a5a8a;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }

    /* Ship list */
    .ship-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ship-item {
      display: flex;
      align-items: center;
      padding: 10px;
      background: rgba(30, 45, 70, 0.8);
      border: 1px solid #2a4a6a;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .ship-item:hover {
      background: rgba(40, 60, 90, 0.9);
      border-color: #4a7aaa;
    }

    .ship-item.selected {
      border-color: #4da6ff;
      background: rgba(50, 80, 120, 0.8);
    }

    .ship-icon {
      width: 60px;
      height: 40px;
      background: #1a2a3a;
      border: 1px solid #3a5a8a;
      margin-right: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8em;
      color: #6a8aaa;
    }

    .ship-info {
      flex: 1;
    }

    .ship-name {
      font-weight: bold;
      color: #8ab4f8;
    }

    .ship-archetype {
      font-size: 0.9em;
      color: #7a9aba;
      text-transform: capitalize;
    }

    .ship-status {
      font-size: 0.8em;
      margin-top: 4px;
    }

    .ship-status.damaged {
      color: #ffaa44;
    }

    .ship-status.ok {
      color: #44cc66;
    }

    /* Contract list */
    .contract-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .contract-item {
      padding: 15px;
      background: rgba(30, 45, 70, 0.8);
      border: 1px solid #2a4a6a;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .contract-item:hover {
      background: rgba(40, 60, 90, 0.9);
      border-color: #4a7aaa;
      transform: translateX(5px);
    }

    .contract-name {
      font-size: 1.2em;
      font-weight: bold;
      color: #8ab4f8;
      margin-bottom: 5px;
    }

    .contract-difficulty {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.8em;
      margin-bottom: 8px;
    }

    .contract-difficulty.easy {
      background: #2a5a2a;
      color: #66cc66;
    }

    .contract-difficulty.medium {
      background: #5a5a2a;
      color: #cccc66;
    }

    .contract-difficulty.hard {
      background: #5a2a2a;
      color: #cc6666;
    }

    .contract-description {
      color: #9ab0c8;
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .contract-reward {
      color: #44cc66;
      font-weight: bold;
    }

    /* Buttons */
    .btn {
      padding: 10px 25px;
      font-family: 'Courier New', monospace;
      font-size: 1em;
      border: 2px solid #4a7aaa;
      background: rgba(30, 50, 80, 0.8);
      color: #8ab4f8;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.2s;
    }

    .btn:hover {
      background: rgba(50, 80, 120, 0.9);
      border-color: #6a9aca;
      color: #aad4ff;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: rgba(40, 80, 140, 0.9);
      border-color: #4da6ff;
    }

    .btn-primary:hover {
      background: rgba(60, 100, 160, 0.9);
    }

    .btn-back {
      position: absolute;
      top: 20px;
      left: 20px;
    }

    /* Credits display */
    .credits-display {
      position: absolute;
      top: 20px;
      right: 20px;
      font-size: 1.2em;
      color: #44cc66;
    }

    .credits-display::before {
      content: '⬡ ';
    }

    /* Results screen */
    .result-title {
      font-size: 3em;
      margin-bottom: 0.5em;
    }

    .result-title.victory {
      color: #44cc66;
    }

    .result-title.defeat {
      color: #cc4444;
    }

    .result-stats {
      margin: 20px 0;
      font-size: 1.2em;
    }

    .result-stats div {
      margin: 8px 0;
    }

    /* Game over screen */
    .game-over-title {
      color: #cc4444;
      font-size: 4em;
      margin-bottom: 0.5em;
    }

    .game-over-stats {
      font-size: 1.3em;
      margin: 20px 0;
    }

    /* Results panel with debrief */
    .results-panel {
      max-height: 80vh;
      overflow-y: auto;
    }

    /* Inventory panel */
    .inventory-panel {
      margin-top: 15px;
    }

    .inventory-empty {
      color: #6a8aaa;
      font-style: italic;
      padding: 10px;
    }

    .inventory-section {
      margin-bottom: 10px;
    }

    .inventory-label {
      color: #8ab4f8;
      font-size: 0.9em;
      margin-bottom: 5px;
      border-bottom: 1px solid #3a5a7a;
      padding-bottom: 3px;
    }

    .inventory-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 8px;
      margin: 3px 0;
      background: rgba(40, 60, 90, 0.5);
      border-radius: 3px;
    }

    .item-name {
      color: #aaccee;
    }

    .item-status {
      color: #88aa88;
      font-size: 0.9em;
    }

    .item-category {
      color: #8888aa;
      font-size: 0.85em;
      text-transform: uppercase;
    }

    /* Debrief styles */
    ${getDebriefStyles()}
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
