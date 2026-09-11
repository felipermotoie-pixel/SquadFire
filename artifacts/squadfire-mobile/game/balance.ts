/**
 * Central balance configuration. Every squad-wide modifier lives here so scaling
 * can be reasoned about in one place.
 *
 * Total DPS ≈ aliveSoldiers × weapon.damage × damageMultiplier × weapon.fireRate × fireRateMultiplier × hitEfficiency
 *
 * Squad size is applied exactly once (as the number of firing sources). Damage per
 * projectile and fire rate are weapon-based and only change through explicit gates.
 */
import type { Vec2, WeaponDefinition, WeaponId } from './types';

/** Visible causeway length in road half-widths. Enemies spawn near the far end. */
export const ROAD_LENGTH = 6;

/**
 * Canonical road basis. Every formation, facing, projectile and debug vector is
 * expressed in it: +y runs from the squad line toward the vanishing point,
 * +x runs to the player's right. There is no other "forward" in the game.
 */
export const ROAD_FORWARD: Readonly<Vec2> = Object.freeze({ x: 0, y: 1 });
export const ROAD_RIGHT: Readonly<Vec2> = Object.freeze({ x: 1, y: 0 });

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  rifle: {
    id: 'rifle',
    fireRate: 2,
    damage: 10,
    projectileSpeed: 11,
    /** Straight fire: every shot leaves the muzzle along ROAD_FORWARD, no target lookup. */
    aimMode: 'STRAIGHT',
    /** Lateral spread applied to the straight direction (world units per forward unit). 0 = perfect lanes. */
    spread: 0,
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
  /** Absolute lateral clamp for the squad anchor (small squads). */
  anchorLimit: 0.72,
  /**
   * Half-width of the drivable road in world units. World x is expressed in road
   * half-widths, so the barriers sit at ±1 at *every* depth — perspective narrowing is
   * purely a projection effect (see game/camera.ts). `roadHalfWidthAt(y)` in
   * formation.ts is the single place that answers "how wide is the road here".
   */
  roadHalfWidth: 1.0,
  /** Safety margin kept between the outermost soldier's centre and the barrier. */
  formationRoadMargin: 0.14,
  /** Column pitch along ROAD_RIGHT (world units) = fire-lane spacing. Soldier sprite is ~0.18 wide. */
  formationHorizontalSpacing: 0.21,
  /** Row pitch along ROAD_FORWARD for small squads (world units). */
  formationLongitudinalSpacing: 0.16,
  /** Row pitch floor used when a deep block is compressed. */
  formationMinLongitudinalSpacing: 0.1,
  /** Outer lateral extent the block may never exceed. */
  formationMaxWidth: 0.9,
  /** Hard cap on columns; extra soldiers add rows behind instead of width. */
  formationMaxColumns: 5,
  /**
   * Squad sizes at which one more column is unlocked (2 → 2 cols, 5 → 3, 10 → 4, 20 → 5).
   * Rows are added *before* width so small squads stay compact: 3 = wedge, 4 = 2×2,
   * 5 = 3+2, 9 = 3×3, 20 = 5×4, 50 = 5×10.
   */
  formationColumnThresholds: [2, 5, 10, 20],
  /** Total front-to-back depth budget before rows are compressed. */
  formationMaxDepth: 0.95,
  /** Rear rows may not sit further behind the squad line than this. */
  formationMaxRearDepth: 0.75,
  /** Front row may creep this far ahead of the squad line for deep blocks. */
  formationMaxFrontAdvance: 0.3,
  /** Formation-slot capacity of a full row (derived: equals formationMaxColumns). */
  get formationRowCapacity(): number {
    return this.formationMaxColumns;
  },
};

export const MODIFIER_CAPS = {
  fireRateMax: 2.5,
  damageMax: 3,
};

/**
 * Base enemy archetypes. Stage configs (game/stages.ts) scale hp/speed per stage;
 * these are the stage-5 reference values.
 */
export const ENEMIES = {
  grunt: { hp: 30, speed: 0.42, hitRadius: 0.2, depthTolerance: 0.32 },
  /** Fast, fragile flanker: crosses the road in ~9 s instead of ~14 s. */
  runner: { hp: 18, speed: 0.66, hitRadius: 0.17, depthTolerance: 0.3 },
  elite: { hp: 110, speed: 0.34, hitRadius: 0.26, depthTolerance: 0.38 },
  /** Never keep more than this many enemies alive. */
  maxAlive: 300,
  spawnY: ROAD_LENGTH - 0.2,
  spawnDepthSpread: 1.1,
  /** Forward distance at which an enemy reaches the squad line. */
  contactY: 0.08,
  /** Lateral spread of a spawn group around its lane centre. */
  groupLateralSpread: 0.22,
};

/** Boss reference values. Per-stage multipliers live in game/stages.ts (bossFor). */
export const BOSS = {
  hp: 2600,
  hitRadius: 0.62,
  depthTolerance: 0.7,
  spawnY: ROAD_LENGTH - 0.1,
  holdY: 3.1,
  approachSpeed: 0.55,
  /**
   * Bounded lateral patrol. The boss never tracks the squad: it walks to a random
   * waypoint inside ±patrolRange, dwells, then picks the next one.
   */
  patrolSpeed: 0.28,
  patrolRange: 0.5,
  patrolDwellMin: 0.9,
  patrolDwellMax: 1.9,
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
  /** Seconds a missed bullet stays alive before it is recycled (it usually leaves the road first). */
  lifetime: 1.6,
  /** Lateral limit past which a projectile is off the road and recycled. */
  sideExit: 1.6,
  /** Forward margin past ROAD_LENGTH before a projectile is recycled. */
  farExit: 0.6,
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
