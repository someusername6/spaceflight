/**
 * Replay Debrief Tab Rendering
 *
 * Renders the debrief tab content showing pilot combat statistics
 * and weapon breakdowns. Extracted from replay-detail-tabs.ts.
 */

import type {
  FullReplayData,
  ReplayPilotDebrief,
  ReplayWeaponStats,
} from '../../../replay/types';
import { escapeHtml } from '../../utils';
import { getShipSvgInline } from '../../utils/inline-svg';

/** Capitalize first letter */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format time as M:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Render weapon stats row based on category */
function renderWeaponRow(w: ReplayWeaponStats): string {
  const name = w.weaponName;
  const dmg = Math.round(w.damageDealt);

  switch (w.category) {
    case 'beam': {
      if (w.isPulseBeam) {
        const shots = w.shotsFired;
        const onTarget = w.shotsOnTarget;
        const acc = shots > 0 ? Math.round((onTarget / shots) * 100) : 0;
        return `
          <tr>
            <td>${name}</td>
            <td>${shots} pulses</td>
            <td>${onTarget} hit (${acc}%)</td>
            <td class="damage">${dmg}</td>
          </tr>
        `;
      }
      const timeFired = w.timeFired.toFixed(1);
      const timeOnTarget = w.timeOnTarget.toFixed(1);
      const accuracy =
        w.timeFired > 0 ? Math.round((w.timeOnTarget / w.timeFired) * 100) : 0;
      return `
        <tr>
          <td>${name}</td>
          <td>${timeFired}s fired</td>
          <td>${timeOnTarget}s on target (${accuracy}%)</td>
          <td class="damage">${dmg}</td>
        </tr>
      `;
    }

    case 'missile': {
      const launched = w.missilesLaunched;
      const hit = w.missilesHit;
      const seduced = w.missilesSeduced;
      const carried = w.ammoCarried;
      const hitRate = launched > 0 ? Math.round((hit / launched) * 100) : 0;
      return `
        <tr>
          <td>${name}</td>
          <td>${launched}/${carried} launched</td>
          <td>${hit} hit (${hitRate}%), ${seduced} seduced</td>
          <td class="damage">${dmg}</td>
        </tr>
      `;
    }

    case 'decoy': {
      const deployed = w.decoysDeployed;
      const carried = w.decoysCarried;
      const seducedByDecoy = w.missilesSeducedByDecoy;
      return `
        <tr>
          <td>${name}</td>
          <td>${deployed}/${carried} deployed</td>
          <td>${seducedByDecoy} missiles seduced</td>
          <td>-</td>
        </tr>
      `;
    }

    default: {
      const shots = w.shotsFired;
      const onTarget = w.shotsOnTarget;
      const acc = shots > 0 ? Math.round((onTarget / shots) * 100) : 0;
      const ammoStr = w.ammoCarried > 0 ? `/${w.ammoCarried}` : '';
      return `
        <tr>
          <td>${name}</td>
          <td>${shots}${ammoStr} fired</td>
          <td>${onTarget} hit (${acc}%)</td>
          <td class="damage">${dmg}</td>
        </tr>
      `;
    }
  }
}

/** Render a pilot debrief card */
function renderPilotCard(pilot: ReplayPilotDebrief): string {
  const statusClass = pilot.isKIA ? 'kia' : 'survived';
  const statusText = pilot.isKIA ? 'KIA' : 'Survived';
  const hullPercent =
    pilot.hullMax > 0
      ? Math.round((pilot.hullRemaining / pilot.hullMax) * 100)
      : 0;

  // Group weapons by category
  const beams = pilot.weaponStats.filter((w) => w.category === 'beam');
  const projectiles = pilot.weaponStats.filter(
    (w) => w.category === 'projectile',
  );
  const missiles = pilot.weaponStats.filter((w) => w.category === 'missile');
  const decoys = pilot.weaponStats.filter((w) => w.category === 'decoy');
  const orderedWeapons = [...projectiles, ...beams, ...missiles, ...decoys];

  const weaponRows =
    orderedWeapons.length > 0
      ? orderedWeapons.map((w) => renderWeaponRow(w)).join('')
      : '<tr><td colspan="4" class="no-weapons">No weapons used</td></tr>';

  const timeOfDeathStr =
    pilot.timeOfDeath !== null
      ? `<span class="time-of-death">@ ${formatTime(pilot.timeOfDeath)}</span>`
      : '';

  const svg = getShipSvgInline(pilot.archetype);

  return `
    <div class="replay-pilot-card ${pilot.isPlayer ? 'player' : 'wingman'} ${pilot.isKIA ? 'kia' : ''}">
      <div class="replay-pilot-header">
        <div class="replay-pilot-icon">${svg}</div>
        <div class="replay-pilot-info">
          <span class="replay-pilot-callsign">${escapeHtml(pilot.callsign)}</span>
          <span class="replay-pilot-archetype">${capitalize(pilot.archetype)}</span>
        </div>
        <div class="replay-pilot-status ${statusClass}">
          ${statusText} ${timeOfDeathStr}
        </div>
      </div>
      <div class="replay-pilot-stats">
        <div class="stat"><span class="value">${pilot.kills}</span><span class="label">Kills</span></div>
        <div class="stat"><span class="value">${pilot.assists}</span><span class="label">Assists</span></div>
        <div class="stat"><span class="value">${Math.round(pilot.damageDealt)}</span><span class="label">Damage</span></div>
        <div class="stat"><span class="value ${pilot.isKIA ? 'destroyed' : ''}">${pilot.isKIA ? '0' : hullPercent}%</span><span class="label">Hull</span></div>
      </div>
      <div class="replay-weapon-breakdown">
        <table>
          <thead><tr><th>Weapon</th><th>Usage</th><th>Accuracy</th><th>Dmg</th></tr></thead>
          <tbody>${weaponRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

/** Render Debrief tab content */
export function renderDebriefTab(replay: FullReplayData): string {
  // Check for v1 replays without debrief data
  if (!replay.debriefData) {
    return `
      <div class="replay-tab-content replay-debrief-tab">
        <div class="replay-tab-empty">
          <p>Debrief data not available</p>
          <p class="hint">This replay was recorded before debrief data was saved.</p>
        </div>
      </div>
    `;
  }

  const { pilots } = replay.debriefData;
  const pilotCards = pilots.map((p) => renderPilotCard(p)).join('');

  return `
    <div class="replay-tab-content replay-debrief-tab">
      <div class="replay-pilot-cards">
        ${pilotCards}
      </div>
    </div>
  `;
}
