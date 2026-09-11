/**
 * Core simulation types for SquadFire.
 *
 * The simulation is pure TypeScript (no React, no Skia) so it can be stepped by
 * the render loop on device and by the headless verification script in Node.
 *
 * World space:
 *   x  = lateral position in "road half-widths" (-1 = left barrier, +1 = right barrier)
 *   y  = forward distance from the squad line, also in road half-widths (0 = squad line,
 *        ROAD_LENGTH = far end of the visible causeway). Positive y is away from the camera.
 *   h  = height above the road, same unit (only used for projectile/muzzle visuals)
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type WeaponId = 'rifle';

/**
 * STRAIGHT: the only aim mode. Shots leave the muzzle along ROAD_FORWARD and the
 * player aims by moving the squad. There is no target lookup of any kind.
 */
export type AimMode = 'STRAIGHT';

export interface WeaponDefinition {
  id: WeaponId;
  aimMode: AimMode;
  /** Lateral spread in world units per forward unit (0 = perfectly parallel lanes). */
  spread: number;
  /** Shots per second per soldier before fire-rate modifiers. */
  fireRate: number;
  /** Damage per projectile before damage modifiers. */
  damage: number;
  /** Projectile ground speed (world units / second). */
  projectileSpeed: number;
  /** Recoil animation strength (visual only). */
  recoil: number;
  /** Projectile visual id consumed by the renderer. */
  projectileVisualId: 'tracer';
  /** Muzzle flash visual id consumed by the renderer. */
  muzzleFlashVisualId: 'flash-small';
}

export interface Soldier {
  id: number;
  alive: boolean;
  /** Current world position (converges toward the formation slot). */
  pos: Vec2;
  /** Formation slot relative to the squad anchor (x is absolute after anchor is applied). */
  slot: Vec2;
  /** Timestamp (seconds) at which this soldier is allowed to fire next. */
  nextShotAt: number;
  /** Normalized fire phase in [0, 1). Used to keep the cadence distributed. */
  firePhase: number;
  weaponId: WeaponId;
  /** Animation phase offset so soldiers do not run in lockstep. */
  animPhase: number;
  /** 1 immediately after a shot, decays to 0. Visual only. */
  recoil: number;
  /** Seconds since spawn — used for the spawn "drop in" animation. */
  age: number;
  /** Death animation progress (0 = alive, 1 = removed). */
  death: number;
  shotsFired: number;
}

export type EnemyKind = 'grunt' | 'runner' | 'elite';

export interface Enemy {
  id: number;
  alive: boolean;
  kind: EnemyKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  /** Visual scale multiplier applied on top of perspective (small crowd variety). */
  sizeVariation: number;
  animPhase: number;
  /** Lateral wander phase. */
  wanderPhase: number;
  /** Seconds remaining of hit flash. */
  hitFlash: number;
  /** Death animation progress (0 = alive, >0 dying, >=1 removed). */
  death: number;
  /** Direction of the last hit (for death tilt). */
  lastHitDir: number;
  /** Seconds since spawn (visual: far-end materialise). */
  age: number;
}

export interface Boss {
  active: boolean;
  alive: boolean;
  pos: Vec2;
  hp: number;
  maxHp: number;
  /** Seconds since spawn. */
  age: number;
  hitFlash: number;
  /** Attack telegraph timer: counts down while the boss winds up a slam. */
  telegraph: number;
  /** Seconds until the next attack wind-up. */
  nextAttackIn: number;
  /** Multiplies the balance attack intervals for this encounter (stage-dependent cadence). */
  attackIntervalScale: number;
  /** Phase 1 or 2 (phase 2 starts at 50% HP). */
  phase: 1 | 2;
  death: number;
  /** Current patrol waypoint (lateral). Chosen at random inside ±BOSS.patrolRange. */
  patrolTargetX: number;
  /** Seconds left to stand still before walking to the next waypoint. */
  patrolDwell: number;
}

export interface Projectile {
  active: boolean;
  ownerSoldierId: number;
  weaponId: WeaponId;
  x: number;
  y: number;
  /** Velocity in the road basis. Fixed at spawn; never steered afterwards. */
  vx: number;
  vy: number;
  /** Flight height above the road (constant = muzzle height). */
  h: number;
  /** Ground origin (for the debug path overlay). */
  originX: number;
  originY: number;
  traveled: number;
  damage: number;
  spawnTime: number;
  lifetime: number;
}

export interface ShotEvent {
  soldierId: number;
  weaponId: WeaponId;
  /** Ground-plane origin (world) */
  origin: Vec2;
  /** Height of the muzzle above the ground (world units). */
  originHeight: number;
  /** Ground-plane direction (normalized). Always ROAD_FORWARD (plus weapon spread). */
  direction: Vec2;
  timestamp: number;
}

export type GateEffect =
  | { kind: 'squad'; amount: number }
  | { kind: 'damage'; multiplier: number }
  | { kind: 'fireRate'; multiplier: number };

export interface Gate {
  id: number;
  active: boolean;
  /** Forward distance of the gate line. Moves toward the squad. */
  y: number;
  /** Which lane the gate covers. */
  side: 'left' | 'right';
  effect: GateEffect;
  /** Seconds since it was triggered (drives the "pass through" burst). */
  triggeredAt: number | null;
  consumed: boolean;
}

export type VfxKind =
  | 'muzzle'
  | 'impact'
  | 'impact-boss'
  | 'death'
  | 'death-elite'
  | 'death-boss'
  | 'gate'
  | 'squad-grow'
  | 'boss-phase'
  | 'boss-slam'
  | 'soldier-lost';

export interface VfxParticle {
  active: boolean;
  kind: VfxKind;
  x: number;
  y: number;
  h: number;
  /** Screen-space angle for directional effects (muzzle flash). */
  angle: number;
  age: number;
  lifetime: number;
  /** Random seed for per-instance variation. */
  seed: number;
  /** Optional scale multiplier. */
  scale: number;
}

export interface DamagePopup {
  active: boolean;
  x: number;
  y: number;
  h: number;
  value: number;
  age: number;
  lifetime: number;
  crit: boolean;
}

export type GamePhase = 'playing' | 'paused' | 'defeat';

export interface GameStats {
  /** Total shots fired since the run started. */
  shotsFired: number;
  /** Shots fired in the last second (rolling window). */
  shotsPerSecond: number;
  hits: number;
  kills: number;
  /** Time spent in the run (seconds, excluding pause). */
  elapsed: number;
  activeProjectiles: number;
  activeEnemies: number;
  activeSoldiers: number;
  poolProjectiles: number;
  poolVfx: number;
  /** Simulation step cost in ms (measured by the host loop). */
  simMs: number;
  fps: number;
  frameMs: number;
  peakFrameMs: number;
}

export interface Modifiers {
  /** Multiplies every soldier's weapon fire rate. */
  fireRate: number;
  /** Multiplies every projectile's damage. */
  damage: number;
}

export interface GameSettings {
  reducedScreenShake: boolean;
  /** Developer-only diagnostic overlay. Never enabled in production builds. */
  debugOverlay: boolean;
}

export interface GameEvent {
  type:
    | 'gate'
    | 'boss-spawn'
    | 'boss-phase'
    | 'boss-slam'
    | 'boss-defeated'
    | 'soldier-lost'
    | 'defeat'
    | 'stage-start'
    | 'stage-clear'
    | 'boss-warning';
  message?: string;
  /** Screen shake request in [0, 1]. */
  shake?: number;
}
