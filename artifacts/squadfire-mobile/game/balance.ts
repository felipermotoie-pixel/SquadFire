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

/**
 * Playable causeway length in road half-widths. Enemies spawn near the far end and
 * walk the whole length, so the player sees them long before they matter (v0.3.5
 * raised this from 6 to 8 for long-range readability). The drawn bridge continues
 * far beyond this toward the vanishing point (renderer ROAD_FAR).
 */
export const ROAD_LENGTH = 8;

/**
 * Canonical road basis. Every formation, facing, projectile and debug vector is
 * expressed in it: +y runs from the squad line toward the vanishing point,
 * +x runs to the player's right. There is no other "forward" in the game.
 */
export const ROAD_FORWARD: Readonly<Vec2> = Object.freeze({ x: 0, y: 1 });
export const ROAD_RIGHT: Readonly<Vec2> = Object.freeze({ x: 1, y: 0 });

/**
 * Forward depth of a world position = its projection on ROAD_FORWARD. Because the
 * basis is axis-aligned this equals `v.y`, and `pos.y` / `Projectile.y` are the
 * canonical forward-depth coordinates everywhere (see types.ts). Range, combat-depth
 * and formation-depth rules go through these helpers so the basis stays the single
 * source of truth.
 */
export function forwardDepth(v: Readonly<Vec2>): number {
  return v.x * ROAD_FORWARD.x + v.y * ROAD_FORWARD.y;
}
/** Lateral offset of a world position = its projection on ROAD_RIGHT (= `v.x`). */
export function lateral(v: Readonly<Vec2>): number {
  return v.x * ROAD_RIGHT.x + v.y * ROAD_RIGHT.y;
}

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
  /**
   * True gap kept between the outermost soldier's *rendered edge* (not its centre) and
   * the barrier. The footprint half-width used by the clamp is
   * centreSpan/2 + soldierHalfWidth (see formation.ts), so this margin is only air.
   */
  formationRoadMargin: 0.06,
  /**
   * Column pitch along ROAD_RIGHT (world units) = fire-lane spacing. The soldier
   * sprite is 0.46 × 0.384 ≈ 0.177 wide, so 0.15 gives ~15 % shoulder overlap —
   * intentionally dense (v0.3.6 ultra-compact block), muzzles stay distinct.
   */
  formationHorizontalSpacing: 0.15,
  /** Row pitch along ROAD_FORWARD for small squads (world units). */
  formationLongitudinalSpacing: 0.12,
  /** Row pitch floor used when a deep block is compressed. */
  formationMinLongitudinalSpacing: 0.08,
  /**
   * Outer *centre-to-centre* span the block may never exceed (outermost soldier
   * centres, not rendered edges). 0.6 / 0.15 = 4 gaps → exactly 5 columns; the column
   * cap in formation.ts adds an epsilon so this never depends on float division.
   */
  formationMaxWidth: 0.6,
  /**
   * Hard cap on columns; extra soldiers add rows behind instead of width. Fixed at 5
   * for v0.3.6: 50 soldiers = 5 × 10 rows → 9 gaps × 0.08 = 0.72 = formationMaxDepth.
   * Four columns (13 rows, 0.96 deep) would not fit the vertical budget.
   */
  formationMaxColumns: 5,
  /**
   * Squad sizes at which one more column is unlocked (cumulative: columns = 1 + number
   * of thresholds reached, capped). 2 → 2 cols, 5 → 3, 12 → 4, 24 → 5. Rows are added
   * *before* width so the block grows backward: 3 = wedge, 4 = 2×2, 5 = 3+2, 6 = 3×2,
   * 9 = 3×3, 12 = 4×3, 20 = 4×5, 24 = 5×4+4, 50 = 5×10.
   */
  formationColumnThresholds: [2, 5, 12, 24],
  /** Total front-to-back depth budget before rows are compressed. */
  formationMaxDepth: 0.72,
  /** Rear rows may not sit further behind the squad line than this. */
  formationMaxRearDepth: 0.6,
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
  /**
   * Hard ceiling on any enemy's forward depth at spawn (`spawnEnemy` clamps to it):
   * covers the timeline jitter (+0.15) and the second row of an escort group
   * (+0.28 + 0.12). COMBAT_DEPTH is derived from it — nothing can ever be hit deeper.
   */
  maxSpawnDepth: ROAD_LENGTH - 0.2 + 0.4,
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

/**
 * Deepest forward depth at which anything can be hit: the farthest spawn line plus the
 * largest depth tolerance. Bullets beyond it are in pure flight (no collision queries).
 */
export const COMBAT_DEPTH =
  Math.max(ENEMIES.maxSpawnDepth, BOSS.spawnY, GATES.spawnY) +
  Math.max(ENEMIES.grunt.depthTolerance, ENEMIES.runner.depthTolerance, ENEMIES.elite.depthTolerance, BOSS.depthTolerance);

export const PROJECTILES = {
  /**
   * Floor for the projectile pool. The engine grows the pool at construction (and on
   * camera change) to `requiredProjectilePool(cam)`, which is derived from the
   * camera's far visible depth, so a live bullet is never recycled.
   */
  poolSize: 640,
  /** Safety factor applied to the theoretical peak of simultaneously live bullets. */
  poolSafetyFactor: 1.3,
  /**
   * Lifetime = maxTravel / speed × this margin. The travel budget is the real limit;
   * the lifetime is only a backstop and must never cut a bullet short.
   */
  lifetimeMargin: 1.15,
  /** Lateral limit past which a projectile is off the road and recycled. */
  sideExit: 1.6,
  /**
   * End of the readable track: a missed bullet flies until the road's projected width
   * falls below this fraction of the screen width (≈ 40 pt on a 402-pt phone — fire
   * lanes 0.15 units apart are then ~3 pt apart and the track no longer reads). The
   * camera turns it into `farVisibleDepth` (game/camera.ts, ≈ 23.1 units for the
   * v0.3.5 camera); each bullet's budget is `farVisibleDepth − forwardDepth(spawn)`
   * so every row ends at the same distant boundary.
   */
  minReadableRoadWidthFraction: 0.1,
};

export const VFX = {
  poolSize: 320,
  popupPoolSize: 40,
  muzzleLifetime: 0.07,
  impactLifetime: 0.14,
  deathLifetime: 0.5,
  bossDeathLifetime: 1.6,
};

export const SIM = {
  /** Fixed simulation step (seconds). Rendering interpolates nothing — steps are cheap. */
  fixedStep: 1 / 120,
  maxStepsPerFrame: 8,
};
