/**
 * Store Styles - Tactical interface design
 */

import { colors, fonts } from '../common/theme';

export function getStoreStyles(): string {
  return `
    /* ========================================
       STORE SCREEN LAYOUT
       ======================================== */

    .store-screen {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 56px);
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px;
      box-sizing: border-box;
      overflow: hidden;
    }

    .store-categories {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-shrink: 0;
    }

    .category-tabs {
      display: flex;
      gap: 4px;
    }

    .category-tabs .btn {
      padding: 10px 20px;
      font-size: 0.8rem;
    }

    .category-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-resupply-small {
      padding: 8px 16px;
      font-size: 0.75rem;
      border-color: ${colors.secondary};
      color: ${colors.secondary};
    }

    .btn-resupply-small:hover:not(:disabled) {
      background: rgba(0, 245, 255, 0.1);
    }

    .resupply-status {
      font-size: 0.75rem;
      color: ${colors.success};
    }

    .store-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr) 280px;
      gap: 20px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    @media (max-width: 1000px) {
      .store-layout {
        grid-template-columns: 280px minmax(0, 1fr);
      }
      .store-storage {
        display: none;
      }
    }

    @media (max-width: 700px) {
      .store-layout {
        grid-template-columns: 1fr;
      }
    }

    /* ========================================
       ITEM LIST
       ======================================== */

    .store-list {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      padding: 12px;
      overflow-y: auto;
      min-height: 0;
      min-width: 0;
      max-width: 280px;
    }

    /* Custom scrollbar */
    .store-list::-webkit-scrollbar {
      width: 6px;
    }

    .store-list::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }

    .store-list::-webkit-scrollbar-thumb {
      background: ${colors.borderLight};
      border-radius: 3px;
    }

    .store-list::-webkit-scrollbar-thumb:hover {
      background: ${colors.primary};
    }

    .store-item {
      display: flex;
      align-items: center;
      padding: 12px 14px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid transparent;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }

    .store-item:last-child {
      margin-bottom: 0;
    }

    .store-item:hover {
      background: rgba(255, 159, 28, 0.08);
      border-color: ${colors.border};
    }

    .store-item.selected {
      background: rgba(255, 159, 28, 0.12);
      border-color: ${colors.primary};
    }

    .store-item.selected::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${colors.primary};
    }

    .store-item .item-name {
      flex: 1;
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 500;
      color: ${colors.textPrimary};
      text-transform: capitalize;
    }

    .store-item .item-stock {
      font-family: ${fonts.body};
      font-size: 0.75rem;
      color: ${colors.textDim};
      margin: 0 16px;
      min-width: 40px;
      text-align: center;
    }

    .store-item .item-price {
      font-family: ${fonts.display};
      font-size: 0.85rem;
      font-weight: 500;
      color: ${colors.success};
      min-width: 80px;
      text-align: right;
    }

    .store-item .item-price.expensive {
      color: ${colors.danger};
    }

    .store-item .item-price.sell-price {
      color: ${colors.warning};
    }

    /* ========================================
       DETAIL PANEL
       ======================================== */

    .store-details {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      padding: 20px;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      min-width: 0;
    }

    .no-selection {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: ${colors.textDim};
      font-style: italic;
      text-align: center;
    }

    .store-detail {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .detail-header {
      font-family: ${fonts.ui};
      font-size: 1.3rem;
      font-weight: 600;
      color: ${colors.primary};
      text-transform: capitalize;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid ${colors.border};
    }

    .item-description {
      font-size: 0.85rem;
      color: ${colors.textSecondary};
      line-height: 1.5;
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-left: 2px solid ${colors.border};
    }

    /* ========================================
       PRICING
       ======================================== */

    .detail-prices {
      background: rgba(0, 0, 0, 0.3);
      padding: 14px;
      margin-bottom: 20px;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 0.85rem;
    }

    .price-row:first-child {
      padding-top: 0;
    }

    .price-row:last-child {
      padding-bottom: 0;
    }

    .price-label {
      color: ${colors.textSecondary};
    }

    .price-value {
      font-family: ${fonts.display};
      font-weight: 500;
    }

    .price-value.buy {
      color: ${colors.success};
    }

    .price-value.sell {
      color: ${colors.warning};
    }

    .stock-count {
      color: ${colors.textDim};
      font-size: 0.8rem;
    }

    .storage-count {
      color: ${colors.secondary};
      font-size: 0.8rem;
    }

    .detail-storage {
      font-size: 0.8rem;
      color: ${colors.secondary};
      padding: 8px 12px;
      background: rgba(0, 245, 255, 0.05);
      border: 1px solid ${colors.border};
      margin-bottom: 16px;
    }

    /* ========================================
       ACTION BUTTONS
       ======================================== */

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: auto;
    }

    .detail-actions .btn {
      flex: 1;
      min-width: 100px;
      min-height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .btn-buy {
      border-color: ${colors.success};
      color: ${colors.success};
    }

    .btn-buy:hover:not(:disabled) {
      background: rgba(0, 255, 136, 0.1);
      box-shadow: 0 0 15px ${colors.successGlow};
    }

    .btn-sell {
      border-color: ${colors.warning};
      color: ${colors.warning};
    }

    .btn-sell:hover:not(:disabled) {
      background: rgba(255, 217, 61, 0.1);
    }

    /* ========================================
       SCRAP SPECIFIC
       ======================================== */

    .scrap-conversion-info {
      background: rgba(0, 245, 255, 0.05);
      border: 1px solid ${colors.secondary};
      padding: 12px;
      margin-bottom: 16px;
      font-size: 0.8rem;
      color: ${colors.textSecondary};
    }

    .scrap-conversion-info strong {
      color: ${colors.secondary};
    }
  `;
}
