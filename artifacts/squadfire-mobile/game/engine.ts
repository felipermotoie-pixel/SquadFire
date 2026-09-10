/**
 * SquadFire simulation. Pure TypeScript, deterministic given a seed, framework
 * agnostic. The host (React/Skia on device, Node in the headless test) calls
 * `game.advance(dtSeconds)` once per frame and reads the public arrays to render.
 *
 * Core combat rule (non-negotiable):
 *   individual soldier → individual muzzle → individual ShotEvent → individual projectile
 */
import {
  BOSS,
  ENEMIES,
  GATES,
  MODIFIER_CAPS,
  PROJECTILES,
  ROAD_LENGTH,
  SIM,
  SQUAD,
  TARGETING,
  VFX,
  WEAPONS,
} from './balance';
import { createCamera, project, unitPx, type CameraLayout } from './camera';
import { formationSlots } from './formation';
import { emptyFrame, spriteFrame } from './sprite-geometry';
import { resolveTarget } from './targeting';
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
  TargetKind,
  VfxKind,
  VfxParticle,
} from './types';
import { BOSS_VISUAL, ENEMY_ELITE_VISUAL, ENEMY_GRUNT_VISUAL, PLAYER_SOLDIER_VISUAL, SOLDIER_BARREL_ANGLE, soldierSpriteRotation } from './visuals';

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

  wave = 1;
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
  private enemyById = new Map<number, Enemy>();
  private spawnTimer = 1.2;
  private gateTimer = GATES.firstAt;
  private bossSpawned = false;
  private endTimer = -1;
  private accumulator = 0;
  private shotTimes: number[] = [];
  private shotListeners: ShotListener[] = [];
  private buckets: Enemy[][] = [];
  private frame = emptyFrame();
  private scratchTarget = { kind: null as TargetKind, id: null as number | null };

  constructor(opts: GameOptions = {}) {
    this.rng = mulberry32(opts.seed ?? 1337);
    this.cam = createCamera(opts.width ?? 402, opts.height ?? 874);
    for (let i = 0; i < BUCKET_COUNT; i++) this.buckets.push([]);
    for (let i = 0; i < PROJECTILES.poolSize; i++) this.projectiles.push(createProjectile());
    for (let i = 0; i < VFX.poolSize; i++) this.vfx.push(createVfx());
    for (let i = 0; i < VFX.popupPoolSize; i++) this.popups.push(createPopup());
    this.addSoldiers(opts.initialSquad ?? SQUAD.initialSize, false);
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

  setInputX(worldX: number): void {
    this.targetAnchorX = clamp(worldX, -SQUAD.anchorLimit, SQUAD.anchorLimit);
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
    if (this.phase !== 'playing' && this.phase !== 'victory' && this.phase !== 'defeat') return;
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
        aimAngle: 0,
        aimDir: { x: 0, y: 1 },
        targetId: null,
        targetKind: null,
        nextShotAt: this.time + firePhase * period,
        firePhase,
        bossAimOffset: { x: (this.rng() - 0.5) * 0.9, y: 0.45 + this.rng() * 1.1 },
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
    const lateral = 0.22;
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
    const enemy: Enemy = {
      id: this.nextEnemyId++,
      alive: true,
      kind,
      pos: { x, y },
      hp: def.hp,
      maxHp: def.hp,
      reserved: 0,
      speed: def.speed * (0.9 + this.rng() * 0.2),
      sizeVariation: 0.92 + this.rng() * 0.16,
      animPhase: this.rng() * Math.PI * 2,
      wanderPhase: this.rng() * Math.PI * 2,
      hitFlash: 0,
      death: 0,
      lastHitDir: 0,
    };
    this.enemies.push(enemy);
    this.enemyById.set(enemy.id, enemy);
    return enemy;
  }

  spawnBoss(): void {
    if (this.boss.active) return;
    this.boss = createBoss();
    this.boss.active = true;
    this.boss.alive = true;
    this.boss.pos.x = 0;
    this.boss.pos.y = BOSS.spawnY;
    this.boss.hp = BOSS.hp;
    this.boss.maxHp = BOSS.hp;
    this.boss.nextAttackIn = BOSS.attackInterval;
    this.bossSpawned = true;
    this.pushEvent({ type: 'boss-spawn', message: 'WARDEN OF THE CAUSEWAY', shake: 0.5 });
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

    if (this.phase === 'victory' || this.phase === 'defeat') {
      this.endTimer += dt;
    }
  }

  private updateDirector(dt: number): void {
    // Waves
    const wave = 1 + Math.floor(this.kills / ENEMIES.killsPerWave);
    if (wave !== this.wave) {
      this.wave = wave;
      this.pushEvent({ type: 'wave', message: `WAVE ${wave}` });
    }

    // Enemy groups keep coming until the boss is down.
    if (!this.boss.active || this.boss.alive) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const bossActive = this.boss.active && this.boss.alive;
        const interval = Math.max(ENEMIES.spawnIntervalMin, ENEMIES.spawnIntervalBase - (this.wave - 1) * 0.3) * (bossActive ? 1.6 : 1);
        this.spawnTimer = interval;
        const size = Math.min(ENEMIES.groupSizeMax, ENEMIES.groupSizeBase + (this.wave - 1) * ENEMIES.groupSizePerWave);
        this.spawnEnemyGroup(bossActive ? Math.ceil(size * 0.6) : size, undefined, undefined, this.wave >= 2 ? ENEMIES.eliteChanceFromWave2 : 0);
      }
    }

    // Boss entrance
    if (!this.bossSpawned && this.kills >= BOSS.killsToSpawn) {
      this.spawnBoss();
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

      // Target resolution: keep a valid target, re-evaluate periodically.
      let target = this.lookupTarget(s.targetKind, s.targetId);
      const aboutToFire = canFire && this.time >= s.nextShotAt;
      // Re-evaluate periodically, and right before a shot if the current target's
      // remaining HP is already covered by projectiles in flight (overkill guard).
      const needsReacquire =
        !target ||
        (s.firePhase + this.time) % TARGETING.reacquireInterval < dt ||
        (aboutToFire && target.enemy !== null && target.enemy.reserved >= target.enemy.hp);
      if (needsReacquire) {
        const res = resolveTarget(s, this.enemies, this.boss, this.scratchTarget);
        s.targetKind = res.kind;
        s.targetId = res.id;
        target = this.lookupTarget(res.kind, res.id);
      }

      if (!target) {
        s.aimAngle += (0 - s.aimAngle) * Math.min(1, 6 * dt);
        // Keep the cadence distributed while idle: never let every timer expire together.
        if (this.time >= s.nextShotAt) s.nextShotAt = this.time + s.firePhase * period;
        continue;
      }

      // Aim: sprite rotation toward the target's projected aim point.
      const aim = this.aimPointOf(s, target.kind, target.enemy, target.isBoss);
      const frame = spriteFrame(this.cam, PLAYER_SOLDIER_VISUAL, s.pos.x, s.pos.y, 0, 1, this.frame);
      const tp = project(this.cam, aim.x, aim.y);
      const tpy = tp.y - aim.h * unitPx(this.cam, aim.y);
      const desired = clamp(Math.atan2(tp.x - frame.pivotX, frame.pivotY - tpy), -0.5, 0.5);
      s.aimAngle += (desired - s.aimAngle) * Math.min(1, 14 * dt);
      const dx = aim.x - s.pos.x;
      const dy = aim.y - s.pos.y;
      const len = Math.hypot(dx, dy) || 1;
      s.aimDir.x = dx / len;
      s.aimDir.y = dy / len;

      if (aboutToFire) {
        this.fireShot(s, aim, target.kind, target.id);
        // Next shot exactly one period later. Catch up at most one period if the
        // frame was long, so cadence stays stable without bursts.
        s.nextShotAt = Math.max(s.nextShotAt + period, this.time + period * 0.5);
      }
    }

    if (removed) {
      this.soldiers = this.soldiers.filter((s) => s.alive);
      this.reassignSlots();
    }
  }

  // Scratch objects reused every substep (no allocations in the soldier loop).
  private scratchLookup: { kind: TargetKind; id: number; enemy: Enemy | null; isBoss: boolean } = { kind: null, id: 0, enemy: null, isBoss: false };
  private scratchAim = { x: 0, y: 0, h: 0 };

  private lookupTarget(kind: TargetKind, id: number | null): { kind: TargetKind; id: number; enemy: Enemy | null; isBoss: boolean } | null {
    const out = this.scratchLookup;
    if (kind === 'boss') {
      if (this.boss.active && this.boss.alive && this.boss.death === 0) {
        out.kind = kind;
        out.id = 0;
        out.enemy = null;
        out.isBoss = true;
        return out;
      }
      return null;
    }
    if (kind === 'enemy' && id !== null) {
      const e = this.enemyById.get(id);
      if (e && e.alive && e.death === 0) {
        out.kind = kind;
        out.id = id;
        out.enemy = e;
        out.isBoss = false;
        return out;
      }
    }
    return null;
  }

  private aimPointOf(s: Soldier, kind: TargetKind, enemy: Enemy | null, isBoss: boolean): { x: number; y: number; h: number } {
    const out = this.scratchAim;
    if (isBoss) {
      out.x = this.boss.pos.x + s.bossAimOffset.x;
      out.y = this.boss.pos.y;
      out.h = s.bossAimOffset.y;
      return out;
    }
    const e = enemy as Enemy;
    const vis = e.kind === 'elite' ? ENEMY_ELITE_VISUAL : ENEMY_GRUNT_VISUAL;
    out.x = e.pos.x;
    out.y = e.pos.y;
    out.h = vis.height * e.sizeVariation * vis.aimHeightFraction;
    return out;
  }

  /**
   * ONE ShotEvent drives everything: projectile spawn, muzzle flash, recoil pose,
   * audio hook, statistics. Origin is the soldier's own weapon muzzle.
   */
  private fireShot(s: Soldier, aim: { x: number; y: number; h: number }, kind: TargetKind, targetId: number): void {
    const weapon = WEAPONS[s.weaponId];
    const frame = spriteFrame(this.cam, PLAYER_SOLDIER_VISUAL, s.pos.x, s.pos.y, soldierSpriteRotation(s.aimAngle), 1, this.frame);
    // Convert the drawn muzzle position back to world: lateral from screen x, height from screen y.
    const originX = (frame.muzzleX - this.cam.centerX) / (this.cam.halfWidthBase * frame.scale);
    const originY = s.pos.y + 0.03;
    const originH = Math.max(0.05, (frame.footY - frame.muzzleY) / frame.unit);

    const dx = aim.x - originX;
    const dy = aim.y - originY;
    const dist = Math.hypot(dx, dy) || 0.001;
    const dirX = dx / dist;
    const dirY = dy / dist;

    const p = this.acquireProjectile();
    if (!p) return;
    p.active = true;
    p.ownerSoldierId = s.id;
    p.weaponId = s.weaponId;
    p.x = originX;
    p.y = originY;
    p.vx = dirX * weapon.projectileSpeed;
    p.vy = dirY * weapon.projectileSpeed;
    p.h0 = originH;
    p.h1 = aim.h;
    p.planned = dist;
    p.traveled = 0;
    p.damage = weapon.damage * this.mods.damage;
    p.targetId = targetId;
    p.targetKind = kind;
    p.spawnTime = this.time;
    p.lifetime = PROJECTILES.lifetime;

    // Reserve damage for overkill reduction.
    if (kind === 'boss') this.boss.reserved += p.damage;
    else {
      const e = this.enemyById.get(targetId);
      if (e) e.reserved += p.damage;
    }

    s.recoil = weapon.recoil;
    s.shotsFired++;
    this.stats.shotsFired++;
    this.shotTimes.push(this.time);

    // Muzzle flash sits exactly at the muzzle, oriented along the aim.
    const screenAngle = soldierSpriteRotation(s.aimAngle) + SOLDIER_BARREL_ANGLE;
    this.spawnVfx('muzzle', originX, originY, originH, screenAngle, 1);

    if (this.shotListeners.length > 0) {
      const shot: ShotEvent = {
        soldierId: s.id,
        weaponId: s.weaponId,
        targetId,
        targetKind: kind,
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
    this.releaseReservation(oldest);
    return oldest;
  }

  private releaseReservation(p: Projectile): void {
    if (!p.active) return;
    if (p.targetKind === 'boss') this.boss.reserved = Math.max(0, this.boss.reserved - p.damage);
    else if (p.targetId !== null) {
      const e = this.enemyById.get(p.targetId);
      if (e) e.reserved = Math.max(0, e.reserved - p.damage);
    }
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
        this.releaseReservation(p);
        p.active = false;
        continue;
      }

      if (bossTargetable) {
        const ddx = boss.pos.x - p.x;
        const ddy = boss.pos.y - p.y;
        if ((ddx < 0 ? -ddx : ddx) <= BOSS.hitRadius && (ddy < 0 ? -ddy : ddy) <= BOSS.depthTolerance) {
          this.damageBoss(p);
          this.releaseReservation(p);
          p.active = false;
          continue;
        }
      }

      const expired =
        this.time - p.spawnTime > p.lifetime || p.y > ROAD_LENGTH + 0.6 || p.x < -1.6 || p.x > 1.6 || p.traveled > p.planned + 1.4;
      if (expired) {
        this.releaseReservation(p);
        p.active = false;
      }
    }
  }

  private damageEnemy(e: Enemy, p: Projectile): void {
    e.hp -= p.damage;
    e.hitFlash = 0.08;
    e.lastHitDir = p.vx >= 0 ? 1 : -1;
    this.stats.hits++;
    const h = p.h0 + (p.h1 - p.h0) * Math.min(1, p.traveled / p.planned);
    this.spawnVfx('impact', p.x, e.pos.y - 0.05, h, Math.atan2(p.vx, p.vy), e.kind === 'elite' ? 1.2 : 1);
    if (e.hp <= 0) {
      e.death = 0.0001;
      this.kills++;
      this.stats.kills = this.kills;
      this.spawnVfx(e.kind === 'elite' ? 'death-elite' : 'death', e.pos.x, e.pos.y, 0.15, 0, e.sizeVariation);
      if (e.kind === 'elite') this.spawnPopup(e.pos.x, e.pos.y, 0.5, Math.round(p.damage), true);
    }
  }

  private damageBoss(p: Projectile): void {
    const b = this.boss;
    b.hp -= p.damage;
    b.hitFlash = 0.06;
    this.stats.hits++;
    const h = p.h0 + (p.h1 - p.h0) * Math.min(1, p.traveled / p.planned);
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
    const anchorX = this.anchorX;
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
      // Gentle lateral life: wander + slight pressure toward the squad.
      e.wanderPhase += dt * 1.7;
      const drift = Math.sin(e.wanderPhase) * 0.06 + (anchorX - e.pos.x) * 0.03;
      e.pos.x = clamp(e.pos.x + drift * dt, -0.95, 0.95);

      if (e.pos.y <= ENEMIES.contactY) {
        e.alive = false;
        removed = true;
        this.spawnVfx('impact', e.pos.x, 0.05, 0.25, 0, 1.4);
        this.loseSoldier('contact');
      }
    }
    if (removed) {
      for (const e of this.enemies) if (!e.alive) this.enemyById.delete(e.id);
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
      if (b.death >= 1 && this.phase === 'playing') {
        this.phase = 'victory';
        this.endTimer = 0;
        this.pushEvent({ type: 'victory', message: 'CAUSEWAY SECURED' });
      }
      return;
    }
    if (this.phase !== 'playing') return;

    if (b.pos.y > BOSS.holdY) {
      b.pos.y = Math.max(BOSS.holdY, b.pos.y - BOSS.approachSpeed * dt);
    } else {
      // Track the squad laterally, slowly.
      b.targetX = clamp(this.anchorX * 0.8, -0.5, 0.5);
      const step = BOSS.lateralSpeed * dt;
      const diff = b.targetX - b.pos.x;
      b.pos.x += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
    }

    if (b.telegraph > 0) {
      b.telegraph -= dt;
      if (b.telegraph <= 0) {
        // Slam lands.
        this.spawnVfx('boss-slam', b.pos.x, 0.4, 0, 0, 1);
        const hit = Math.abs(this.anchorX - b.pos.x) < BOSS.slamHalfWidth;
        this.pushEvent({ type: 'boss-slam', shake: hit ? 0.9 : 0.5 });
        if (hit) this.loseSoldier('slam');
        b.nextAttackIn = b.phase === 2 ? BOSS.attackIntervalPhase2 : BOSS.attackInterval;
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
    reserved: 0,
    age: 0,
    hitFlash: 0,
    telegraph: 0,
    nextAttackIn: BOSS.attackInterval,
    phase: 1,
    death: 0,
    targetX: 0,
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
    h0: 0,
    h1: 0,
    planned: 1,
    traveled: 0,
    damage: 0,
    targetId: null,
    targetKind: null,
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
