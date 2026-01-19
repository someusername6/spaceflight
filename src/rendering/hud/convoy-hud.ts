/**
 * Convoy Health Bars - shows status of convoy ships.
 * - Escort missions: neutral convoy, display SAFE/LOST status
 * - Ambush missions: enemy convoy, display STOPPED/DESTROYED/ESCAPED status
 * Position: below wingman display
 */

import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Faction } from '../../core/types';
import { requireElement } from './dom-utils';

/** Maximum convoy ships to display */
const MAX_CONVOY_SHOWN = 5;

/** Convoy display state */
export interface ConvoyDisplay {
  section: HTMLElement;
  header: HTMLElement;
  timer: HTMLElement;
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
  /** Faction of the convoy (determines display mode) */
  faction: Faction;
  /** Whether convoy has stopped (ambush missions only) */
  isStopped: boolean;
  /** Whether convoy has escaped (jumped to hyperspace) */
  hasEscaped: boolean;
  /** Whether this is an ambush convoy (has stopDistance set) */
  isAmbushConvoy: boolean;
  /** Distance to escape zone (meters) */
  distanceToEscape: number;
  /** Ship's max speed (m/s) for ETA calculation */
  maxSpeed: number;
}

// Reusable array to avoid allocations
const convoyShips: ConvoyInfo[] = [];

/** Create convoy display section */
export function createConvoyDisplay(container: HTMLElement): ConvoyDisplay {
  const section = document.createElement('div');
  section.className = 'convoy-section';
  section.innerHTML = `
    <div class="convoy-header-row">
      <div class="convoy-header">CONVOY</div>
      <div class="convoy-timer"></div>
    </div>
  `;
  section.style.display = 'none';

  const header = requireElement(section, '.convoy-header');
  const timer = requireElement(section, '.convoy-timer');

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

  return { section, header, timer, elements };
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
    'convoyAutopilot',
    'health',
    'transform',
    'faction',
    'physics',
  ])) {
    const health = getComponent(world, entity, 'health');
    if (!health) continue;

    const convoyShip = getComponent(world, entity, 'convoyShip');
    const autopilot = getComponent(world, entity, 'convoyAutopilot');
    const transform = getComponent(world, entity, 'transform');
    const shields = getComponent(world, entity, 'shields');
    const factionComp = getComponent(world, entity, 'faction');
    const physics = getComponent(world, entity, 'physics');

    const hullPct = isDead(health) ? 0 : (health.hull / health.maxHull) * 100;
    const shieldPct =
      shields && shields.max > 0 ? (shields.current / shields.max) * 100 : 0;

    // Calculate distance to escape zone
    let distanceToEscape = 0;
    if (transform && autopilot) {
      distanceToEscape = transform.position.distanceTo(autopilot.destination);
    }

    convoyShips.push({
      entity,
      index: convoyShip?.index ?? 0,
      hullPct,
      shieldPct,
      inZone: convoyShip?.inEscapeZone ?? false,
      critical: hullPct > 0 && hullPct < 30,
      faction: factionComp?.faction ?? Faction.Neutral,
      isStopped: convoyShip?.isStopped ?? false,
      hasEscaped: convoyShip?.jumpInitiated ?? false,
      isAmbushConvoy: convoyShip?.stopDistance !== undefined,
      distanceToEscape,
      maxSpeed: physics?.maxSpeed ?? 50,
    });
  }

  // Sort by index
  convoyShips.sort((a, b) => a.index - b.index);

  // Update convoy display
  const hasConvoy = convoyShips.length > 0;
  display.section.style.display = hasConvoy ? 'block' : 'none';

  if (!hasConvoy) return false;

  // Determine display mode from convoy type (ambush convoys have stopDistance)
  const isAmbushMission = convoyShips[0]?.isAmbushConvoy ?? false;

  // Update header and section style based on mission type
  if (isAmbushMission) {
    display.header.textContent = 'TARGETS';
    display.header.style.color = '#f80';
    display.section.classList.add('ambush');
    display.section.classList.remove('escort');
  } else {
    display.header.textContent = 'CONVOY';
    display.header.style.color = '#fa0';
    display.section.classList.add('escort');
    display.section.classList.remove('ambush');
  }

  // Calculate and display ETA to escape zone
  // Find the convoy ship closest to escape (most urgent)
  const activeConvoys = convoyShips.filter(
    (c) => c.hullPct > 0 && !c.isStopped && !c.hasEscaped,
  );
  // Sort by distance to find closest to escape
  activeConvoys.sort((a, b) => a.distanceToEscape - b.distanceToEscape);
  const closestConvoy = activeConvoys[0];
  if (closestConvoy) {
    // Use convoy's actual max speed for ETA calculation
    const convoySpeed = closestConvoy.maxSpeed;
    const etaSeconds = Math.ceil(closestConvoy.distanceToEscape / convoySpeed);
    const minutes = Math.floor(etaSeconds / 60);
    const seconds = etaSeconds % 60;
    const timeStr =
      minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, '0')}`
        : `${seconds}s`;
    display.timer.textContent = timeStr;
    display.timer.style.color = etaSeconds < 30 ? '#f00' : '#fa0';
    display.timer.style.display = 'block';
  } else {
    display.timer.style.display = 'none';
  }

  for (let i = 0; i < display.elements.length; i++) {
    const el = display.elements[i];
    if (!el) continue;
    const convoy = convoyShips[i];

    if (convoy) {
      el.row.style.display = 'flex';
      el.row.classList.toggle('critical', convoy.critical);
      el.row.classList.toggle('destroyed', convoy.hullPct === 0);
      el.row.classList.toggle('in-zone', convoy.inZone);
      el.row.classList.toggle('stopped', convoy.isStopped);

      // Label differs for ambush (Target X) vs escort (Ship X)
      el.label.textContent = isAmbushMission
        ? `Target ${convoy.index + 1}`
        : `Ship ${convoy.index + 1}`;

      // Label color: red for enemy, yellow for neutral
      el.label.style.color = isAmbushMission ? '#f80' : '#fa0';

      el.hullBar.style.width = `${convoy.hullPct}%`;
      el.shieldBar.style.width = `${convoy.shieldPct}%`;

      // Status text differs based on mission type
      if (isAmbushMission) {
        // Ambush mission status
        if (convoy.hullPct === 0) {
          el.status.textContent = 'DEAD';
          el.status.style.color = '#0f0'; // Green - good for player
        } else if (convoy.isStopped) {
          el.status.textContent = 'STOP';
          el.status.style.color = '#0f0'; // Green - good for player
        } else if (convoy.hasEscaped) {
          el.status.textContent = 'ESC';
          el.status.style.color = '#f00'; // Red - bad for player
        } else {
          el.status.textContent = '';
        }
      } else {
        // Escort mission status
        if (convoy.hullPct === 0) {
          el.status.textContent = 'LOST';
          el.status.style.color = '#f00';
        } else if (convoy.inZone) {
          el.status.textContent = 'SAFE';
          el.status.style.color = '#0f0';
        } else {
          el.status.textContent = '';
        }
      }

      // Hull bar color
      if (convoy.hullPct === 0) {
        el.hullBar.style.background = '#400';
      } else if (convoy.hullPct < 25) {
        el.hullBar.style.background = '#f00';
      } else if (convoy.hullPct < 50) {
        el.hullBar.style.background = '#f80';
      } else {
        // Yellow for escort, orange for ambush
        el.hullBar.style.background = isAmbushMission ? '#f80' : '#fa0';
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
    .convoy-section.ambush {
      border-top-color: #830;
    }
    .convoy-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .convoy-header {
      font-size: 10px;
      color: #fa0;
      letter-spacing: 1px;
    }
    .convoy-timer {
      font-size: 11px;
      color: #fa0;
      font-weight: bold;
      font-family: monospace;
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
    .convoy-row.stopped .convoy-label {
      color: #0f0;
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
