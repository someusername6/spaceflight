/**
 * Convoy Health Bars - shows status of convoy ships in escort missions.
 * Position: below wingman display
 */

import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { requireElement } from './dom-utils';

/** Maximum convoy ships to display */
const MAX_CONVOY_SHOWN = 5;

/** Convoy display state */
export interface ConvoyDisplay {
  section: HTMLElement;
  elements: ConvoyElement[];
}

/** Single convoy row elements */
interface ConvoyElement {
  row: HTMLElement;
  label: HTMLElement;
  hullBar: HTMLElement;
  shieldBar: HTMLElement;
  status: HTMLElement;
}

/** Convoy info for display */
interface ConvoyInfo {
  entity: Entity;
  index: number;
  hullPct: number;
  shieldPct: number;
  inZone: boolean;
  critical: boolean;
}

// Reusable array to avoid allocations
const convoyShips: ConvoyInfo[] = [];

/** Create convoy display section */
export function createConvoyDisplay(container: HTMLElement): ConvoyDisplay {
  const section = document.createElement('div');
  section.className = 'convoy-section';
  section.innerHTML = `<div class="convoy-header">CONVOY</div>`;
  section.style.display = 'none';

  // Pre-create convoy rows
  const elements: ConvoyElement[] = [];
  for (let i = 0; i < MAX_CONVOY_SHOWN; i++) {
    const row = document.createElement('div');
    row.className = 'convoy-row';
    row.innerHTML = `
      <span class="convoy-label">---</span>
      <div class="ally-bars">
        <div class="ally-bar shield"><div class="ally-bar-fill"></div></div>
        <div class="ally-bar hull"><div class="ally-bar-fill"></div></div>
      </div>
      <span class="convoy-status">---</span>
    `;
    section.appendChild(row);

    elements.push({
      row,
      label: requireElement(row, '.convoy-label'),
      hullBar: requireElement(row, '.ally-bar.hull .ally-bar-fill'),
      shieldBar: requireElement(row, '.ally-bar.shield .ally-bar-fill'),
      status: requireElement(row, '.convoy-status'),
    });
  }
  container.appendChild(section);

  return { section, elements };
}

/** Update convoy display */
export function updateConvoyDisplay(
  display: ConvoyDisplay,
  world: World,
): boolean {
  // Collect convoy ships
  convoyShips.length = 0;

  for (const entity of queryEntities(world, [
    'convoyShip',
    'health',
    'transform',
  ])) {
    const health = getComponent(world, entity, 'health');
    if (!health) continue;

    const convoyShip = getComponent(world, entity, 'convoyShip');
    const shields = getComponent(world, entity, 'shields');

    const hullPct = isDead(health) ? 0 : (health.hull / health.maxHull) * 100;
    const shieldPct =
      shields && shields.max > 0 ? (shields.current / shields.max) * 100 : 0;

    convoyShips.push({
      entity,
      index: convoyShip?.index ?? 0,
      hullPct,
      shieldPct,
      inZone: convoyShip?.inEscapeZone ?? false,
      critical: hullPct > 0 && hullPct < 30,
    });
  }

  // Sort by index
  convoyShips.sort((a, b) => a.index - b.index);

  // Update convoy display
  const hasConvoy = convoyShips.length > 0;
  display.section.style.display = hasConvoy ? 'block' : 'none';

  for (let i = 0; i < display.elements.length; i++) {
    const el = display.elements[i];
    if (!el) continue;
    const convoy = convoyShips[i];

    if (convoy) {
      el.row.style.display = 'flex';
      el.row.classList.toggle('critical', convoy.critical);
      el.row.classList.toggle('destroyed', convoy.hullPct === 0);
      el.row.classList.toggle('in-zone', convoy.inZone);
      el.label.textContent = `Ship ${convoy.index + 1}`;
      el.hullBar.style.width = `${convoy.hullPct}%`;
      el.shieldBar.style.width = `${convoy.shieldPct}%`;

      // Status text
      if (convoy.hullPct === 0) {
        el.status.textContent = 'LOST';
        el.status.style.color = '#f00';
      } else if (convoy.inZone) {
        el.status.textContent = 'SAFE';
        el.status.style.color = '#0f0';
      } else {
        el.status.textContent = '';
      }

      // Hull bar color
      if (convoy.hullPct === 0) {
        el.hullBar.style.background = '#400';
      } else if (convoy.hullPct < 25) {
        el.hullBar.style.background = '#f00';
      } else if (convoy.hullPct < 50) {
        el.hullBar.style.background = '#f80';
      } else {
        el.hullBar.style.background = '#fa0'; // Yellow for convoy
      }
    } else {
      el.row.style.display = 'none';
    }
  }

  return hasConvoy;
}

/** Get CSS styles for convoy display */
export function getConvoyDisplayStyles(): string {
  return `
    .convoy-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #550;
    }
    .convoy-header {
      font-size: 10px;
      color: #fa0;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .convoy-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .convoy-row.critical {
      animation: pulse 0.5s ease-in-out infinite alternate;
    }
    .convoy-row.destroyed {
      opacity: 0.4;
    }
    .convoy-row.in-zone .convoy-label {
      color: #0f0;
    }
    .convoy-label {
      width: 52px;
      font-size: 10px;
      color: #fa0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .convoy-status {
      width: 32px;
      font-size: 9px;
      color: #fa0;
      text-align: right;
      font-weight: bold;
    }
  `;
}
