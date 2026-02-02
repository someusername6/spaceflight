/**
 * Component Hashers - Hash individual components for desync detection.
 * Uses FNV-1a hash via HashState from hashing.ts.
 */

import type { ComponentBase } from '../core/types';
import type { HashState } from './hashing';

/** Hash a single component. Only includes simulation-critical fields. */
export function hashComponent(hash: HashState, component: ComponentBase): void {
  hash.addString(component.type);

  switch (component.type) {
    case 'transform': {
      const c = component as import('../components/transform').Transform;
      hash.addFloat64(c.position.x);
      hash.addFloat64(c.position.y);
      hash.addFloat64(c.position.z);
      hash.addFloat64(c.rotation.x);
      hash.addFloat64(c.rotation.y);
      hash.addFloat64(c.rotation.z);
      hash.addFloat64(c.rotation.w);
      break;
    }
    case 'physics': {
      const c = component as import('../components/physics').Physics;
      hash.addFloat64(c.velocity.x);
      hash.addFloat64(c.velocity.y);
      hash.addFloat64(c.velocity.z);
      hash.addFloat64(c.maxSpeed);
      hash.addFloat64(c.acceleration);
      hash.addFloat64(c.drag);
      hash.addFloat64(c.turnRate);
      hash.addFloat64(c.rollRate);
      hash.addFloat64(c.currentSpeed);
      hash.addFloat64(c.afterburnerMultiplier);
      hash.addFloat64(c.afterburnerHeatRate);
      hash.addBool(c.isAfterburning);
      hash.addBool(c.afterburnerLocked);
      hash.addFloat64(c.angularVelocity.x);
      hash.addFloat64(c.angularVelocity.y);
      hash.addFloat64(c.angularVelocity.z);
      hash.addFloat64(c.angularAcceleration);
      break;
    }
    case 'health': {
      const c = component as import('../components/health').Health;
      hash.addFloat64(c.hull);
      hash.addFloat64(c.maxHull);
      hash.addBool(c.deathDelay !== undefined);
      if (c.deathDelay !== undefined) hash.addFloat64(c.deathDelay);
      break;
    }
    case 'collision': {
      const c = component as import('../components/collision').Collision;
      hash.addFloat64(c.radius);
      hash.addInt32(c.collidedWith.length);
      const sorted = [...c.collidedWith].sort((a, b) => a - b);
      for (const e of sorted) hash.addInt32(e);
      break;
    }
    case 'faction': {
      const c = component as import('../components/faction').FactionComponent;
      hash.addInt32(c.faction);
      break;
    }
    case 'shields': {
      const c = component as import('../components/shields').Shields;
      hash.addFloat64(c.current);
      hash.addFloat64(c.max);
      hash.addFloat64(c.regenRate);
      hash.addFloat64(c.regenDelay);
      hash.addFloat64(c.lastDamageTime);
      hash.addFloat64(c.ionizedUntil);
      break;
    }
    case 'primaryWeapons': {
      const c = component as import('../components/weapons').PrimaryWeapons;
      hash.addInt32(c.currentIndex);
      hash.addFloat64(c.lastFireTime);
      hash.addInt32(c.linkMode);
      hash.addInt32(c.weapons.length);
      for (const w of c.weapons) {
        hash.addString(w.name);
        hash.addFloat64(w.heatPerShot);
        hash.addFloat64(w.fireRate);
        hash.addFloat64(w.damage);
        hash.addInt32(w.bankSize);
        hash.addBool(w.ammo !== undefined);
        if (w.ammo !== undefined) hash.addInt32(w.ammo);
      }
      break;
    }
    case 'secondaryWeapons': {
      const c = component as import('../components/weapons').SecondaryWeapons;
      hash.addInt32(c.currentIndex);
      hash.addFloat64(c.lastFireTime);
      hash.addBool(c.lockTarget !== undefined);
      if (c.lockTarget !== undefined) hash.addInt32(c.lockTarget);
      hash.addFloat64(c.lockProgress);
      hash.addInt32(c.lockWeaponIndex);
      hash.addInt32(c.weapons.length);
      for (const w of c.weapons) {
        hash.addString(w.name);
        hash.addInt32(w.count);
        hash.addFloat64(w.fireRate);
        hash.addFloat64(w.damage);
      }
      break;
    }
    case 'projectile': {
      const c = component as import('../components/projectile').Projectile;
      hash.addInt32(c.owner);
      hash.addFloat64(c.damage);
      hash.addFloat64(c.speed);
      hash.addFloat64(c.range);
      hash.addFloat64(c.distanceTraveled);
      hash.addFloat64(c.direction.x);
      hash.addFloat64(c.direction.y);
      hash.addFloat64(c.direction.z);
      hash.addString(c.category);
      hash.addString(c.weaponName);
      hash.addBool(c.trackingTarget !== undefined);
      if (c.trackingTarget !== undefined) hash.addInt32(c.trackingTarget);
      break;
    }
    case 'missile': {
      const c = component as import('../components/missile').Missile;
      hash.addInt32(c.owner);
      hash.addBool(c.target !== undefined);
      if (c.target !== undefined) hash.addInt32(c.target);
      hash.addFloat64(c.damage);
      hash.addFloat64(c.speed);
      hash.addFloat64(c.turnRate);
      hash.addFloat64(c.range);
      hash.addFloat64(c.distanceTraveled);
      hash.addFloat64(c.direction.x);
      hash.addFloat64(c.direction.y);
      hash.addFloat64(c.direction.z);
      hash.addFloat64(c.aoeRadius);
      hash.addBool(c.isNuke);
      hash.addString(c.missileType);
      const resistedArray = Array.from(c.resistedDecoys).sort((a, b) => a - b);
      hash.addInt32(resistedArray.length);
      for (const e of resistedArray) hash.addInt32(e);
      break;
    }
    case 'decoy': {
      const c = component as import('../components/decoy').Decoy;
      hash.addInt32(c.owner);
      hash.addFloat64(c.direction.x);
      hash.addFloat64(c.direction.y);
      hash.addFloat64(c.direction.z);
      hash.addFloat64(c.timeRemaining);
      break;
    }
    case 'explosion': {
      const c = component as import('../components/explosion').Explosion;
      hash.addFloat64(c.age);
      hash.addFloat64(c.maxAge);
      hash.addFloat64(c.size);
      hash.addString(c.variant);
      hash.addBool(c.sourceEntity !== undefined);
      if (c.sourceEntity !== undefined) hash.addInt32(c.sourceEntity);
      break;
    }
    case 'playerControlled': {
      const c = component as import('../components/player').PlayerControlled;
      hash.addBool(c.input.pitchUp);
      hash.addBool(c.input.pitchDown);
      hash.addBool(c.input.yawLeft);
      hash.addBool(c.input.yawRight);
      hash.addBool(c.input.rollLeft);
      hash.addBool(c.input.rollRight);
      hash.addBool(c.input.accelerate);
      hash.addBool(c.input.decelerate);
      hash.addBool(c.input.afterburner);
      hash.addBool(c.input.firePrimary);
      hash.addBool(c.input.fireSecondary);
      hash.addBool(c.input.launchDecoy);
      hash.addBool(c.input.cyclePrimary);
      hash.addBool(c.input.cycleSecondary);
      hash.addBool(c.input.cycleTargetNext);
      hash.addBool(c.input.cycleTargetPrev);
      hash.addBool(c.input.targetNearest);
      hash.addBool(c.input.toggleMatchSpeed);
      hash.addBool(c.matchSpeed);
      hash.addFloat64(c.prevTargetDistance);
      hash.addBool(c.prevMatchSpeedTarget !== undefined);
      if (c.prevMatchSpeedTarget !== undefined)
        hash.addInt32(c.prevMatchSpeedTarget);
      break;
    }
    case 'aiControlled': {
      const c = component as import('../components/ai').AIControlled;
      hash.addString(c.state);
      hash.addBool(c.target !== null);
      if (c.target !== null) hash.addInt32(c.target);
      hash.addFloat64(c.stateTimer);
      hash.addFloat64(c.lastStateChange);
      hash.addFloat64(c.lastDecoyTime);
      hash.addFloat64(c.lastRepositionTime);
      hash.addString(c.profile.name);
      hash.addFloat64(c.input.pitch);
      hash.addFloat64(c.input.yaw);
      hash.addFloat64(c.input.roll);
      hash.addBool(c.input.accelerate);
      hash.addBool(c.input.decelerate);
      hash.addBool(c.input.afterburner);
      hash.addBool(c.preferredCombatRange !== undefined);
      if (c.preferredCombatRange !== undefined)
        hash.addFloat64(c.preferredCombatRange);
      hash.addBool(c.fleeDistance !== undefined);
      if (c.fleeDistance !== undefined) hash.addFloat64(c.fleeDistance);
      hash.addBool(c.behaviorMode !== undefined);
      if (c.behaviorMode !== undefined) hash.addString(c.behaviorMode);
      break;
    }
    case 'targeting': {
      const c = component as import('../components/targeting').Targeting;
      hash.addBool(c.currentTarget !== undefined);
      if (c.currentTarget !== undefined) hash.addInt32(c.currentTarget);
      hash.addInt32(c.targetIndex);
      const sorted = [...c.validTargets].sort((a, b) => a - b);
      hash.addInt32(sorted.length);
      for (const e of sorted) hash.addInt32(e);
      break;
    }
    case 'aimError': {
      const c = component as import('../components/aim-error').AimError;
      hash.addFloat64(c.offset.x);
      hash.addFloat64(c.offset.y);
      hash.addFloat64(c.maxError);
      hash.addFloat64(c.effectiveMaxError);
      hash.addFloat64(c.angularFactor);
      hash.addFloat64(c.driftSpeed);
      hash.addFloat64(c.driftDirection.x);
      hash.addFloat64(c.driftDirection.y);
      hash.addFloat64(c.driftTimer);
      hash.addFloat64(c.currentAngularVelocity);
      hash.addFloat64(c.beamTrackingSpeed);
      hash.addFloat64(c.currentBeamDirection.x);
      hash.addFloat64(c.currentBeamDirection.y);
      hash.addFloat64(c.currentBeamDirection.z);
      break;
    }
    case 'heat': {
      const c = component as import('../components/heat').Heat;
      hash.addFloat64(c.current);
      hash.addFloat64(c.max);
      hash.addFloat64(c.coolingRate);
      hash.addBool(c.weaponsLocked);
      break;
    }
    case 'shipIdentity': {
      const c = component as import('../components/ship-identity').ShipIdentity;
      hash.addString(c.archetype);
      hash.addString(c.callsign);
      hash.addBool(c.campaignShipId !== undefined);
      if (c.campaignShipId !== undefined) hash.addString(c.campaignShipId);
      break;
    }
    case 'combatStats': {
      const c = component as import('../components/combat-stats').CombatStats;
      hash.addInt32(c.kills);
      hash.addInt32(c.assists);
      hash.addFloat64(c.damageDealt);
      hash.addFloat64(c.damageReceived);
      const sortedKeys = Array.from(c.weaponStats.keys()).sort();
      hash.addInt32(sortedKeys.length);
      for (const key of sortedKeys) {
        const ws = c.weaponStats.get(key);
        if (!ws) continue;
        hash.addString(ws.weaponName);
        hash.addFloat64(ws.damageDealt);
        hash.addInt32(ws.shotsFired);
        hash.addInt32(ws.shotsOnTarget);
      }
      break;
    }
    case 'convoyShip': {
      const c = component as import('../components/convoy').ConvoyShip;
      hash.addInt32(c.index);
      hash.addBool(c.inEscapeZone);
      hash.addFloat64(c.jumpChargeProgress);
      hash.addFloat64(c.jumpChargeTime);
      hash.addBool(c.jumpInitiated);
      hash.addBool(c.isStopped);
      hash.addBool(c.stopDistance !== undefined);
      if (c.stopDistance !== undefined) hash.addFloat64(c.stopDistance);
      break;
    }
    case 'convoyAutopilot': {
      const c = component as import('../components/convoy').ConvoyAutopilot;
      hash.addFloat64(c.destination.x);
      hash.addFloat64(c.destination.y);
      hash.addFloat64(c.destination.z);
      hash.addFloat64(c.escapeZoneRadius);
      hash.addBool(c.active);
      hash.addFloat64(c.input.pitch);
      hash.addFloat64(c.input.yaw);
      hash.addBool(c.input.accelerate);
      hash.addBool(c.input.decelerate);
      break;
    }
    case 'damageTracking': {
      const c =
        component as import('../components/damage-tracking').DamageTracking;
      hash.addBool(c.lastAttacker !== null);
      if (c.lastAttacker !== null) hash.addInt32(c.lastAttacker);
      hash.addFloat64(c.lastDamageTime);
      break;
    }
    case 'structure': {
      const c = component as import('../components/structure').Structure;
      hash.addString(c.structureType);
      hash.addBool(c.stationType !== undefined);
      if (c.stationType !== undefined) hash.addString(c.stationType);
      break;
    }
    case 'hullCollider': {
      const c = component as import('../components/hull-collider').HullCollider;
      hash.addFloat64(c.boundingRadius);
      hash.addFloat64(c.mass);
      hash.addBool(c.useHullForWeapons);
      hash.addInt32(c.planes.length);
      for (const p of c.planes) {
        hash.addFloat64(p.nx);
        hash.addFloat64(p.ny);
        hash.addFloat64(p.nz);
        hash.addFloat64(p.d);
      }
      hash.addBool(c.subHulls !== undefined);
      if (c.subHulls) {
        hash.addInt32(c.subHulls.length);
        for (const sh of c.subHulls) {
          hash.addFloat64(sh.boundingRadius);
          hash.addInt32(sh.planes.length);
          for (const p of sh.planes) {
            hash.addFloat64(p.nx);
            hash.addFloat64(p.ny);
            hash.addFloat64(p.nz);
            hash.addFloat64(p.d);
          }
        }
      }
      break;
    }
    case 'shieldHit':
      break; // Visual only
    case 'hyperspaceJump': {
      const c =
        component as import('../components/hyperspace-jump').HyperspaceJump;
      hash.addFloat64(c.progress);
      hash.addFloat64(c.duration);
      hash.addFloat64(c.direction.x);
      hash.addFloat64(c.direction.y);
      hash.addFloat64(c.direction.z);
      hash.addFloat64(c.startTime);
      break;
    }
    default:
      hash.addString(`unknown:${component.type}`);
  }
}
