/**
 * Headless stage-system checks. Run with `pnpm run test:sim:stages`.
 *
 * Covers the brief's Tests A–F: Stage 1 flow (group kills never advance the stage),
 * Stage 2 volume, Stage 5 boss flow, post-boss relief, Stage 10 auto-boss and
 * 100-stage config compatibility, plus campaign-save migration.
 *
 * Runs use an "autopilot" that drags the squad under the nearest enemy every frame
 * — the input a competent player provides. There is no aim assist in the engine.
 */
import { ENEMIES } from '../balance';
import { defaultCampaign, migrateCampaign, recordStageCleared } from '../campaign-progress';
import { Game } from '../engine';
import { STAGES, bossHpFor, isBossStage, isMajorBossStage, stageConfig, stageDifficulty, stageEnemyCount } from '../stages';
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
    // Autopilot: park the lanes under the nearest live threat.
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
        if (g.remainingScheduledSpawns > 0) trace.clearedBeforeAllSpawned = true;
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

// Config sanity across the whole campaign ---------------------------------------
{
  const problems: string[] = [];
  let prevDiff = 0;
  for (let n = 1; n <= 120; n++) {
    const cfg = stageConfig(n);
    const groups = cfg.sequences.reduce((a, s) => a + s.groups.length, 0);
    if (cfg.id !== n) problems.push(`${n}: id`);
    if (groups < 2) problems.push(`${n}: only ${groups} group`);
    if ((cfg.boss !== undefined) !== isBossStage(n)) problems.push(`${n}: boss flag`);
    if (cfg.boss && (cfg.boss.tier === 'major') !== isMajorBossStage(n)) problems.push(`${n}: major tier`);
    if (stageEnemyCount(cfg) > ENEMIES.maxAlive) problems.push(`${n}: too many enemies`);
    if (cfg.rewardMultiplier !== (cfg.boss ? STAGES.rewards.bossStageRewardMultiplier : 1)) problems.push(`${n}: reward`);
    const relief = n > 1 && isBossStage(n - 1);
    if (!relief && cfg.difficulty < prevDiff) problems.push(`${n}: difficulty dropped without relief`);
    if (relief && cfg.difficulty >= prevDiff) problems.push(`${n}: no post-boss relief`);
    prevDiff = cfg.difficulty;
    if (stageConfig(n) !== cfg) problems.push(`${n}: not memoised`);
  }
  check('Test F: stages 1–120 are data-driven and valid (boss every 5, major every 10, smooth curve with post-boss relief)', problems.length === 0, problems.length === 0 ? `120 configs; stage 100 has ${stageEnemyCount(stageConfig(100))} enemies in ${stageConfig(100).sequences.length} sequences` : problems.slice(0, 5).join('; '));
}

// Early bands from the brief -----------------------------------------------------
{
  const counts = [1, 2, 3, 4, 5].map((n) => stageEnemyCount(stageConfig(n)));
  const bands: [number, number][] = [
    [8, 12],
    [12, 16],
    [15, 20],
    [20, 25],
    [10, 20],
  ];
  const ok = counts.every((c, i) => c >= bands[i][0] && c <= bands[i][1]) && stageConfig(1).sequences.every((s) => s.groups.every((g) => g.kind === 'grunt' && g.count <= 3));
  check('Stages 1–5: enemy totals inside the tutorial bands, Stage 1 is grunt-only groups of 2–3', ok, `totals ${counts.join('/')}; hp× ${[1, 2, 3, 4, 5].map((n) => stageConfig(n).enemyHpMultiplier).join('/')}`);
}

// Test A — Stage 1 flow -------------------------------------------------------------
{
  const g = new Game({ seed: 3 });
  let stageAfterFirstGroup = -1;
  let stateAfterFirstGroup = '';
  const t = play(g, 90, (game) => {
    if (stageAfterFirstGroup < 0 && game.kills >= 2) {
      stageAfterFirstGroup = game.stage;
      stateAfterFirstGroup = game.stageState;
    }
    return game.stage === 2 && game.stageState === 'ACTIVE';
  });
  const ev = types(t, 1);
  const noWave = t.events.every((e) => !(e.message ?? '').toUpperCase().includes('WAVE'));
  const clearAt = t.events.find((e) => e.type === 'stage-clear' && e.stage === 1)?.t ?? -1;
  check(
    'Test A: Stage 1 — first group kill does not advance, stage completes only after all spawns and kills',
    ev[0] === 'stage-start' && stageAfterFirstGroup === 1 && stateAfterFirstGroup === 'ACTIVE' && ev.includes('stage-clear') && !t.clearedBeforeAllSpawned && !t.clearedWithEnemiesAlive && noWave && g.stage === 2 && g.squadSize > 0,
    `stage 1 cleared at ${clearAt.toFixed(1)}s with ${g.kills} kills, squad ${g.squadSize}; events: ${ev.join(' → ')}`,
  );
  const start2 = t.events.find((e) => e.type === 'stage-start' && e.stage === 2)?.t ?? -1;
  check('Stage transition: STAGE CLEAR → next STAGE banner within 0.8–2.5 s, no menu', start2 > clearAt && start2 - clearAt >= 0.8 && start2 - clearAt <= 2.5, `gap ${(start2 - clearAt).toFixed(2)}s`);
}

// Test B — Stage 2 volume / smoothness -----------------------------------------------
{
  const c1 = stageEnemyCount(stageConfig(1));
  const c2 = stageEnemyCount(stageConfig(2));
  const g = new Game({ seed: 5, startStage: 2 });
  const t = play(g, 90, (game) => game.stage === 3);
  check('Test B: Stage 2 has more enemies than Stage 1, stays easy (5-soldier squad clears it without losses)', c2 > c1 && c2 <= c1 * 1.6 && g.stage === 3 && g.squadSize === 5 && !t.clearedWithEnemiesAlive, `${c1} → ${c2} enemies; cleared in ${t.seconds.toFixed(1)}s, squad ${g.squadSize}`);
}

// Test C — Stage 5 boss flow -------------------------------------------------------
{
  // A normally progressed player reaches Stage 5 with a few gates taken.
  const g = new Game({ seed: 11, startStage: 5, initialSquad: 12 });
  const t = play(g, 200, (game) => game.stage === 6);
  const ev = types(t, 5).filter((x) => x !== 'gate' && x !== 'soldier-lost' && x !== 'boss-slam' && x !== 'boss-phase');
  const expected = ['stage-start', 'boss-warning', 'boss-spawn', 'boss-defeated', 'stage-clear'];
  const warn = t.events.find((e) => e.type === 'boss-warning')!;
  const spawn = t.events.find((e) => e.type === 'boss-spawn')!;
  check(
    'Test C: Stage 5 — enemy sequence → BOSS INCOMING → boss → defeat → STAGE CLEAR; never completes before the boss dies',
    JSON.stringify(ev) === JSON.stringify(expected) && !t.advancedWithBossAlive && g.stage === 6 && warn && spawn && spawn.t - warn.t >= 0.8 && spawn.t - warn.t <= 1.5,
    `events: ${ev.join(' → ')}; warning→boss ${warn && spawn ? (spawn.t - warn.t).toFixed(2) : '?'}s; boss hp ${bossHpFor(stageConfig(5).boss!)}; total ${t.seconds.toFixed(0)}s, squad ${g.squadSize}`,
  );
}

// Test D — post-boss relief -----------------------------------------------------------
{
  const d5 = stageDifficulty(5);
  const d6 = stageDifficulty(6);
  const d7 = stageDifficulty(7);
  const c6 = stageConfig(6);
  check('Test D: Stage 6 is a normal stage with lower pressure than the Stage 5 peak, then the curve resumes', !c6.boss && d6 < d5 && d7 > d6 && c6.sequences[0].startDelay === 0, `difficulty 5/6/7 = ${d5.toFixed(1)}/${d6.toFixed(1)}/${d7.toFixed(1)}; stage 6 has ${stageEnemyCount(c6)} enemies`);
}

// Test E — Stage 10 recognised automatically; state machine reaches the boss ----------
{
  const g = new Game({ seed: 2, startStage: 10, initialSquad: 20 });
  // Fast-forward the enemy sequence with the dev cheat to isolate the state machine.
  let sawWarning = false;
  let bossSpawnedInState = '';
  for (let i = 0; i < 60 * 60 && !g.boss.active; i++) {
    g.debugClearEnemies();
    g.advance(1 / 60);
    for (const e of g.drainEvents()) if (e.type === 'boss-warning') sawWarning = true;
    if (g.boss.active) bossSpawnedInState = g.stageState;
  }
  check(
    'Test E: Stage 10 is a boss stage automatically (10 % 5 === 0), major tier, boss enters after the warning',
    g.isBossStage && isBossStage(10) && isBossStage(15) && !isBossStage(11) && stageConfig(10).boss?.tier === 'major' && stageConfig(15).boss?.tier === 'boss' && sawWarning && g.boss.active && bossSpawnedInState === 'BOSS_ACTIVE',
    `boss hp ${g.boss.maxHp}, attack scale ${g.boss.attackIntervalScale.toFixed(2)}, escorts every ${stageConfig(10).boss?.escortInterval}s`,
  );
}

// Boss stage never completes while the boss lives, even with no enemies on the road ----
{
  const g = new Game({ seed: 4, startStage: 5, initialSquad: 1 });
  let sawClearWhileBossAlive = false;
  for (let i = 0; i < 60 * 60; i++) {
    g.debugClearEnemies();
    g.setInputX(0.9); // park the lone soldier away from the boss so it cannot die
    g.advance(1 / 60);
    for (const e of g.drainEvents()) if (e.type === 'stage-clear' && g.boss.alive) sawClearWhileBossAlive = true;
    if (g.boss.active && g.boss.alive && g.stageTime > 40) break;
  }
  check('Boss stage holds until the boss is defeated', !sawClearWhileBossAlive && g.stage === 5 && g.stageState === 'BOSS_ACTIVE', `state ${g.stageState} after ${g.stageTime.toFixed(0)}s, boss hp ${g.boss.hp}/${g.boss.maxHp}`);
}

// Campaign save migration ---------------------------------------------------------------
{
  const legacy = migrateCampaign({ highestUnlockedWave: 7, currentWave: 7, highestCompletedWave: 6 });
  const fresh = migrateCampaign(null);
  const garbage = migrateCampaign({ version: 99, highestUnlockedStage: 'x' });
  const cleared = recordStageCleared(defaultCampaign(), 1, new Date('2026-09-11T12:00:00Z'));
  check(
    'Campaign save: wave-era fields migrate to stages, invalid input falls back safely, clearing Stage 1 unlocks Stage 2',
    legacy.highestUnlockedStage === 7 && legacy.highestCompletedStage === 6 && fresh.highestUnlockedStage === 1 && garbage.highestUnlockedStage === 1 && cleared.highestUnlockedStage === 2 && cleared.highestCompletedStage === 1 && cleared.version === 2,
    `legacy → unlocked ${legacy.highestUnlockedStage}/completed ${legacy.highestCompletedStage}; cleared → unlocked ${cleared.highestUnlockedStage}`,
  );
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} stage checks passed`);
if (failed > 0) process.exit(1);
