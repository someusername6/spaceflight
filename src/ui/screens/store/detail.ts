/**
 * Store Detail Panel - renders the selected item details and action buttons.
 */

import {
  canConvertScrapToShip,
  getScrapConversionFee,
} from '../../../campaign/store/store';
import type { CampaignState } from '../../../campaign/types';
import { SCRAP_PER_SHIP } from '../../../data/prices';
import { PRIMARY_WEAPONS } from '../../../data/weapons';
import {
  canBuy as hasCanBuyPermission,
  canConvertScrap as hasCanConvertPermission,
  canSell as hasCanSellPermission,
} from '../../../multiplayer/context-permissions';
import { capitalize } from '../../utils/text';
import {
  getItemPrice,
  getStorageCount,
  renderAmmoStats,
  renderItemPreview,
  renderPrimaryStats,
  renderScrapStats,
  renderSecondaryStats,
  renderShipStats,
  type StoreCategory,
} from './render';

/** Render stats section based on category */
function renderStats(category: StoreCategory, itemId: string): string {
  switch (category) {
    case 'ships':
      return renderShipStats(itemId);
    case 'primaries':
      return renderPrimaryStats(itemId);
    case 'secondaries':
      return renderSecondaryStats(itemId);
    case 'ammo':
      return renderAmmoStats(itemId);
    case 'scrap':
      return renderScrapStats(itemId);
  }
}

/** Render scrap detail panel (sell-only with conversion) */
function renderScrapDetail(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
  storageCount: number,
  sellPrice: number,
  statsHtml: string,
): string {
  // Check multiplayer permissions
  const hasSellPerm = hasCanSellPermission();
  const hasConvertPerm = hasCanConvertPermission();

  const canSell = storageCount > 0 && hasSellPerm;
  const canSellBulk10 = storageCount >= 10 && hasSellPerm;
  const canSellBulk100 = storageCount >= 100 && hasSellPerm;
  const conversionFee = getScrapConversionFee(itemId);
  const canConvert = canConvertScrapToShip(state, itemId) && hasConvertPerm;
  const storageText = storageCount > 0 ? `In storage: ${storageCount}` : '';
  const displayName = capitalize(itemId);
  const previewHtml = renderItemPreview(category, itemId);

  return `
    <div class="store-detail">
      <div class="detail-fixed-top">
        <div class="detail-header">${displayName} Scrap</div>
        ${previewHtml}
      </div>
      <div class="detail-scrollable">
        ${statsHtml}
      </div>
      <div class="detail-fixed-bottom">
        ${storageText ? `<div class="detail-storage">${storageText}</div>` : ''}
        <div class="detail-actions">
          <button class="btn btn-convert" id="btn-convert" ${canConvert ? '' : 'disabled'}>
            Convert&nbsp;to&nbsp;Ship (${SCRAP_PER_SHIP}&nbsp;scrap,&nbsp;${conversionFee}&nbsp;cr)
          </button>
          <button class="btn btn-sell" id="btn-sell" ${canSell ? '' : 'disabled'}>
            Sell&nbsp;×1<br>(${sellPrice}&nbsp;cr)
          </button>
          <button class="btn btn-sell" id="btn-sell-bulk" ${canSellBulk10 ? '' : 'disabled'}>
            Sell&nbsp;×10<br>(${sellPrice * 10}&nbsp;cr)
          </button>
          <button class="btn btn-sell" id="btn-sell-bulk-100" ${canSellBulk100 ? '' : 'disabled'}>
            Sell&nbsp;×100<br>(${sellPrice * 100}&nbsp;cr)
          </button>
        </div>
      </div>
    </div>
  `;
}

/** Render standard item detail panel (buy/sell) */
function renderStandardDetail(
  state: CampaignState,
  category: StoreCategory,
  itemId: string,
  storeStockCount: number,
  storageCount: number,
  buyPrice: number,
  sellPrice: number,
  statsHtml: string,
): string {
  // Check multiplayer permissions
  const hasBuyPerm = hasCanBuyPermission();
  const hasSellPerm = hasCanSellPermission();

  const canAfford =
    state.credits >= buyPrice && storeStockCount > 0 && hasBuyPerm;
  const canSell = storageCount > 0 && hasSellPerm;
  const storageText = storageCount > 0 ? `In storage: ${storageCount}` : '';
  const previewHtml = renderItemPreview(category, itemId);

  // Batch sizes depend on item type
  const isMissile = category === 'secondaries';
  const isAmmo = category === 'ammo';
  const isAutocannon = isAmmo && itemId === 'autocannon';

  // Single buy/sell amount: autocannon ×10, others ×1
  const singleBuyAmount = isAutocannon ? 10 : 1;
  const singleSellAmount = isAutocannon ? 10 : 1;

  // Bulk amount: autocannon ×100, others ×10
  const bulkAmount = isAutocannon ? 100 : 10;
  const showBulk = isMissile || isAmmo;

  const singleBuyPrice = Math.round(buyPrice * singleBuyAmount);
  const singleSellPrice = Math.round(sellPrice * singleSellAmount);
  const bulkPrice = Math.round(buyPrice * bulkAmount);
  const bulkSellPrice = Math.round(sellPrice * bulkAmount);

  const canAffordBulk =
    state.credits >= bulkPrice && storeStockCount >= bulkAmount && hasBuyPerm;
  const canSellBulk = storageCount >= bulkAmount && hasSellPerm;

  // For ammo, use the ammoName field; for primaries, use the full name
  const isPrimary = category === 'primaries';
  let headerTitle = itemId;
  if (isAmmo) {
    headerTitle = PRIMARY_WEAPONS[itemId]?.ammoName ?? itemId;
  } else if (isPrimary) {
    headerTitle = PRIMARY_WEAPONS[itemId]?.name ?? itemId;
  }

  // Show quantity on buttons for consumables (ammo/missiles) with line break before price
  // For non-consumables, just add a space before the price
  const showQty = showBulk;
  const buyQtyText = showQty ? `&nbsp;×${singleBuyAmount}<br>` : ' ';
  const sellQtyText = showQty ? `&nbsp;×${singleSellAmount}<br>` : ' ';

  return `
    <div class="store-detail">
      <div class="detail-fixed-top">
        <div class="detail-header">${headerTitle}</div>
        ${previewHtml}
      </div>
      <div class="detail-scrollable">
        ${statsHtml}
      </div>
      <div class="detail-fixed-bottom">
        ${storageText ? `<div class="detail-storage">${storageText}</div>` : ''}
        <div class="detail-actions">
          <button class="btn btn-sell" id="btn-sell" ${canSell ? '' : 'disabled'}>
            Sell${sellQtyText}(${singleSellPrice}&nbsp;cr)
          </button>
          ${showBulk ? `<button class="btn btn-sell" id="btn-sell-bulk" ${canSellBulk ? '' : 'disabled'}>Sell&nbsp;×${bulkAmount}<br>(${bulkSellPrice}&nbsp;cr)</button>` : ''}
          <button class="btn btn-buy" id="btn-buy" ${canAfford ? '' : 'disabled'}>
            Buy${buyQtyText}(${singleBuyPrice}&nbsp;cr)
          </button>
          ${showBulk ? `<button class="btn btn-buy" id="btn-buy-bulk" ${canAffordBulk ? '' : 'disabled'}>Buy&nbsp;×${bulkAmount}<br>(${bulkPrice}&nbsp;cr)</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

/** Item info for detail panel */
export interface DetailItem {
  id: string;
  stock: number;
}

/** Render detail panel for selected item */
export function renderDetailPanel(
  state: CampaignState,
  category: StoreCategory,
  selectedItem: string | null,
  items: DetailItem[],
): string {
  if (!selectedItem) {
    return '';
  }

  const buyPrice = getItemPrice(category, selectedItem, 'buy');
  const sellPrice = getItemPrice(category, selectedItem, 'sell');
  const foundItem = items.find((i) => i.id === selectedItem);
  const storeStockCount = foundItem?.stock ?? 0;
  const storageCount = getStorageCount(state, category, selectedItem);
  const statsHtml = renderStats(category, selectedItem);

  if (category === 'scrap') {
    return renderScrapDetail(
      state,
      category,
      selectedItem,
      storageCount,
      sellPrice,
      statsHtml,
    );
  }

  return renderStandardDetail(
    state,
    category,
    selectedItem,
    storeStockCount,
    storageCount,
    buyPrice,
    sellPrice,
    statsHtml,
  );
}
