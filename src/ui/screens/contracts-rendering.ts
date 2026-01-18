/**
 * Contract rendering helpers for the contracts screen.
 */

import type { Contract } from '../../campaign/types';

/** Count total enemies across all waves */
export function countTotalEnemies(contract: Contract): number {
  const waves = contract.waves ?? [];
  return waves.reduce(
    (total, wave) => total + wave.enemies.reduce((sum, e) => sum + e.count, 0),
    0,
  );
}

/** Render a contract list item (compact) */
export function renderContractListItem(
  contract: Contract,
  isSelected: boolean,
  isReplayMode: boolean,
): string {
  const replayBadge = isReplayMode
    ? '<span class="contract-badge replay">REPLAY</span>'
    : '';

  return `
    <article
      class="contract-list-item ${isSelected ? 'selected' : ''} ${isReplayMode ? 'replay-mode' : ''}"
      data-contract-id="${contract.id}"
      role="option"
      aria-selected="${isSelected}"
      tabindex="0"
      aria-label="${contract.name}, ${contract.difficulty} difficulty, ${contract.reward} credits${isReplayMode ? ', replay mission' : ''}"
    >
      <div class="contract-list-info">
        <div class="contract-list-name">${contract.name}${replayBadge}</div>
        <span class="contract-difficulty ${contract.difficulty}" aria-label="Difficulty: ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-list-reward" aria-hidden="true">${contract.reward}&nbsp;cr</div>
    </article>
  `;
}

/** Render hostiles section for wave-based missions */
export function renderWaveHostiles(contract: Contract): string {
  const waves = contract.waves ?? [];
  const enemyCounts = new Map<string, number>();
  for (const wave of waves) {
    for (const enemy of wave.enemies) {
      const key = `${enemy.archetype}`;
      enemyCounts.set(key, (enemyCounts.get(key) ?? 0) + enemy.count);
    }
  }
  const enemyList = Array.from(enemyCounts.entries())
    .map(([type, count]) => `<div class="enemy-entry">${count}× ${type}</div>`)
    .join('');

  const totalEnemies = countTotalEnemies(contract);
  const waveCount = waves.length;

  return `
    <div class="contract-detail-section">
      <div class="detail-section-label">HOSTILES</div>
      <div class="contract-enemies">${enemyList}</div>
      <div class="contract-waves">${totalEnemies} total in ${waveCount} waves</div>
    </div>
  `;
}

/** Render mission info for escort missions */
export function renderEscortInfo(contract: Contract): string {
  const escort = contract.escortData!;
  const enemyTypes = escort.enemyPool
    .map((e) => e.archetype)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .join(', ');

  return `
    <div class="contract-detail-section">
      <div class="detail-section-label">ESCORT MISSION</div>
      <div class="escort-info">
        <div class="escort-entry">Convoy: ${escort.convoySize} ships</div>
        <div class="escort-entry">Distance: ${(escort.escapeZoneDistance / 1000).toFixed(1)} km to jump point</div>
        <div class="escort-entry">Jump charge: ${escort.jumpChargeTime}s</div>
      </div>
    </div>
    <div class="contract-detail-section">
      <div class="detail-section-label">THREAT</div>
      <div class="contract-enemies">
        <div class="enemy-entry">Continuous spawns: ${enemyTypes}</div>
        <div class="enemy-entry">Max concurrent: ${escort.maxConcurrentEnemies}</div>
      </div>
      <div class="contract-waves">Reward scales with convoy survival</div>
    </div>
  `;
}

/** Render mission info for station defense missions */
export function renderStationDefenseInfo(contract: Contract): string {
  const defense = contract.stationDefenseData!;
  const waves = defense.waves;

  // Count enemy types across waves
  const enemyCounts = new Map<string, number>();
  for (const wave of waves) {
    for (const enemy of wave.enemies) {
      enemyCounts.set(
        enemy.archetype,
        (enemyCounts.get(enemy.archetype) ?? 0) + enemy.count,
      );
    }
  }
  const enemyList = Array.from(enemyCounts.entries())
    .map(([type, count]) => `<div class="enemy-entry">${count}× ${type}</div>`)
    .join('');
  const totalEnemies = Array.from(enemyCounts.values()).reduce(
    (a, b) => a + b,
    0,
  );

  // Station type display name
  const stationType = defense.stationType ?? 'mining';
  const stationName = `${stationType.charAt(0).toUpperCase()}${stationType.slice(1)} Station`;

  // Reinforcement info
  const reinforcementTypes = defense.reinforcementPool
    .map((e) => e.archetype)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return `
    <div class="contract-detail-section">
      <div class="detail-section-label">STATION DEFENSE</div>
      <div class="escort-info">
        <div class="escort-entry">Defend: ${stationName}</div>
        <div class="escort-entry">Reinforcements: ${defense.reinforcementCount} ships (${reinforcementTypes})</div>
      </div>
    </div>
    <div class="contract-detail-section">
      <div class="detail-section-label">HOSTILES</div>
      <div class="contract-enemies">${enemyList}</div>
      <div class="contract-waves">${totalEnemies} total in ${waves.length} waves</div>
    </div>
    <div class="contract-detail-section">
      <div class="contract-waves">Reward scales with station health</div>
    </div>
  `;
}

/** Render contract detail panel */
export function renderContractDetail(
  contract: Contract,
  canLaunch: boolean,
): string {
  const isEscort = contract.missionType === 'escort' && contract.escortData;
  const isStationDefense =
    contract.missionType === 'station-defense' && contract.stationDefenseData;

  // Accept button or commander warning (hard block)
  const acceptButton = canLaunch
    ? `<button class="btn btn-large btn-success" id="btn-accept-mission">ACCEPT MISSION</button>`
    : `<button class="btn btn-warning btn-goto-squadron">⚠ ASSIGN COMMANDER IN SQUADRON</button>`;

  let missionInfo: string;
  if (isEscort) {
    missionInfo = renderEscortInfo(contract);
  } else if (isStationDefense) {
    missionInfo = renderStationDefenseInfo(contract);
  } else {
    missionInfo = renderWaveHostiles(contract);
  }

  return `
    <div class="contract-detail">
      <div class="contract-detail-header">
        <span class="contract-detail-name">${contract.name}</span>
        <span class="contract-difficulty ${contract.difficulty}">
          ${contract.difficulty.toUpperCase()}
        </span>
      </div>
      <div class="contract-detail-desc">${contract.description}</div>
      ${missionInfo}
      <div class="contract-actions">
        <div class="contract-reward-price">${contract.reward.toLocaleString()}<span class="currency">cr</span></div>
        ${acceptButton}
      </div>
    </div>
  `;
}
