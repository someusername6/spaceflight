/**
 * Store Content Rendering - Layout and content generation for store screen.
 */

import { getResupplyStatus } from '../../campaign/state';
import type { CampaignState } from '../../campaign/types';
import { type NavDestination, renderNavBar } from '../common/nav-bar';
import { renderDetailPanel } from './detail';
import {
  getCategoryItems,
  getItemPrice,
  isCategoryVisible,
  type StoreCategory,
} from './render';
import { renderStoreStorage } from './storage';

/** Render a category tab if visible */
function renderCategoryTab(
  campaignState: CampaignState,
  selected: StoreCategory,
  category: StoreCategory,
  label: string,
): string {
  if (!isCategoryVisible(campaignState, category)) return '';
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
export function renderStoreContent(
  selectedCategory: StoreCategory,
  selectedItem: string | null,
  campaignState: CampaignState,
  onNavigate: (destination: NavDestination) => void,
): string {
  const items = getCategoryItems(
    selectedCategory,
    campaignState.storeStock,
    campaignState.storedScrap,
  );
  const isScrap = selectedCategory === 'scrap';

  const itemList = items
    .map((item) => {
      const isSelected = item.id === selectedItem;
      // For scrap, show sell price only (no stock - scrap comes from player storage)
      if (isScrap) {
        const sellPrice = getItemPrice(selectedCategory, item.id, 'sell');
        return `
          <div class="store-item ${isSelected ? 'selected' : ''}" data-item="${item.id}" role="option" aria-selected="${isSelected}" tabindex="0">
            <span class="item-name">${item.name}</span>
            <span class="item-price sell-price" aria-label="Sell price: ${sellPrice} credits">${sellPrice} cr</span>
          </div>
        `;
      }
      const buyPrice = getItemPrice(selectedCategory, item.id, 'buy');
      const canAfford = campaignState.credits >= buyPrice;
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
    campaignState,
    selectedCategory,
    selectedItem,
    items,
  );

  const navBar = renderNavBar({
    activeTab: 'store',
    credits: campaignState.credits,
    sector: campaignState.currentSector,
    onNavigate,
  });

  return `
    <div class="campaign-page">
      ${navBar}
      <main class="store-screen" aria-label="Equipment Store">
        <nav class="store-categories" aria-label="Store categories">
          <div class="category-tabs" role="tablist" aria-label="Item categories">
            ${renderCategoryTab(campaignState, selectedCategory, 'ships', 'Ships')}
            ${renderCategoryTab(campaignState, selectedCategory, 'primaries', 'Primaries')}
            ${renderCategoryTab(campaignState, selectedCategory, 'secondaries', 'Missiles')}
            ${renderCategoryTab(campaignState, selectedCategory, 'ammo', 'Ammo')}
            ${renderCategoryTab(campaignState, selectedCategory, 'scrap', 'Scrap')}
          </div>
          <div class="category-actions">
            ${renderResupplyButton(campaignState)}
          </div>
        </nav>
        <div class="store-layout">
          <aside class="store-list" role="listbox" aria-label="Available items">
            ${itemList}
          </aside>
          <section class="store-details" aria-label="Item details">
            ${detailPanel || '<div class="empty-state-panel" role="status">Select an item to view details</div>'}
          </section>
          ${renderStoreStorage(campaignState, selectedCategory, selectedItem)}
        </div>
      </main>
    </div>
  `;
}
