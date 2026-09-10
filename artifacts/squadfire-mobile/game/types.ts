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

export interface WeaponDefinition {
  id: WeaponId;
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
  /** Screen-space aim angle (radians, 0 = straight ahead) — drives sprite rotation. */
  aimAngle: number;
  /** Ground-plane aim direction toward the current target. */
  aimDir: Vec2;
  targetId: number | null;
  targetKind: TargetKind;
  /** Timestamp (seconds) at which this soldier is allowed to fire next. */
  nextShotAt: number;
  /** Normalized fire phase in [0, 1). Used to keep the cadence distributed. */
  firePhase: number;
  /** Per-soldier per-boss aim offset so 20 bullets do not converge on one pixel. */
  bossAimOffset: Vec2;
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

export type TargetKind = 'enemy' | 'boss' | null;

export type EnemyKind = 'grunt' | 'elite';

export interface Enemy {
  id: number;
  alive: boolean;
  kind: EnemyKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  /** Damage already committed by in-flight projectiles (overkill reduction). */
  reserved: number;
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
}

export interface Boss {
  active: boolean;
  alive: boolean;
  pos: Vec2;
  hp: number;
  maxHp: number;
  reserved: number;
  /** Seconds since spawn. */
  age: number;
  hitFlash: number;
  /** Attack telegraph timer: counts down while the boss winds up a slam. */
  telegraph: number;
  /** Seconds until the next attack wind-up. */
  nextAttackIn: number;
  /** Phase 1 or 2 (phase 2 starts at 50% HP). */
  phase: 1 | 2;
  death: number;
  /** Lateral movement target. */
  targetX: number;
}

export interface Projectile {
  active: boolean;
  ownerSoldierId: number;
  weaponId: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Height above the ground at spawn (muzzle) and at the aim point. */
  h0: number;
  h1: number;
  /** Total planned travel distance from muzzle to aim point. */
  planned: number;
  traveled: number;
  damage: number;
  targetId: number | null;
  targetKind: TargetKind;
  spawnTime: number;
  lifetime: number;
}

export interface ShotEvent {
  soldierId: number;
  weaponId: WeaponId;
  targetId: number | null;
  targetKind: TargetKind;
  /** Ground-plane origin (world) */
  origin: Vec2;
  /** Height of the muzzle above the ground (world units). */
  originHeight: number;
  /** Ground-plane direction (normalized). */
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

export type GamePhase = 'playing' | 'paused' | 'victory' | 'defeat';

export interface GameStats {
  /** Total shots fired since the stage started. */
  shotsFired: number;
  /** Shots fired in the last second (rolling window). */
  shotsPerSecond: number;
  hits: number;
  kills: number;
  /** Time spent in the current stage (seconds, excluding pause). */
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
    | 'victory'
    | 'defeat'
    | 'wave';
  message?: string;
  /** Screen shake request in [0, 1]. */
  shake?: number;
}
