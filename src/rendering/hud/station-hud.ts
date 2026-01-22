/**
 * Station Health Display - shows status of station in station defense missions.
 * Position: below wingman display (similar to convoy)
 */

import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { requireElement } from './dom-utils';

/** Station display state */
export interface StationDisplay {
  section: HTMLElement;
  nameLabel: HTMLElement;
  hullBar: HTMLElement;
  hullText: HTMLElement;
  shieldBar: HTMLElement;
  shieldText: HTMLElement;
  statusLabel: HTMLElement;
}

/** Station info for display */
interface StationInfo {
  entity: Entity;
  name: string;
  hullPct: number;
  hullCurrent: number;
  hullMax: number;
  shieldPct: number;
  shieldCurrent: number;
  shieldMax: number;
  critical: boolean;
  destroyed: boolean;
}

/** Create station display section */
export function createStationDisplay(container: HTMLElement): StationDisplay {
  const section = document.createElement('div');
  section.className = 'station-section';
  section.innerHTML = `
    <div class="station-header">STATION</div>
    <div class="station-name">---</div>
    <div class="station-bars">
      <div class="station-bar-row">
        <span class="station-bar-label">SHLD</span>
        <div class="station-bar shield"><div class="station-bar-fill"></div></div>
        <span class="station-bar-text">---</span>
      </div>
      <div class="station-bar-row">
        <span class="station-bar-label">HULL</span>
        <div class="station-bar hull"><div class="station-bar-fill"></div></div>
        <span class="station-bar-text">---</span>
      </div>
    </div>
    <div class="station-status">---</div>
  `;
  section.style.display = 'none';
  container.appendChild(section);

  return {
    section,
    nameLabel: requireElement(section, '.station-name'),
    hullBar: requireElement(section, '.station-bar.hull .station-bar-fill'),
    hullText: requireElement(
      section,
      '.station-bar-row:last-child .station-bar-text',
    ),
    shieldBar: requireElement(section, '.station-bar.shield .station-bar-fill'),
    shieldText: requireElement(
      section,
      '.station-bar-row:first-child .station-bar-text',
    ),
    statusLabel: requireElement(section, '.station-status'),
  };
}

/** Find station entity in world */
function findStation(world: World): StationInfo | null {
  for (const entity of queryEntities(world, [
    'structure',
    'health',
    'shipIdentity',
  ])) {
    const structure = getComponent(world, entity, 'structure');
    if (structure?.structureType !== 'station') continue;

    const health = getComponent(world, entity, 'health');
    const shields = getComponent(world, entity, 'shields');
    const identity = getComponent(world, entity, 'shipIdentity');

    if (!health) continue;

    const hullPct = isDead(health) ? 0 : (health.hull / health.maxHull) * 100;
    const shieldPct =
      shields && shields.max > 0 ? (shields.current / shields.max) * 100 : 0;

    return {
      entity,
      name: identity?.callsign ?? 'Station',
      hullPct,
      hullCurrent: Math.ceil(health.hull),
      hullMax: health.maxHull,
      shieldPct,
      shieldCurrent: shields ? Math.ceil(shields.current) : 0,
      shieldMax: shields?.max ?? 0,
      critical: hullPct > 0 && hullPct < 30,
      destroyed: isDead(health),
    };
  }
  return null;
}

/** Update station display */
export function updateStationDisplay(
  display: StationDisplay,
  world: World,
): boolean {
  const station = findStation(world);

  if (!station) {
    display.section.style.display = 'none';
    return false;
  }

  display.section.style.display = 'block';

  // Update name
  display.nameLabel.textContent = station.name;

  // Update hull bar
  display.hullBar.style.width = `${station.hullPct}%`;
  display.hullText.textContent = `${station.hullCurrent}/${station.hullMax}`;

  // Hull bar color
  if (station.destroyed) {
    display.hullBar.style.background = '#400';
    display.section.classList.add('destroyed');
    display.section.classList.remove('critical');
  } else if (station.hullPct < 30) {
    display.hullBar.style.background = '#f00';
    display.section.classList.add('critical');
    display.section.classList.remove('destroyed');
  } else if (station.hullPct < 50) {
    display.hullBar.style.background = '#f80';
    display.section.classList.remove('critical', 'destroyed');
  } else {
    display.hullBar.style.background = '#0f0';
    display.section.classList.remove('critical', 'destroyed');
  }

  // Update shield bar
  display.shieldBar.style.width = `${station.shieldPct}%`;
  display.shieldText.textContent = `${station.shieldCurrent}/${station.shieldMax}`;

  // Status text
  if (station.destroyed) {
    display.statusLabel.textContent = 'DESTROYED';
    display.statusLabel.style.color = '#f00';
  } else if (station.critical) {
    display.statusLabel.textContent = 'CRITICAL';
    display.statusLabel.style.color = '#f80';
  } else {
    display.statusLabel.textContent = 'OPERATIONAL';
    display.statusLabel.style.color = '#0f0';
  }

  return true;
}

/** Get CSS styles for station display */
export function getStationDisplayStyles(): string {
  return `
    .station-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #040;
    }
    .station-header {
      font-size: 10px;
      color: #0a0;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .station-name {
      font-size: 11px;
      color: #0f0;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .station-bars {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .station-bar-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .station-bar-label {
      width: 32px;
      font-size: 9px;
      color: #888;
    }
    .station-bar {
      flex: 1;
      height: 8px;
      background: rgba(0, 20, 0, 0.5);
      border: 1px solid #040;
      position: relative;
    }
    .station-bar-fill {
      height: 100%;
      transition: width 0.2s ease-out;
    }
    .station-bar.hull .station-bar-fill {
      background: #0f0;
    }
    .station-bar.shield .station-bar-fill {
      background: #0af;
    }
    .station-bar-text {
      width: 60px;
      font-size: 9px;
      color: #888;
      text-align: right;
    }
    .station-status {
      margin-top: 6px;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
    }
    .station-section.critical {
      animation: pulse 0.5s ease-in-out infinite alternate;
    }
    .station-section.destroyed {
      opacity: 0.5;
    }
  `;
}
