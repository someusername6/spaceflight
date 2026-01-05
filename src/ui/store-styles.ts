/**
 * Store UI styles - equipment shop styling.
 */

export function getStoreStyles(): string {
  return `
    /* Store categories */
    .store-categories {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    /* Store layout */
    .store-layout {
      display: flex;
      gap: 20px;
      width: 90%;
      max-width: 900px;
    }

    .store-list {
      flex: 1;
      background: rgba(20, 30, 50, 0.9);
      border: 1px solid #3a5a8a;
      border-radius: 4px;
      padding: 10px;
      max-height: 400px;
      overflow-y: auto;
    }

    .store-details {
      width: 300px;
      flex-shrink: 0;
    }

    /* Store items */
    .store-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      margin: 5px 0;
      background: rgba(30, 45, 70, 0.8);
      border: 1px solid #2a4a6a;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .store-item:hover {
      background: rgba(40, 60, 90, 0.9);
      border-color: #4a7aaa;
    }

    .store-item.selected {
      background: rgba(50, 80, 120, 0.8);
      border-color: #4da6ff;
    }

    .item-name {
      color: #aaccee;
    }

    .item-stock {
      color: #8899aa;
      font-size: 0.9em;
      margin-left: auto;
      margin-right: 10px;
    }

    .item-price {
      color: #44cc66;
      font-weight: bold;
    }

    .item-price.expensive {
      color: #cc6666;
    }

    /* Store detail panel */
    .store-detail {
      background: rgba(20, 40, 70, 0.95);
      border: 1px solid #3a5a8a;
      border-radius: 5px;
      padding: 15px;
    }

    .detail-header {
      font-size: 1.2em;
      color: #8ab4f8;
      font-weight: bold;
      margin-bottom: 15px;
      text-transform: capitalize;
      border-bottom: 1px solid #3a5a7a;
      padding-bottom: 10px;
    }

    .no-selection {
      background: rgba(20, 40, 70, 0.5);
      border: 1px dashed #3a5a8a;
      border-radius: 5px;
      padding: 40px 20px;
      text-align: center;
      color: #6a8aaa;
      font-style: italic;
    }

    /* Item stats */
    .item-stats {
      margin-bottom: 15px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 0.9em;
    }

    .stat-row span:first-child {
      color: #7a9ab8;
    }

    .stat-row span:last-child {
      color: #aaccee;
    }

    .stat-note {
      font-size: 0.8em;
      color: #6a8aaa;
      font-style: italic;
      margin-top: 5px;
    }

    /* Detail prices */
    .detail-prices {
      background: rgba(30, 50, 80, 0.5);
      padding: 10px;
      border-radius: 3px;
      margin-bottom: 15px;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      color: #88aa88;
    }

    .price-row.stock-count {
      color: #8899aa;
    }

    .price-row.storage-count {
      color: #88aacc;
    }

    /* Detail actions */
    .detail-actions {
      display: flex;
      gap: 10px;
    }

    .detail-actions .btn {
      flex: 1;
    }
  `;
}
