/**
 * Allied Health Bars - shows status of wingmen (allied AI ships).
 * Position: top-left corner
 */

import { isDead } from '../../components/health';
import { getComponent, hasComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Faction } from '../../core/types';
import {
  type ConvoyDisplay,
  createConvoyDisplay,
  getConvoyDisplayStyles,
  updateConvoyDisplay,
} from './convoy-hud';
import { requireElement } from './dom-utils';

/** Maximum allies to display */
const MAX_ALLIES_SHOWN = 5;

/** Allied display state */
export interface AlliedDisplay {
  container: HTMLElement;
  allyElements: AllyElement[];
  convoyDisplay: ConvoyDisplay;
}

/** Single ally row elements */
interface AllyElement {
  row: HTMLElement;
  callsign: HTMLElement;
  hullBar: HTMLElement;
  shieldBar: HTMLElement;
  distance: HTMLElement;
}

/** Create allied display */
export function createAlliedDisplay(parent: HTMLElement): AlliedDisplay {
  const container = document.createElement('div');
  container.className = 'allied-display';
  container.innerHTML = `<div class="allied-header">WINGMEN</div>`;

  // Pre-create ally rows
  const allyElements: AllyElement[] = [];
  for (let i = 0; i < MAX_ALLIES_SHOWN; i++) {
    const row = document.createElement('div');
    row.className = 'ally-row';
    row.innerHTML = `
      <span class="ally-callsign">---</span>
      <div class="ally-bars">
        <div class="ally-bar hull"><div class="ally-bar-fill"></div></div>
        <div class="ally-bar shield"><div class="ally-bar-fill"></div></div>
      </div>
      <span class="ally-distance">---</span>
    `;
    container.appendChild(row);

    allyElements.push({
      row,
      callsign: requireElement(row, '.ally-callsign'),
      hullBar: requireElement(row, '.ally-bar.hull .ally-bar-fill'),
      shieldBar: requireElement(row, '.ally-bar.shield .ally-bar-fill'),
      distance: requireElement(row, '.ally-distance'),
    });
  }

  // Create convoy display (for escort missions)
  const convoyDisplay = createConvoyDisplay(container);

  parent.appendChild(container);

  return { container, allyElements, convoyDisplay };
}

/** Ally info for sorting */
interface AllyInfo {
  entity: Entity;
  callsign: string;
  hullPct: number;
  shieldPct: number;
  distance: number;
  critical: boolean;
}

// Reusable array to avoid allocations
const allies: AllyInfo[] = [];

/** Update allied display */
export function updateAlliedDisplay(
  display: AlliedDisplay,
  world: World,
  player: Entity,
): void {
  const playerTransform = getComponent(world, player, 'transform');

  // Collect allied ships
  allies.length = 0;

  for (const entity of queryEntities(world, [
    'faction',
    'health',
    'transform',
    'shipIdentity',
  ])) {
    // Skip player
    if (entity === player) continue;
    if (hasComponent(world, entity, 'playerControlled')) continue;

    const faction = getComponent(world, entity, 'faction');
    if (!faction || faction.faction !== Faction.Player) continue;

    const health = getComponent(world, entity, 'health');
    if (!health || isDead(health)) continue;

    const identity = getComponent(world, entity, 'shipIdentity');
    const shields = getComponent(world, entity, 'shields');
    const transform = getComponent(world, entity, 'transform');

    const hullPct = (health.hull / health.maxHull) * 100;
    const shieldPct = shields ? (shields.current / shields.max) * 100 : 0;
    const distance =
      playerTransform && transform
        ? playerTransform.position.distanceTo(transform.position)
        : 0;

    allies.push({
      entity,
      callsign: identity?.callsign ?? '???',
      hullPct,
      shieldPct,
      distance,
      critical: hullPct < 30,
    });
  }

  // Sort by callsign (Alpha 2, Alpha 3, etc.)
  allies.sort((a, b) => a.callsign.localeCompare(b.callsign));

  // Update display elements
  const hasAllies = allies.length > 0;
  display.container.classList.toggle('has-allies', hasAllies);

  for (let i = 0; i < display.allyElements.length; i++) {
    const el = display.allyElements[i];
    if (!el) continue;
    const ally = allies[i];

    if (ally) {
      el.row.style.display = 'flex';
      el.row.classList.toggle('critical', ally.critical);
      el.callsign.textContent = ally.callsign;
      el.hullBar.style.width = `${ally.hullPct}%`;
      el.shieldBar.style.width = `${ally.shieldPct}%`;
      el.distance.textContent = formatDistance(ally.distance);

      // Hull bar color based on health
      if (ally.hullPct < 25) {
        el.hullBar.style.background = '#f00';
      } else if (ally.hullPct < 50) {
        el.hullBar.style.background = '#f80';
      } else {
        el.hullBar.style.background = '#0f0';
      }
    } else {
      el.row.style.display = 'none';
    }
  }

  // Update convoy display (for escort missions)
  const hasConvoy = updateConvoyDisplay(display.convoyDisplay, world);
  if (hasConvoy) {
    display.container.classList.add('has-allies');
  }
}

/** Format distance for display */
function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}k`;
  }
  return `${Math.round(distance)}m`;
}

/** Get CSS styles for allied display */
export function getAlliedDisplayStyles(): string {
  return `
    .allied-display {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #080;
      padding: 8px 10px;
      min-width: 140px;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .allied-display.has-allies {
      opacity: 1;
      border-color: #0a0;
    }
    .allied-header {
      font-size: 10px;
      color: #0a0;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .ally-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .ally-row.critical {
      animation: pulse 0.5s ease-in-out infinite alternate;
    }
    .ally-callsign {
      width: 52px;
      font-size: 10px;
      color: #0f0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ally-bars {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .ally-bar {
      height: 4px;
      background: rgba(0, 20, 0, 0.5);
      border: 1px solid #040;
    }
    .ally-bar-fill {
      height: 100%;
      width: 0%;
      transition: width 0.1s;
    }
    .ally-bar.hull .ally-bar-fill {
      background: #0f0;
    }
    .ally-bar.shield .ally-bar-fill {
      background: #0af;
    }
    .ally-distance {
      width: 32px;
      font-size: 9px;
      color: #080;
      text-align: right;
    }
    ${getConvoyDisplayStyles()}
  `;
}
