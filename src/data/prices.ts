/**
 * Equipment Prices - buy/sell prices for ships, weapons, and ammo.
 *
 * Prices are balanced around campaign economy:
 * - Easy contract: ~200 credits + salvage
 * - Medium contract: ~400 credits + salvage
 * - Hard contract: ~600 credits + salvage
 * - Salvage: 0-10% of destroyed ships yield scrap, weapons, ammo
 *
 * Weapons are one-time purchases. Ammo/missiles are consumables.
 */

/** Ship chassis prices */
export const SHIP_PRICES: Record<string, { buy: number; sell: number }> = {
  patrol: { buy: 200, sell: 100 },
  scout: { buy: 300, sell: 150 },
  fighter: { buy: 400, sell: 200 },
  interceptor: { buy: 500, sell: 250 },
  striker: { buy: 800, sell: 400 },
  bomber: { buy: 700, sell: 350 },
  defender: { buy: 900, sell: 450 },
  raider: { buy: 600, sell: 300 },
  sentinel: { buy: 750, sell: 375 },
};

/** Primary weapon prices (one-time purchase for the weapon itself) */
export const PRIMARY_PRICES: Record<string, { buy: number; sell: number }> = {
  // Energy weapons (infinite ammo)
  plasma: { buy: 100, sell: 50 },
  pulse: { buy: 80, sell: 40 },
  ion: { buy: 90, sell: 45 },

  // Ballistic weapons (require ammo)
  autocannon: { buy: 150, sell: 75 },
  railgun: { buy: 300, sell: 150 },
  flak: { buy: 200, sell: 100 },

  // Beam weapons
  redLaser: { buy: 250, sell: 125 },
  greenLaser: { buy: 200, sell: 100 },
  blueLaser: { buy: 180, sell: 90 },
  lightning: { buy: 220, sell: 110 },
  torch: { buy: 280, sell: 140 }, // Short-range plasma cutter
  nuclearLance: { buy: 500, sell: 250 },
};

/** Ammo prices for ballistic primaries (per round) */
export const AMMO_PRICES: Record<string, { buy: number; sell: number }> = {
  autocannon: { buy: 0.1, sell: 0 }, // 0.1 credit per round (1 cr per 10)
  railgun: { buy: 5, sell: 2 }, // 5 credits per slug
  flak: { buy: 2, sell: 1 }, // 2 credits per shell
  nuclearLance: { buy: 50, sell: 25 }, // 50 credits per charge
};

/** Secondary weapon/missile prices (per missile, consumable) */
export const SECONDARY_PRICES: Record<string, { buy: number; sell: number }> = {
  // Dumbfire (cheap)
  rocket: { buy: 5, sell: 2 },
  cluster: { buy: 8, sell: 4 },

  // Homing (moderate)
  seeker: { buy: 15, sell: 7 },
  dart: { buy: 10, sell: 5 },
  swarm: { buy: 3, sell: 1 },

  // Heavy (expensive)
  torpedo: { buy: 40, sell: 20 },
  nuke: { buy: 100, sell: 50 },

  // Countermeasures
  decoy: { buy: 20, sell: 10 },
};

/** Get ship price (returns 0 if unknown) */
export function getShipPrice(shipClass: string, type: 'buy' | 'sell'): number {
  const price = SHIP_PRICES[shipClass.toLowerCase()];
  return price ? price[type] : 0;
}

/** Get primary weapon price (returns 0 if unknown) */
export function getPrimaryPrice(
  weaponType: string,
  type: 'buy' | 'sell',
): number {
  const price = PRIMARY_PRICES[weaponType];
  return price ? price[type] : 0;
}

/** Get ammo price for ballistic weapons (returns 0 if no ammo needed) */
export function getAmmoPrice(weaponType: string, type: 'buy' | 'sell'): number {
  const price = AMMO_PRICES[weaponType];
  return price ? price[type] : 0;
}

/** Check if weapon uses ammo */
export function weaponUsesAmmo(weaponType: string): boolean {
  return weaponType in AMMO_PRICES;
}

/** Get secondary weapon price (returns 0 if unknown) */
export function getSecondaryPrice(
  weaponType: string,
  type: 'buy' | 'sell',
): number {
  const price = SECONDARY_PRICES[weaponType];
  return price ? price[type] : 0;
}

/**
 * Scrap prices - sell only (80% of ship price / 100).
 * Scrap cannot be bought, only obtained through salvage.
 */
export function getScrapPrice(shipClass: string): number {
  const shipPrice = getShipPrice(shipClass, 'buy');
  if (shipPrice === 0) return 0;
  // Sell value = 80% of (ship price / 100 scrap)
  return Math.floor((shipPrice / 100) * 0.8);
}

/** Scrap required to convert to a ship */
export const SCRAP_PER_SHIP = 100;

/** Conversion fee as fraction of ship buy price */
export const SCRAP_CONVERSION_FEE = 0.05;
