/**
 * Store Stock Tiers - defines which items appear in store at each sector.
 *
 * The store restocks at the start of each sector with items appropriate
 * for that sector. Items from earlier sectors have higher stock quantities.
 *
 * Sector 1 (Frontier): Basic starter gear
 * Sector 2 (Contested Zone): Mid-tier upgrades
 * Sector 3 (Warzone): Advanced equipment
 * Sector 4 (Core Systems): Elite gear
 * Sector 5 (Endless): Everything available
 */

/** Sector at which each ship class first appears in store */
export const SHIP_UNLOCK_SECTOR: Record<string, number> = {
  // Sector 1: Basic ships
  patrol: 1,
  scout: 1,
  fighter: 1,

  // Sector 2: Mid-tier ships
  interceptor: 2,
  raider: 2,

  // Sector 3: Advanced ships
  bomber: 3,
  sentinel: 3,

  // Sector 4: Elite ships
  striker: 4,
  defender: 4,
};

/** Sector at which each primary weapon first appears in store */
export const PRIMARY_UNLOCK_SECTOR: Record<string, number> = {
  // Sector 1: Starter weapons (one from each category)
  pulse: 1,
  ion: 1,
  plasma: 1,
  blueLaser: 1, // Beam: long-range sniper
  autocannon: 1, // Ballistic: close-range brawler
  // Sector 2: Mid-tier weapons
  greenLaser: 2,
  slugCannon: 2,
  flak: 2,

  // Sector 3: Advanced weapons
  redLaser: 3,
  lightning: 3,
  torch: 3,
  gyrojet: 3, // Accelerating rockets with gentle tracking

  // Sector 4: Elite weapons
  railgun: 4,

  // Sector 5: Ultimate weapons
  nuclearLance: 5,
};

/** Sector at which each secondary weapon first appears in store */
export const SECONDARY_UNLOCK_SECTOR: Record<string, number> = {
  // Sector 1: Basic missiles and countermeasures
  rocket: 1,
  seeker: 1,
  swarm: 1,
  decoy: 1,

  // Sector 2: Mid-tier missiles
  dart: 2,
  cluster: 2,
  starburst: 2,

  // Sector 3: Advanced missiles
  torpedo: 3,

  // Sector 4: Elite ordnance
  nuke: 4,
};
