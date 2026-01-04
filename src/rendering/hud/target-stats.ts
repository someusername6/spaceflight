/**
 * Target Stats Panel - shows detailed info about current target.
 * Position: top-right corner
 */

import * as THREE from 'three';
import type { Health } from '../../components/health';
import type { Physics } from '../../components/physics';
import type { Shields } from '../../components/shields';
import type { ShipIdentity } from '../../components/ship-identity';
import type { Targeting } from '../../components/targeting';
import type { Transform } from '../../components/transform';
import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/** Target stats display state */
export interface TargetStatsDisplay {
  container: HTMLElement;
  callsignEl: HTMLElement;
  typeEl: HTMLElement;
  distanceEl: HTMLElement;
  hullBar: HTMLElement;
  hullValue: HTMLElement;
  shieldBar: HTMLElement;
  shieldValue: HTMLElement;
  aspectEl: HTMLElement;
}

// Reusable vectors for aspect calculation
const relVel = new THREE.Vector3();
const bearing = new THREE.Vector3();

/** Create target stats display */
export function createTargetStats(parent: HTMLElement): TargetStatsDisplay {
  const container = document.createElement('div');
  container.className = 'target-stats';
  container.innerHTML = `
    <div class="target-header">TARGET</div>
    <div class="target-callsign">---</div>
    <div class="target-type">NO TARGET</div>
    <div class="target-row">
      <span class="target-label">DIST</span>
      <span class="target-distance">---</span>
    </div>
    <div class="target-row">
      <span class="target-label">HULL</span>
      <div class="target-bar hull"><div class="target-bar-fill"></div></div>
      <span class="target-bar-value">---</span>
    </div>
    <div class="target-row">
      <span class="target-label">SHLD</span>
      <div class="target-bar shield"><div class="target-bar-fill"></div></div>
      <span class="target-bar-value">---</span>
    </div>
    <div class="target-aspect">---</div>
  `;

  parent.appendChild(container);

  return {
    container,
    callsignEl: container.querySelector('.target-callsign') as HTMLElement,
    typeEl: container.querySelector('.target-type') as HTMLElement,
    distanceEl: container.querySelector('.target-distance') as HTMLElement,
    hullBar: container.querySelector(
      '.target-bar.hull .target-bar-fill',
    ) as HTMLElement,
    hullValue: container.querySelector(
      '.target-bar.hull + .target-bar-value',
    ) as HTMLElement,
    shieldBar: container.querySelector(
      '.target-bar.shield .target-bar-fill',
    ) as HTMLElement,
    shieldValue: container.querySelector(
      '.target-bar.shield + .target-bar-value',
    ) as HTMLElement,
    aspectEl: container.querySelector('.target-aspect') as HTMLElement,
  };
}

/** Update target stats display */
export function updateTargetStats(
  display: TargetStatsDisplay,
  world: World,
  player: Entity,
): void {
  const targeting = getComponent<Targeting>(world, player, 'targeting');
  const target = targeting?.currentTarget;

  if (target === undefined) {
    // No target selected
    display.callsignEl.textContent = '---';
    display.typeEl.textContent = 'NO TARGET';
    display.distanceEl.textContent = '---';
    display.hullBar.style.width = '0%';
    display.hullValue.textContent = '---';
    display.shieldBar.style.width = '0%';
    display.shieldValue.textContent = '---';
    display.aspectEl.textContent = '---';
    display.container.classList.remove('has-target');
    return;
  }

  display.container.classList.add('has-target');

  // Get target components
  const identity = getComponent<ShipIdentity>(world, target, 'shipIdentity');
  const health = getComponent<Health>(world, target, 'health');
  const shields = getComponent<Shields>(world, target, 'shields');
  const targetTransform = getComponent<Transform>(world, target, 'transform');
  const targetPhysics = getComponent<Physics>(world, target, 'physics');
  const playerTransform = getComponent<Transform>(world, player, 'transform');
  const playerPhysics = getComponent<Physics>(world, player, 'physics');

  // Callsign and type
  if (identity) {
    display.callsignEl.textContent = identity.callsign;
    display.typeEl.textContent = identity.archetype.toUpperCase();
  } else {
    display.callsignEl.textContent = '???';
    display.typeEl.textContent = 'UNKNOWN';
  }

  // Distance
  if (targetTransform && playerTransform) {
    const distance = playerTransform.position.distanceTo(
      targetTransform.position,
    );
    display.distanceEl.textContent = formatDistance(distance);
  } else {
    display.distanceEl.textContent = '---';
  }

  // Hull
  if (health) {
    const hullPct = (health.hull / health.maxHull) * 100;
    display.hullBar.style.width = `${hullPct}%`;
    display.hullValue.textContent = `${Math.round(hullPct)}%`;

    // Color based on health
    if (hullPct < 25) {
      display.hullBar.style.background = '#f00';
    } else if (hullPct < 50) {
      display.hullBar.style.background = '#f80';
    } else {
      display.hullBar.style.background = '#0f0';
    }
  } else {
    display.hullBar.style.width = '0%';
    display.hullValue.textContent = '---';
  }

  // Shields
  if (shields) {
    const shieldPct = (shields.current / shields.max) * 100;
    display.shieldBar.style.width = `${shieldPct}%`;
    display.shieldValue.textContent = `${Math.round(shieldPct)}%`;
  } else {
    display.shieldBar.style.width = '0%';
    display.shieldValue.textContent = '---';
  }

  // Aspect (closing/separating)
  if (targetTransform && playerTransform && targetPhysics && playerPhysics) {
    const closureRate = calculateClosureRate(
      playerTransform.position,
      playerPhysics.velocity,
      targetTransform.position,
      targetPhysics.velocity,
    );
    display.aspectEl.textContent = formatAspect(closureRate);
    display.aspectEl.className = `target-aspect ${closureRate > 10 ? 'closing' : closureRate < -10 ? 'separating' : ''}`;
  } else {
    display.aspectEl.textContent = '---';
    display.aspectEl.className = 'target-aspect';
  }
}

/** Calculate closure rate (positive = closing, negative = separating) */
function calculateClosureRate(
  playerPos: THREE.Vector3,
  playerVel: THREE.Vector3,
  targetPos: THREE.Vector3,
  targetVel: THREE.Vector3,
): number {
  // Relative velocity (target relative to player)
  relVel.copy(targetVel).sub(playerVel);

  // Bearing to target (normalized)
  bearing.copy(targetPos).sub(playerPos).normalize();

  // Closure rate is negative of relative velocity projected onto bearing
  // Positive means closing, negative means separating
  return -relVel.dot(bearing);
}

/** Format distance for display */
function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`;
  }
  return `${Math.round(distance)}m`;
}

/** Format aspect for display */
function formatAspect(closureRate: number): string {
  const absRate = Math.abs(closureRate);
  const rateStr =
    absRate >= 1000
      ? `${(absRate / 1000).toFixed(1)}k`
      : `${Math.round(absRate)}`;

  if (closureRate > 10) {
    return `CLOSING +${rateStr}`;
  } else if (closureRate < -10) {
    return `SEPARATING -${rateStr}`;
  }
  return 'MATCHED';
}

/** Get CSS styles for target stats */
export function getTargetStatsStyles(): string {
  return `
    .target-stats {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid #a00;
      padding: 8px 12px;
      min-width: 160px;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .target-stats.has-target {
      opacity: 1;
      border-color: #f00;
    }
    .target-header {
      font-size: 10px;
      color: #a00;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }
    .target-stats.has-target .target-header {
      color: #f00;
    }
    .target-callsign {
      font-size: 14px;
      color: #f00;
      margin-bottom: 2px;
    }
    .target-type {
      font-size: 11px;
      color: #f88;
      margin-bottom: 8px;
    }
    .target-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .target-label {
      width: 32px;
      font-size: 10px;
      color: #888;
    }
    .target-bar {
      flex: 1;
      height: 8px;
      background: rgba(40, 0, 0, 0.5);
      border: 1px solid #600;
    }
    .target-bar-fill {
      height: 100%;
      width: 0%;
      transition: width 0.1s;
    }
    .target-bar.hull .target-bar-fill {
      background: #0f0;
    }
    .target-bar.shield .target-bar-fill {
      background: #0af;
    }
    .target-bar-value {
      width: 36px;
      font-size: 10px;
      text-align: right;
      color: #f88;
    }
    .target-distance {
      font-size: 12px;
      color: #f88;
    }
    .target-aspect {
      margin-top: 6px;
      font-size: 11px;
      color: #888;
      text-align: center;
    }
    .target-aspect.closing {
      color: #f80;
    }
    .target-aspect.separating {
      color: #0af;
    }
  `;
}
