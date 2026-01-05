/**
 * Loadout UI styles - styles for ship loadout panel and inventory display.
 */

export function getLoadoutStyles(): string {
  return `
    /* Hangar layout */
    .hangar-layout {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }

    .hangar-main {
      flex: 1;
      min-width: 0;
    }

    .hangar-sidebar {
      width: 320px;
      flex-shrink: 0;
    }

    /* Ship selection */
    .ship-item {
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }

    .ship-item:hover {
      background: rgba(60, 90, 130, 0.6);
    }

    .ship-item.selected {
      background: rgba(70, 100, 150, 0.7);
      border-left: 3px solid #4da6ff;
    }

    /* Loadout panel */
    .loadout-panel {
      background: rgba(20, 40, 70, 0.95);
      border: 1px solid #3a5a8a;
      border-radius: 5px;
      padding: 15px;
    }

    .loadout-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .loadout-title {
      font-size: 1.1em;
      color: #8ab4f8;
      font-weight: bold;
    }

    .loadout-stats {
      color: #7a9ab8;
      font-size: 0.9em;
      margin-bottom: 15px;
    }

    .loadout-divider {
      border-top: 1px solid #3a5a7a;
      margin: 15px 0;
    }

    /* Weapon rows */
    .ship-weapons, .equip-options {
      margin-bottom: 10px;
    }

    .weapon-section, .equip-section {
      margin-bottom: 12px;
    }

    .weapon-label {
      color: #6a8aaa;
      font-size: 0.85em;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .weapon-row, .equip-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      margin: 4px 0;
      background: rgba(40, 60, 90, 0.5);
      border-radius: 3px;
    }

    .weapon-name {
      color: #aaccee;
      font-size: 0.95em;
    }

    .weapon-empty {
      color: #5a7a9a;
      font-style: italic;
      font-size: 0.9em;
      padding: 5px 0;
    }

    .storage-header {
      color: #8ab4f8;
      font-size: 0.95em;
      margin-bottom: 10px;
      font-weight: bold;
    }

    /* Small buttons */
    .btn-small {
      padding: 4px 10px;
      font-size: 0.8em;
      font-family: 'Courier New', monospace;
      border: 1px solid #4a7aaa;
      background: rgba(30, 50, 80, 0.8);
      color: #8ab4f8;
      cursor: pointer;
      border-radius: 3px;
    }

    .btn-small:hover {
      background: rgba(50, 80, 120, 0.9);
    }

    .btn-unequip {
      border-color: #aa6a4a;
      color: #ddaa88;
    }

    .btn-unequip:hover {
      background: rgba(100, 60, 40, 0.8);
    }

    .btn-equip {
      border-color: #4aaa6a;
      color: #88ddaa;
    }

    .btn-equip:hover {
      background: rgba(40, 100, 60, 0.8);
    }

    .btn-close {
      border: none;
      background: transparent;
      color: #8ab4f8;
      font-size: 1.2em;
      cursor: pointer;
      padding: 2px 6px;
    }

    .btn-close:hover {
      color: #ff8888;
    }

    /* Tiny ammo buttons */
    .btn-tiny {
      padding: 2px 6px;
      font-size: 0.75em;
      font-family: 'Courier New', monospace;
      border: 1px solid #4a7aaa;
      background: rgba(30, 50, 80, 0.8);
      color: #8ab4f8;
      cursor: pointer;
      border-radius: 3px;
      margin-left: 3px;
    }

    .btn-tiny:hover:not(:disabled) {
      background: rgba(50, 80, 120, 0.9);
    }

    .btn-tiny:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-load {
      border-color: #4aaa6a;
      color: #88ddaa;
    }

    .btn-unload {
      border-color: #aa8844;
      color: #ddcc88;
    }

    /* Ammo info display */
    .ammo-info {
      color: #aabb88;
      font-size: 0.85em;
      margin-left: 8px;
      min-width: 50px;
      text-align: center;
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

    .item-count {
      color: #aabb88;
      font-size: 0.9em;
    }
  `;
}
