/**
 * Target Stats Panel - shows detailed info about current target.
 * Position: top-right corner
 */

import * as THREE from 'three';
import {
  DECOY_LIFETIME,
  DECOY_SPEED,
  type Decoy,
} from '../../components/decoy';
import type { Health } from '../../components/health';
import type { Physics } from '../../components/physics';
import type { Shields } from '../../components/shields';
import type { ShipIdentity } from '../../components/ship-identity';
import type { Targeting } from '../../components/targeting';
import type { Transform } from '../../components/transform';
import { getComponent, hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { FALLBACK_ICON_PATH } from '../../ui/ship/viewer';

/** Target stats display state */
export interface TargetStatsDisplay {
  container: HTMLElement;
  cameraContainer: HTMLElement;
  callsignEl: HTMLElement;
  typeIconEl: HTMLImageElement;
  typeEl: HTMLElement;
  distanceEl: HTMLElement;
  hullLabel: HTMLElement;
  hullBar: HTMLElement;
  hullValue: HTMLElement;
  shieldRow: HTMLElement;
  shieldBar: HTMLElement;
  shieldValue: HTMLElement;
  aspectEl: HTMLElement;
}

// Reusable vectors for aspect calculation
const relVel = new THREE.Vector3();
const bearing = new THREE.Vector3();
const decoyVelocity = new THREE.Vector3();

/** Create target stats display */
export function createTargetStats(parent: HTMLElement): TargetStatsDisplay {
  const container = document.createElement('div');
  container.className = 'target-stats';
  container.innerHTML = `
    <div class="target-camera-container"></div>
    <div class="target-callsign">---</div>
    <div class="target-type-row">
      <img class="target-type-icon" src="" alt="" />
      <span class="target-type">NO TARGET</span>
    </div>
    <div class="target-row">
      <span class="target-label">DIST</span>
      <span class="target-distance">---</span>
    </div>
    <div class="target-row">
      <span class="target-label hull-label">HULL</span>
      <div class="target-bar hull"><div class="target-bar-fill"></div></div>
      <span class="target-bar-value">---</span>
    </div>
    <div class="target-row shield-row">
      <span class="target-label">SHLD</span>
      <div class="target-bar shield"><div class="target-bar-fill"></div></div>
      <span class="target-bar-value">---</span>
    </div>
    <div class="target-aspect">---</div>
  `;

  parent.appendChild(container);

  return {
    container,
    cameraContainer: container.querySelector(
      '.target-camera-container',
    ) as HTMLElement,
    callsignEl: container.querySelector('.target-callsign') as HTMLElement,
    typeIconEl: container.querySelector(
      '.target-type-icon',
    ) as HTMLImageElement,
    typeEl: container.querySelector('.target-type') as HTMLElement,
    distanceEl: container.querySelector('.target-distance') as HTMLElement,
    hullLabel: container.querySelector('.hull-label') as HTMLElement,
    hullBar: container.querySelector(
      '.target-bar.hull .target-bar-fill',
    ) as HTMLElement,
    hullValue: container.querySelector(
      '.target-bar.hull + .target-bar-value',
    ) as HTMLElement,
    shieldRow: container.querySelector('.shield-row') as HTMLElement,
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
    display.typeIconEl.style.display = 'none';
    display.typeEl.textContent = 'NO TARGET';
    display.distanceEl.textContent = '---';
    display.hullLabel.textContent = 'HULL';
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

  // Check if target is a decoy
  const isDecoy = hasComponent(world, target, 'decoy');
  const decoy = isDecoy
    ? getComponent<Decoy>(world, target, 'decoy')
    : undefined;

  // Callsign and type
  if (isDecoy) {
    display.callsignEl.textContent = 'DECOY';
    display.typeIconEl.style.display = 'none';
    display.typeEl.textContent = 'COUNTERMEASURE';
  } else if (identity) {
    display.callsignEl.textContent = identity.callsign;
    display.typeIconEl.src = `/icons/ships/${identity.archetype.toLowerCase()}.svg`;
    display.typeIconEl.onerror = () => {
      display.typeIconEl.onerror = null;
      display.typeIconEl.src = FALLBACK_ICON_PATH;
    };
    display.typeIconEl.style.display = '';
    display.typeEl.textContent = identity.archetype.toUpperCase();
  } else {
    display.callsignEl.textContent = '???';
    display.typeIconEl.style.display = 'none';
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

  // Hull - for decoys, show lifetime countdown instead
  if (isDecoy && decoy) {
    display.hullLabel.textContent = 'TIME';
    // Show remaining lifetime as a countdown bar
    const lifetimePct = (decoy.timeRemaining / DECOY_LIFETIME) * 100;
    display.hullBar.style.width = `${lifetimePct}%`;
    display.hullValue.textContent = `${decoy.timeRemaining.toFixed(1)}s`;
    display.hullBar.style.background = lifetimePct < 30 ? '#f80' : '#0af';
  } else if (health) {
    display.hullLabel.textContent = 'HULL';
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

  // Shields - hide row for decoys (they don't have shields)
  if (isDecoy) {
    display.shieldRow.style.display = 'none';
  } else {
    display.shieldRow.style.display = '';
    if (shields) {
      const shieldPct = (shields.current / shields.max) * 100;
      display.shieldBar.style.width = `${shieldPct}%`;
      display.shieldValue.textContent = `${Math.round(shieldPct)}%`;
    } else {
      display.shieldBar.style.width = '0%';
      display.shieldValue.textContent = '---';
    }
  }

  // Aspect (closing/separating) - works for ships and decoys
  if (targetTransform && playerTransform && playerPhysics) {
    // Get target velocity: from physics for ships, from direction for decoys
    let targetVel: THREE.Vector3;
    if (isDecoy && decoy) {
      decoyVelocity.copy(decoy.direction).multiplyScalar(DECOY_SPEED);
      targetVel = decoyVelocity;
    } else if (targetPhysics) {
      targetVel = targetPhysics.velocity;
    } else {
      display.aspectEl.textContent = '---';
      display.aspectEl.className = 'target-aspect';
      return;
    }

    const closureRate = calculateClosureRate(
      playerTransform.position,
      playerPhysics.velocity,
      targetTransform.position,
      targetVel,
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
    .target-callsign {
      font-size: 14px;
      color: #f00;
      margin-bottom: 2px;
    }
    .target-type-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .target-type-icon {
      width: 16px;
      height: 16px;
      filter: var(--filter-cyan) drop-shadow(0 0 4px var(--color-secondary));
    }
    .target-type {
      font-size: 11px;
      color: #f88;
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
