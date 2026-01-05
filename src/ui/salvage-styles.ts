/**
 * Salvage UI styles - results tabs, salvage display, scrap conversion.
 */

export function getSalvageStyles(): string {
  return `
    /* Results tabs */
    .results-tabs {
      display: flex;
      gap: 5px;
      margin: 15px 0;
      border-bottom: 1px solid #3a5a8a;
      padding-bottom: 0;
    }

    .tab-btn {
      padding: 10px 25px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      border: 1px solid #3a5a8a;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      background: rgba(20, 30, 50, 0.8);
      color: #6a8aaa;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: rgba(30, 50, 80, 0.9);
      color: #8ab4f8;
    }

    .tab-btn.active {
      background: rgba(40, 60, 100, 0.95);
      color: #aad4ff;
      border-color: #4da6ff;
    }

    .results-tab-content {
      margin-top: 15px;
    }

    /* Salvage display */
    .salvage-section {
      padding: 10px 0;
    }

    .salvage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #3a5a7a;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }

    .salvage-header h2 {
      margin: 0;
      font-size: 1.4em;
      color: #8ab4f8;
    }

    .salvage-value {
      color: #44cc66;
      font-weight: bold;
    }

    .salvage-items {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .salvage-category h3 {
      font-size: 1.1em;
      color: #7a9ab8;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .salvage-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 8px 12px;
      background: rgba(30, 45, 70, 0.6);
      border-radius: 3px;
    }

    .salvage-item .item-name {
      color: #aaccee;
      flex: 1;
    }

    .salvage-item .item-category {
      color: #6a8a9a;
      font-size: 0.85em;
      text-transform: capitalize;
    }

    .salvage-item .item-count {
      color: #88aa88;
      font-weight: bold;
    }

    .salvage-empty {
      text-align: center;
      color: #6a8aaa;
      font-style: italic;
      padding: 30px;
    }

    /* Scrap conversion panel (hangar) */
    .scrap-panel {
      margin-top: 15px;
    }

    .scrap-note {
      font-size: 0.85em;
      color: #6a8aaa;
      font-style: italic;
      margin-bottom: 10px;
    }

    .scrap-row {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 10px;
      background: rgba(30, 45, 70, 0.6);
      border-radius: 3px;
      margin-bottom: 8px;
    }

    .scrap-info {
      flex: 1;
      color: #aaccee;
    }

    .scrap-info strong {
      color: #8ab4f8;
    }

    .scrap-conversion {
      color: #7a9ab8;
      font-size: 0.9em;
    }

    .btn-convert {
      padding: 6px 12px;
      font-size: 0.85em;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 0.85em;
      border: 1px solid #4a7aaa;
      background: rgba(30, 50, 80, 0.8);
      color: #8ab4f8;
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.2s;
    }

    .btn-small:hover {
      background: rgba(50, 80, 120, 0.9);
      border-color: #6a9aca;
    }

    .btn-small:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}
