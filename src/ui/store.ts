/**
 * Store UI - equipment shop for buying/selling ships, weapons, and ammo.
 */

import {
  buyAmmo,
  buyHull,
  buyPrimaryWeapon,
  buySecondaryWeapon,
  sellAmmo,
  sellHull,
  sellPrimaryWeapon,
  sellScrap,
  sellSecondaryWeapon,
} from '../campaign/store';
import type { CampaignState } from '../campaign/types';
import {
  getCategoryItems,
  getItemPrice,
  getStorageCount,
  getStorageIndex,
  renderAmmoStats,
  renderHullStats,
  renderPrimaryStats,
  renderScrapStats,
  renderSecondaryStats,
  type StoreCategory,
  type StoreUI,
} from './store-render';

// Re-export types for external use
export type { StoreCategory, StoreUI } from './store-render';

/** Render the store content */
function renderStore(ui: StoreUI): string {
  const items = getCategoryItems(
    ui.selectedCategory,
    ui.state.storeStock,
    ui.state.storedScrap,
  );
  const selected = ui.selectedItem;
  const isScrap = ui.selectedCategory === 'scrap';

  const itemList = items
    .map((item) => {
      const isSelected = item.id === selected;
      // For scrap, show sell price; for others, show buy price
      if (isScrap) {
        const sellPrice = getItemPrice(ui.selectedCategory, item.id, 'sell');
        return `
          <div class="store-item ${isSelected ? 'selected' : ''}" data-item="${item.id}">
            <span class="item-name">${item.name}</span>
            <span class="item-stock">[${item.stock}]</span>
            <span class="item-price sell-price">${sellPrice} cr</span>
          </div>
        `;
      }
      const buyPrice = getItemPrice(ui.selectedCategory, item.id, 'buy');
      const canAfford = ui.state.credits >= buyPrice;
      return `
        <div class="store-item ${isSelected ? 'selected' : ''}" data-item="${item.id}">
          <span class="item-name">${item.name}</span>
          <span class="item-stock">[${item.stock}]</span>
          <span class="item-price ${canAfford ? '' : 'expensive'}">${buyPrice} cr</span>
        </div>
      `;
    })
    .join('');

  // Detail panel for selected item
  let detailPanel = '';
  if (selected) {
    const buyPrice = getItemPrice(ui.selectedCategory, selected, 'buy');
    const sellPrice = getItemPrice(ui.selectedCategory, selected, 'sell');
    const selectedItem = items.find((i) => i.id === selected);
    const storeStockCount = selectedItem?.stock ?? 0;
    const canAfford = ui.state.credits >= buyPrice && storeStockCount > 0;
    const storageCount = getStorageCount(ui, ui.selectedCategory, selected);
    const canSell = storageCount > 0;

    let statsHtml = '';
    switch (ui.selectedCategory) {
      case 'hulls':
        statsHtml = renderHullStats(selected);
        break;
      case 'primaries':
        statsHtml = renderPrimaryStats(selected);
        break;
      case 'secondaries':
        statsHtml = renderSecondaryStats(selected);
        break;
      case 'ammo':
        statsHtml = renderAmmoStats(selected);
        break;
      case 'scrap':
        statsHtml = renderScrapStats(selected);
        break;
    }

    const storageText = storageCount > 0 ? `In Storage: ${storageCount}` : '';

    // Scrap is sell-only with bulk options
    if (isScrap) {
      const canSellBulk10 = storageCount >= 10;
      const canSellBulk100 = storageCount >= 100;
      detailPanel = `
        <div class="store-detail">
          <div class="detail-header">${selected}</div>
          ${statsHtml}
          <div class="detail-prices">
            <div class="price-row">Sell: ${sellPrice} cr each</div>
            ${storageText ? `<div class="price-row storage-count">${storageText}</div>` : ''}
          </div>
          <div class="detail-actions">
            <button class="btn btn-sell" id="btn-sell" ${canSell ? '' : 'disabled'}>
              Sell ×1
            </button>
            <button class="btn btn-sell" id="btn-sell-bulk" ${canSellBulk10 ? '' : 'disabled'}>
              Sell ×10
            </button>
            <button class="btn btn-sell" id="btn-sell-bulk-100" ${canSellBulk100 ? '' : 'disabled'}>
              Sell ×100
            </button>
          </div>
        </div>
      `;
    } else {
      // Show bulk buttons for missiles (×10) and ammo (×100)
      const isMissile = ui.selectedCategory === 'secondaries';
      const isAmmo = ui.selectedCategory === 'ammo';
      const bulkAmount = isAmmo ? 100 : 10;
      const bulkPrice = buyPrice * bulkAmount;
      const canAffordBulk =
        ui.state.credits >= bulkPrice && storeStockCount >= bulkAmount;
      const canSellBulk = storageCount >= bulkAmount;
      const showBulk = isMissile || isAmmo;

      detailPanel = `
        <div class="store-detail">
          <div class="detail-header">${selected}</div>
          ${statsHtml}
          <div class="detail-prices">
            <div class="price-row">Buy: ${buyPrice} cr${showBulk ? ` (×${bulkAmount}: ${bulkPrice} cr)` : ''}</div>
            <div class="price-row">Sell: ${sellPrice} cr</div>
            <div class="price-row stock-count">Store Stock: ${storeStockCount}</div>
            ${storageText ? `<div class="price-row storage-count">${storageText}</div>` : ''}
          </div>
          <div class="detail-actions">
            <button class="btn btn-equip" id="btn-buy" ${canAfford ? '' : 'disabled'}>
              Buy${isMissile ? '' : isAmmo ? ' ×10' : ''}
            </button>
            ${showBulk ? `<button class="btn btn-equip" id="btn-buy-bulk" ${canAffordBulk ? '' : 'disabled'}>Buy ×${bulkAmount}</button>` : ''}
            <button class="btn btn-sell" id="btn-sell" ${canSell ? '' : 'disabled'}>
              Sell${isMissile ? '' : isAmmo ? ' ×10' : ''}
            </button>
            ${showBulk ? `<button class="btn btn-sell" id="btn-sell-bulk" ${canSellBulk ? '' : 'disabled'}>Sell ×${bulkAmount}</button>` : ''}
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="credits-display">${ui.state.credits}</div>
    <button class="btn btn-back" id="btn-back">← Back</button>

    <h1>Equipment Store</h1>

    <div class="store-categories">
      <button class="btn ${ui.selectedCategory === 'hulls' ? 'btn-primary' : ''}" data-cat="hulls">
        Hulls
      </button>
      <button class="btn ${ui.selectedCategory === 'primaries' ? 'btn-primary' : ''}" data-cat="primaries">
        Primaries
      </button>
      <button class="btn ${ui.selectedCategory === 'secondaries' ? 'btn-primary' : ''}" data-cat="secondaries">
        Missiles
      </button>
      <button class="btn ${ui.selectedCategory === 'ammo' ? 'btn-primary' : ''}" data-cat="ammo">
        Ammo
      </button>
      <button class="btn ${ui.selectedCategory === 'scrap' ? 'btn-primary' : ''}" data-cat="scrap">
        Scrap
      </button>
    </div>

    <div class="store-layout">
      <div class="store-list">
        ${itemList}
      </div>
      <div class="store-details">
        ${detailPanel || '<div class="no-selection">Select an item to view details</div>'}
      </div>
    </div>
  `;
}

/** Bind store event handlers */
function bindStoreEvents(ui: StoreUI): void {
  // Back button
  const backBtn = ui.element.querySelector('#btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', ui.onBack);
  }

  // Category buttons
  ui.element.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = (btn as HTMLElement).dataset.cat as StoreCategory;
      ui.selectedCategory = cat;
      ui.selectedItem = null;
      renderAndBindStore(ui);
    });
  });

  // Item selection
  ui.element.querySelectorAll('.store-item').forEach((item) => {
    item.addEventListener('click', () => {
      const itemId = (item as HTMLElement).dataset.item;
      if (itemId) {
        ui.selectedItem = itemId === ui.selectedItem ? null : itemId;
        renderAndBindStore(ui);
      }
    });
  });

  // Buy button
  const buyBtn = ui.element.querySelector('#btn-buy');
  if (buyBtn && ui.selectedItem) {
    const itemId = ui.selectedItem;
    buyBtn.addEventListener('click', () => {
      let newState = ui.state;

      switch (ui.selectedCategory) {
        case 'hulls':
          newState = buyHull(ui.state, itemId);
          break;
        case 'primaries':
          newState = buyPrimaryWeapon(ui.state, itemId);
          break;
        case 'secondaries':
          // Buy 1 missile at a time
          newState = buySecondaryWeapon(ui.state, itemId, 1);
          break;
        case 'ammo':
          // Buy 10 rounds at a time
          newState = buyAmmo(ui.state, itemId, 10);
          break;
      }

      // If state changed, update and re-render
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
  }

  // Sell button
  const sellBtn = ui.element.querySelector('#btn-sell');
  if (sellBtn && ui.selectedItem) {
    const itemId = ui.selectedItem;
    const category = ui.selectedCategory;
    sellBtn.addEventListener('click', () => {
      const storageIndex = getStorageIndex(ui, category, itemId);
      if (storageIndex < 0) return;

      let newState = ui.state;

      switch (category) {
        case 'hulls':
          newState = sellHull(ui.state, storageIndex);
          break;
        case 'primaries':
          newState = sellPrimaryWeapon(ui.state, storageIndex);
          break;
        case 'secondaries':
          // Sell 1 missile at a time
          newState = sellSecondaryWeapon(ui.state, storageIndex, 1);
          break;
        case 'ammo':
          // Sell 10 rounds at a time
          newState = sellAmmo(ui.state, itemId, 10);
          break;
        case 'scrap':
          // Sell 1 scrap at a time
          newState = sellScrap(ui.state, itemId, 1);
          break;
      }

      // If state changed, update and re-render
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
  }

  // Bulk buy button (missiles ×10, ammo ×100)
  const bulkBuyBtn = ui.element.querySelector('#btn-buy-bulk');
  if (bulkBuyBtn && ui.selectedItem) {
    const itemId = ui.selectedItem;
    const category = ui.selectedCategory;
    const bulkAmount = category === 'ammo' ? 100 : 10;
    bulkBuyBtn.addEventListener('click', () => {
      let newState = ui.state;
      if (category === 'secondaries') {
        newState = buySecondaryWeapon(ui.state, itemId, bulkAmount);
      } else if (category === 'ammo') {
        newState = buyAmmo(ui.state, itemId, bulkAmount);
      }
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
  }

  // Bulk sell button (missiles ×10, ammo ×100, scrap ×10)
  const bulkSellBtn = ui.element.querySelector('#btn-sell-bulk');
  if (bulkSellBtn && ui.selectedItem) {
    const itemId = ui.selectedItem;
    const category = ui.selectedCategory;
    const bulkAmount = category === 'ammo' ? 100 : 10;
    bulkSellBtn.addEventListener('click', () => {
      const storageIndex = getStorageIndex(ui, category, itemId);
      if (storageIndex < 0) return;

      let newState = ui.state;
      if (category === 'secondaries') {
        newState = sellSecondaryWeapon(ui.state, storageIndex, bulkAmount);
      } else if (category === 'ammo') {
        newState = sellAmmo(ui.state, itemId, bulkAmount);
      } else if (category === 'scrap') {
        newState = sellScrap(ui.state, itemId, 10);
      }
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
  }

  // Bulk sell ×100 button (scrap only)
  const bulkSell100Btn = ui.element.querySelector('#btn-sell-bulk-100');
  if (bulkSell100Btn && ui.selectedItem) {
    const itemId = ui.selectedItem;
    const category = ui.selectedCategory;
    bulkSell100Btn.addEventListener('click', () => {
      if (category !== 'scrap') return;

      const newState = sellScrap(ui.state, itemId, 100);
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
  }
}

/** Internal: render and bind */
function renderAndBindStore(ui: StoreUI): void {
  ui.element.innerHTML = renderStore(ui);
  bindStoreEvents(ui);
}

/** Create store UI */
export function createStoreUI(
  element: HTMLElement,
  state: CampaignState,
  onBack: () => void,
  onStateUpdate: (newState: CampaignState) => void,
): StoreUI {
  const ui: StoreUI = {
    element,
    state,
    selectedCategory: 'hulls',
    selectedItem: null,
    onBack,
    onStateUpdate,
  };

  renderAndBindStore(ui);
  return ui;
}
