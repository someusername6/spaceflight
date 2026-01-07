/**
 * Store UI - equipment shop for buying/selling ships, weapons, and ammo.
 */

import { getResupplyStatus, storeResupplyAllShips } from '../../campaign/state';
import { convertScrapToHull } from '../../campaign/store';
import type { CampaignState } from '../../campaign/types';
import {
  bindNavBar,
  type NavDestination,
  renderNavBar,
} from '../common/nav-bar';
import { initShipConnectors } from '../ship/connectors';
import { renderDetailPanel } from './detail';
import {
  handleBulkBuy,
  handleBulkSell,
  handleBulkSell100,
  handleBuy,
  handleSell,
} from './events';
import {
  getCategoryItems,
  getFirstVisibleCategory,
  getItemPrice,
  isCategoryVisible,
  type StoreCategory,
} from './render';
import { renderStoreStorage } from './storage';

/** Store UI state */
export interface StoreUI {
  element: HTMLElement;
  state: CampaignState;
  selectedCategory: StoreCategory;
  selectedItem: string | null;
  onNavigate: (destination: NavDestination) => void;
  onStateUpdate: (newState: CampaignState) => void;
}

export type { NavDestination } from '../common/nav-bar';
// Re-export types for external use
export type { StoreCategory } from './render';

/** Render a category tab if visible */
function renderCategoryTab(
  state: CampaignState,
  selected: StoreCategory,
  category: StoreCategory,
  label: string,
): string {
  if (!isCategoryVisible(state, category)) return '';
  const isSelected = selected === category;
  return `<button class="btn ${isSelected ? 'btn-primary' : ''}" data-cat="${category}" role="tab" aria-selected="${isSelected}">${label}</button>`;
}

/** Render the resupply button (for categories bar) */
function renderResupplyButton(state: CampaignState): string {
  const resupply = getResupplyStatus(state);

  if (resupply.status === 'supplied') {
    return `<span class="resupply-status">✓ Supplied</span>`;
  }

  if (resupply.status === 'insufficient') {
    return `<span class="resupply-status resupply-warning">⚠ Insufficient Supply</span>`;
  }

  const canAfford = state.credits >= resupply.cost;
  const warningClass = resupply.hasShortages ? ' has-shortage' : '';

  return `
    <button class="btn btn-resupply-small${warningClass}" id="btn-resupply" ${canAfford ? '' : 'disabled'}>
      Resupply (${resupply.cost} cr)${resupply.hasShortages ? ' ⚠' : ''}
    </button>
  `;
}

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
      // For scrap, show sell price only (no stock - scrap comes from player storage)
      if (isScrap) {
        const sellPrice = getItemPrice(ui.selectedCategory, item.id, 'sell');
        return `
          <div class="store-item ${isSelected ? 'selected' : ''}" data-item="${item.id}" role="option" aria-selected="${isSelected}" tabindex="0">
            <span class="item-name">${item.name}</span>
            <span class="item-price sell-price" aria-label="Sell price: ${sellPrice} credits">${sellPrice} cr</span>
          </div>
        `;
      }
      const buyPrice = getItemPrice(ui.selectedCategory, item.id, 'buy');
      const canAfford = ui.state.credits >= buyPrice;
      return `
        <div class="store-item ${isSelected ? 'selected' : ''}" data-item="${item.id}" role="option" aria-selected="${isSelected}" tabindex="0">
          <span class="item-name">${item.name}</span>
          <span class="item-stock" aria-label="${item.stock} in stock">×${item.stock}</span>
          <span class="item-price ${canAfford ? '' : 'expensive'}" aria-label="Price: ${buyPrice} credits${canAfford ? '' : ', cannot afford'}">${buyPrice}&nbsp;cr</span>
        </div>
      `;
    })
    .join('');

  // Detail panel for selected item
  const detailPanel = renderDetailPanel(
    ui.state,
    ui.selectedCategory,
    selected,
    items,
  );

  const navBar = renderNavBar({
    activeTab: 'store',
    credits: ui.state.credits,
    sector: ui.state.currentSector,
    onNavigate: ui.onNavigate,
  });

  return `
    <div class="campaign-page">
      ${navBar}
      <main class="store-screen" aria-label="Equipment Store">
        <nav class="store-categories" aria-label="Store categories">
          <div class="category-tabs" role="tablist" aria-label="Item categories">
            ${renderCategoryTab(ui.state, ui.selectedCategory, 'hulls', 'Hulls')}
            ${renderCategoryTab(ui.state, ui.selectedCategory, 'primaries', 'Primaries')}
            ${renderCategoryTab(ui.state, ui.selectedCategory, 'secondaries', 'Missiles')}
            ${renderCategoryTab(ui.state, ui.selectedCategory, 'ammo', 'Ammo')}
            ${renderCategoryTab(ui.state, ui.selectedCategory, 'scrap', 'Scrap')}
          </div>
          <div class="category-actions">
            ${renderResupplyButton(ui.state)}
          </div>
        </nav>
        <div class="store-layout">
          <aside class="store-list" role="listbox" aria-label="Available items">
            ${itemList}
          </aside>
          <section class="store-details" aria-label="Item details">
            ${detailPanel || '<div class="empty-state-panel" role="status">Select an item to view details</div>'}
          </section>
          ${renderStoreStorage(ui.state, ui.selectedCategory, ui.selectedItem)}
        </div>
      </main>
    </div>
  `;
}

/** Bind store event handlers */
function bindStoreEvents(ui: StoreUI): void {
  // Bind navigation bar
  bindNavBar(ui.element, ui.onNavigate);

  // Bind resupply button
  const resupplyBtn = ui.element.querySelector('#btn-resupply');
  if (resupplyBtn) {
    resupplyBtn.addEventListener('click', () => {
      const newState = storeResupplyAllShips(ui.state);
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
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

  // Item selection (store list)
  ui.element.querySelectorAll('.store-item').forEach((item) => {
    item.addEventListener('click', () => {
      const itemId = (item as HTMLElement).dataset.item;
      if (itemId) {
        ui.selectedItem = itemId === ui.selectedItem ? null : itemId;
        renderAndBindStore(ui);
      }
    });
  });

  // Storage item selection (synchronized with store)
  ui.element.querySelectorAll('.storage-item').forEach((item) => {
    item.addEventListener('click', () => {
      const el = item as HTMLElement;
      const category = el.dataset.category as StoreCategory;
      const itemId = el.dataset.item;
      if (category && itemId) {
        // Switch to the correct category and select the item
        ui.selectedCategory = category;
        ui.selectedItem = itemId;
        renderAndBindStore(ui);
      }
    });
  });

  // Buy button
  const buyBtn = ui.element.querySelector('#btn-buy');
  if (buyBtn && ui.selectedItem) {
    const itemId = ui.selectedItem;
    const category = ui.selectedCategory;
    buyBtn.addEventListener('click', () => {
      const newState = handleBuy(ui.state, category, itemId);
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
      const newState = handleSell(ui.state, category, itemId);
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
    bulkBuyBtn.addEventListener('click', () => {
      const newState = handleBulkBuy(ui.state, category, itemId);
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
    bulkSellBtn.addEventListener('click', () => {
      const newState = handleBulkSell(ui.state, category, itemId);
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
      const newState = handleBulkSell100(ui.state, category, itemId);
      if (newState !== ui.state) {
        ui.state = newState;
        ui.onStateUpdate(newState);
        renderAndBindStore(ui);
      }
    });
  }

  // Convert scrap to hull button
  const convertBtn = ui.element.querySelector('#btn-convert');
  if (convertBtn && ui.selectedItem && ui.selectedCategory === 'scrap') {
    const shipClass = ui.selectedItem;
    convertBtn.addEventListener('click', () => {
      const newState = convertScrapToHull(ui.state, shipClass);
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
  // If current category is no longer visible, switch to first visible one
  if (!isCategoryVisible(ui.state, ui.selectedCategory)) {
    const firstVisible = getFirstVisibleCategory(ui.state);
    if (firstVisible) {
      ui.selectedCategory = firstVisible;
      ui.selectedItem = null;
    }
  }

  ui.element.innerHTML = renderStore(ui);
  bindStoreEvents(ui);

  // Hull and scrap previews display schematic connector lines from slots to ship
  // hardpoints. These require manual initialization after render since the SVG
  // overlay needs to measure element positions.
  if (ui.selectedCategory === 'hulls' || ui.selectedCategory === 'scrap') {
    const previewContainer = ui.element.querySelector(
      '.hull-preview-container, .scrap-preview-container',
    );
    if (previewContainer) {
      initShipConnectors(previewContainer);
    }
  }
}

/** Create store UI */
export function createStoreUI(
  element: HTMLElement,
  state: CampaignState,
  onNavigate: (destination: NavDestination) => void,
  onStateUpdate: (newState: CampaignState) => void,
): StoreUI {
  // Start with first visible category (or hulls as fallback if somehow none visible)
  const initialCategory = getFirstVisibleCategory(state) ?? 'hulls';

  const ui: StoreUI = {
    element,
    state,
    selectedCategory: initialCategory,
    selectedItem: null,
    onNavigate,
    onStateUpdate,
  };

  renderAndBindStore(ui);
  return ui;
}
