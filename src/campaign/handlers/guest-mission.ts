/**
 * Guest Mission Launch Handler
 *
 * Handles mission launch for guest players when they receive
 * the MissionStarted message from the host.
 */

import { getGuestShipIds } from '../../multiplayer/mission-setup';
import { startMission } from '../../ui/common/screens';
import type { CampaignController } from '../controller-types';
import { launchMission } from '../mission/mission-launcher';
import type { Contract } from '../types';
import { setupContractsScreen } from './campaign-handlers';
import { getLobbyContext } from './lobby-context';

/**
 * Launch a mission for a guest player.
 * Called when guest receives MissionStarted message from host.
 *
 * Note: Guest doesn't mark contract as attempted or save - host does that
 * and syncs state. Guest just needs to launch the mission locally.
 */
export function launchGuestMission(
  controller: CampaignController,
  contract: Contract,
): void {
  const { screenManager } = controller;
  const ctx = getLobbyContext();
  if (!ctx) {
    console.error('[lobby-handlers] No lobby context for guest mission launch');
    return;
  }

  // All ships are deployed in multiplayer
  const allShipIds = screenManager.campaignState.ships.map((s) => s.id);

  // Find the host's player ID (needed for getGuestShipIds)
  const hostPlayer = ctx.lobbyState.players.find((p) => p.isHost);
  const hostPlayerId = hostPlayer?.playerId ?? ctx.localPlayerId;

  // Get guest ship IDs for spawning with PlayerControlled instead of AIControlled
  const guestShipIds = getGuestShipIds(ctx.lobbyState.players, hostPlayerId);

  // Get local player's ship ID (the guest's assigned ship)
  const localPlayer = ctx.lobbyState.players.find(
    (p) => p.playerId === ctx.localPlayerId,
  );
  const localShipId = localPlayer?.shipId ?? undefined;

  // Switch to mission screen
  startMission(screenManager, contract);

  // Launch the mission with setupContracts callback for mission end
  launchMission(
    controller,
    contract,
    allShipIds,
    (ctrl) => {
      setupContractsScreen(ctrl);
    },
    guestShipIds,
    localShipId,
  );
}
