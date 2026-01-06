/**
 * Debrief UI - displays detailed combat statistics after a mission.
 *
 * Shows per-pilot cards with kills, assists, damage, and weapon breakdowns.
 */

import type { CombatStats, WeaponStats } from '../../components/combat-stats';
import { snapshotStats } from '../../components/combat-stats';
import { Faction, type FactionComponent } from '../../components/faction';
import type { Health } from '../../components/health';
import type { ShipIdentity } from '../../components/ship-identity';
import { getComponent, hasComponent, queryEntities } from '../../core/ecs';
import type { World } from '../../core/types';

/** Data for a pilot's debrief card */
export interface PilotDebriefData {
  callsign: string;
  archetype: string;
  isPlayer: boolean;
  isKIA: boolean;
  kills: number;
  assists: number;
  damageDealt: number;
  damageReceived: number;
  hullRemaining: number;
  hullMax: number;
  timeOfDeath: number | null; // null if survived
  weaponStats: WeaponStats[];
}

/** Debrief data for the entire mission */
export interface MissionDebriefData {
  missionDuration: number;
  pilots: PilotDebriefData[];
}

/** Collect debrief data from world state */
export function collectDebriefData(world: World): MissionDebriefData {
  const matchStats = world.systemState.matchStats;
  const missionDuration = matchStats
    ? matchStats.missionEndTime - matchStats.missionStartTime
    : 0;

  const pilots: PilotDebriefData[] = [];

  // Add destroyed ships (KIA) from match stats
  if (matchStats) {
    for (const record of matchStats.destroyedShips) {
      pilots.push({
        callsign: record.callsign,
        archetype: record.archetype,
        isPlayer: record.wasPlayer,
        isKIA: true,
        kills: record.stats.kills,
        assists: record.stats.assists,
        damageDealt: record.stats.damageDealt,
        damageReceived: record.stats.damageReceived,
        hullRemaining: 0,
        hullMax: record.hullMax,
        timeOfDeath: record.timeOfDeath,
        weaponStats: record.stats.weaponStats,
      });
    }
  }

  // Add surviving player faction ships
  for (const entity of queryEntities(world, ['shipIdentity', 'combatStats'])) {
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    if (!faction || faction.faction !== Faction.Player) continue;

    const identity = getComponent<ShipIdentity>(world, entity, 'shipIdentity');
    const combatStats = getComponent<CombatStats>(world, entity, 'combatStats');
    const health = getComponent<Health>(world, entity, 'health');

    if (!identity || !combatStats || !health) continue;

    const isPlayer = hasComponent(world, entity, 'playerControlled');
    const snapshot = snapshotStats(combatStats);

    pilots.push({
      callsign: identity.callsign,
      archetype: identity.archetype,
      isPlayer,
      isKIA: false,
      kills: snapshot.kills,
      assists: snapshot.assists,
      damageDealt: snapshot.damageDealt,
      damageReceived: snapshot.damageReceived,
      hullRemaining: health.hull,
      hullMax: health.maxHull,
      timeOfDeath: null,
      weaponStats: snapshot.weaponStats,
    });
  }

  // Sort: Player first, then by kills, then by damage dealt
  pilots.sort((a, b) => {
    if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
    if (a.kills !== b.kills) return b.kills - a.kills;
    return b.damageDealt - a.damageDealt;
  });

  return { missionDuration, pilots };
}

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
  const statusClass = pilot.isKIA ? 'kia' : 'survived';
  const statusText = pilot.isKIA ? 'KIA' : 'Survived';
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

  const kiaClass = pilot.isKIA ? 'kia' : '';

  return `
    <div class="pilot-card ${pilot.isPlayer ? 'player' : 'wingman'} ${kiaClass}">
      <div class="pilot-header">
        <div class="pilot-info">
          <span class="callsign">${pilot.callsign}</span>
          <span class="archetype">${pilot.archetype}</span>
        </div>
        <div class="pilot-status ${statusClass}">
          ${statusText} ${timeOfDeathStr}
        </div>
      </div>

      <div class="pilot-stats">
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
          <span class="stat-value ${pilot.isKIA ? 'destroyed' : ''}">${pilot.isKIA ? '0' : hullPercent}%</span>
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

// Re-export styles from separate file
export { getDebriefStyles } from './debrief-styles';
