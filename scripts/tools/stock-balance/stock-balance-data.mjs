/**
 * Stock Balance Simulation - Item Data and Player Profiles
 *
 * This file contains static data used by the stock balance simulation.
 * Extracted to keep the main simulation file under 400 lines.
 */

// ============ ITEM DATA ============

export const MISSILES = {
  rocket: { capacity: 12, unlockSector: 1 },
  seeker: { capacity: 8, unlockSector: 1 },
  swarm: { capacity: 20, unlockSector: 1 },
  decoy: { capacity: 6, unlockSector: 1 },
  dart: { capacity: 10, unlockSector: 2 },
  cluster: { capacity: 10, unlockSector: 2 },
  torpedo: { capacity: 4, unlockSector: 3 },
  nuke: { capacity: 2, unlockSector: 4 },
};

export const AMMO_WEAPONS = {
  autocannon: { baseAmmo: 200, unlockSector: 2 },
  flak: { baseAmmo: 50, unlockSector: 2 },
  railgun: { baseAmmo: 20, unlockSector: 4 },
  nuclearLance: { baseAmmo: 1, unlockSector: 5 },
};

export const SHIPS = {
  patrol: { unlockSector: 1 },
  scout: { unlockSector: 1 },
  fighter: { unlockSector: 1 },
  interceptor: { unlockSector: 2 },
  raider: { unlockSector: 2 },
  bomber: { unlockSector: 3 },
  sentinel: { unlockSector: 3 },
  striker: { unlockSector: 4 },
  defender: { unlockSector: 4 },
};

export const PRIMARIES = {
  pulse: { unlockSector: 1 },
  ion: { unlockSector: 1 },
  plasma: { unlockSector: 1 },
  autocannon: { unlockSector: 2 },
  blueLaser: { unlockSector: 2 },
  greenLaser: { unlockSector: 2 },
  flak: { unlockSector: 2 },
  redLaser: { unlockSector: 3 },
  lightning: { unlockSector: 3 },
  torch: { unlockSector: 3 },
  railgun: { unlockSector: 4 },
  nuclearLance: { unlockSector: 5 },
};

// ============ PLAYER PROFILES ============

/**
 * Consumption profiles define how much a player uses per mission.
 *
 * - shipsLostPerMission: Average ships lost (Poisson-distributed)
 * - missilesPerMission: Average missiles consumed (by type preference)
 * - ammoPercentPerMission: Percentage of equipped ammo capacity consumed
 * - primaryPurchasesPerSector: How many primaries bought per sector
 * - shipPurchasesPerSector: How many ships bought per sector
 * - missilePreference: Which missiles they prefer (weighted)
 * - ammoPreference: Which ammo weapons they prefer (weighted)
 */
export const PROFILES = {
  conservative: {
    name: 'Conservative',
    description: 'Careful player, low consumption',
    shipsLostPerMission: 0.3,
    missilesPerMission: 15,
    ammoPercentPerMission: 0.4,
    primaryPurchasesPerSector: 2,
    shipPurchasesPerSector: 1,
    missilePreference: { seeker: 0.5, rocket: 0.3, decoy: 0.2 },
    ammoPreference: { autocannon: 0.7, flak: 0.3 },
  },
  balanced: {
    name: 'Balanced',
    description: 'Average player consumption',
    shipsLostPerMission: 0.8,
    missilesPerMission: 35,
    ammoPercentPerMission: 0.65,
    primaryPurchasesPerSector: 4,
    shipPurchasesPerSector: 2,
    missilePreference: { seeker: 0.3, rocket: 0.3, swarm: 0.2, dart: 0.2 },
    ammoPreference: { autocannon: 0.6, flak: 0.3, railgun: 0.1 },
  },
  aggressive: {
    name: 'Aggressive',
    description: 'High risk, high consumption',
    shipsLostPerMission: 1.5,
    missilesPerMission: 60,
    ammoPercentPerMission: 0.9,
    primaryPurchasesPerSector: 6,
    shipPurchasesPerSector: 4,
    missilePreference: { swarm: 0.4, rocket: 0.3, seeker: 0.2, torpedo: 0.1 },
    ammoPreference: { autocannon: 0.8, flak: 0.2 },
  },
  missileSpammer: {
    name: 'Missile Spammer',
    description: 'Heavy missile user',
    shipsLostPerMission: 0.5,
    missilesPerMission: 120,
    ammoPercentPerMission: 0.3,
    primaryPurchasesPerSector: 2,
    shipPurchasesPerSector: 1,
    missilePreference: { swarm: 0.5, rocket: 0.2, seeker: 0.2, nuke: 0.1 },
    ammoPreference: { autocannon: 0.5, flak: 0.5 },
  },
  gunRunner: {
    name: 'Gun Runner',
    description: 'Heavy ammo user, prefers ballistics',
    shipsLostPerMission: 1.0,
    missilesPerMission: 10,
    ammoPercentPerMission: 1.2, // Burns through more than one load
    primaryPurchasesPerSector: 8,
    shipPurchasesPerSector: 3,
    missilePreference: { decoy: 0.6, rocket: 0.4 },
    ammoPreference: { autocannon: 0.6, railgun: 0.3, flak: 0.1 },
  },
};

// ============ STOCK CONSTANTS ============

export const CONSTANTS = {
  // Base stock (on sector entry)
  SHIP_BASE: 5,
  SHIP_SECTOR_BONUS: 2,
  PRIMARY_BASE: 6,
  PRIMARY_SECTOR_BONUS: 1,
  MISSILE_BASE_LOADS: 20,
  AMMO_BASE_REFILLS: 12,
  AVAILABILITY_BONUS: 0.25,

  // Trickle (per mission)
  TRICKLE_PROB_BASE: 0.4,
  TRICKLE_PROB_DECAY: 0.05,
  MISSILE_TRICKLE_LOADS: 2,
  AMMO_TRICKLE_REFILLS: 1.5,
};
