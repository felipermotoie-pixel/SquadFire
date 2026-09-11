/**
 * SquadFire simulation. Pure TypeScript, deterministic given a seed, framework
 * agnostic. The host (React/Skia on device, Node in the headless test) calls
 * `game.advance(dtSeconds)` once per frame and reads the public arrays to render.
 *
 * Core combat rules (non-negotiable):
 *   individual soldier → individual muzzle → individual ShotEvent → individual projectile
 *   STRAIGHT FIRE: every projectile leaves its muzzle along ROAD_FORWARD. Nothing in
 *   the simulation looks up, tracks, or steers toward a target. Damage happens only
 *   when a projectile physically crosses a hitbox. The player aims by moving the squad.
 *
 * Squad Power vs visible squad (v0.4.0):
 *   `squadPower` (0..MAX_SQUAD_POWER) is the canonical strength. The soldiers on the
 *   road are a compressed representation of it (game/squad-power.ts): each soldier
 *   carries `representedPower` and its projectiles deal weapon damage × modifiers ×
 *   representedPower. Formation, clamp, cadence, muzzles and pools only ever see the
 *   visible count (≤ SQUAD.maxSize). `syncRosterToPower()` is the single reconciler.
 *
 * Planet / stage progression:
 *   The engine plays one `PlanetConfig` (game/planets.ts). Each stage builds a
 *   deterministic spawn schedule (game/spawn-schedule.ts) and is complete only when
 *   every scheduled regular has spawned and died (and the boss, if any, is dead).
 *   Completing the planet's last stage ends the run in the terminal `victory` phase.
 */
import { BOSS, ENEMIES, FAR_SPAWN, GATES, MAX_SQUAD_POWER, MODIFIER_CAPS, PROJECTILES, ROAD_FORWARD, SIM, SQUAD, VFX, WEAPONS, forwardDepth } from './balance';
import { createCamera, project, type CameraLayout } from './camera';
import { anchorLimitFor, formationLayout, formationSlots } from './formation';
import { isLastStage, planetById, planetStage, type PlanetConfig } from './planets';
import { mulberry32, stageSeedFor } from './rng';
import { GRID_CELL_DEPTH, GRID_MIN_DEPTH, computeSpawnGeometry, spawnGeometryViolations, type SpawnGeometry } from './spawn-geometry';
import { createSpawnSchedule, type SpawnSchedule } from './spawn-schedule';
import { emptyFrame, spriteFrame } from './sprite-geometry';
import { clampSquadPower, representationFor } from './squad-power';
import { STAGES, bossDisplayName, type StageBossConfig, type StageConfig, type StageState } from './stages';
import type {
  Boss,
  DamagePopup,
  Enemy,
  EnemyKind,
  Gate,
  GateEffect,
  GameEvent,
  GamePhase,
  GameSettings,
  GameStats,
  Modifiers,
  Projectile,
  ShotEvent,
  Soldier,
  VfxKind,
  VfxParticle,
} from './types';
import { BOSS_VISUAL, ENEMY_ELITE_VISUAL, ENEMY_GRUNT_VISUAL, PLAYER_SOLDIER_VISUAL } from './visuals';

export type ShotListener = (shot: ShotEvent) => void;

// Collision grid: depth rows × lateral columns. Cells are wider than any hit
// radius + tolerance so a query only ever touches the 3×3 neighbourhood. Row count is
// derived from the spawn geometry (camera) — see setCamera().
const BUCKET_COLS = 6;
const BUCKET_X_MIN = -1.5;
const BUCKET_X_SIZE = 3 / BUCKET_COLS;

/** Seconds of the cyan consolidation pulse after a soldier's representedPower changes. */
const TRANSFORM_PULSE_SEC = 0.45;
/** Cap on consolidation VFX emitted by one reconciliation (pool budget). */
const MAX_CONSOLIDATE_VFX = 4;

/**
 * Projectile pool the camera needs so no live bullet is ever recycled. Discrete
 * shots, not a rate × time approximation: the rearmost muzzle has the longest flight
 * (farVisibleDepth − rear muzzle depth) at the fastest allowed cadence. Sized from the
 * VISIBLE cap (SQUAD.maxSize), never from Squad Power.
 */
export function projectilePoolRequirement(cam: CameraLayout): {
  maxFlightTime: number;
  maxShotsInFlightPerSoldier: number;
  theoreticalMaxActive: number;
  requiredPool: number;
} {
  const weapon = WEAPONS.rifle;
  const rearMuzzleDepth = formationLayout(SQUAD.maxSize).rearY + PLAYER_SOLDIER_VISUAL.muzzleForwardOffset;
  const maxFlightTime = (cam.farVisibleDepth - rearMuzzleDepth) / weapon.projectileSpeed;
  const maxEffectiveFireRate = weapon.fireRate * MODIFIER_CAPS.fireRateMax;
  const maxShotsInFlightPerSoldier = Math.ceil(maxEffectiveFireRate * maxFlightTime) + 1;
  const theoreticalMaxActive = SQUAD.maxSize * maxShotsInFlightPerSoldier;
  const requiredPool = Math.ceil(theoreticalMaxActive * PROJECTILES.poolSafetyFactor);
  return { maxFlightTime, maxShotsInFlightPerSoldier, theoreticalMaxActive, requiredPool };
}

export interface GameOptions {
  seed?: number;
  /** Planet to play. Default: Earth. */
  planetId?: string;
  /** Initial Squad Power (default SQUAD.initialSize = 5). */
  initialSquadPower?: number;
  /** Stage the run starts at. Default 1. Clamped to the planet's length. */
  startStage?: number;
  width?: number;
  height?: number;
  /**
   * TEST ONLY: replaces ENEMIES.maxAlive so the scheduler's defer path can be forced
   * deterministically. Never set by production code; never persisted.
   */
  maxAliveOverride?: number;
}

/** Per-stage record kept for the balance report / dev overlay. */
export interface StageLogEntry {
  stage: number;
  /** Seconds from stage start (INTRO) to completeStage(). */
  clearTime: number;
  peakActiveEnemies: number;
  deferredSpawns: number;
  spawnedRegulars: number;
  squadPowerAtClear: number;
}

/** Boss encounter timestamps (simulation seconds) for the balance harness. */
export interface BossTiming {
  spawnTime: number | null;
  holdReachedTime: number | null;
  deathTime: number | null;
  killedDuringApproach: boolean;
}

export class Game {
  cam: CameraLayout;
  /** Camera-derived spawn/collision envelope. Recomputed with the camera. */
  geometry: SpawnGeometry;
  time = 0;
  phase: GamePhase = 'playing';
  settings: GameSettings = { reducedScreenShake: false, debugOverlay: false };
  mods: Modifiers = { fireRate: 1, damage: 1 };

  soldiers: Soldier[] = [];
  enemies: Enemy[] = [];
  boss: Boss = createBoss();
  projectiles: Projectile[] = [];
  vfx: VfxParticle[] = [];
  popups: DamagePopup[] = [];
  gates: Gate[] = [];
  events: GameEvent[] = [];

  anchorX = 0;
  targetAnchorX = 0;
  /** Accumulated screen shake request (consumed by the renderer). */
  shake = 0;

  /** Canonical squad strength. Mutate only through addSquadPower / loseSquadPower / setSquadPower. */
  squadPower = 0;

  readonly planet: PlanetConfig;
  /** Player-facing progression: the current stage number (1-based) inside the planet. */
  stage = 1;
  stageState: StageState = 'INTRO';
  stageConfig: StageConfig;
  /** Seconds since the current stage started. */
  stageTime = 0;
  /** Deterministic spawn schedule of the current stage. */
  schedule: SpawnSchedule;
  /** Regulars the scheduler has spawned in the current stage (never dev/escort/test spawns). */
  spawnedRegulars = 0;
  /** Run rewards (economy hooks; nothing spends them yet). */
  run = { coins: 0, score: 0, stagesCleared: 0 };
  kills = 0;
  /** Cleared-stage records for this run. */
  stageLog: StageLogEntry[] = [];
  bossTiming: BossTiming = { spawnTime: null, holdReachedTime: null, deathTime: null, killedDuringApproach: false };
  /**
   * False once anything non-campaign touched the run (dev stage jump, power preset,
   * scripted scenario, direct spawns…). The campaign bridge refuses to persist progress
   * from an ineligible run. Latches: never returns to true.
   */
  progressEligible = true;
  stats: GameStats = {
    shotsFired: 0,
    shotsPerSecond: 0,
    hits: 0,
    kills: 0,
    elapsed: 0,
    activeProjectiles: 0,
    peakActiveProjectiles: 0,
    projectilePoolExhausted: 0,
    activeEnemies: 0,
    activeSoldiers: 0,
    squadPower: 0,
    peakVisibleSoldiers: 0,
    spawnedRegulars: 0,
    deferredSpawns: 0,
    peakActiveEnemies: 0,
    overkillDamage: 0,
    damageDealt: 0,
    poolProjectiles: 0,
    poolVfx: VFX.poolSize,
    simMs: 0,
    fps: 0,
    frameMs: 0,
    peakFrameMs: 0,
  };

  private scriptedFlag = false;
  /** When true, enemies/gates/boss are not auto-spawned (test scenarios). Latches progressEligible = false. */
  get scripted(): boolean {
    return this.scriptedFlag;
  }
  set scripted(v: boolean) {
    if (v) this.progressEligible = false;
    this.scriptedFlag = v;
  }

  private rng: () => number;
  private readonly runSeed: number;
  private readonly maxAlive: number;
  private nextSoldierId = 1;
  private nextEnemyId = 1;
  private nextGateId = 1;
  private gateTimer = GATES.firstAt;
  private bossSpawned = false;
  // Stage schedule cursor.
  private scheduleCursor = 0;
  private spawnClock = 0;
  private deferredEventIndex = -1;
  private stateTimer = 0;
  private escortTimer = 0;
  private endTimer = -1;
  private accumulator = 0;
  private shotTimes: number[] = [];
  private shotListeners: ShotListener[] = [];
  private buckets: Enemy[][] = [];
  private bucketRows = 0;
  private frame = emptyFrame();
  private scratchProjected = { x: 0, y: 0, scale: 1 };
  private poolWarned = false;

  constructor(opts: GameOptions = {}) {
    this.runSeed = (opts.seed ?? 1337) >>> 0;
    this.rng = mulberry32(this.runSeed);
    this.maxAlive = opts.maxAliveOverride ?? ENEMIES.maxAlive;
    if (opts.maxAliveOverride !== undefined) this.progressEligible = false;
    this.planet = planetById(opts.planetId);
    this.stageConfig = planetStage(this.planet, 1);
    this.schedule = createSpawnSchedule(this.stageConfig, stageSeedFor(this.runSeed, 1));
    this.cam = createCamera(opts.width ?? 402, opts.height ?? 874);
    this.geometry = this.applyGeometry();
    this.ensureProjectilePool();
    for (let i = 0; i < VFX.poolSize; i++) this.vfx.push(createVfx());
    for (let i = 0; i < VFX.popupPoolSize; i++) this.popups.push(createPopup());
    this.squadPower = clampSquadPower(opts.initialSquadPower ?? SQUAD.initialSize);
    this.syncRosterToPower('preset');
    this.startStage(opts.startStage ?? 1);
    // Snap soldiers to their slots on start.
    for (const s of this.soldiers) {
      s.pos.x = s.slot.x;
      s.pos.y = s.slot.y;
      s.age = 10;
      s.transformPulse = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Host API
  // ---------------------------------------------------------------------------

  setCamera(width: number, height: number): void {
    this.cam = createCamera(width, height);
    this.geometry = this.applyGeometry();
    this.ensureProjectilePool();
  }

  /** Derives the spawn envelope from the camera and (re)allocates the collision grid. */
  private applyGeometry(): SpawnGeometry {
    const g = computeSpawnGeometry(this.cam);
    const violations = spawnGeometryViolations(g);
    if (violations.length > 0) throw new Error(`spawn geometry invalid: ${violations.join('; ')}`);
    if (g.gridRows !== this.bucketRows) {
      this.bucketRows = g.gridRows;
      this.buckets = [];
      for (let i = 0; i < this.bucketRows * BUCKET_COLS; i++) this.buckets.push([]);
    }
    return g;
  }

  /**
   * Grows the projectile pool to what the current camera requires (never shrinks, so
   * bullets in flight are untouched). PROJECTILES.poolSize is only the floor.
   */
  private ensureProjectilePool(): void {
    const need = Math.max(PROJECTILES.poolSize, projectilePoolRequirement(this.cam).requiredPool);
    while (this.projectiles.length < need) this.projectiles.push(createProjectile());
    this.stats.poolProjectiles = this.projectiles.length;
  }

  onShot(listener: ShotListener): () => void {
    this.shotListeners.push(listener);
    return () => {
      this.shotListeners = this.shotListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Player input: desired lateral position of the squad anchor. This is the ONLY
   * aiming control in the game — soldiers fire straight ahead from wherever they
   * stand, so moving the squad moves the fire lanes.
   */
  setInputX(worldX: number): void {
    const limit = anchorLimitFor(this.visibleSquadCount);
    this.targetAnchorX = clamp(worldX, -limit, limit);
  }

  /** Current lateral clamp for the anchor (shrinks as the formation gets wider). */
  get anchorLimit(): number {
    return anchorLimitFor(this.visibleSquadCount);
  }

  pause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
  }

  resume(): void {
    if (this.phase === 'paused') this.phase = 'playing';
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  /** True once the run has ended (defeat or planet victory). */
  get isTerminal(): boolean {
    return this.phase === 'defeat' || this.phase === 'victory';
  }

  drainEvents(): GameEvent[] {
    if (this.events.length === 0) return this.events;
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Advance the simulation by a variable frame delta using fixed sub-steps. */
  advance(dt: number): void {
    if (this.phase === 'paused') return;
    this.accumulator += Math.min(dt, 0.25);
    let steps = 0;
    while (this.accumulator >= SIM.fixedStep && steps < SIM.maxStepsPerFrame) {
      this.step(SIM.fixedStep);
      this.accumulator -= SIM.fixedStep;
      steps++;
    }
    if (steps === SIM.maxStepsPerFrame) this.accumulator = 0;
    this.refreshStats();
  }

  // ---------------------------------------------------------------------------
  // Squad Power and its visible representation
  // ---------------------------------------------------------------------------

  /** Number of VISIBLE soldiers currently acting as firing sources (never the power). */
  get visibleSquadCount(): number {
    let n = 0;
    for (const s of this.soldiers) if (s.alive && s.death === 0) n++;
    return n;
  }

  /**
   * Adds Squad Power (gates, tests). Clamped to MAX_SQUAD_POWER; returns the amount
   * actually applied. The visible squad is reconciled immediately.
   */
  addSquadPower(amount: number, celebrate = true): number {
    const before = this.squadPower;
    const after = clampSquadPower(before + Math.max(0, Math.floor(amount)));
    const applied = after - before;
    if (applied <= 0) return 0;
    this.squadPower = after;
    this.syncRosterToPower('gain');
    if (celebrate) this.spawnVfx('squad-grow', this.anchorX, -0.2, 0.3, 0, 1 + Math.min(1, this.visibleSquadCount / 20));
    return applied;
  }

  /**
   * Removes Squad Power (enemy contact / boss slam). The rearmost visible soldier is
   * demoted or removed by the reconciler; defeat when power reaches 0.
   */
  loseSquadPower(amount: number, reason: 'contact' | 'slam'): void {
    if (this.squadPower <= 0) return;
    const after = clampSquadPower(this.squadPower - Math.max(1, Math.floor(amount)));
    if (after === this.squadPower) return;
    this.squadPower = after;
    const rear = this.rearmostSoldier();
    if (rear) this.spawnVfx('soldier-lost', rear.pos.x, rear.pos.y, 0.25, 0, 1);
    this.pushEvent({ type: 'soldier-lost', shake: reason === 'slam' ? 0.7 : 0.35 });
    this.syncRosterToPower('loss');
    if (this.squadPower === 0 && this.phase === 'playing') {
      this.phase = 'defeat';
      this.endTimer = 0;
      this.pushEvent({ type: 'defeat', message: 'SQUAD LOST' });
    }
  }

  /** Debug/test preset: sets Squad Power exactly. Latches progressEligible = false. */
  setSquadPower(power: number): void {
    this.progressEligible = false;
    this.squadPower = clampSquadPower(power);
    this.syncRosterToPower('preset');
  }

  /** Dev panel entry point for +power cheats (latches progressEligible = false). */
  devAddSquadPower(amount: number): number {
    this.progressEligible = false;
    return this.addSquadPower(amount);
  }

  /** Dev panel entry point for effect cheats (latches progressEligible = false). */
  devApplyEffect(effect: GateEffect): void {
    this.progressEligible = false;
    this.applyEffect(effect);
  }

  private rearmostSoldier(): Soldier | null {
    for (let i = this.soldiers.length - 1; i >= 0; i--) {
      const s = this.soldiers[i];
      if (s.alive && s.death === 0) return s;
    }
    return null;
  }

  /**
   * THE roster reconciler. Makes the visible soldiers match `representationFor(power)`
   * while reusing existing entities (timers, fire phase, position are preserved):
   *   - too many soldiers → the rearmost are removed ('loss' plays the death
   *     animation; 'gain'/'preset' consolidate instantly with a cyan pulse);
   *   - too few → new soldiers join behind the block with evenly filled fire phases;
   *   - representedPower is then assigned by index (full units first, partial last).
   * Slots are reassigned and the anchor clamped in the same frame whenever the visible
   * count changes. Called only when power changes — never per frame.
   */
  /**
   * Roster bookkeeping companion of syncRosterToPower: drops soldiers whose death
   * animation has finished. Casualties are already excluded from the represented
   * roster the moment they are marked, so this never changes visible power.
   */
  private pruneRetiredSoldiers(): void {
    this.soldiers = this.soldiers.filter((s) => s.alive);
    this.reassignSlots();
  }

  private syncRosterToPower(mode: 'gain' | 'loss' | 'preset'): void {
    const target = representationFor(this.squadPower);
    let alive = this.soldiers.filter((s) => s.alive && s.death === 0);
    let countChanged = false;
    let vfxBudget = MAX_CONSOLIDATE_VFX;

    if (alive.length > target.length) {
      countChanged = true;
      const remove = alive.slice(target.length);
      if (mode === 'loss') {
        // Only the last removal reads as a casualty; any others merge into the survivors.
        for (let i = 0; i < remove.length; i++) {
          const s = remove[i];
          s.death = 0.0001;
        }
      } else {
        const gone = new Set(remove);
        for (const s of remove) {
          if (vfxBudget > 0) {
            this.spawnVfx('squad-consolidate', s.pos.x, s.pos.y, 0.35, 0, 0.8);
            vfxBudget--;
          }
        }
        this.soldiers = this.soldiers.filter((s) => !gone.has(s));
      }
      alive = alive.slice(0, target.length);
    } else if (alive.length < target.length) {
      countChanged = true;
      const weapon = WEAPONS.rifle;
      const period = 1 / (weapon.fireRate * this.mods.fireRate);
      const current = alive.length;
      const add = target.length - current;
      for (let i = 0; i < add; i++) {
        const index = current + i;
        const firePhase = (index * 0.6180339887) % 1; // golden-ratio spacing stays well distributed at any N
        const soldier: Soldier = {
          id: this.nextSoldierId++,
          alive: true,
          pos: { x: this.anchorX + (this.rng() - 0.5) * 0.3, y: -0.9 - this.rng() * 0.3 },
          slot: { x: 0, y: 0 },
          nextShotAt: this.time + firePhase * period,
          firePhase,
          weaponId: 'rifle',
          animPhase: this.rng() * Math.PI * 2,
          recoil: 0,
          age: 0,
          representedPower: target[index],
          transformPulse: 0,
          death: 0,
          shotsFired: 0,
        };
        this.soldiers.push(soldier);
        alive.push(soldier);
      }
    }

    for (let i = 0; i < alive.length; i++) {
      const s = alive[i];
      if (s.representedPower !== target[i]) {
        s.representedPower = target[i];
        s.transformPulse = TRANSFORM_PULSE_SEC;
        if (vfxBudget > 0 && s.age > 0) {
          this.spawnVfx('squad-consolidate', s.pos.x, s.pos.y, 0.35, 0, 1);
          vfxBudget--;
        }
      }
    }

    if (countChanged) this.reassignSlots();
    const visible = alive.length;
    if (visible > this.stats.peakVisibleSoldiers) this.stats.peakVisibleSoldiers = visible;
    if (visible > SQUAD.maxSize) throw new Error(`visible squad ${visible} exceeds SQUAD.maxSize`);
  }

  private reassignSlots(): void {
    const alive = this.soldiers.filter((s) => s.alive && s.death === 0);
    const slots = formationSlots(alive.length);
    alive.forEach((s, i) => {
      s.slot.x = slots[i].x;
      s.slot.y = slots[i].y;
    });
    // A wider block has less room to move; keep the whole formation on the road.
    // Both the smoothed anchor and its target are clamped, so a squad that grows while
    // parked at the edge snaps inside the new limit this frame instead of drifting in.
    const limit = anchorLimitFor(alive.length);
    this.targetAnchorX = clamp(this.targetAnchorX, -limit, limit);
    this.anchorX = clamp(this.anchorX, -limit, limit);
  }

  // ---------------------------------------------------------------------------
  // Upgrades
  // ---------------------------------------------------------------------------

  applyEffect(effect: GateEffect): void {
    switch (effect.kind) {
      case 'squad':
        this.addSquadPower(effect.amount);
        break;
      case 'damage':
        this.mods.damage = Math.min(MODIFIER_CAPS.damageMax, this.mods.damage * effect.multiplier);
        break;
      case 'fireRate':
        // Modifies each soldier's weapon cadence — never a global bullet generator.
        this.mods.fireRate = Math.min(MODIFIER_CAPS.fireRateMax, this.mods.fireRate * effect.multiplier);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Scenario helpers (developer mode / headless tests)
  // ---------------------------------------------------------------------------

  /** Direct group spawn (dev stress / tests). Never counts toward the stage's regulars. */
  spawnEnemyGroup(count: number, centerX = (this.rng() - 0.5) * 1.1, y = this.geometry.enemySpawnDepth, eliteChance = 0): number {
    this.progressEligible = false;
    return this.spawnGroupAt(count, centerX, y, eliteChance);
  }

  private spawnGroupAt(count: number, centerX: number, y: number, eliteChance: number): number {
    let spawned = 0;
    const cols = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(count * 1.4))));
    const lateral = ENEMIES.groupLateralSpread;
    const live = this.activeEnemyCount;
    for (let i = 0; i < count; i++) {
      if (live + spawned >= this.maxAlive) break;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = Math.min(cols, count - row * cols);
      const x = centerX + (col - (rowCount - 1) / 2) * lateral + (this.rng() - 0.5) * 0.09;
      const yy = y + row * 0.28 + this.rng() * 0.12;
      const kind: EnemyKind = this.rng() < eliteChance ? 'elite' : 'grunt';
      this.createEnemy(kind, clamp(x, -0.92, 0.92), yy);
      spawned++;
    }
    return spawned;
  }

  /** Direct single spawn (tests / dev). Never counts toward the stage's regulars. */
  spawnEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    this.progressEligible = false;
    return this.createEnemy(kind, x, y);
  }

  /**
   * Creates a regular enemy. HP comes from StageConfig.enemyHP only — archetypes carry
   * no hit points. Depth is clamped to the geometry's maximum regular spawn depth so
   * combatDepth always covers it.
   */
  private createEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    const def = ENEMIES[kind];
    const hp = Math.max(1, Math.round(this.stageConfig.enemyHP));
    y = Math.min(y, this.geometry.maxRegularSpawnDepth);
    const enemy: Enemy = {
      id: this.nextEnemyId++,
      alive: true,
      kind,
      pos: { x, y },
      prevX: x,
      prevY: y,
      hp,
      maxHp: hp,
      speed: def.speed * this.stageConfig.enemySpeedMultiplier * (0.9 + this.rng() * 0.2),
      sizeVariation: 0.92 + this.rng() * 0.16,
      animPhase: this.rng() * Math.PI * 2,
      wanderPhase: this.rng() * Math.PI * 2,
      hitFlash: 0,
      death: 0,
      lastHitDir: 0,
      age: 0,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  /** Dev/test boss entry (latches progressEligible = false). The director uses enterBoss(). */
  spawnBoss(): void {
    this.progressEligible = false;
    this.enterBoss();
  }

  private bossConfigForEncounter(): StageBossConfig {
    if (this.stageConfig.boss) return this.stageConfig.boss;
    // Non-boss stage (dev/test boss entry): use the planet's first authored boss.
    for (const s of this.planet.stages) if (s.boss) return s.boss;
    throw new Error(`${this.planet.id}: no boss config`);
  }

  private enterBoss(): void {
    if (this.boss.active) return;
    const cfg = this.bossConfigForEncounter();
    const spawnY = this.geometry.bossSpawnDepth;
    const approachSec = cfg.approachDurationTargetSec > 0 ? cfg.approachDurationTargetSec : BOSS.defaultApproachDurationSec;
    this.boss = createBoss();
    this.boss.active = true;
    this.boss.alive = true;
    this.boss.type = cfg.type;
    this.boss.pos.x = 0;
    this.boss.pos.y = spawnY;
    this.boss.prevX = 0;
    this.boss.prevY = spawnY;
    this.boss.hp = cfg.hp;
    this.boss.maxHp = cfg.hp;
    this.boss.approachSpeed = Math.max(0.05, (spawnY - BOSS.holdY) / approachSec);
    this.boss.attackIntervalScale = cfg.attackIntervalMultiplier;
    this.boss.nextAttackIn = BOSS.attackInterval * cfg.attackIntervalMultiplier;
    this.bossSpawned = true;
    this.escortTimer = cfg.escortInterval;
    this.bossTiming = { spawnTime: this.time, holdReachedTime: null, deathTime: null, killedDuringApproach: false };
    this.pushEvent({ type: 'boss-spawn', message: bossDisplayName(cfg), shake: 0.5 });
  }

  // ---------------------------------------------------------------------------
  // Stage progression
  // ---------------------------------------------------------------------------

  /** Regulars still on the road. Death animations count as gone. */
  get activeEnemyCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive && e.death === 0) n++;
    return n;
  }

  get isBossStage(): boolean {
    return this.stageConfig.boss !== undefined;
  }

  get isLastStage(): boolean {
    return isLastStage(this.planet, this.stage);
  }

  /** Scheduled regulars of this stage that have not entered yet. */
  get remainingScheduledSpawns(): number {
    return this.schedule.events.length - this.scheduleCursor;
  }

  /** Every scheduled regular has entered the road. */
  get scheduleConsumed(): boolean {
    return this.scheduleCursor >= this.schedule.events.length;
  }

  /** Legacy alias kept for the renderer's debug overlay. */
  get spawnSequenceFinished(): boolean {
    return this.scheduleConsumed;
  }

  /** Developer-facing snapshot of the schedule cursor. */
  get stageCursor(): { cursor: number; total: number; groups: number; nextAt: number | null } {
    const next = this.schedule.events[this.scheduleCursor];
    return { cursor: this.scheduleCursor, total: this.schedule.events.length, groups: this.schedule.groupCount, nextAt: next ? next.time : null };
  }

  /** Seconds since the stage became ACTIVE (schedule clock). */
  get stageActiveTime(): number {
    return this.spawnClock;
  }

  /**
   * Begins a stage: banner, fresh deterministic schedule, boss reset. Squad Power and
   * run upgrades are preserved (STAGES.transition). Internal progression only — the
   * dev panel goes through devJumpToStage().
   */
  startStage(stage: number): void {
    const n = Math.min(this.planet.stages.length, Math.max(1, Math.floor(stage)));
    this.stage = n;
    this.stageConfig = planetStage(this.planet, n);
    this.schedule = createSpawnSchedule(this.stageConfig, stageSeedFor(this.runSeed, n));
    this.stageState = 'INTRO';
    this.stageTime = 0;
    this.stateTimer = STAGES.introDuration;
    this.scheduleCursor = 0;
    this.spawnClock = 0;
    this.deferredEventIndex = -1;
    this.spawnedRegulars = 0;
    this.stats.spawnedRegulars = 0;
    this.stats.deferredSpawns = 0;
    this.stats.peakActiveEnemies = 0;
    this.bossSpawned = false;
    this.escortTimer = 0;
    this.bossTiming = { spawnTime: null, holdReachedTime: null, deathTime: null, killedDuringApproach: false };
    if (this.boss.active) this.boss = createBoss();
    this.pushEvent({ type: 'stage-start', message: `STAGE ${this.stage}` });
  }

  /** Dev panel stage jump: clears the road and latches progressEligible = false. */
  devJumpToStage(stage: number): void {
    this.progressEligible = false;
    this.enemies = [];
    this.gates = [];
    if (this.phase === 'defeat' || this.phase === 'victory') this.phase = 'playing';
    this.startStage(stage);
  }

  /** Dev helper: removes every enemy on the road as if killed (no rewards). */
  debugClearEnemies(): void {
    this.progressEligible = false;
    for (const e of this.enemies) {
      if (e.alive && e.death === 0) {
        e.hp = 0;
        e.death = 0.0001;
        this.kills++;
        this.stats.kills = this.kills;
      }
    }
  }

  /**
   * Walks the stage schedule. Events whose time has come are spawned in order; when
   * the live cap (maxAlive) is reached the cursor does NOT advance — the event waits
   * (counted once in deferredSpawns) and fires as soon as room frees up. Nothing is
   * ever dropped, so `spawnedRegulars` reaches exactly `enemyCount`.
   */
  private advanceSpawnTimeline(dt: number): void {
    this.spawnClock += dt;
    const events = this.schedule.events;
    while (this.scheduleCursor < events.length) {
      const ev = events[this.scheduleCursor];
      if (ev.time > this.spawnClock) break;
      if (this.activeEnemyCount >= this.maxAlive) {
        if (this.deferredEventIndex !== this.scheduleCursor) {
          this.deferredEventIndex = this.scheduleCursor;
          this.stats.deferredSpawns++;
        }
        break;
      }
      const spread = ENEMIES.groupLateralSpread;
      const slot = ev.indexInGroup - (ev.groupSize - 1) / 2;
      const x = clamp(ev.lane + slot * spread * 0.55 + (this.rng() - 0.5) * 0.12, -0.92, 0.92);
      this.createEnemy(ev.kind, x, this.geometry.enemySpawnDepth + this.rng() * FAR_SPAWN.depthJitter);
      this.scheduleCursor++;
      this.spawnedRegulars++;
      this.stats.spawnedRegulars = this.spawnedRegulars;
    }
  }

  /** All regulars of the stage have spawned (exact count) and none is left on the road. */
  private regularsCleared(): boolean {
    return this.scheduleConsumed && this.spawnedRegulars === this.stageConfig.enemyCount && this.activeEnemyCount === 0;
  }

  private completeStage(): void {
    // Flat stage-clear reward. (StageConfig has no reward multiplier: economy is out of scope.)
    this.run.coins += STAGES.rewards.stageClearCoins;
    this.run.stagesCleared++;
    this.stageLog.push({
      stage: this.stage,
      clearTime: this.stageTime,
      peakActiveEnemies: this.stats.peakActiveEnemies,
      deferredSpawns: this.stats.deferredSpawns,
      spawnedRegulars: this.spawnedRegulars,
      squadPowerAtClear: this.squadPower,
    });
    this.stageState = 'CLEARING';
    this.stateTimer = STAGES.clearDuration;
    this.pushEvent({ type: 'stage-clear', message: 'STAGE CLEAR' });
  }

  /** Terminal victory: the planet's last stage is complete. No next stage, no gates, no spawns. */
  private finishPlanet(): void {
    this.phase = 'victory';
    this.endTimer = 0;
    this.gates = [];
    this.pushEvent({ type: 'planet-complete', message: `${this.planet.displayName} COMPLETE` });
  }

  spawnGatePair(left: GateEffect, right: GateEffect, y = GATES.spawnY): void {
    this.gates.push({ id: this.nextGateId++, active: true, y, side: 'left', effect: left, triggeredAt: null, consumed: false });
    this.gates.push({ id: this.nextGateId++, active: true, y, side: 'right', effect: right, triggeredAt: null, consumed: false });
  }

  /**
   * Picks one of the three fixed gate pairs and makes it valid for the current power:
   * a +SQUAD amount is clamped to the room left below MAX_SQUAD_POWER (label and
   * applied value are the same object), and at the cap the squad side is replaced by
   * the complementary modifier so the pair never shows +0 or a dead gate.
   */
  private nextGatePair(): [GateEffect, GateEffect] {
    const pairs: [GateEffect, GateEffect][] = [
      [{ kind: 'squad', amount: 3 }, { kind: 'fireRate', multiplier: 1.25 }],
      [{ kind: 'damage', multiplier: 1.5 }, { kind: 'squad', amount: 4 }],
      [{ kind: 'squad', amount: 5 }, { kind: 'damage', multiplier: 2 }],
    ];
    const pair = pairs[Math.floor(this.rng() * pairs.length)];
    const room = MAX_SQUAD_POWER - this.squadPower;
    const fix = (e: GateEffect, other: GateEffect): GateEffect => {
      if (e.kind !== 'squad') return e;
      if (room >= e.amount) return e;
      if (room > 0) return { kind: 'squad', amount: room };
      return other.kind === 'damage' ? { kind: 'fireRate', multiplier: 1.25 } : { kind: 'damage', multiplier: 1.5 };
    };
    return [fix(pair[0], pair[1]), fix(pair[1], pair[0])];
  }

  // ---------------------------------------------------------------------------
  // Simulation step
  // ---------------------------------------------------------------------------

  private step(dt: number): void {
    this.time += dt;
    if (this.phase === 'playing') this.stats.elapsed += dt;

    this.anchorX += (this.targetAnchorX - this.anchorX) * Math.min(1, SQUAD.anchorFollow * dt);

    if (this.phase === 'playing' && !this.scriptedFlag) this.updateDirector(dt);

    // Targets move first so that, when projectiles are swept, enemy/boss
    // prev→pos and projectile prev→pos describe the same substep interval.
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.rebuildBuckets();
    this.updateSoldiers(dt);
    this.updateProjectiles(dt);
    this.updateGates(dt);
    this.updateVfx(dt);

    if (this.phase === 'defeat' || this.phase === 'victory') {
      this.endTimer += dt;
    }
  }

  private updateDirector(dt: number): void {
    this.stageTime += dt;
    const cfg = this.stageConfig;
    const bossLive = this.boss.active && this.boss.alive;

    switch (this.stageState) {
      case 'INTRO':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.stageState = 'ACTIVE';
        break;
      case 'ACTIVE':
        this.advanceSpawnTimeline(dt);
        if (this.regularsCleared()) {
          if (cfg.boss && !this.bossSpawned) {
            this.stageState = 'BOSS_WARNING';
            this.stateTimer = STAGES.bossWarningDuration;
            this.pushEvent({ type: 'boss-warning', message: 'BOSS INCOMING', shake: 0.2 });
          } else {
            this.completeStage();
          }
        }
        break;
      case 'BOSS_WARNING':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.enterBoss();
          this.stageState = 'BOSS_ACTIVE';
        }
        break;
      case 'BOSS_ACTIVE':
        if (bossLive && cfg.boss && cfg.boss.escortInterval > 0 && cfg.boss.escortSize > 0) {
          this.escortTimer -= dt;
          if (this.escortTimer <= 0) {
            this.escortTimer = cfg.boss.escortInterval;
            this.spawnGroupAt(cfg.boss.escortSize, (this.rng() - 0.5) * 1.1, this.geometry.enemySpawnDepth, 0);
          }
        }
        // Boss dead (death animation finished) and every escort cleared → stage done.
        if (this.bossSpawned && !this.boss.alive && this.boss.death >= 1 && this.activeEnemyCount === 0) {
          this.completeStage();
        }
        break;
      case 'CLEARING':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.stageState = 'COMPLETE';
          this.stateTimer = STAGES.transitionDuration;
        }
        break;
      case 'COMPLETE':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.isLastStage) this.finishPlanet();
          else this.startStage(this.stage + 1);
        }
        break;
    }
    if (this.phase !== 'playing') return;

    // Gates: fixed cadence across stage states, suppressed only while a boss lives.
    this.gateTimer -= dt;
    if (this.gateTimer <= 0 && !(this.boss.active && this.boss.alive)) {
      this.gateTimer = GATES.interval;
      const pair = this.nextGatePair();
      this.spawnGatePair(pair[0], pair[1]);
    }
  }


  private rebuildBuckets(): void {
    for (const b of this.buckets) b.length = 0;
    for (const e of this.enemies) {
      if (!e.alive || e.death > 0) continue;
      const row = bucketRow(e.pos.y, this.bucketRows);
      if (row >= 0) this.buckets[row * BUCKET_COLS + bucketCol(e.pos.x)].push(e);
    }
  }

  private updateSoldiers(dt: number): void {
    const weapon = WEAPONS.rifle;
    const period = 1 / (weapon.fireRate * this.mods.fireRate);
    const canFire = this.phase === 'playing';
    let removed = false;

    for (let i = 0; i < this.soldiers.length; i++) {
      const s = this.soldiers[i];
      if (!s.alive) continue;
      s.age += dt;
      if (s.death > 0) {
        s.death += dt / 0.55;
        if (s.death >= 1) {
          s.alive = false;
          removed = true;
        }
        continue;
      }

      // Converge toward the formation slot (slot x is relative to the anchor).
      const tx = this.anchorX + s.slot.x;
      const ty = s.slot.y;
      const k = Math.min(1, SQUAD.slotFollow * dt);
      s.pos.x += (tx - s.pos.x) * k;
      s.pos.y += (ty - s.pos.y) * k;

      s.recoil = Math.max(0, s.recoil - dt / 0.11);
      if (s.transformPulse > 0) s.transformPulse = Math.max(0, s.transformPulse - dt);

      // Continuous straight fire on the soldier's own timer. No target lookup, no
      // idle state: the timer never waits for an enemy and never re-phases.
      if (canFire && this.time >= s.nextShotAt) {
        this.fireShot(s);
        // Next shot exactly one period later. Catch up at most half a period if the
        // frame was long, so cadence stays stable without bursts.
        s.nextShotAt = Math.max(s.nextShotAt + period, this.time + period * 0.5);
      }
    }

    if (removed) this.pruneRetiredSoldiers();
  }

  /**
   * World-space muzzle of a soldier: lateral position and height are read back from
   * the drawn sprite frame, so projectiles always leave the drawn barrel tip.
   * Shared by the simulation (spawn) and the debug overlay (muzzle markers).
   */
  muzzleOf(s: Soldier, out: { x: number; y: number; h: number }): { x: number; y: number; h: number } {
    const frame = spriteFrame(this.cam, PLAYER_SOLDIER_VISUAL, s.pos.x, s.pos.y, PLAYER_SOLDIER_VISUAL.baseVisualRotationOffset, 1, this.frame);
    out.x = (frame.muzzleX - this.cam.centerX) / (this.cam.halfWidthBase * frame.scale);
    out.y = s.pos.y + PLAYER_SOLDIER_VISUAL.muzzleForwardOffset;
    out.h = Math.max(0.05, (frame.footY - frame.muzzleY) / frame.unit);
    return out;
  }

  private scratchMuzzle = { x: 0, y: 0, h: 0 };

  /**
   * ONE ShotEvent drives everything: projectile spawn, muzzle flash, recoil pose,
   * audio hook, statistics. Origin is the soldier's own weapon muzzle; direction is
   * ROAD_FORWARD (plus the weapon's configured spread, 0 for the rifle). The
   * projectile is fully independent once spawned.
   */
  private fireShot(s: Soldier): void {
    const weapon = WEAPONS[s.weaponId];
    const m = this.muzzleOf(s, this.scratchMuzzle);
    const originX = m.x;
    const originY = m.y;
    const originH = m.h;

    let dirX = ROAD_FORWARD.x;
    let dirY = ROAD_FORWARD.y;
    if (weapon.spread > 0) {
      dirX += (this.rng() * 2 - 1) * weapon.spread;
      const len = Math.hypot(dirX, dirY);
      dirX /= len;
      dirY /= len;
    }

    const p = this.acquireProjectile();
    if (!p) return;
    p.active = true;
    p.ownerSoldierId = s.id;
    p.weaponId = s.weaponId;
    p.x = originX;
    p.y = originY;
    p.prevX = originX;
    p.prevY = originY;
    p.originX = originX;
    p.originY = originY;
    p.vx = dirX * weapon.projectileSpeed;
    p.vy = dirY * weapon.projectileSpeed;
    p.h = originH;
    p.traveled = 0;
    // Travel budget to the camera's far visible depth from THIS muzzle, so front and
    // rear rows terminate at the same distant boundary. Lifetime is only a backstop.
    p.maxTravel = Math.max(0.5, this.cam.farVisibleDepth - forwardDepth(m));
    // Damage scales with the power this soldier represents; cadence never does, so
    // ten P1 soldiers and one P10 soldier have identical theoretical DPS.
    p.damage = weapon.damage * this.mods.damage * s.representedPower;
    p.spawnTime = this.time;
    p.lifetime = (p.maxTravel / weapon.projectileSpeed) * PROJECTILES.lifetimeMargin;

    s.recoil = weapon.recoil;
    s.shotsFired++;
    this.stats.shotsFired++;
    this.shotTimes.push(this.time);

    // Muzzle flash sits exactly at the muzzle, oriented along the projected forward
    // direction (which leans toward the vanishing point for off-center soldiers).
    const p0 = project(this.cam, originX, originY, this.scratchProjected);
    const p0x = p0.x;
    const p0y = p0.y;
    const p1 = project(this.cam, originX + dirX * 0.6, originY + dirY * 0.6, this.scratchProjected);
    const screenAngle = Math.atan2(p1.x - p0x, p0y - p1.y);
    this.spawnVfx('muzzle', originX, originY, originH, screenAngle, 1);

    if (this.shotListeners.length > 0) {
      const shot: ShotEvent = {
        soldierId: s.id,
        weaponId: s.weaponId,
        origin: { x: originX, y: originY },
        originHeight: originH,
        direction: { x: dirX, y: dirY },
        timestamp: this.time,
      };
      for (const l of this.shotListeners) l(shot);
    }
  }

  private acquireProjectile(): Projectile | null {
    const pool = this.projectiles;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) return pool[i];
    }
    // Never recycle a live bullet. The pool is sized for the camera's maximum flight
    // time at the capped cadence (ensureProjectilePool), so this is a real bug signal.
    this.stats.projectilePoolExhausted++;
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !this.poolWarned) {
      this.poolWarned = true;
      console.warn(`[squadfire] projectile pool exhausted (${pool.length}); shot dropped`);
    }
    return null;
  }

  private updateProjectiles(dt: number): void {
    const pool = this.projectiles;
    const boss = this.boss;
    const bossTargetable = boss.active && boss.alive && boss.death === 0;
    let active = 0;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const stepLen = Math.hypot(p.vx, p.vy) * dt;
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.traveled += stepLen;

      // Beyond the geometry's combat depth nothing can be hit: pure flight, no lookups.
      if (p.prevY <= this.geometry.combatDepth) {
        // Collision: swept segment (prev → current) against each candidate's own
        // motion over its last step, evaluated in the candidate's frame. A bullet can
        // therefore neither tunnel through a thin depth tolerance nor miss an enemy
        // that crossed its lane between two steps. Candidates come from the 3×3
        // neighbourhood of the 2D grid (cell 0.5 ≫ step 0.09 + hitbox).
        const rows = this.bucketRows;
        const row = bucketRow(p.y, rows);
        let hit: Enemy | null = null;
        if (row >= 0) {
          const col = bucketCol(p.x);
          const r0 = row > 0 ? row - 1 : 0;
          const r1 = row < rows - 1 ? row + 1 : rows - 1;
          const c0 = col > 0 ? col - 1 : 0;
          const c1 = col < BUCKET_COLS - 1 ? col + 1 : BUCKET_COLS - 1;
          outer: for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              const bucket = this.buckets[r * BUCKET_COLS + c];
              for (let k = 0; k < bucket.length; k++) {
                const e = bucket[k];
                if (e.death > 0 || !e.alive) continue;
                const def = ENEMIES[e.kind];
                if (
                  sweptHit(
                    p.prevX - e.prevX,
                    p.prevY - e.prevY,
                    p.x - e.pos.x,
                    p.y - e.pos.y,
                    def.hitRadius * e.sizeVariation,
                    def.depthTolerance,
                  )
                ) {
                  hit = e;
                  break outer;
                }
              }
            }
          }
        }
        if (hit) {
          this.damageEnemy(hit, p);
          p.active = false;
          continue;
        }

        // The boss is never aimed at; it is hit only when its hitbox crosses a lane.
        if (
          bossTargetable &&
          sweptHit(p.prevX - boss.prevX, p.prevY - boss.prevY, p.x - boss.pos.x, p.y - boss.pos.y, BOSS.hitRadius, BOSS.depthTolerance)
        ) {
          this.damageBoss(p);
          p.active = false;
          continue;
        }
      }

      // Missed bullets fly their full travel budget (to the camera's far visible
      // depth) or leave the road sideways. The lifetime is a backstop only.
      const expired =
        p.traveled > p.maxTravel ||
        this.time - p.spawnTime > p.lifetime ||
        p.x < -PROJECTILES.sideExit ||
        p.x > PROJECTILES.sideExit;
      if (expired) p.active = false;
      else active++;
    }
    if (active > this.stats.peakActiveProjectiles) this.stats.peakActiveProjectiles = active;
  }

  private damageEnemy(e: Enemy, p: Projectile): void {
    const applied = Math.min(e.hp, p.damage);
    this.stats.damageDealt += applied;
    this.stats.overkillDamage += p.damage - applied;
    e.hp -= p.damage;
    e.hitFlash = 0.08;
    e.lastHitDir = p.vx >= 0 ? 1 : -1;
    this.stats.hits++;
    const h = p.h;
    this.spawnVfx('impact', p.x, e.pos.y - 0.05, h, Math.atan2(p.vx, p.vy), e.kind === 'elite' ? 1.2 : 1);
    if (e.hp <= 0) {
      e.death = 0.0001;
      this.kills++;
      this.stats.kills = this.kills;
      this.run.score += e.kind === 'elite' ? STAGES.rewards.eliteKillScore : STAGES.rewards.killScore;
      this.spawnVfx(e.kind === 'elite' ? 'death-elite' : 'death', e.pos.x, e.pos.y, 0.15, 0, e.sizeVariation);
      if (e.kind === 'elite') this.spawnPopup(e.pos.x, e.pos.y, 0.5, Math.round(p.damage), true);
    }
  }

  private damageBoss(p: Projectile): void {
    const b = this.boss;
    // Several projectiles can reach the body in the frame it dies; only the first kill counts.
    if (!b.alive) return;
    const applied = Math.min(b.hp, p.damage);
    this.stats.damageDealt += applied;
    this.stats.overkillDamage += p.damage - applied;
    b.hp -= p.damage;
    b.hitFlash = 0.06;
    this.stats.hits++;
    const h = p.h;
    this.spawnVfx('impact-boss', p.x, b.pos.y - 0.1, h, Math.atan2(p.vx, p.vy), 1);
    if (this.stats.hits % 6 === 0) this.spawnPopup(p.x, b.pos.y, h + 0.2, Math.round(p.damage * 6), false);
    if (b.phase === 1 && b.hp <= b.maxHp * 0.5) {
      b.phase = 2;
      this.spawnVfx('boss-phase', b.pos.x, b.pos.y, 0.9, 0, 1);
      this.pushEvent({ type: 'boss-phase', message: 'WARDEN ENRAGED', shake: 0.6 });
    }
    if (b.hp <= 0) {
      b.hp = 0;
      b.alive = false;
      b.death = 0.0001;
      this.bossTiming.deathTime = this.time;
      this.bossTiming.killedDuringApproach = this.bossTiming.holdReachedTime === null;
      this.spawnVfx('death-boss', b.pos.x, b.pos.y, 0.8, 0, 1);
      this.pushEvent({ type: 'boss-defeated', message: 'WARDEN DOWN', shake: 1 });
    }
  }

  private updateEnemies(dt: number): void {
    let removed = false;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.death > 0) {
        e.death += dt / VFX.deathLifetime;
        if (e.death >= 1) {
          e.alive = false;
          removed = true;
        }
        continue;
      }
      e.prevX = e.pos.x;
      e.prevY = e.pos.y;
      if (this.phase !== 'playing') continue;
      e.pos.y -= e.speed * dt;
      // Gentle lateral wander only. Enemies never drift toward the squad: if the
      // player parks the fire lanes off-axis, the enemies walk past them.
      e.wanderPhase += dt * 1.7;
      const drift = Math.sin(e.wanderPhase) * 0.06;
      e.pos.x = clamp(e.pos.x + drift * dt, -0.95, 0.95);

      if (e.pos.y <= ENEMIES.contactY) {
        e.alive = false;
        removed = true;
        this.spawnVfx('impact', e.pos.x, 0.05, 0.25, 0, 1.4);
        this.loseSquadPower(1, 'contact');
      }
    }
    if (removed) {
      this.enemies = this.enemies.filter((e) => e.alive);
    }
  }

  private updateBoss(dt: number): void {
    const b = this.boss;
    if (!b.active) return;
    b.age += dt;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    if (!b.alive) {
      b.death += dt / VFX.bossDeathLifetime;
      if (b.death > 1) b.death = 1;
      return;
    }
    if (this.phase !== 'playing') return;
    b.prevX = b.pos.x;
    b.prevY = b.pos.y;

    if (b.pos.y > BOSS.holdY) {
      // Approach pacing is semantic (seconds to holdY), so the far spawn does not turn
      // into a long idle walk. The boss is targetable the whole way.
      b.pos.y = Math.max(BOSS.holdY, b.pos.y - b.approachSpeed * dt);
      if (b.pos.y <= BOSS.holdY && this.bossTiming.holdReachedTime === null) this.bossTiming.holdReachedTime = this.time;
    } else if (b.telegraph <= 0) {
      // Slow bounded patrol with dwell. Independent of the squad position: the
      // player has to bring the lanes to the boss, not the other way round.
      if (b.patrolDwell > 0) {
        b.patrolDwell -= dt;
      } else {
        const step = BOSS.patrolSpeed * dt;
        const diff = b.patrolTargetX - b.pos.x;
        if (Math.abs(diff) <= step) {
          b.pos.x = b.patrolTargetX;
          b.patrolDwell = BOSS.patrolDwellMin + this.rng() * (BOSS.patrolDwellMax - BOSS.patrolDwellMin);
          // Next waypoint at least a third of the range away so the boss actually moves.
          let next = (this.rng() * 2 - 1) * BOSS.patrolRange;
          if (Math.abs(next - b.pos.x) < BOSS.patrolRange / 3) next = -Math.sign(b.pos.x || 1) * BOSS.patrolRange * (0.5 + this.rng() * 0.5);
          b.patrolTargetX = clamp(next, -BOSS.patrolRange, BOSS.patrolRange);
        } else {
          b.pos.x += Math.sign(diff) * step;
        }
      }
    }

    if (b.telegraph > 0) {
      b.telegraph -= dt;
      if (b.telegraph <= 0) {
        // Slam lands.
        this.spawnVfx('boss-slam', b.pos.x, 0.4, 0, 0, 1);
        const hit = Math.abs(this.anchorX - b.pos.x) < BOSS.slamHalfWidth;
        this.pushEvent({ type: 'boss-slam', shake: hit ? 0.9 : 0.5 });
        if (hit) this.loseSquadPower(1, 'slam');
        b.nextAttackIn = (b.phase === 2 ? BOSS.attackIntervalPhase2 : BOSS.attackInterval) * b.attackIntervalScale;
      }
    } else if (b.pos.y <= BOSS.holdY + 0.01) {
      b.nextAttackIn -= dt;
      if (b.nextAttackIn <= 0) b.telegraph = BOSS.telegraphDuration;
    }
  }

  private updateGates(dt: number): void {
    if (this.gates.length === 0) return;
    let removed = false;
    for (const g of this.gates) {
      if (!g.active) continue;
      if (this.phase === 'playing') g.y -= GATES.speed * dt;
      if (g.triggeredAt !== null) g.triggeredAt += dt;
      if (!g.consumed && g.y <= 0.02) {
        g.consumed = true;
        const chosen = (g.side === 'left') === (this.anchorX < 0);
        if (chosen) {
          g.triggeredAt = 0;
          this.applyEffect(g.effect);
          this.spawnVfx('gate', g.side === 'left' ? -0.5 : 0.5, 0.05, 0.4, 0, 1);
          this.pushEvent({ type: 'gate', message: gateLabel(g.effect), shake: 0.15 });
        }
      }
      if (g.y < -0.9) {
        g.active = false;
        removed = true;
      }
    }
    if (removed) this.gates = this.gates.filter((g) => g.active);
  }

  private updateVfx(dt: number): void {
    for (const v of this.vfx) {
      if (!v.active) continue;
      v.age += dt;
      if (v.age >= v.lifetime) v.active = false;
    }
    for (const p of this.popups) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.lifetime) p.active = false;
    }
  }

  spawnVfx(kind: VfxKind, x: number, y: number, h: number, angle: number, scale: number): void {
    const lifetime = vfxLifetime(kind);
    let slot: VfxParticle | null = null;
    let oldest: VfxParticle = this.vfx[0];
    for (const v of this.vfx) {
      if (!v.active) {
        slot = v;
        break;
      }
      if (v.age / v.lifetime > oldest.age / oldest.lifetime) oldest = v;
    }
    // Budget: when the pool is full, drop the oldest cheap effect first (never a boss effect).
    if (!slot) {
      if (kind === 'muzzle' || kind === 'impact') return;
      slot = oldest;
    }
    slot.active = true;
    slot.kind = kind;
    slot.x = x;
    slot.y = y;
    slot.h = h;
    slot.angle = angle;
    slot.age = 0;
    slot.lifetime = lifetime;
    slot.seed = this.rng();
    slot.scale = scale;
  }

  private spawnPopup(x: number, y: number, h: number, value: number, crit: boolean): void {
    for (const p of this.popups) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.h = h;
      p.value = value;
      p.age = 0;
      p.lifetime = 0.7;
      p.crit = crit;
      return;
    }
  }

  private pushEvent(ev: GameEvent): void {
    this.events.push(ev);
    if (ev.shake) this.shake = Math.min(1, this.shake + ev.shake);
  }

  private refreshStats(): void {
    // Rolling 1-second window of shot timestamps.
    const cutoff = this.time - 1;
    let drop = 0;
    while (drop < this.shotTimes.length && this.shotTimes[drop] < cutoff) drop++;
    if (drop > 0) this.shotTimes.splice(0, drop);
    this.stats.shotsPerSecond = this.shotTimes.length;

    let ap = 0;
    for (const p of this.projectiles) if (p.active) ap++;
    let av = 0;
    for (const v of this.vfx) if (v.active) av++;
    this.stats.activeProjectiles = ap;
    this.stats.activeEnemies = this.enemies.length;
    const live = this.activeEnemyCount;
    if (live > this.stats.peakActiveEnemies) this.stats.peakActiveEnemies = live;
    this.stats.activeSoldiers = this.visibleSquadCount;
    this.stats.squadPower = this.squadPower;
    this.stats.poolVfx = av;
  }
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

export function gateLabel(effect: GateEffect): string {
  switch (effect.kind) {
    case 'squad':
      return `+${effect.amount} SQUAD`;
    case 'damage':
      return `×${trimNumber(effect.multiplier)} DAMAGE`;
    case 'fireRate':
      return `+${Math.round((effect.multiplier - 1) * 100)}% FIRE RATE`;
  }
}

export function gateBigNumber(effect: GateEffect): string {
  switch (effect.kind) {
    case 'squad':
      return `+${effect.amount}`;
    case 'damage':
      return `×${trimNumber(effect.multiplier)}`;
    case 'fireRate':
      return `+${Math.round((effect.multiplier - 1) * 100)}%`;
  }
}

export function gateSmallLabel(effect: GateEffect): string {
  switch (effect.kind) {
    case 'squad':
      return 'SQUAD';
    case 'damage':
      return 'DAMAGE';
    case 'fireRate':
      return 'FIRE RATE';
  }
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Does the segment a → b (positions relative to a hitbox centre) touch the
 * axis-aligned box |x| ≤ hx, |y| ≤ hy? Slab test; endpoints inclusive, so a bullet
 * ending inside the box behaves exactly like the old point test.
 */
export function sweptHit(ax: number, ay: number, bx: number, by: number, hx: number, hy: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx > -1e-12 && dx < 1e-12) {
    if (ax < -hx || ax > hx) return false;
  } else {
    let tx0 = (-hx - ax) / dx;
    let tx1 = (hx - ax) / dx;
    if (tx0 > tx1) {
      const tmp = tx0;
      tx0 = tx1;
      tx1 = tmp;
    }
    if (tx0 > t0) t0 = tx0;
    if (tx1 < t1) t1 = tx1;
    if (t0 > t1) return false;
  }
  if (dy > -1e-12 && dy < 1e-12) {
    if (ay < -hy || ay > hy) return false;
  } else {
    let ty0 = (-hy - ay) / dy;
    let ty1 = (hy - ay) / dy;
    if (ty0 > ty1) {
      const tmp = ty0;
      ty0 = ty1;
      ty1 = tmp;
    }
    if (ty0 > t0) t0 = ty0;
    if (ty1 < t1) t1 = ty1;
    if (t0 > t1) return false;
  }
  return true;
}

function bucketRow(y: number, rows: number): number {
  if (y < GRID_MIN_DEPTH) return -1;
  const idx = Math.floor((y - GRID_MIN_DEPTH) / GRID_CELL_DEPTH);
  return idx >= rows ? -1 : idx;
}

function bucketCol(x: number): number {
  const c = Math.floor((x - BUCKET_X_MIN) / BUCKET_X_SIZE);
  return c < 0 ? 0 : c >= BUCKET_COLS ? BUCKET_COLS - 1 : c;
}

function vfxLifetime(kind: VfxKind): number {
  switch (kind) {
    case 'muzzle':
      return VFX.muzzleLifetime;
    case 'impact':
      return VFX.impactLifetime;
    case 'impact-boss':
      return 0.3;
    case 'death':
      return VFX.deathLifetime;
    case 'death-elite':
      return 0.7;
    case 'death-boss':
      return VFX.bossDeathLifetime;
    case 'gate':
      return 0.7;
    case 'squad-grow':
      return 0.8;
    case 'boss-phase':
      return 1.1;
    case 'boss-slam':
      return 0.9;
    case 'soldier-lost':
      return 0.6;
    case 'squad-consolidate':
      return 0.5;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function createBoss(): Boss {
  return {
    active: false,
    alive: false,
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    hp: 0,
    maxHp: 0,
    age: 0,
    hitFlash: 0,
    telegraph: 0,
    nextAttackIn: BOSS.attackInterval,
    attackIntervalScale: 1,
    approachSpeed: 0,
    type: 'sub',
    phase: 1,
    death: 0,
    patrolTargetX: 0.35,
    patrolDwell: 0,
  };
}

function createProjectile(): Projectile {
  return {
    active: false,
    ownerSoldierId: 0,
    weaponId: 'rifle',
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    h: 0,
    originX: 0,
    originY: 0,
    traveled: 0,
    maxTravel: 1,
    damage: 0,
    spawnTime: 0,
    lifetime: 1,
  };
}

function createVfx(): VfxParticle {
  return { active: false, kind: 'impact', x: 0, y: 0, h: 0, angle: 0, age: 0, lifetime: 1, seed: 0, scale: 1 };
}

function createPopup(): DamagePopup {
  return { active: false, x: 0, y: 0, h: 0, value: 0, age: 0, lifetime: 1, crit: false };
}

export { BOSS_VISUAL, ENEMY_ELITE_VISUAL, ENEMY_GRUNT_VISUAL, PLAYER_SOLDIER_VISUAL };
