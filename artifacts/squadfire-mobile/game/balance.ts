/**
 * Central balance configuration. Every squad-wide modifier lives here so scaling
 * can be reasoned about in one place.
 *
 * Total DPS ≈ aliveSoldiers × weapon.damage × damageMultiplier × weapon.fireRate × fireRateMultiplier × hitEfficiency
 *
 * Squad size is applied exactly once (as the number of firing sources). Damage per
 * projectile and fire rate are weapon-based and only change through explicit gates.
 */
import type { WeaponDefinition, WeaponId } from './types';

/** Visible causeway length in road half-widths. Enemies spawn near the far end. */
export const ROAD_LENGTH = 6;

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  rifle: {
    id: 'rifle',
    fireRate: 2,
    damage: 10,
    projectileSpeed: 11,
    recoil: 1,
    projectileVisualId: 'tracer',
    muzzleFlashVisualId: 'flash-small',
  },
};

export const SQUAD = {
  initialSize: 5,
  maxSize: 50,
  /** How fast a soldier converges to its formation slot (1/s). */
  slotFollow: 9,
  /** How fast the anchor follows the finger (1/s). */
  anchorFollow: 14,
  /** Lateral clamp for the squad anchor. */
  anchorLimit: 0.72,
  /** Formation spacing in world units. */
  lateralSpacing: 0.25,
  rowSpacing: 0.17,
  maxRowsBeforeWidening: 5,
};

export const MODIFIER_CAPS = {
  fireRateMax: 2.5,
  damageMax: 3,
};

export const TARGETING = {
  /** Enemies closer than this (forward) are ignored — they are already at the line. */
  minForward: 0.05,
  /** Half-angle of the forward attack cone expressed as lateral units per forward unit. */
  coneSlope: 0.75,
  /** Lateral distance weight in target scoring. */
  lateralWeight: 1.6,
  /** Re-evaluate a valid target this often (seconds). */
  reacquireInterval: 0.35,
};

export const ENEMIES = {
  grunt: { hp: 30, speed: 0.42, hitRadius: 0.2, depthTolerance: 0.32 },
  elite: { hp: 110, speed: 0.34, hitRadius: 0.26, depthTolerance: 0.38 },
  /** Never keep more than this many enemies alive. */
  maxAlive: 300,
  spawnY: ROAD_LENGTH - 0.2,
  spawnDepthSpread: 1.1,
  /** Forward distance at which an enemy reaches the squad line. */
  contactY: 0.08,
  /** Kills needed to advance to the next wave. */
  killsPerWave: 22,
  /** Time between groups at wave 1; shrinks with each wave. */
  spawnIntervalBase: 2.4,
  spawnIntervalMin: 0.9,
  groupSizeBase: 5,
  groupSizePerWave: 2,
  groupSizeMax: 18,
  eliteChanceFromWave2: 0.16,
};

export const BOSS = {
  /** The boss enters after this many kills. */
  killsToSpawn: 70,
  hp: 2600,
  hitRadius: 0.62,
  depthTolerance: 0.7,
  spawnY: ROAD_LENGTH - 0.1,
  holdY: 3.1,
  approachSpeed: 0.55,
  lateralSpeed: 0.35,
  attackInterval: 6.5,
  attackIntervalPhase2: 4.5,
  telegraphDuration: 1.3,
  slamHalfWidth: 0.55,
  /** Visual height in world units. */
  height: 2.3,
};

export const GATES = {
  firstAt: 9,
  interval: 12,
  speed: 0.55,
  spawnY: ROAD_LENGTH - 0.6,
  /** Gate frame world height. */
  height: 0.9,
};

export const PROJECTILES = {
  poolSize: 640,
  lifetime: 1.6,
  /** Aim height on a normal enemy (fraction of its visual height). */
  enemyAimHeightFraction: 0.55,
};

export const VFX = {
  poolSize: 320,
  popupPoolSize: 40,
  muzzleLifetime: 0.07,
  impactLifetime: 0.22,
  deathLifetime: 0.5,
  bossDeathLifetime: 1.6,
};

export const SIM = {
  /** Fixed simulation step (seconds). Rendering interpolates nothing — steps are cheap. */
  fixedStep: 1 / 120,
  maxStepsPerFrame: 8,
};
