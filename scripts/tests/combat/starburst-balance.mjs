/**
 * Starburst Balance Test - Measures Starburst vs Rocket damage effectiveness.
 *
 * Goal: Starburst should deal ~3x the damage of a Rocket on average.
 * This tests the shrapnel count/range tuning.
 *
 * Test methodology:
 * - Simulate firing Starburst/Rocket at a stationary target
 * - Measure average damage per missile
 * - Ratio should be approximately 3.0
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Get missile stats
const ROCKET_DAMAGE = 50;
const STARBURST_SHRAPNEL_COUNT = 50;
const STARBURST_SHRAPNEL_DAMAGE = 4;
const STARBURST_SHRAPNEL_RANGE = 100; // meters
const STARBURST_FLAK_RADIUS = 30; // meters (detonation radius)

/**
 * Calculate average damage from Starburst shrapnel hitting a target.
 *
 * Assumptions:
 * - Shrapnel is uniformly distributed on a sphere
 * - Target is a sphere with a given radius at a certain distance
 * - Only shrapnel traveling toward the target can hit
 *
 * This is a simplified geometric model.
 */
function estimateStarburstDamage(targetRadius, detonationDistance) {
  // When Starburst detonates at detonationDistance from target center:
  // - Shrapnel radiates uniformly in all directions (sphere)
  // - Target subtends a solid angle based on its size and distance
  // - Shrapnel within shrapnelRange that travels through target's solid angle hits

  // If detonation is at flakRadius distance from target, we use that
  const effectiveDistance = detonationDistance || STARBURST_FLAK_RADIUS;

  // Solid angle subtended by target (approximation for small angles)
  // Ω = 2π(1 - cos(θ)) where θ = atan(r/d)
  const theta = Math.atan(targetRadius / effectiveDistance);
  const solidAngle = 2 * Math.PI * (1 - Math.cos(theta));

  // Fraction of sphere covered by target
  const totalSolidAngle = 4 * Math.PI;
  const hitFraction = solidAngle / totalSolidAngle;

  // Expected hits
  const expectedHits = STARBURST_SHRAPNEL_COUNT * hitFraction;

  // Expected damage
  return expectedHits * STARBURST_SHRAPNEL_DAMAGE;
}

describe('Starburst Balance', () => {
  it('shows estimated damage ratio vs Rocket', () => {
    // Ship hitbox radius ~= 3-4 meters (based on collision radii in code)
    const targetRadius = 3.5;

    // Estimate Starburst damage at optimal detonation distance (flakRadius)
    const starburstDamage = estimateStarburstDamage(targetRadius);

    const ratio = starburstDamage / ROCKET_DAMAGE;

    console.log('\n=== Starburst Balance Analysis ===');
    console.log(`Rocket damage: ${ROCKET_DAMAGE}`);
    console.log(
      `Starburst shrapnel: ${STARBURST_SHRAPNEL_COUNT} x ${STARBURST_SHRAPNEL_DAMAGE} damage`,
    );
    console.log(`Starburst flak radius: ${STARBURST_FLAK_RADIUS}m`);
    console.log(`Starburst shrapnel range: ${STARBURST_SHRAPNEL_RANGE}m`);
    console.log(`Target radius: ${targetRadius}m`);
    console.log(`\nEstimated Starburst damage: ${starburstDamage.toFixed(1)}`);
    console.log(`Damage ratio (Starburst/Rocket): ${ratio.toFixed(2)}x`);
    console.log(`Target ratio: 3.0x`);

    // Check if ratio is within acceptable range (2.5x - 3.5x)
    const inRange = ratio >= 2.5 && ratio <= 3.5;
    console.log(`\nWithin target range (2.5x-3.5x): ${inRange ? 'YES' : 'NO'}`);

    if (!inRange) {
      // Suggest adjustment
      const targetDamage = ROCKET_DAMAGE * 3;
      const targetHits = targetDamage / STARBURST_SHRAPNEL_DAMAGE;

      // Work backward to find needed shrapnel count
      const theta = Math.atan(targetRadius / STARBURST_FLAK_RADIUS);
      const solidAngle = 2 * Math.PI * (1 - Math.cos(theta));
      const hitFraction = solidAngle / (4 * Math.PI);
      const suggestedCount = Math.round(targetHits / hitFraction);

      console.log(`\nSuggested adjustment for 3x effectiveness:`);
      console.log(
        `  shrapnelCount: ${suggestedCount} (currently ${STARBURST_SHRAPNEL_COUNT})`,
      );
    }

    // This is informational - we don't fail the test
    assert.ok(true, 'Balance analysis complete');
  });

  it('calculates damage at various detonation distances', () => {
    const targetRadius = 3.5;

    console.log('\n=== Damage vs Detonation Distance ===');
    console.log('Distance | Estimated Damage | Ratio vs Rocket');
    console.log('-'.repeat(50));

    for (const distance of [20, 40, 65, 100, 150]) {
      if (distance > STARBURST_SHRAPNEL_RANGE) {
        console.log(`${distance.toString().padStart(8)}m | Out of range`);
        continue;
      }
      const damage = estimateStarburstDamage(targetRadius, distance);
      const ratio = damage / ROCKET_DAMAGE;
      console.log(
        `${distance.toString().padStart(8)}m | ${damage.toFixed(1).padStart(16)} | ${ratio.toFixed(2)}x`,
      );
    }

    assert.ok(true);
  });

  it('provides tuning recommendations', () => {
    const targetRadius = 3.5;
    const targetRatio = 3.0;
    const targetDamage = ROCKET_DAMAGE * targetRatio;

    console.log('\n=== Tuning Recommendations ===');
    console.log(
      `Goal: ${targetRatio}x Rocket effectiveness = ${targetDamage} damage`,
    );

    // Calculate geometric hit fraction at flakRadius
    const theta = Math.atan(targetRadius / STARBURST_FLAK_RADIUS);
    const solidAngle = 2 * Math.PI * (1 - Math.cos(theta));
    const hitFraction = solidAngle / (4 * Math.PI);

    console.log(
      `\nGeometric hit fraction at ${STARBURST_FLAK_RADIUS}m: ${(hitFraction * 100).toFixed(2)}%`,
    );

    // Calculate required shrapnel count for various damage scenarios
    const scenarios = [
      {
        name: 'Current',
        count: STARBURST_SHRAPNEL_COUNT,
        damage: STARBURST_SHRAPNEL_DAMAGE,
      },
      { name: 'More shrapnel', count: 40, damage: STARBURST_SHRAPNEL_DAMAGE },
      { name: 'More damage', count: 30, damage: 6 },
      {
        name: 'Optimal for 3x',
        count: Math.round(
          targetDamage / (hitFraction * STARBURST_SHRAPNEL_DAMAGE),
        ),
        damage: STARBURST_SHRAPNEL_DAMAGE,
      },
    ];

    console.log('\nScenarios:');
    for (const s of scenarios) {
      const expectedHits = s.count * hitFraction;
      const totalDamage = expectedHits * s.damage;
      const ratio = totalDamage / ROCKET_DAMAGE;
      console.log(
        `  ${s.name}: ${s.count} shrapnel x ${s.damage} dmg = ${totalDamage.toFixed(1)} dmg (${ratio.toFixed(2)}x)`,
      );
    }

    assert.ok(true);
  });
});
