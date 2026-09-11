/**
 * Headless planet / stage / Squad Power checks. Run with `pnpm run test:sim:stages`.
 *
 * Covers: Earth config validation, spawn-schedule determinism and exact counts, the
 * maxAlive defer path, stage-completion invariants (never before every regular spawned
 * and died; never with the boss alive), planet victory, the v3 campaign save (migration,
 * reducers, idempotency), gate clamping at the power cap, the representation property
 * over 0..500, spawn geometry invariants and deepest-target hit tests.
 *
 * Runs use an "autopilot" that drags the squad under the nearest enemy every frame —
 * the input a competent player provides. There is no aim assist in the engine.
 */
import { BOSS, ENEMIES, FAR_SPAWN, MAX_SQUAD_POWER, POWER_PER_UNIT, SQUAD } from '../balance';
import { createCamera } from '../camera';
import { defaultCampaign, migrateCampaign, planetProgress, recordPlanetCompleted, recordStageCleared } from '../campaign-progress';
import { Game } from '../engine';
import { EARTH, PLANETS, validatePlanet } from '../planets';
import { computeSpawnGeometry, spawnGeometryViolations } from '../spawn-geometry';
import { createSpawnSchedule } from '../spawn-schedule';
import { assertRepresentationBounds, representationFor, visibleUnitCount } from '../squad-power';
import { EARTH_STAGES, STAGES } from '../stages';
import type { GameEvent } from '../types';

interface Result {
  name: string;
  pass: boolean;
  detail: string;
}
const results: Result[] = [];
function check(name: string, pass: boolean, detail: string): void {
  results.push({ name, pass, detail });
}

interface Trace {
  events: (GameEvent & { t: number; stage: number })[];
  clearedBeforeAllSpawned: boolean;
  clearedWithEnemiesAlive: boolean;
  advancedWithBossAlive: boolean;
  seconds: number;
}

/** Steps the director-driven game with a nearest-enemy autopilot until `until` is true or the time budget runs out. */
function play(g: Game, seconds: number, until: (g: Game) => boolean): Trace {
  const trace: Trace = { events: [], clearedBeforeAllSpawned: false, clearedWithEnemiesAlive: false, advancedWithBossAlive: false, seconds: 0 };
  const dt = 1 / 60;
  let lastStage = g.stage;
  for (let i = 0; i < seconds * 60; i++) {
    let targetX = g.boss.active && g.boss.alive ? g.boss.pos.x : g.targetAnchorX;
    let nearest = Infinity;
    for (const e of g.enemies) {
      if (e.alive && e.death === 0 && e.pos.y < nearest) {
        nearest = e.pos.y;
        targetX = e.pos.x;
      }
    }
    g.setInputX(targetX);
    g.advance(dt);
    trace.seconds += dt;
    for (const e of g.drainEvents()) {
      trace.events.push({ ...e, t: trace.seconds, stage: g.stage });
      if (e.type === 'stage-clear') {
        if (g.remainingScheduledSpawns > 0 || g.spawnedRegulars !== g.stageConfig.enemyCount) trace.clearedBeforeAllSpawned = true;
        if (g.activeEnemyCount > 0) trace.clearedWithEnemiesAlive = true;
      }
    }
    if (g.stage !== lastStage) {
      if (g.boss.active && g.boss.alive) trace.advancedWithBossAlive = true;
      lastStage = g.stage;
    }
    if (until(g)) break;
  }
  return trace;
}

const types = (t: Trace, stage?: number) => t.events.filter((e) => stage === undefined || e.stage === stage).map((e) => e.type);

// Earth config validation ---------------------------------------------------------------
{
  let err = '';
  try {
    for (const p of Object.values(PLANETS)) validatePlanet(p);
  } catch (e) {
    err = String(e);
  }
  const counts = EARTH_STAGES.map((s) => s.enemyCount);
  const hp = EARTH_STAGES.map((s) => s.enemyHP);
  const windows = EARTH_STAGES.map((s) => s.spawnWindowSec);
  const monotonic = (a: number[]) => a.every((v, i) => i === 0 || v >= a[i - 1]);
  const bosses = EARTH_STAGES.map((s, i) => (s.boss ? `${i + 1}:${s.boss.type}` : null)).filter(Boolean);
  check(
    'Earth: 10 stages, counts 36→120, HP 20→120, windows 60→90 s, sub-boss at 5, final at 10, no reward multiplier',
    err === '' && EARTH.stages.length === 10 && counts[0] === 36 && counts[9] === 120 && hp[0] === 20 && hp[9] === 120 && windows[0] === 60 && windows[9] === 90 && monotonic(counts) && monotonic(hp) && monotonic(windows) && bosses.join(',') === '5:sub,10:final' && !('rewardMultiplier' in EARTH_STAGES[4]) && EARTH_STAGES[0].archetypeMix.grunt === 1,
    err || `counts ${counts.join('/')}; hp ${hp.join('/')}; windows ${windows.join('/')}; bosses ${bosses.join(', ')}; final hp ${EARTH_STAGES[9].boss?.hp}`,
  );
}

// Spawn schedule: deterministic, exact count, group bounds, lands at the window -------
{
  let ok = true;
  const rows: string[] = [];
  for (const cfg of EARTH_STAGES) {
    const a = createSpawnSchedule(cfg, 1234);
    const b = createSpawnSchedule(cfg, 1234);
    const c = createSpawnSchedule(cfg, 4321);
    const same = JSON.stringify(a.events) === JSON.stringify(b.events);
    const differs = JSON.stringify(a.events) !== JSON.stringify(c.events);
    const sorted = a.events.every((e, i) => i === 0 || e.time >= a.events[i - 1].time);
    const sizes = new Map<number, number>();
    for (const e of a.events) sizes.set(e.group, (sizes.get(e.group) ?? 0) + 1);
    const groupsOk = [...sizes.entries()].every(([g, n]) => (g === a.groupCount - 1 ? n >= cfg.minGroupSize : n >= cfg.minGroupSize && n <= cfg.maxGroupSize));
    const last = a.events[a.events.length - 1].time;
    const landsOk = Math.abs(last - cfg.spawnWindowSec) < 1e-6;
    const kinds = new Set(a.events.map((e) => e.kind));
    if (!(same && differs && sorted && a.events.length === cfg.enemyCount && a.totalRegulars === cfg.enemyCount && groupsOk && landsOk)) {
      ok = false;
      rows.push(`stage ${cfg.id}: same ${same} differs ${differs} sorted ${sorted} n ${a.events.length}/${cfg.enemyCount} groups ${groupsOk} last ${last.toFixed(2)}`);
    } else rows.push(`${cfg.id}:${a.groupCount}g/${[...kinds].join('+')}`);
  }
  check('Schedule: same seed → identical events, other seed differs, sum == enemyCount, groups within bounds, last spawn == spawnWindowSec', ok, rows.join(' '));
}

// Spawn geometry: camera-derived envelope, invariants on phone and tablet ----------------
{
  const rows: string[] = [];
  let ok = true;
  for (const [w, h] of [
    [402, 874],
    [1024, 1366],
    [360, 640],
  ]) {
    const geo = computeSpawnGeometry(createCamera(w, h));
    const v = spawnGeometryViolations(geo);
    if (v.length > 0) ok = false;
    rows.push(`${w}×${h}: far ${geo.farVisibleDepth.toFixed(1)} spawn ${geo.enemySpawnDepth.toFixed(1)} boss ${geo.bossSpawnDepth.toFixed(1)} combat ${geo.combatDepth.toFixed(1)} rows ${geo.gridRows}${v.length ? ' VIOLATION ' + v.join(';') : ''}`);
  }
  check('Geometry: enemySpawnDepth = far − regularInset, boss deeper, combatDepth covers both, everything inside farVisibleDepth', ok, rows.join(' | '));
}

// Deepest targets are hittable: regular at maxRegularSpawnDepth and boss at bossSpawnDepth
{
  const g = new Game({ seed: 9, initialSquadPower: 1 });
  g.scripted = true;
  const geo = g.geometry;
  const e = g.spawnEnemy('grunt', 0, 99);
  e.speed = 0;
  e.hp = 1e9;
  e.pos.x = g.soldiers[0].slot.x;
  const before = g.stats.hits;
  for (let i = 0; i < 60 * 4; i++) {
    g.setInputX(0);
    g.advance(1 / 60);
  }
  const regularHit = g.stats.hits - before;
  const gb = new Game({ seed: 9, initialSquadPower: 1 });
  gb.scripted = true;
  gb.spawnBoss();
  gb.boss.approachSpeed = 0;
  const bhp = gb.boss.hp;
  for (let i = 0; i < 60 * 4; i++) {
    gb.setInputX(gb.boss.pos.x);
    gb.advance(1 / 60);
  }
  check(
    'Geometry: regular parked at maxRegularSpawnDepth and boss parked at bossSpawnDepth both take hits',
    e.pos.y === geo.maxRegularSpawnDepth && regularHit > 0 && gb.boss.pos.y === geo.bossSpawnDepth && gb.boss.hp < bhp,
    `regular y ${e.pos.y.toFixed(2)} hits ${regularHit}; boss y ${gb.boss.pos.y.toFixed(2)} hp ${bhp} → ${gb.boss.hp}`,
  );
}

// Representation property test 0..500 ------------------------------------------------
{
  let err = '';
  try {
    assertRepresentationBounds();
  } catch (e) {
    err = String(e);
  }
  let ok = err === '';
  const bad: string[] = [];
  for (let p = 0; p <= MAX_SQUAD_POWER; p++) {
    const rep = representationFor(p);
    const sum = rep.reduce((a, b) => a + b, 0);
    const full = rep.filter((r) => r === POWER_PER_UNIT).length;
    const partials = rep.filter((r) => r !== POWER_PER_UNIT);
    const expectVisible = p < POWER_PER_UNIT ? p : Math.ceil(p / POWER_PER_UNIT);
    const good =
      sum === p &&
      rep.length === visibleUnitCount(p) &&
      rep.length === expectVisible &&
      rep.length <= SQUAD.maxSize &&
      (p < POWER_PER_UNIT ? rep.every((r) => r === 1) : partials.length <= 1 && full === Math.floor(p / POWER_PER_UNIT) && (partials.length === 0 || rep[rep.length - 1] === partials[0])) &&
      rep.every((r) => r >= 1 && r <= POWER_PER_UNIT);
    if (!good) {
      ok = false;
      if (bad.length < 5) bad.push(`${p}→[${rep.join(',')}]`);
    }
  }
  check(
    'Squad Power: every power 0..500 sums exactly, ≤ 50 visible, full units first, single partial last, <10 = all P1',
    ok,
    err || (bad.length ? bad.join(' ') : `5→${representationFor(5).length} visible, 9→${representationFor(9).length}, 10→${representationFor(10).join('')}, 13→${representationFor(13).join(',')}, 499→${representationFor(499).length} visible, 500→${representationFor(500).length}`),
  );
}

// Engine mirrors the representation and damage scales with representedPower ----------
{
  const g = new Game({ seed: 1, initialSquadPower: 5 });
  g.scripted = true;
  const v5 = g.visibleSquadCount;
  g.addSquadPower(4, false); // 9
  const v9 = g.visibleSquadCount;
  const ids9 = g.soldiers.filter((s) => s.alive && s.death === 0).map((s) => s.id);
  g.addSquadPower(1, false); // 10 → one P10
  const v10 = g.visibleSquadCount;
  const p10 = g.soldiers.find((s) => s.alive && s.death === 0)!;
  const keptFront = ids9[0] === p10.id;
  g.addSquadPower(3, false); // 13 → P10 + P3
  const rep13 = g.soldiers.filter((s) => s.alive && s.death === 0).map((s) => s.representedPower);
  g.setSquadPower(500);
  const v500 = g.visibleSquadCount;
  const applied = g.addSquadPower(10);
  g.loseSquadPower(1, 'contact');
  const rep499 = g.soldiers.filter((s) => s.alive && s.death === 0).map((s) => s.representedPower);
  g.setSquadPower(10);
  const shots: number[] = [];
  g.onShot(() => shots.push(1));
  let dmg = 0;
  for (let i = 0; i < 60; i++) {
    g.advance(1 / 60);
    for (const p of g.projectiles) if (p.active) dmg = Math.max(dmg, p.damage);
  }
  check(
    'Squad Power ↔ roster: 5→5, 9→9, 10→1×P10 (front soldier kept), 13→P10+P3, 500→50 visible, cap rejects, 499→49×P10+P9, P10 bullet = 10× damage',
    v5 === 5 && v9 === 9 && v10 === 1 && keptFront && p10.representedPower === 10 && rep13.join(',') === '10,3' && v500 === 50 && applied === 0 && g.squadPower === 10 && rep499.length === 50 && rep499[49] === 9 && rep499.slice(0, 49).every((r) => r === 10) && Math.abs(dmg - 10 * 10) < 1e-9 && !g.progressEligible,
    `visible 5/${v5} 9/${v9} 10/${v10} 500/${v500}; 13 → [${rep13.join(',')}]; +10 at cap applied ${applied}; 499 tail ${rep499[49]}; P10 damage ${dmg}`,
  );
}

// Stage 1 flow: never completes early, transition to Stage 2 without a menu ------------
{
  const g = new Game({ seed: 7 });
  const eligibleAtStart = g.progressEligible;
  let stageAfterFirstKills = -1;
  const t = play(g, 200, (game) => {
    if (stageAfterFirstKills < 0 && game.kills >= 2) stageAfterFirstKills = game.stage;
    return game.stage === 2 && game.stageState === 'ACTIVE';
  });
  const ev = types(t, 1);
  const clearAt = t.events.find((e) => e.type === 'stage-clear' && e.stage === 1)?.t ?? -1;
  const start2 = t.events.find((e) => e.type === 'stage-start' && e.stage === 2)?.t ?? -1;
  const log = g.stageLog[0];
  check(
    'Stage 1: first kills do not advance; completes only after all 36 spawned and killed; still progress-eligible',
    eligibleAtStart && g.progressEligible && ev[0] === 'stage-start' && stageAfterFirstKills === 1 && ev.includes('stage-clear') && !t.clearedBeforeAllSpawned && !t.clearedWithEnemiesAlive && g.stage === 2 && log && log.spawnedRegulars === 36 && g.squadPower > 0 && clearAt >= EARTH_STAGES[0].spawnWindowSec,
    `cleared at ${clearAt.toFixed(1)}s (window ${EARTH_STAGES[0].spawnWindowSec}s), ${g.kills} kills, power ${g.squadPower}, peak active ${log?.peakActiveEnemies}, deferred ${log?.deferredSpawns}; events: ${ev.join(' → ')}`,
  );
  check('Stage transition: STAGE CLEAR → next STAGE banner within 0.8–2.5 s, no menu', start2 > clearAt && start2 - clearAt >= 0.8 && start2 - clearAt <= 2.5, `gap ${(start2 - clearAt).toFixed(2)}s`);
}

// maxAlive defer: nothing dropped, exact count, cursor only advances when there is room
{
  const g = new Game({ seed: 3, startStage: 1, maxAliveOverride: 2, initialSquadPower: 5 });
  let overCap = false;
  let deferredSeen = 0;
  const t = play(g, 400, (game) => {
    if (game.activeEnemyCount > 2) overCap = true;
    deferredSeen = Math.max(deferredSeen, game.stats.deferredSpawns);
    return game.stage === 2;
  });
  const log = g.stageLog[0];
  check(
    'maxAlive defer: with cap 2 the scheduler waits (deferred > 0), never exceeds the cap, still spawns exactly enemyCount and completes',
    !overCap && deferredSeen > 0 && log && log.spawnedRegulars === EARTH_STAGES[0].enemyCount && g.stage === 2 && !t.clearedBeforeAllSpawned && !t.clearedWithEnemiesAlive,
    `deferred ${deferredSeen}, spawned ${log?.spawnedRegulars}/${EARTH_STAGES[0].enemyCount}, cleared in ${t.seconds.toFixed(0)}s`,
  );
}

// Stage 5 sub-boss flow --------------------------------------------------------------
{
  const g = new Game({ seed: 11, startStage: 5, initialSquadPower: 60 });
  const t = play(g, 400, (game) => game.stage === 6);
  const ev = types(t, 5).filter((x) => x !== 'gate' && x !== 'soldier-lost' && x !== 'boss-slam' && x !== 'boss-phase');
  const expected = ['stage-start', 'boss-warning', 'boss-spawn', 'boss-defeated', 'stage-clear'];
  const warn = t.events.find((e) => e.type === 'boss-warning');
  const spawn = t.events.find((e) => e.type === 'boss-spawn');
  check(
    'Stage 5: regulars → BOSS INCOMING → WARDEN OF THE CAUSEWAY (far entry, sub) → defeat → STAGE CLEAR; never completes before the boss dies',
    JSON.stringify(ev) === JSON.stringify(expected) && !t.advancedWithBossAlive && g.stage === 6 && !!warn && !!spawn && spawn.t - warn.t >= 0.8 && spawn.t - warn.t <= 1.5 && spawn.message === 'WARDEN OF THE CAUSEWAY',
    `events: ${ev.join(' → ')}; warning→boss ${warn && spawn ? (spawn.t - warn.t).toFixed(2) : '?'}s; total ${t.seconds.toFixed(0)}s, power ${g.squadPower}`,
  );
}

// Boss spawns at the far boundary and approach speed is semantic --------------------------
{
  const g = new Game({ seed: 2, startStage: 10, initialSquadPower: 1 });
  g.scripted = true;
  g.spawnBoss();
  const b = g.boss;
  const cfg = EARTH_STAGES[9].boss!;
  const expectSpeed = (g.geometry.bossSpawnDepth - BOSS.holdY) / cfg.approachDurationTargetSec;
  g.setInputX(0.9);
  let reached = -1;
  for (let i = 0; i < 60 * 30 && reached < 0; i++) {
    g.setInputX(0.9);
    g.advance(1 / 60);
    if (g.bossTiming.holdReachedTime !== null) reached = g.bossTiming.holdReachedTime - (g.bossTiming.spawnTime ?? 0);
  }
  check(
    'Boss: spawns at bossSpawnDepth, type final, HIGH WARDEN, approachSpeed = (spawn − hold)/target, reaches hold in ≈ target seconds',
    b.type === 'final' && b.maxHp === cfg.hp && Math.abs(b.approachSpeed - expectSpeed) < 1e-9 && reached > 0 && Math.abs(reached - cfg.approachDurationTargetSec) < 0.2 && g.boss.attackIntervalScale === cfg.attackIntervalMultiplier,
    `spawn y ${g.geometry.bossSpawnDepth.toFixed(2)}, speed ${b.approachSpeed.toFixed(3)}, hold reached after ${reached.toFixed(2)}s (target ${cfg.approachDurationTargetSec}s), hp ${b.maxHp}`,
  );
}

// Boss stage never completes while the boss lives ----------------------------------------
{
  const g = new Game({ seed: 4, startStage: 5, initialSquadPower: 1 });
  let sawClearWhileBossAlive = false;
  let bossAt = -1;
  for (let i = 0; i < 60 * 130; i++) {
    g.debugClearEnemies();
    g.setInputX(0.9);
    g.advance(1 / 60);
    if (g.boss.active && bossAt < 0) {
      bossAt = g.stageTime;
      g.boss.hp = 1e9; // the state machine, not the fight, is under test
    }
    for (const e of g.drainEvents()) if (e.type === 'stage-clear' && g.boss.alive) sawClearWhileBossAlive = true;
    if (bossAt > 0 && g.stageTime > bossAt + 30) break;
  }
  check('Boss stage holds until the boss is defeated (even with the road empty)', !sawClearWhileBossAlive && g.stage === 5 && g.stageState === 'BOSS_ACTIVE' && g.boss.alive && !g.progressEligible, `state ${g.stageState} after ${g.stageTime.toFixed(0)}s (boss entered at ${bossAt.toFixed(0)}s), boss hp ${g.boss.hp}/${g.boss.maxHp}`);
}

// Planet victory: Stage 10 clear → 'victory', planet-complete once, no further spawns ------
{
  const g = new Game({ seed: 21, startStage: 10, initialSquadPower: 500 });
  const t = play(g, 400, (game) => game.phase === 'victory');
  const completes = t.events.filter((e) => e.type === 'planet-complete').length;
  const stageStartsAfter = t.events.filter((e) => e.type === 'stage-start').length;
  const enemiesAtVictory = g.activeEnemyCount;
  const gatesAtVictory = g.gates.length;
  for (let i = 0; i < 120; i++) g.advance(1 / 60);
  const stillVictory = g.phase === 'victory' && g.stage === 10 && g.activeEnemyCount === 0 && g.gates.length === 0;
  check(
    'Victory: clearing Stage 10 ends the run in phase victory with one planet-complete event, no Stage 11, no spawns or gates afterwards',
    g.phase === 'victory' && completes === 1 && stageStartsAfter === 1 && enemiesAtVictory === 0 && gatesAtVictory === 0 && stillVictory && g.isLastStage && g.run.stagesCleared === 1 && g.progressEligible,
    `victory after ${t.seconds.toFixed(0)}s, planet-complete ×${completes}, boss spawn→death ${((g.bossTiming.deathTime ?? 0) - (g.bossTiming.spawnTime ?? 0)).toFixed(1)}s, killedDuringApproach ${g.bossTiming.killedDuringApproach}`,
  );
}

// Gate clamp at the cap -----------------------------------------------------------------
{
  const g = new Game({ seed: 8, startStage: 3, initialSquadPower: 498 });
  let sawSquadGate = false;
  let clampedTo2 = false;
  let overCap = false;
  let plusZero = false;
  let altAtCap = false;
  for (let i = 0; i < 60 * 120; i++) {
    g.debugClearEnemies();
    // Steer into the +SQUAD side whenever one is offered so the cap is reached.
    const squadGate = g.gates.find((gt) => gt.active && gt.effect.kind === 'squad');
    g.setInputX(squadGate ? (squadGate.side === 'left' ? -0.5 : 0.5) : 0);
    g.advance(1 / 60);
    for (const gt of g.gates) {
      if (gt.effect.kind === 'squad') {
        sawSquadGate = true;
        if (gt.effect.amount === 0) plusZero = true;
        if (gt.effect.amount === 2 && g.squadPower === 498) clampedTo2 = true;
      }
    }
    if (g.squadPower === MAX_SQUAD_POWER && g.gates.length === 2 && g.gates.every((gt) => gt.effect.kind !== 'squad')) altAtCap = true;
    if (g.squadPower > MAX_SQUAD_POWER) overCap = true;
    if (altAtCap && g.gates.some((gt) => gt.consumed)) break;
  }
  check(
    'Gates: +SQUAD clamped to the room left (498 → +2), power never exceeds 500, no +0 gate, at the cap the squad side becomes a modifier',
    sawSquadGate && clampedTo2 && !overCap && !plusZero && altAtCap && g.squadPower === MAX_SQUAD_POWER,
    `power ${g.squadPower}, clampedTo2 ${clampedTo2}, altAtCap ${altAtCap}, plusZero ${plusZero}`,
  );
}

// Gate timer keeps ticking across stage states (suppressed only while a boss lives) ----------
{
  const g = new Game({ seed: 12, startStage: 1, initialSquadPower: 50 });
  let gatesDuringIntro = 0;
  let gatesWhileBossAlive = 0;
  let gateSpawns = 0;
  let lastGateCount = 0;
  let sawIntro = false;
  const t = play(g, 200, (game) => {
    if (game.stageState === 'INTRO') sawIntro = true;
    if (game.gates.length > lastGateCount) {
      gateSpawns++;
      if (game.stageState === 'INTRO') gatesDuringIntro++;
      if (game.boss.active && game.boss.alive) gatesWhileBossAlive++;
    }
    lastGateCount = game.gates.length;
    return game.stage === 2 && game.stageTime > 10;
  });
  check('Gates: cadence continues across INTRO/ACTIVE/CLEARING, none while a boss is alive', sawIntro && gateSpawns >= 3 && gatesWhileBossAlive === 0, `${gateSpawns} gate pairs in ${t.seconds.toFixed(0)}s (${gatesDuringIntro} during INTRO), boss-alive gates ${gatesWhileBossAlive}`);
}

// Far spawn: regulars enter at the far boundary with the fade budget ----------------------
{
  const g = new Game({ seed: 5, startStage: 4 });
  let minSpawnY = Infinity;
  let maxSpawnY = -Infinity;
  const seen = new Set<number>();
  play(g, 20, (game) => {
    for (const e of game.enemies) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        minSpawnY = Math.min(minSpawnY, e.pos.y);
        maxSpawnY = Math.max(maxSpawnY, e.pos.y);
      }
    }
    return seen.size >= 12;
  });
  const geo = g.geometry;
  check(
    'Far spawn: every regular enters at enemySpawnDepth (+ jitter) and never beyond maxRegularSpawnDepth',
    seen.size >= 12 && minSpawnY >= geo.enemySpawnDepth - 0.3 && maxSpawnY <= geo.maxRegularSpawnDepth + 1e-9 && maxSpawnY <= geo.enemySpawnDepth + FAR_SPAWN.depthJitter + 1e-9 && ENEMIES.maxAlive >= 40,
    `${seen.size} spawns, y ∈ [${minSpawnY.toFixed(2)}, ${maxSpawnY.toFixed(2)}], enemySpawnDepth ${geo.enemySpawnDepth.toFixed(2)}, far ${geo.farVisibleDepth.toFixed(2)}`,
  );
}

// Dev entry points latch progressEligible; the campaign path keeps it ------------------------
{
  const a = new Game({ seed: 1 });
  a.devJumpToStage(3);
  const b = new Game({ seed: 1 });
  b.setSquadPower(100);
  const c = new Game({ seed: 1 });
  c.devAddSquadPower(5);
  const d = new Game({ seed: 1 });
  d.spawnEnemy('grunt', 0, 5);
  const e = new Game({ seed: 1 });
  e.devApplyEffect({ kind: 'damage', multiplier: 1.5 });
  const f = new Game({ seed: 1, startStage: 4 });
  f.addSquadPower(10);
  f.applyEffect({ kind: 'fireRate', multiplier: 1.25 });
  check('progressEligible: dev jump/preset/cheat/direct spawn latch false; startStage + gate effects stay eligible', !a.progressEligible && !b.progressEligible && !c.progressEligible && !d.progressEligible && !e.progressEligible && f.progressEligible && a.stage === 3, `a ${a.progressEligible} b ${b.progressEligible} c ${c.progressEligible} d ${d.progressEligible} e ${e.progressEligible} f ${f.progressEligible}`);
}

// Campaign save v3: migration, reducers, idempotency ----------------------------------------
{
  const fresh = migrateCampaign(null);
  const wave = migrateCampaign({ highestUnlockedWave: 7, currentWave: 7, highestCompletedWave: 6 });
  const v2 = migrateCampaign({ version: 2, highestUnlockedStage: 12, highestCompletedStage: 11 });
  const v2done = migrateCampaign({ version: 2, highestUnlockedStage: 40, highestCompletedStage: 39 });
  const garbage = migrateCampaign({ version: 99, planets: 'x' });
  const v3 = migrateCampaign({ version: 3, currentPlanetId: 'earth', planets: { earth: { highestCompletedStage: 4, highestUnlockedStage: 5, completed: false }, mars: { highestCompletedStage: 1 } }, updatedAt: 'x' });
  const now = new Date('2026-09-11T12:00:00Z');
  const c1 = recordStageCleared(defaultCampaign(), 'earth', 1, now);
  const c1again = recordStageCleared(c1, 'earth', 1, now);
  const cLower = recordStageCleared(c1, 'earth', 0, now);
  const c10 = recordStageCleared(defaultCampaign(), 'earth', 10, now);
  const done = recordPlanetCompleted(c1, 'earth', now);
  const doneAgain = recordPlanetCompleted(done, 'earth', now);
  const ep = (p: ReturnType<typeof defaultCampaign>) => planetProgress(p, 'earth');
  check(
    'Campaign v3: fresh = Earth 0/1; wave-era 7/6 and v2 12/11 clamp to Earth 10; v2 ≥10 = completed; unknown planets dropped; reducers monotonic + idempotent',
    fresh.version === 3 && ep(fresh).highestCompletedStage === 0 && ep(fresh).highestUnlockedStage === 1 && fresh.currentPlanetId === 'earth' &&
      ep(wave).highestCompletedStage === 6 && ep(wave).highestUnlockedStage === 7 &&
      ep(v2).highestCompletedStage === 10 && ep(v2).highestUnlockedStage === 10 && ep(v2).completed &&
      ep(v2done).completed && ep(garbage).highestUnlockedStage === 1 &&
      ep(v3).highestCompletedStage === 4 && ep(v3).highestUnlockedStage === 5 && !('mars' in v3.planets) &&
      ep(c1).highestCompletedStage === 1 && ep(c1).highestUnlockedStage === 2 && c1again === c1 && cLower === c1 &&
      ep(c10).completed && ep(c10).highestUnlockedStage === 10 && !!ep(c10).completedAt &&
      ep(done).completed && ep(done).highestCompletedStage === 10 && doneAgain === done,
    `fresh ${ep(fresh).highestCompletedStage}/${ep(fresh).highestUnlockedStage}; wave ${ep(wave).highestCompletedStage}/${ep(wave).highestUnlockedStage}; v2 ${ep(v2).highestCompletedStage}/${ep(v2).highestUnlockedStage} completed ${ep(v2).completed}; c1 → ${ep(c1).highestUnlockedStage}; c10 completed ${ep(c10).completed}`,
  );
}

// Coins: flat stage-clear reward, no multiplier -------------------------------------------
{
  const g = new Game({ seed: 21, startStage: 10, initialSquadPower: 500 });
  play(g, 400, (game) => game.phase === 'victory');
  check('Rewards: boss stage clear pays the flat stageClearCoins (no boss multiplier)', g.run.coins === STAGES.rewards.stageClearCoins && g.run.stagesCleared === 1, `coins ${g.run.coins} (flat ${STAGES.rewards.stageClearCoins})`);
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} stage checks passed`);
if (failed > 0) process.exit(1);
