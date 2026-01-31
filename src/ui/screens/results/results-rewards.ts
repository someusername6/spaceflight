/**
 * Results Rewards - Renders the rewards tab content.
 *
 * Displays contract rewards and mission-specific results
 * (escort, ambush, station defense, attack station).
 */

import type { SalvageResult } from '../../../campaign/salvage';
import type { Contract } from '../../../campaign/types';
import { renderSalvageSection } from './results-salvage';

/** Escort mission results for display */
export interface EscortResultsDisplay {
  convoySurvived: number;
  convoyTotal: number;
}

/** Ambush mission results for display */
export interface AmbushResultsDisplay {
  convoyDestroyed: number;
  convoyStopped: number;
  convoyEscaped: number;
  totalConvoy: number;
}

/** Station defense mission results for display */
export interface StationDefenseResultsDisplay {
  stationHealthPercent: number;
  reinforcementsArrived: boolean;
}

/** Attack station mission results for display */
export interface AttackStationResultsDisplay {
  stationDestroyed: boolean;
  stationDamagePercent: number;
  reinforcementsReceived: number;
  totalReinforcements: number;
  overwhelmed: boolean;
}

/** Render the rewards tab content */
export function renderRewards(
  victory: boolean,
  contract: Contract | null,
  salvage: SalvageResult | null,
  earnedReward?: number,
  escortResults?: EscortResultsDisplay,
  ambushResults?: AmbushResultsDisplay,
  stationDefenseResults?: StationDefenseResultsDisplay,
  attackStationResults?: AttackStationResultsDisplay,
): string {
  const titleClass = victory ? 'victory' : 'defeat';
  const titleText = victory ? 'VICTORY' : 'DEFEAT';

  // Use actual earned reward if provided, otherwise fall back to contract base
  const displayReward =
    earnedReward ?? (victory && contract ? contract.reward : 0);

  // Escort mission details
  const escortHtml = escortResults
    ? `
      <div class="rewards-escort-details">
        <span class="escort-survival">Convoy: ${escortResults.convoySurvived}/${escortResults.convoyTotal} survived</span>
        ${
          escortResults.convoySurvived < escortResults.convoyTotal
            ? `<span class="escort-penalty">(${Math.round((escortResults.convoySurvived / escortResults.convoyTotal) * 100)}% reward)</span>`
            : ''
        }
      </div>
    `
    : '';

  // Ambush mission details
  let ambushHtml = '';
  if (ambushResults) {
    const destroyed = ambushResults.convoyDestroyed;
    const stopped = ambushResults.convoyStopped;
    const escaped = ambushResults.convoyEscaped;
    const total = ambushResults.totalConvoy;
    const neutralized = destroyed + stopped;
    const rewardPct = Math.round(((stopped + destroyed * 0.5) / total) * 100);
    ambushHtml = `
      <div class="rewards-ambush-details">
        <span class="ambush-result">${neutralized}/${total} targets neutralized</span>
        <span class="ambush-breakdown">(${stopped} stopped, ${destroyed} destroyed${escaped > 0 ? `, ${escaped} escaped` : ''})</span>
        ${rewardPct < 100 ? `<span class="ambush-reward">(${rewardPct}% reward)</span>` : ''}
      </div>
    `;
  }

  // Station defense mission details
  let stationDefenseHtml = '';
  if (stationDefenseResults) {
    // stationHealthPercent is already 0-100, no multiplication needed
    const healthPct = Math.round(stationDefenseResults.stationHealthPercent);
    const reinforced = stationDefenseResults.reinforcementsArrived;
    const statusText = reinforced
      ? 'Reinforcements arrived'
      : 'Enemies repelled';
    stationDefenseHtml = `
      <div class="rewards-station-details">
        <span class="station-health">Station: ${healthPct}% hull remaining</span>
        <span class="station-reinforcements">${statusText}</span>
      </div>
    `;
  }

  // Attack station mission details
  let attackStationHtml = '';
  if (attackStationResults) {
    const destroyed = attackStationResults.stationDestroyed;
    const damagePct = attackStationResults.stationDamagePercent;
    const reinforcements = attackStationResults.reinforcementsReceived;
    const totalReinforcements = attackStationResults.totalReinforcements;
    const overwhelmed = attackStationResults.overwhelmed;
    attackStationHtml = `
      <div class="rewards-attack-station-details">
        <span class="attack-result">${destroyed ? 'Station Destroyed' : `Station Damage: ${damagePct}%`}</span>
        <span class="attack-reinforcements">Reinforcements: ${reinforcements}/${totalReinforcements} waves</span>
        ${overwhelmed ? '<span class="attack-overwhelmed">Overwhelming force deployed</span>' : ''}
      </div>
    `;
  }

  const contractRewardHtml = contract
    ? `
      <div class="rewards-contract">
        <div class="rewards-section-header">
          <span class="rewards-section-icon" aria-hidden="true">▶</span>
          <span class="rewards-section-title">CONTRACT REWARD</span>
        </div>
        <div class="rewards-contract-details">
          <div class="rewards-contract-name">${contract.name}</div>
          ${escortHtml}
          ${ambushHtml}
          ${stationDefenseHtml}
          ${attackStationHtml}
          <div class="rewards-contract-amount ${victory ? 'earned' : 'failed'}">
            ${victory ? `+${displayReward.toLocaleString()} cr` : 'Mission Failed'}
          </div>
        </div>
      </div>
    `
    : '';

  // Salvage section
  const salvageHtml = renderSalvageSection(salvage);

  return `
    <div class="rewards-content">
      <div class="rewards-title ${titleClass}">${titleText}</div>
      ${contractRewardHtml}
      ${salvageHtml}
    </div>
  `;
}
