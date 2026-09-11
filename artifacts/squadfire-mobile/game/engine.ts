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
 */
import {
  BOSS, ENEMIES,
  GATES,
  MODIFIER_CAPS,
  PROJECTILES,
  ROAD_FORWARD,
  ROAD_LENGTH,
  SIM,
  SQUAD,
  VFX,
  WEAPONS, } from './balance';
import { createCamera, project, type CameraLayout } from './camera';
import { STAGES, bossHpFor, stageConfig, stageEnemyCount, type StageConfig, type StageState } from './stages';
import { anchorLimitFor, formationSlots } from './formation';
import { emptyFrame, spriteFrame } from './sprite-geometry';
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

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Collision grid: depth rows × lateral columns. Cells are wider than any hit
// radius + tolerance so a query only ever touches the 3×3 neighbourhood.
const BUCKET_SIZE = 0.5;
const BUCKET_ROWS = Math.ceil((ROAD_LENGTH + 2) / BUCKET_SIZE);
const BUCKET_COLS = 6;
const BUCKET_X_MIN = -1.5;
const BUCKET_X_SIZE = 3 / BUCKET_COLS;
const BUCKET_COUNT = BUCKET_ROWS * BUCKET_COLS;

export interface GameOptions {
  seed?: number;
  initialSquad?: number;
  /** Stage the run starts at (campaign continue). Default 1. */
  startStage?: number;
  width?: number;
  height?: number;
}

export class Game {
  cam: CameraLayout;
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

  /** Player-facing progression: the current stage number (1-based). */
  stage = 1;
  stageState: StageState = 'INTRO';
  stageConfig: StageConfig = stageConfig(1);
  /** Seconds since the current stage started. */
  stageTime = 0;
  /** Run rewards (economy hooks; nothing spends them yet). */
  run = { coins: 0, score: 0, stagesCleared: 0 };
  kills = 0;
  stats: GameStats = {
    shotsFired: 0,
    shotsPerSecond: 0,
    hits: 0,
    kills: 0,
    elapsed: 0,
    activeProjectiles: 0,
    activeEnemies: 0,
    activeSoldiers: 0,
    poolProjectiles: PROJECTILES.poolSize,
    poolVfx: VFX.poolSize,
    simMs: 0,
    fps: 0,
    frameMs: 0,
    peakFrameMs: 0,
  };

  /** When true, enemies/gates/boss are not auto-spawned (test scenarios). */
  scripted = false;

  private rng: () => number;
  private nextSoldierId = 1;
  private nextEnemyId = 1;
  private nextGateId = 1;
  private gateTimer = GATES.firstAt;
  private bossSpawned = false;
  // Stage spawn timeline cursor.
  private seqIndex = 0;
  private groupIndex = 0;
  private groupSpawned = 0;
  private groupLane = 0;
  private spawnClock = 0;
  private stateTimer = 0;
  private escortTimer = 0;
  private startStageAt = 1;
  private endTimer = -1;
  private accumulator = 0;
  private shotTimes: number[] = [];
  private shotListeners: ShotListener[] = [];
  private buckets: Enemy[][] = [];
  private frame = emptyFrame();
  private scratchProjected = { x: 0, y: 0, scale: 1 };

  constructor(opts: GameOptions = {}) {
    this.rng = mulberry32(opts.seed ?? 1337);
    this.cam = createCamera(opts.width ?? 402, opts.height ?? 874);
    for (let i = 0; i < BUCKET_COUNT; i++) this.buckets.push([]);
    for (let i = 0; i < PROJECTILES.poolSize; i++) this.projectiles.push(createProjectile());
    for (let i = 0; i < VFX.poolSize; i++) this.vfx.push(createVfx());
    for (let i = 0; i < VFX.popupPoolSize; i++) this.popups.push(createPopup());
    this.addSoldiers(opts.initialSquad ?? SQUAD.initialSize, false);
    this.startStageAt = Math.max(1, Math.floor(opts.startStage ?? 1));
    this.startStage(this.startStageAt);
    // Snap soldiers to their slots on start.
    for (const s of this.soldiers) {
      s.pos.x = s.slot.x;
      s.pos.y = s.slot.y;
      s.age = 10;
    }
  }

  // ---------------------------------------------------------------------------
  // Host API
  // ---------------------------------------------------------------------------

  setCamera(width: number, height: number): void {
    this.cam = createCamera(width, height);
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
    const limit = anchorLimitFor(this.squadSize);
    this.targetAnchorX = clamp(worldX, -limit, limit);
  }

  /** Current lateral clamp for the anchor (shrinks as the formation gets wider). */
  get anchorLimit(): number {
    return anchorLimitFor(this.squadSize);
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

  drainEvents(): GameEvent[] {
    if (this.events.length === 0) return this.events;
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Advance the simulation by a variable frame delta using fixed sub-steps. */
  advance(dt: number): void {
    if (this.phase !== 'playing' && this.phase !== 'defeat') return;
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
  // Squad management
  // ---------------------------------------------------------------------------

  /** Number of soldiers currently acting as firing sources. */
  get squadSize(): number {
    let n = 0;
    for (const s of this.soldiers) if (s.alive && s.death === 0) n++;
    return n;
  }

  /**
   * Adds soldiers as NEW firing sources. Existing soldiers keep their timers; the
   * newcomers receive fire phases that fill the cadence evenly, so the aggregate
   * shot rate rises immediately without a synchronized burst.
   */
  addSoldiers(count: number, celebrate = true): number {
    const current = this.squadSize;
    const allowed = Math.max(0, Math.min(count, SQUAD.maxSize - current));
    if (allowed === 0) return 0;
    const weapon = WEAPONS.rifle;
    const newTotal = current + allowed;
    const period = 1 / (weapon.fireRate * this.mods.fireRate);
    for (let i = 0; i < allowed; i++) {
      const index = current + i;
      const firePhase = ((index * 0.6180339887) % 1); // golden-ratio spacing stays well distributed at any N
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
        death: 0,
        shotsFired: 0,
      };
      this.soldiers.push(soldier);
    }
    this.reassignSlots();
    if (celebrate) {
      this.spawnVfx('squad-grow', this.anchorX, -0.2, 0.3, 0, 1 + Math.min(1, newTotal / 20));
    }
    return allowed;
  }

  /** Removes the rearmost soldier (enemy contact / boss slam). */
  loseSoldier(reason: 'contact' | 'slam'): void {
    for (let i = this.soldiers.length - 1; i >= 0; i--) {
      const s = this.soldiers[i];
      if (!s.alive || s.death > 0) continue;
      s.death = 0.0001;
      this.spawnVfx('soldier-lost', s.pos.x, s.pos.y, 0.25, 0, 1);
      this.pushEvent({ type: 'soldier-lost', shake: reason === 'slam' ? 0.7 : 0.35 });
      // Survivors close ranks now, not after the death animation: the clamp already
      // uses the smaller squad's (wider) range, so slots must shrink in the same frame
      // or a squad parked at the edge could briefly reach past the margin.
      this.reassignSlots();
      break;
    }
    if (this.squadSize === 0 && this.phase === 'playing') {
      this.phase = 'defeat';
      this.endTimer = 0;
      this.pushEvent({ type: 'defeat', message: 'SQUAD LOST' });
    }
  }

  /** Debug/test helper: sets the squad to an exact size. */
  setSquadSize(n: number): void {
    const target = clamp(Math.round(n), 1, SQUAD.maxSize);
    const current = this.squadSize;
    if (target > current) {
      this.addSoldiers(target - current, false);
    } else if (target < current) {
      let remove = current - target;
      for (let i = this.soldiers.length - 1; i >= 0 && remove > 0; i--) {
        if (this.soldiers[i].alive && this.soldiers[i].death === 0) {
          this.soldiers.splice(i, 1);
          remove--;
        }
      }
      this.reassignSlots();
    }
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
        this.addSoldiers(effect.amount);
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

  spawnEnemyGroup(count: number, centerX = (this.rng() - 0.5) * 1.1, y = ENEMIES.spawnY, eliteChance = 0): number {
    let spawned = 0;
    const cols = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(count * 1.4))));
    const lateral = ENEMIES.groupLateralSpread;
    for (let i = 0; i < count; i++) {
      if (this.stats.activeEnemies + spawned >= ENEMIES.maxAlive) break;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = Math.min(cols, count - row * cols);
      const x = centerX + (col - (rowCount - 1) / 2) * lateral + (this.rng() - 0.5) * 0.09;
      const yy = y + row * 0.28 + this.rng() * 0.12;
      const kind: EnemyKind = this.rng() < eliteChance ? 'elite' : 'grunt';
      this.spawnEnemy(kind, clamp(x, -0.92, 0.92), yy);
      spawned++;
    }
    return spawned;
  }

  spawnEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    const def = ENEMIES[kind];
    const hp = Math.max(1, Math.round(def.hp * this.stageConfig.enemyHpMultiplier));
    const enemy: Enemy = {
      id: this.nextEnemyId++,
      alive: true,
      kind,
      pos: { x, y },
      hp,
      maxHp: hp,
      speed: def.speed * this.stageConfig.enemySpeedMultiplier * (0.9 + this.rng() * 0.2),
      sizeVariation: 0.92 + this.rng() * 0.16,
      animPhase: this.rng() * Math.PI * 2,
      wanderPhase: this.rng() * Math.PI * 2,
      hitFlash: 0,
      death: 0,
      lastHitDir: 0,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  spawnBoss(): void {
    if (this.boss.active) return;
    const cfg = this.stageConfig.boss ?? { tier: 'boss' as const, hpMultiplier: 1, attackIntervalMultiplier: 1, escortInterval: 0, escortSize: 0 };
    const hp = bossHpFor(cfg);
    this.boss = createBoss();
    this.boss.active = true;
    this.boss.alive = true;
    this.boss.pos.x = 0;
    this.boss.pos.y = BOSS.spawnY;
    this.boss.hp = hp;
    this.boss.maxHp = hp;
    this.boss.attackIntervalScale = cfg.attackIntervalMultiplier;
    this.boss.nextAttackIn = BOSS.attackInterval * cfg.attackIntervalMultiplier;
    this.bossSpawned = true;
    this.escortTimer = cfg.escortInterval;
    this.pushEvent({ type: 'boss-spawn', message: cfg.tier === 'major' ? 'HIGH WARDEN OF THE CAUSEWAY' : 'WARDEN OF THE CAUSEWAY', shake: 0.5 });
  }

  // ---------------------------------------------------------------------------
  // Stage progression
  // ---------------------------------------------------------------------------

  /** True while any enemy (or the boss) is still on the road. Death animations count as gone. */
  get activeEnemyCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive && e.death === 0) n++;
    return n;
  }

  get isBossStage(): boolean {
    return this.stageConfig.boss !== undefined;
  }

  /** Scheduled (non-escort) spawns of this stage that have not entered yet. */
  get remainingScheduledSpawns(): number {
    const cfg = this.stageConfig;
    let n = 0;
    for (let s = this.seqIndex; s < cfg.sequences.length; s++) {
      const seq = cfg.sequences[s];
      for (let k = s === this.seqIndex ? this.groupIndex : 0; k < seq.groups.length; k++) {
        n += seq.groups[k].count - (s === this.seqIndex && k === this.groupIndex ? this.groupSpawned : 0);
      }
    }
    return n;
  }

  get spawnSequenceFinished(): boolean {
    return this.seqIndex >= this.stageConfig.sequences.length;
  }

  /** Developer-facing snapshot of the timeline cursor. */
  get stageCursor(): { sequence: number; group: number; groupSpawned: number } {
    return { sequence: this.seqIndex, group: this.groupIndex, groupSpawned: this.groupSpawned };
  }

  /**
   * Begins a stage: banner, fresh spawn timeline, boss reset. Squad and run upgrades
   * are preserved (STAGES.transition). Also used by the dev panel to jump stages.
   */
  startStage(stage: number): void {
    this.stage = Math.max(1, Math.floor(stage));
    this.stageConfig = stageConfig(this.stage);
    this.stageState = 'INTRO';
    this.stageTime = 0;
    this.stateTimer = STAGES.introDuration;
    this.seqIndex = 0;
    this.groupIndex = 0;
    this.groupSpawned = 0;
    this.groupLane = 0;
    this.spawnClock = this.stageConfig.sequences[0]?.startDelay ?? 0;
    this.bossSpawned = false;
    this.escortTimer = 0;
    if (this.boss.active) this.boss = createBoss();
    this.pushEvent({ type: 'stage-start', message: `STAGE ${this.stage}` });
  }

  /** Dev helper: removes every enemy on the road as if killed (no rewards). */
  debugClearEnemies(): void {
    for (const e of this.enemies) {
      if (e.alive && e.death === 0) {
        e.hp = 0;
        e.death = 0.0001;
        this.kills++;
        this.stats.kills = this.kills;
      }
    }
  }

  private advanceSpawnTimeline(dt: number): void {
    const cfg = this.stageConfig;
    if (this.seqIndex >= cfg.sequences.length) return;
    this.spawnClock -= dt;
    // One enemy per tick at most keeps groups readable; the interval is short enough
    // that a group still feels like one arrival.
    while (this.spawnClock <= 0 && this.seqIndex < cfg.sequences.length) {
      const seq = cfg.sequences[this.seqIndex];
      const group = seq.groups[this.groupIndex];
      if (this.groupSpawned === 0) {
        this.groupLane = group.laneBias ?? (this.rng() - 0.5) * 1.1;
      }
      if (this.stats.activeEnemies < ENEMIES.maxAlive) {
        const spread = ENEMIES.groupLateralSpread;
        const slot = this.groupSpawned - (group.count - 1) / 2;
        const x = clamp(this.groupLane + slot * spread * 0.55 + (this.rng() - 0.5) * 0.12, -0.92, 0.92);
        this.spawnEnemy(group.kind, x, ENEMIES.spawnY + this.rng() * 0.15);
      }
      this.groupSpawned++;
      if (this.groupSpawned >= group.count) {
        this.groupSpawned = 0;
        this.groupIndex++;
        if (this.groupIndex >= seq.groups.length) {
          this.groupIndex = 0;
          this.seqIndex++;
          this.spawnClock += cfg.sequences[this.seqIndex]?.startDelay ?? 0;
          if (this.seqIndex >= cfg.sequences.length) return;
        } else {
          this.spawnClock += seq.betweenGroupDelay;
        }
      } else {
        this.spawnClock += group.spawnInterval;
      }
    }
  }

  private completeStage(): void {
    const cfg = this.stageConfig;
    this.run.coins += Math.round(STAGES.rewards.stageClearCoins * cfg.rewardMultiplier);
    this.run.stagesCleared++;
    this.stageState = 'CLEARING';
    this.stateTimer = STAGES.clearDuration;
    this.pushEvent({ type: 'stage-clear', message: 'STAGE CLEAR' });
  }

  spawnGatePair(left: GateEffect, right: GateEffect, y = GATES.spawnY): void {
    this.gates.push({ id: this.nextGateId++, active: true, y, side: 'left', effect: left, triggeredAt: null, consumed: false });
    this.gates.push({ id: this.nextGateId++, active: true, y, side: 'right', effect: right, triggeredAt: null, consumed: false });
  }

  // ---------------------------------------------------------------------------
  // Simulation step
  // ---------------------------------------------------------------------------

  private step(dt: number): void {
    this.time += dt;
    if (this.phase === 'playing') this.stats.elapsed += dt;

    this.anchorX += (this.targetAnchorX - this.anchorX) * Math.min(1, SQUAD.anchorFollow * dt);

    if (this.phase === 'playing' && !this.scripted) this.updateDirector(dt);

    this.rebuildBuckets();
    this.updateSoldiers(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateGates(dt);
    this.updateVfx(dt);

    if (this.phase === 'defeat') {
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
        if (this.spawnSequenceFinished && this.activeEnemyCount === 0) {
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
          this.spawnBoss();
          this.stageState = 'BOSS_ACTIVE';
        }
        break;
      case 'BOSS_ACTIVE':
        if (bossLive && cfg.boss && cfg.boss.escortInterval > 0) {
          this.escortTimer -= dt;
          if (this.escortTimer <= 0) {
            this.escortTimer = cfg.boss.escortInterval;
            this.spawnEnemyGroup(cfg.boss.escortSize);
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
        if (this.stateTimer <= 0) this.startStage(this.stage + 1);
        break;
    }

    // Gates
    this.gateTimer -= dt;
    if (this.gateTimer <= 0 && !(this.boss.active && this.boss.alive)) {
      this.gateTimer = GATES.interval;
      const pairs: [GateEffect, GateEffect][] = [
        [{ kind: 'squad', amount: 3 }, { kind: 'fireRate', multiplier: 1.25 }],
        [{ kind: 'damage', multiplier: 1.5 }, { kind: 'squad', amount: 4 }],
        [{ kind: 'squad', amount: 5 }, { kind: 'damage', multiplier: 2 }],
      ];
      const pair = pairs[Math.floor(this.rng() * pairs.length)];
      this.spawnGatePair(pair[0], pair[1]);
    }
  }

  private rebuildBuckets(): void {
    for (const b of this.buckets) b.length = 0;
    for (const e of this.enemies) {
      if (!e.alive || e.death > 0) continue;
      const row = bucketRow(e.pos.y);
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

      // Continuous straight fire on the soldier's own timer. No target lookup, no
      // idle state: the timer never waits for an enemy and never re-phases.
      if (canFire && this.time >= s.nextShotAt) {
        this.fireShot(s);
        // Next shot exactly one period later. Catch up at most half a period if the
        // frame was long, so cadence stays stable without bursts.
        s.nextShotAt = Math.max(s.nextShotAt + period, this.time + period * 0.5);
      }
    }

    if (removed) {
      this.soldiers = this.soldiers.filter((s) => s.alive);
      this.reassignSlots();
    }
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
    p.originX = originX;
    p.originY = originY;
    p.vx = dirX * weapon.projectileSpeed;
    p.vy = dirY * weapon.projectileSpeed;
    p.h = originH;
    p.traveled = 0;
    p.damage = weapon.damage * this.mods.damage;
    p.spawnTime = this.time;
    p.lifetime = PROJECTILES.lifetime;

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
    // Pool exhausted: recycle the oldest projectile (keeps the per-soldier rule intact).
    let oldest = pool[0];
    for (let i = 1; i < pool.length; i++) if (pool[i].spawnTime < oldest.spawnTime) oldest = pool[i];
    return oldest;
  }

  private updateProjectiles(dt: number): void {
    const pool = this.projectiles;
    const boss = this.boss;
    const bossTargetable = boss.active && boss.alive && boss.death === 0;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const stepLen = Math.hypot(p.vx, p.vy) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.traveled += stepLen;

      // Collision: regular enemies via the 3×3 neighbourhood of the 2D grid.
      const row = bucketRow(p.y);
      let hit: Enemy | null = null;
      if (row >= 0) {
        const col = bucketCol(p.x);
        const r0 = row > 0 ? row - 1 : 0;
        const r1 = row < BUCKET_ROWS - 1 ? row + 1 : BUCKET_ROWS - 1;
        const c0 = col > 0 ? col - 1 : 0;
        const c1 = col < BUCKET_COLS - 1 ? col + 1 : BUCKET_COLS - 1;
        outer: for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const bucket = this.buckets[r * BUCKET_COLS + c];
            for (let k = 0; k < bucket.length; k++) {
              const e = bucket[k];
              if (e.death > 0 || !e.alive) continue;
              const def = ENEMIES[e.kind];
              const ddx = e.pos.x - p.x;
              const ddy = e.pos.y - p.y;
              if ((ddx < 0 ? -ddx : ddx) <= def.hitRadius * e.sizeVariation && (ddy < 0 ? -ddy : ddy) <= def.depthTolerance) {
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
      if (bossTargetable) {
        const ddx = boss.pos.x - p.x;
        const ddy = boss.pos.y - p.y;
        if ((ddx < 0 ? -ddx : ddx) <= BOSS.hitRadius && (ddy < 0 ? -ddy : ddy) <= BOSS.depthTolerance) {
          this.damageBoss(p);
          p.active = false;
          continue;
        }
      }

      // Missed bullets keep flying until they time out or leave the road. There is
      // no "planned distance": nothing about a projectile depends on a target.
      const expired =
        this.time - p.spawnTime > p.lifetime ||
        p.y > ROAD_LENGTH + PROJECTILES.farExit ||
        p.x < -PROJECTILES.sideExit ||
        p.x > PROJECTILES.sideExit;
      if (expired) p.active = false;
    }
  }

  private damageEnemy(e: Enemy, p: Projectile): void {
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
      this.spawnVfx('death-boss', b.pos.x, b.pos.y, 0.8, 0, 1);
      this.pushEvent({ type: 'boss-defeated', message: 'WARDEN DOWN', shake: 1 });
    }
  }

  private updateEnemies(dt: number): void {
    let removed = false;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.death > 0) {
        e.death += dt / VFX.deathLifetime;
        if (e.death >= 1) {
          e.alive = false;
          removed = true;
        }
        continue;
      }
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
        this.loseSoldier('contact');
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

    if (b.pos.y > BOSS.holdY) {
      b.pos.y = Math.max(BOSS.holdY, b.pos.y - BOSS.approachSpeed * dt);
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
        if (hit) this.loseSoldier('slam');
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
    this.stats.activeSoldiers = this.squadSize;
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

function bucketRow(y: number): number {
  if (y < -0.5) return -1;
  const idx = Math.floor((y + 0.5) / BUCKET_SIZE);
  return idx >= BUCKET_ROWS ? -1 : idx;
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
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function createBoss(): Boss {
  return {
    active: false,
    alive: false,
    pos: { x: 0, y: BOSS.spawnY },
    hp: BOSS.hp,
    maxHp: BOSS.hp,
    age: 0,
    hitFlash: 0,
    telegraph: 0,
    nextAttackIn: BOSS.attackInterval,
    attackIntervalScale: 1,
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
    vx: 0,
    vy: 0,
    h: 0,
    originX: 0,
    originY: 0,
    traveled: 0,
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
