/**
 * Debrief UI - displays detailed combat statistics after a mission.
 *
 * Shows per-pilot cards with kills, assists, damage, and weapon breakdowns.
 */

import type { WeaponStats } from '../../../components/combat-stats';
import { getShipIconPath, iconErrorHandler } from '../../ship/viewer';
import type { MissionDebriefData, PilotDebriefData } from './debrief-data';

// Re-export data types and functions for convenience
export type { MissionDebriefData, PilotDebriefData } from './debrief-data';
export {
  collectDebriefData,
  enhanceDebriefWithEjections,
} from './debrief-data';

/** Format time as M:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Render weapon stats based on category */
function renderWeaponRow(weapon: WeaponStats): string {
  const name = weapon.weaponName;
  const dmg = Math.round(weapon.damageDealt);

  switch (weapon.category) {
    case 'beam': {
      // Pulse beams (Lightning) track shots, continuous beams track time
      if (weapon.isPulseBeam) {
        const shots = weapon.shotsFired;
        const onTarget = weapon.shotsOnTarget;
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
      // Continuous beam - show time
      const timeFired = weapon.timeFired.toFixed(1);
      const timeOnTarget = weapon.timeOnTarget.toFixed(1);
      const accuracy =
        weapon.timeFired > 0
          ? Math.round((weapon.timeOnTarget / weapon.timeFired) * 100)
          : 0;
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
      // Ammo, launched, hit, seduced, damage
      const launched = weapon.missilesLaunched;
      const hit = weapon.missilesHit;
      const seduced = weapon.missilesSeduced;
      const carried = weapon.ammoCarried;
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
      // Carried, deployed, missiles seduced
      const deployed = weapon.decoysDeployed;
      const carried = weapon.decoysCarried;
      const seducedByDecoy = weapon.missilesSeducedByDecoy;
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
      // Shots fired, shots on target, damage
      const shots = weapon.shotsFired;
      const onTarget = weapon.shotsOnTarget;
      const acc = shots > 0 ? Math.round((onTarget / shots) * 100) : 0;
      const ammoStr = weapon.ammoCarried > 0 ? `/${weapon.ammoCarried}` : '';
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

/** Render a pilot card */
function renderPilotCard(pilot: PilotDebriefData): string {
  // Determine status text and CSS class
  let statusClass: string;
  let statusText: string;
  let statusSubtext = '';

  if (pilot.isKIA) {
    statusClass = 'kia';
    statusText = 'KIA';
  } else if (pilot.isEjected) {
    statusClass = 'ejected';
    statusText = 'EJECTED';
    statusSubtext = pilot.isRetiring ? 'Retiring' : 'Injured';
  } else {
    statusClass = 'survived';
    statusText = 'Survived';
  }

  const hullPercent =
    pilot.hullMax > 0
      ? Math.round((pilot.hullRemaining / pilot.hullMax) * 100)
      : 0;

  // Group weapons by category for display order
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

  // Card gets special class for KIA or ejected pilots
  const cardStatusClass = pilot.isKIA || pilot.isEjected ? 'lost-ship' : '';

  const iconPath = getShipIconPath(pilot.archetype);

  // Subtext shown below status (e.g., "Injured" or "Retiring")
  const subtextHtml = statusSubtext
    ? `<span class="status-subtext">${statusSubtext}</span>`
    : '';

  // Ship was lost if KIA or ejected
  const shipLost = pilot.isKIA || pilot.isEjected;

  return `
    <div class="pilot-card ${pilot.isPlayer ? 'player' : 'wingman'} ${cardStatusClass}">
      <div class="pilot-header">
        <div class="pilot-info">
          <span class="callsign">${pilot.callsign}</span>
          <span class="archetype">
            <img src="${iconPath}" alt="${pilot.archetype}" class="debrief-ship-icon" ${iconErrorHandler()} />
            ${pilot.archetype}
          </span>
        </div>
        <div class="pilot-status ${statusClass}">
          ${statusText} ${timeOfDeathStr}
          ${subtextHtml}
        </div>
      </div>

      <div class="stat-grid pilot-stats">
        <div class="stat">
          <span class="stat-value">${pilot.kills}</span>
          <span class="stat-label">Kills</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pilot.assists}</span>
          <span class="stat-label">Assists</span>
        </div>
        <div class="stat">
          <span class="stat-value">${Math.round(pilot.damageDealt)}</span>
          <span class="stat-label">Damage</span>
        </div>
        <div class="stat">
          <span class="stat-value ${shipLost ? 'destroyed' : ''}">${shipLost ? '0' : hullPercent}%</span>
          <span class="stat-label">Hull</span>
        </div>
      </div>

      <div class="weapon-breakdown">
        <table>
          <thead>
            <tr>
              <th>Weapon</th>
              <th>Usage</th>
              <th>Accuracy</th>
              <th>Damage</th>
            </tr>
          </thead>
          <tbody>
            ${weaponRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/** Render the full debrief section */
export function renderDebrief(data: MissionDebriefData): string {
  const pilotCards = data.pilots.map((p) => renderPilotCard(p)).join('');

  return `
    <div class="debrief-section">
      <div class="debrief-header">
        <h2>Combat Debrief</h2>
        <div class="mission-time">Mission Duration: ${formatTime(data.missionDuration)}</div>
      </div>
      <div class="pilot-cards">
        ${pilotCards}
      </div>
    </div>
  `;
}
