/**
 * Squadron List - Unified list component showing deployed, available, and recruits.
 */

import {
  getAttentionReasons,
  needsAttention,
} from '../../../campaign/resupply/resupply-constrained';
import type { HireablePilot, OwnedShip, Pilot } from '../../../campaign/types';
import { renderShipItem, renderWeaponBadges } from '../../common/ship-item';
import { getFallbackSvgUrl } from '../../utils/inline-svg';

/** List selection types */
export type ListSelection =
  | { type: 'none'; id: null }
  | { type: 'deployed'; id: string }
  | { type: 'available'; id: string }
  | { type: 'recruit'; id: string }
  | { type: 'ship'; id: string };

/** Render warning badge and tooltip for icon */
function renderWarningBadge(ship: OwnedShip): string {
  const reasons = getAttentionReasons(ship);
  if (reasons.length === 0) return '';

  const tooltipContent = reasons
    .map((r) => `<div class="warning-tooltip-line">${r}</div>`)
    .join('');

  return `
    <span class="ship-item-warning" aria-label="Needs attention">!</span>
    <div class="warning-tooltip">${tooltipContent}</div>
  `;
}

/** Render a deployed item (pilot-ship pair) */
function renderDeployedItem(
  ship: OwnedShip,
  isSelected: boolean,
  isCommander: boolean,
): string {
  const showWarning = needsAttention(ship);

  return renderShipItem({
    ship,
    isCommander,
    isSelected,
    extraClasses: `deployed ${showWarning ? 'has-warning' : ''}`,
    dataAttrs: { 'deployed-id': ship.id },
    iconContent: showWarning ? renderWarningBadge(ship) : '',
    afterContent: renderWeaponBadges(ship),
  });
}

/** Render an available pilot item */
function renderAvailableItem(
  pilot: Pilot,
  isSelected: boolean,
  isCommander: boolean,
): string {
  const selectedClass = isSelected ? 'selected' : '';
  const commanderClass = isCommander ? 'commander' : '';

  return `
    <article
      class="ship-item available ${selectedClass} ${commanderClass}"
      data-pilot-id="${pilot.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${pilot.name}, available"
    >
      <div class="ship-item-icon">
        <img src="${getFallbackSvgUrl()}" alt="No ship" class="ship-item-img ship-item-img-empty" />
      </div>
      <div class="ship-item-info">
        <div class="ship-item-name-row">
          <span class="ship-item-pilot">${isCommander ? '<span class="commander-star" aria-label="Commander">★</span>' : ''}${pilot.name}</span>
        </div>
        <span class="ship-item-status">Available</span>
      </div>
    </article>
  `;
}

/** Render a recruit item */
function renderRecruitItem(
  recruit: HireablePilot,
  isSelected: boolean,
  canAfford: boolean,
): string {
  const selectedClass = isSelected ? 'selected' : '';
  const affordClass = canAfford ? '' : 'unaffordable';
  const skillClass = recruit.skill.toLowerCase();

  return `
    <article
      class="ship-item recruit ${selectedClass} ${affordClass}"
      data-recruit-id="${recruit.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${recruit.name}, ${recruit.skill} pilot, ${recruit.price} credits${canAfford ? '' : ', cannot afford'}"
    >
      <div class="ship-item-info recruit-info">
        <div class="ship-item-name-row">
          <span class="ship-item-pilot">${recruit.name}</span>
        </div>
        <span class="ship-item-status ${skillClass}">${recruit.skill}</span>
      </div>
      <div class="ship-item-price">${recruit.price} cr</div>
    </article>
  `;
}

/** Options for rendering the squadron list */
export interface SquadronListOptions {
  showResupplyAll?: boolean;
  resupplyAllCost?: number;
  commanderId: string;
}

/** Render the complete squadron list */
export function renderSquadronList(
  ships: OwnedShip[],
  pilots: Pilot[],
  recruits: HireablePilot[],
  commanderId: string,
  credits: number,
  selection: ListSelection,
  options?: SquadronListOptions,
): string {
  // Deployed: ships with pilots
  const deployedShips = ships.filter((s) => s.pilot !== null);
  const deployedHtml = deployedShips
    .map((ship) => {
      const isSelected =
        selection.type === 'deployed' && selection.id === ship.id;
      const isCommander = ship.pilot?.id === commanderId;
      return renderDeployedItem(ship, isSelected, isCommander);
    })
    .join('');

  // Available: pilots without ships
  const assignedPilotIds = new Set<string>();
  for (const ship of ships) {
    if (ship.pilot) {
      assignedPilotIds.add(ship.pilot.id);
    }
  }
  const availablePilots = pilots.filter((p) => !assignedPilotIds.has(p.id));
  const availableHtml = availablePilots
    .map((pilot) => {
      const isSelected =
        selection.type === 'available' && selection.id === pilot.id;
      const isCommander = pilot.id === commanderId;
      return renderAvailableItem(pilot, isSelected, isCommander);
    })
    .join('');

  // Recruits
  const recruitsHtml = recruits
    .map((recruit) => {
      const isSelected =
        selection.type === 'recruit' && selection.id === recruit.id;
      const canAfford = credits >= recruit.price;
      return renderRecruitItem(recruit, isSelected, canAfford);
    })
    .join('');

  // Resupply All button (inside deployed section)
  let resupplyAllBtn = '';
  if (options?.showResupplyAll && options.commanderId) {
    const costLabel =
      options.resupplyAllCost && options.resupplyAllCost > 0
        ? ` (${options.resupplyAllCost} cr)`
        : '';
    resupplyAllBtn = `<div class="squadron-resupply-toolbar">
        <button class="btn btn-small btn-resupply-all" data-commander="${options.commanderId}">
          Resupply All${costLabel}
        </button>
      </div>`;
  }

  // Build sections
  const deployedSection =
    deployedShips.length > 0
      ? `
        <div class="squadron-section">
          <header class="panel-header">
            <span class="panel-icon" aria-hidden="true">◈</span>
            <span class="panel-title">Deployed</span>
            <span class="panel-count" aria-label="${deployedShips.length} deployed">${deployedShips.length}</span>
          </header>
          ${resupplyAllBtn}
          <div class="squadron-items" role="listbox" aria-label="Deployed pilots">
            ${deployedHtml}
          </div>
        </div>
      `
      : '';

  const availableSection =
    availablePilots.length > 0
      ? `
        <div class="squadron-section">
          <header class="panel-header available-header">
            <span class="panel-icon" aria-hidden="true">★</span>
            <span class="panel-title">Available</span>
            <span class="panel-count" aria-label="${availablePilots.length} available">${availablePilots.length}</span>
          </header>
          <div class="squadron-items" role="listbox" aria-label="Available pilots">
            ${availableHtml}
          </div>
        </div>
      `
      : '';

  const recruitsSection =
    recruits.length > 0
      ? `
        <div class="squadron-section">
          <header class="panel-header recruits-header">
            <span class="panel-icon" aria-hidden="true">+</span>
            <span class="panel-title">Recruits</span>
            <span class="panel-count" aria-label="${recruits.length} recruits">${recruits.length}</span>
          </header>
          <div class="squadron-items" role="listbox" aria-label="Available recruits">
            ${recruitsHtml || '<div class="no-recruits">No recruits available</div>'}
          </div>
        </div>
      `
      : '';

  return `
    <aside class="squadron-list" aria-label="Squadron list">
      ${deployedSection}
      ${availableSection}
      ${recruitsSection}
    </aside>
  `;
}
