/**
 * Headless Earth measurement harness (v0.4.0 Phase 13).
 *
 * Plays the whole Earth campaign (Stage 1 → 10) with a deterministic autopilot and
 * one of three mechanical gate-choice policies, then reports per-stage clear data,
 * boss approach / combat timings and the Profile B balance verdict. It never tunes
 * data: boss HP, gate cadence, gate multipliers and boss mechanics are read-only here.
 *
 *   pnpm run measure:earth              # all profiles, primary + supplemental seeds
 *   pnpm run measure:earth -- --json    # also dump the raw JSON report
 *
 * Profiles (gate-choice policies — harness only, normal play is untouched):
 *   A minimal   pick the LOWER projectedDpsScore; tie-break fireRate → damage → squad
 *   B balanced  PRIMARY. squadFactor = postPower / 5, damageFactor = postDamageMod,
 *               fireRateFactor = postFireRateMod, imbalanceRatio = max / min; pick the
 *               LOWER ratio; ties → lower score → squad → fireRate → damage
 *   C maximal   pick the HIGHER score; tie-break damage → fireRate → squad
 * projectedDpsScore = postPower × postDamageMod × postFireRateMod, computed post-choice
 * with the real modifier caps and the real clamped +Squad gain (never visible units).
 *
 * The autopilot steers to the chosen gate side before the pair is crossed and asserts
 * the effect the engine actually applied equals the one the policy picked; a mismatch
 * invalidates the measurement (the script exits non-zero).
 */
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { MAX_SQUAD_POWER, MODIFIER_CAPS, SQUAD, WEAPONS } from '../game/balance';
import { Game } from '../game/engine';
import { EARTH_STAGES } from '../game/stages';
import type { Gate, GateEffect } from '../game/types';

// ---------------------------------------------------------------------------
// Constants (measurement policy — see addendum #2 §1–§8)
// ---------------------------------------------------------------------------

export const PRIMARY_BALANCE_SEED = 1337;
export const SUPPLEMENTAL_SEEDS = [17, 29, 43, 71, 101];
const VIEWPORT = { width: 402, height: 874 };
const DT = 1 / 60;
const RUN_BUDGET_SEC = 1800;
/** Gate distance (world units) at which the autopilot commits to the chosen side. */
const GATE_COMMIT_Y = 2.6;

const THRESHOLDS = {
  sub: { min: 8, max: 20, preferredMin: 10, preferredMax: 20 },
  final: { min: 12, max: 30, preferredMin: 18, preferredMax: 30 },
  approach: { min: 8, max: 12 },
};

type Profile = 'A' | 'B' | 'C';
const PROFILES: Profile[] = ['A', 'B', 'C'];

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

interface PostState {
  power: number;
  damage: number;
  fireRate: number;
  score: number;
  imbalanceRatio: number;
}

interface GateRecord {
  stage: number;
  time: number;
  left: GateEffect;
  right: GateEffect;
  chosenSide: 'left' | 'right';
  chosenEffectByPolicy: GateEffect;
  effectActuallyApplied: GateEffect | null;
  powerBefore: number;
  post: PostState;
}

interface BossRecord {
  stage: number;
  type: 'sub' | 'final';
  hp: number;
  approachDurationTargetSec: number;
  bossSpawnTime: number;
  bossHoldReachedTime: number | null;
  bossDeathTime: number | null;
  approachCompleted: boolean;
  killedDuringApproach: boolean;
  approachSec: number | null;
  combatTTK: number | null;
  spawnToDeathSec: number | null;
  squadPowerAtEntry: number;
  visibleAtEntry: number;
  damageMod: number;
  fireRateMod: number;
  overkillDuringBoss: number;
  gatesCrossedBefore: number;
}

interface StageRecord {
  stage: number;
  count: number;
  hp: number;
  spawnWindowSec: number;
  clearTime: number;
  peakActiveEnemies: number;
  deferredSpawns: number;
  averageActiveEnemies: number;
  squadPowerAtClear: number;
}

interface RunRecord {
  profile: Profile;
  seed: number;
  outcome: 'victory' | 'defeat' | 'timeout' | 'invalid';
  invalidReason?: string;
  totalSeconds: number;
  stages: StageRecord[];
  gates: GateRecord[];
  bosses: BossRecord[];
  finalSquadPower: number;
  finalVisible: number;
  finalMods: { damage: number; fireRate: number };
  overkillDamage: number;
  damageDealt: number;
  peakActiveProjectiles: number;
  projectilePoolExhausted: number;
  peakVisibleSoldiers: number;
  simMsAvg: number;
  simMsPeak: number;
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

function projectPost(g: Game, e: GateEffect): PostState {
  let power = g.squadPower;
  let damage = g.mods.damage;
  let fireRate = g.mods.fireRate;
  switch (e.kind) {
    case 'squad':
      power = Math.min(MAX_SQUAD_POWER, power + e.amount);
      break;
    case 'damage':
      damage = Math.min(MODIFIER_CAPS.damageMax, damage * e.multiplier);
      break;
    case 'fireRate':
      fireRate = Math.min(MODIFIER_CAPS.fireRateMax, fireRate * e.multiplier);
      break;
  }
  const squadFactor = power / SQUAD.initialSize;
  const factors = [squadFactor, damage, fireRate];
  const imbalanceRatio = Math.max(...factors) / Math.min(...factors);
  return { power, damage, fireRate, score: power * damage * fireRate, imbalanceRatio };
}

const KIND_RANK: Record<Profile, GateEffect['kind'][]> = {
  A: ['fireRate', 'damage', 'squad'],
  B: ['squad', 'fireRate', 'damage'],
  C: ['damage', 'fireRate', 'squad'],
};

function tieBreak(profile: Profile, left: GateEffect, right: GateEffect): 'left' | 'right' {
  const rank = KIND_RANK[profile];
  return rank.indexOf(left.kind) <= rank.indexOf(right.kind) ? 'left' : 'right';
}

const EPS = 1e-9;

/** Returns the side the profile picks for the pair currently on the road. */
function choose(profile: Profile, g: Game, left: GateEffect, right: GateEffect): { side: 'left' | 'right'; post: PostState } {
  const pl = projectPost(g, left);
  const pr = projectPost(g, right);
  let side: 'left' | 'right';
  if (profile === 'A') {
    side = Math.abs(pl.score - pr.score) < EPS ? tieBreak(profile, left, right) : pl.score < pr.score ? 'left' : 'right';
  } else if (profile === 'C') {
    side = Math.abs(pl.score - pr.score) < EPS ? tieBreak(profile, left, right) : pl.score > pr.score ? 'left' : 'right';
  } else {
    if (Math.abs(pl.imbalanceRatio - pr.imbalanceRatio) >= EPS) side = pl.imbalanceRatio < pr.imbalanceRatio ? 'left' : 'right';
    else if (Math.abs(pl.score - pr.score) >= EPS) side = pl.score < pr.score ? 'left' : 'right';
    else side = tieBreak(profile, left, right);
  }
  return { side, post: side === 'left' ? pl : pr };
}

function sameEffect(a: GateEffect | null, b: GateEffect | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'squad' && b.kind === 'squad') return a.amount === b.amount;
  if (a.kind !== 'squad' && b.kind !== 'squad') return a.multiplier === b.multiplier;
  return false;
}

function fmtEffect(e: GateEffect | null): string {
  if (!e) return '—';
  return e.kind === 'squad' ? `+${e.amount} SQUAD` : e.kind === 'damage' ? `×${e.multiplier} DMG` : `×${e.multiplier} FR`;
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

function runProfile(profile: Profile, seed: number): RunRecord {
  const g = new Game({ seed, planetId: 'earth', startStage: 1, initialSquadPower: SQUAD.initialSize, ...VIEWPORT });
  const rec: RunRecord = {
    profile,
    seed,
    outcome: 'timeout',
    totalSeconds: 0,
    stages: [],
    gates: [],
    bosses: [],
    finalSquadPower: 0,
    finalVisible: 0,
    finalMods: { damage: 1, fireRate: 1 },
    overkillDamage: 0,
    damageDealt: 0,
    peakActiveProjectiles: 0,
    projectilePoolExhausted: 0,
    peakVisibleSoldiers: 0,
    simMsAvg: 0,
    simMsPeak: 0,
  };

  // Per-stage running sums for average active enemies.
  const activeSum = new Map<number, { sum: number; frames: number }>();
  // Gate pairs currently on the road, keyed by the left gate id.
  const pending = new Map<number, GateRecord & { leftId: number; rightId: number }>();
  let currentBoss: (BossRecord & { overkillAtEntry: number }) | null = null;
  let simMsSum = 0;
  let frames = 0;
  let loggedStages = 0;

  const finishBoss = () => {
    if (!currentBoss) return;
    const t = g.bossTiming;
    currentBoss.bossHoldReachedTime = t.holdReachedTime;
    currentBoss.bossDeathTime = t.deathTime;
    currentBoss.approachCompleted = t.holdReachedTime !== null;
    currentBoss.killedDuringApproach = t.killedDuringApproach;
    currentBoss.approachSec = t.holdReachedTime !== null ? t.holdReachedTime - currentBoss.bossSpawnTime : null;
    currentBoss.combatTTK = t.holdReachedTime !== null && t.deathTime !== null ? t.deathTime - t.holdReachedTime : null;
    currentBoss.spawnToDeathSec = t.deathTime !== null ? t.deathTime - currentBoss.bossSpawnTime : null;
    currentBoss.overkillDuringBoss = g.stats.overkillDamage - currentBoss.overkillAtEntry;
    const { overkillAtEntry: _drop, ...clean } = currentBoss;
    rec.bosses.push(clean);
    currentBoss = null;
  };

  for (let i = 0; i < RUN_BUDGET_SEC * 60; i++) {
    // ---- gate bookkeeping: detect new pairs, decide, and verify consumed ones ----
    const live = g.gates;
    for (let k = 0; k + 1 < live.length; k++) {
      const a = live[k];
      const b = live[k + 1];
      if (a.side !== 'left' || b.side !== 'right' || Math.abs(a.y - b.y) > 1e-6) continue;
      if (pending.has(a.id) || a.consumed || b.consumed) continue;
      const decision = choose(profile, g, a.effect, b.effect);
      const record = {
        stage: g.stage,
        time: g.time,
        left: a.effect,
        right: b.effect,
        chosenSide: decision.side,
        chosenEffectByPolicy: decision.side === 'left' ? a.effect : b.effect,
        effectActuallyApplied: null as GateEffect | null,
        powerBefore: g.squadPower,
        post: decision.post,
        leftId: a.id,
        rightId: b.id,
      };
      pending.set(a.id, record);
      rec.gates.push(record);
    }
    for (const [id, p] of pending) {
      const l = live.find((x: Gate) => x.id === p.leftId);
      const r = live.find((x: Gate) => x.id === p.rightId);
      if (!l || !r) {
        // Gates recycled — only legal after both were consumed and we recorded the result.
        if (p.effectActuallyApplied === null) {
          rec.outcome = 'invalid';
          rec.invalidReason = `gate pair at ${p.time.toFixed(1)}s vanished before an effect was applied (stage ${p.stage})`;
        }
        pending.delete(id);
        continue;
      }
      if (l.consumed && r.consumed) {
        const applied = l.triggeredAt !== null ? l.effect : r.triggeredAt !== null ? r.effect : null;
        p.effectActuallyApplied = applied;
        if (!sameEffect(applied, p.chosenEffectByPolicy)) {
          rec.outcome = 'invalid';
          rec.invalidReason = `policy chose ${fmtEffect(p.chosenEffectByPolicy)} but engine applied ${fmtEffect(applied)} at ${p.time.toFixed(1)}s (stage ${p.stage})`;
        }
        pending.delete(id);
      }
    }
    if (rec.outcome === 'invalid') break;

    // ---- steering: commit to the chosen gate side, otherwise chase the nearest threat ----
    let targetX: number | null = null;
    let nearestGate = Infinity;
    for (const p of pending.values()) {
      const l = live.find((x: Gate) => x.id === p.leftId);
      if (l && !l.consumed && l.y < GATE_COMMIT_Y && l.y < nearestGate) {
        nearestGate = l.y;
        targetX = p.chosenSide === 'left' ? -0.6 : 0.6;
      }
    }
    if (targetX === null) {
      targetX = g.boss.active && g.boss.alive ? g.boss.pos.x : g.targetAnchorX;
      let nearest = Infinity;
      for (const e of g.enemies) {
        if (e.alive && e.death === 0 && e.pos.y < nearest) {
          nearest = e.pos.y;
          targetX = e.pos.x;
        }
      }
    }
    g.setInputX(targetX);

    // ---- step ----
    const t0 = performance.now();
    g.advance(DT);
    const ms = performance.now() - t0;
    simMsSum += ms;
    if (ms > rec.simMsPeak) rec.simMsPeak = ms;
    frames++;
    g.drainEvents();

    // ---- boss tracking ----
    if (g.bossTiming.spawnTime !== null && (!currentBoss || currentBoss.bossSpawnTime !== g.bossTiming.spawnTime)) {
      finishBoss();
      const cfg = g.stageConfig.boss;
      currentBoss = {
        stage: g.stage,
        type: g.boss.type,
        hp: g.boss.maxHp,
        approachDurationTargetSec: cfg?.approachDurationTargetSec ?? 0,
        bossSpawnTime: g.bossTiming.spawnTime,
        bossHoldReachedTime: null,
        bossDeathTime: null,
        approachCompleted: false,
        killedDuringApproach: false,
        approachSec: null,
        combatTTK: null,
        spawnToDeathSec: null,
        squadPowerAtEntry: g.squadPower,
        visibleAtEntry: g.visibleSquadCount,
        damageMod: g.mods.damage,
        fireRateMod: g.mods.fireRate,
        overkillDuringBoss: 0,
        gatesCrossedBefore: rec.gates.filter((x) => x.effectActuallyApplied !== null).length,
        overkillAtEntry: g.stats.overkillDamage,
      };
    }
    if (currentBoss && g.bossTiming.deathTime !== null) finishBoss();

    // ---- per-stage averages / log flush ----
    if (g.stageState === 'ACTIVE' || g.stageState === 'BOSS_WARNING' || g.stageState === 'BOSS_ACTIVE') {
      const s = activeSum.get(g.stage) ?? { sum: 0, frames: 0 };
      s.sum += g.activeEnemyCount + (g.boss.active && g.boss.alive ? 1 : 0);
      s.frames++;
      activeSum.set(g.stage, s);
    }
    while (loggedStages < g.stageLog.length) {
      const e = g.stageLog[loggedStages++];
      const cfg = EARTH_STAGES[e.stage - 1];
      const s = activeSum.get(e.stage);
      rec.stages.push({
        stage: e.stage,
        count: cfg.enemyCount,
        hp: cfg.enemyHP,
        spawnWindowSec: cfg.spawnWindowSec,
        clearTime: e.clearTime,
        peakActiveEnemies: e.peakActiveEnemies,
        deferredSpawns: e.deferredSpawns,
        averageActiveEnemies: s && s.frames > 0 ? s.sum / s.frames : 0,
        squadPowerAtClear: e.squadPowerAtClear,
      });
    }

    if (g.phase === 'victory') {
      rec.outcome = 'victory';
      break;
    }
    if (g.phase === 'defeat') {
      rec.outcome = 'defeat';
      break;
    }
  }
  finishBoss();

  rec.totalSeconds = g.time;
  rec.finalSquadPower = g.squadPower;
  rec.finalVisible = g.visibleSquadCount;
  rec.finalMods = { damage: g.mods.damage, fireRate: g.mods.fireRate };
  rec.overkillDamage = g.stats.overkillDamage;
  rec.damageDealt = g.stats.damageDealt;
  rec.peakActiveProjectiles = g.stats.peakActiveProjectiles;
  rec.projectilePoolExhausted = g.stats.projectilePoolExhausted;
  rec.peakVisibleSoldiers = g.stats.peakVisibleSoldiers;
  rec.simMsAvg = frames > 0 ? simMsSum / frames : 0;
  return rec;
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

interface BossVerdict {
  type: 'sub' | 'final';
  hp: number;
  combatTTK: number | null;
  killedDuringApproach: boolean;
  approachSec: number | null;
  pass: boolean;
  reasons: string[];
  approachReview: boolean;
}

function judge(b: BossRecord | undefined, type: 'sub' | 'final'): BossVerdict {
  const th = THRESHOLDS[type];
  const v: BossVerdict = { type, hp: b?.hp ?? 0, combatTTK: b?.combatTTK ?? null, killedDuringApproach: b?.killedDuringApproach ?? false, approachSec: b?.approachSec ?? null, pass: true, reasons: [], approachReview: false };
  if (!b) {
    v.pass = false;
    v.reasons.push('boss never reached (run ended earlier)');
    return v;
  }
  if (b.killedDuringApproach) {
    v.pass = false;
    v.reasons.push('killed during approach (combatTTK = null)');
  } else if (b.combatTTK === null) {
    v.pass = false;
    v.reasons.push('boss not killed');
  } else if (b.combatTTK < th.min) {
    v.pass = false;
    v.reasons.push(`combatTTK ${b.combatTTK.toFixed(2)} s < ${th.min} s`);
  } else if (b.combatTTK > th.max) {
    v.pass = false;
    v.reasons.push(`combatTTK ${b.combatTTK.toFixed(2)} s > ${th.max} s`);
  }
  if (b.approachSec !== null && (b.approachSec < THRESHOLDS.approach.min || b.approachSec > THRESHOLDS.approach.max)) v.approachReview = true;
  return v;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const f1 = (n: number | null | undefined) => (n === null || n === undefined ? 'n/a' : n.toFixed(1));
const f2 = (n: number | null | undefined) => (n === null || n === undefined ? 'n/a' : n.toFixed(2));

function bossOf(run: RunRecord, type: 'sub' | 'final'): BossRecord | undefined {
  return run.bosses.find((b) => b.type === type);
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function buildReport(primary: Record<Profile, RunRecord>, supplemental: RunRecord[]): { md: string; balanceReviewRequired: boolean; bossApproachReviewRequired: boolean } {
  const b = primary.B;
  const sub = judge(bossOf(b, 'sub'), 'sub');
  const fin = judge(bossOf(b, 'final'), 'final');
  const invalid = PROFILES.filter((p) => primary[p].outcome === 'invalid');
  const balanceReviewRequired = !sub.pass || !fin.pass || b.outcome !== 'victory' || invalid.length > 0;
  const approachAll = [...PROFILES.map((p) => primary[p]), ...supplemental].flatMap((r) => r.bosses).filter((x) => x.approachSec !== null);
  const bossApproachReviewRequired = approachAll.some((x) => x.approachSec! < THRESHOLDS.approach.min || x.approachSec! > THRESHOLDS.approach.max);

  const L: string[] = [];
  L.push('# Earth balance measurement — v0.4.0');
  L.push('');
  L.push(`Primary seed ${PRIMARY_BALANCE_SEED} (Profile B decides). Supplemental seeds ${SUPPLEMENTAL_SEEDS.join('/')} (Profile B, robustness only). Viewport ${VIEWPORT.width}×${VIEWPORT.height}, dt 1/60.`);
  L.push('');
  L.push(`**BALANCE VERDICT: ${balanceReviewRequired ? 'BALANCE REVIEW REQUIRED' : 'BALANCED FOR v0.4.0'}**`);
  L.push(`**Boss approach: ${bossApproachReviewRequired ? 'BOSS APPROACH REVIEW REQUIRED' : 'within 8–12 s target'}**`);
  if (invalid.length) L.push(`**INVALID MEASUREMENT** — profiles ${invalid.join(', ')}: ${invalid.map((p) => primary[p].invalidReason).join(' | ')}`);
  L.push('');

  L.push('## Earth results (Profile B, primary seed)');
  L.push('');
  L.push('| Stage | Count | HP | Spawn window | Measured clear | Peak active | Deferred | Avg active | Power at clear |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const s of b.stages) {
    L.push(`| ${s.stage} | ${s.count} | ${s.hp} | ${s.spawnWindowSec} s | ${f1(s.clearTime)} s | ${s.peakActiveEnemies} | ${s.deferredSpawns} | ${f1(s.averageActiveEnemies)} | ${s.squadPowerAtClear} |`);
  }
  L.push('');
  L.push(`Run outcome: **${b.outcome}** in ${f1(b.totalSeconds)} s (${(b.totalSeconds / 60).toFixed(1)} min). Gates crossed: ${b.gates.filter((x) => x.effectActuallyApplied).length}.`);
  L.push('');

  L.push('## Bosses (primary seed)');
  L.push('');
  L.push('| Boss | HP | Profile | Power at entry (visible) | DMG × FR | Gates before | Approach | Hold reached | Combat TTK | Spawn→death | Killed in approach | Overkill |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const type of ['sub', 'final'] as const) {
    for (const p of PROFILES) {
      const r = bossOf(primary[p], type);
      if (!r) {
        L.push(`| ${type} | — | ${p} | not reached (${primary[p].outcome}) | | | | | | | | |`);
        continue;
      }
      L.push(
        `| ${type} (stage ${r.stage}) | ${r.hp} | ${p} | ${r.squadPowerAtEntry} (${r.visibleAtEntry}) | ${f2(r.damageMod)} × ${f2(r.fireRateMod)} | ${r.gatesCrossedBefore} | ${f2(r.approachSec)} s (target ${r.approachDurationTargetSec}) | ${r.approachCompleted ? 'yes' : 'no'} | ${r.combatTTK === null ? 'null' : `${f2(r.combatTTK)} s`} | ${f2(r.spawnToDeathSec)} s | ${r.killedDuringApproach ? 'YES' : 'no'} | ${Math.round(r.overkillDuringBoss)} |`,
      );
    }
  }
  L.push('');
  for (const v of [sub, fin]) {
    const th = THRESHOLDS[v.type];
    L.push(`- ${v.type === 'sub' ? 'Sub-Boss' : 'Final Boss'} (HP ${v.hp}) Profile B: ${v.pass ? 'PASS' : 'REVIEW REQUIRED'} — window ${th.min}–${th.max} s (preferred ${th.preferredMin}–${th.preferredMax} s); ${v.reasons.length ? v.reasons.join('; ') : `combatTTK ${f2(v.combatTTK)} s`}${v.approachReview ? '; approach outside 8–12 s' : ''}`);
  }
  L.push('');

  L.push('## Supplemental seeds (Profile B)');
  L.push('');
  L.push('| Seed | Outcome | Run time | Sub TTK | Sub killed in approach | Final TTK | Final killed in approach | Final power |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of supplemental) {
    const s = bossOf(r, 'sub');
    const fb = bossOf(r, 'final');
    L.push(`| ${r.seed} | ${r.outcome} | ${f1(r.totalSeconds)} s | ${s ? (s.combatTTK === null ? 'null' : f2(s.combatTTK)) : '—'} | ${s ? (s.killedDuringApproach ? 'YES' : 'no') : '—'} | ${fb ? (fb.combatTTK === null ? 'null' : f2(fb.combatTTK)) : '—'} | ${fb ? (fb.killedDuringApproach ? 'YES' : 'no') : '—'} | ${r.finalSquadPower} |`);
  }
  for (const type of ['sub', 'final'] as const) {
    const ttks = supplemental.map((r) => bossOf(r, type)?.combatTTK).filter((x): x is number => x !== null && x !== undefined);
    const std = supplemental.map((r) => bossOf(r, type)?.spawnToDeathSec).filter((x): x is number => x !== null && x !== undefined);
    L.push(`- ${type}: combatTTK min/median/max = ${f2(ttks.length ? Math.min(...ttks) : null)} / ${f2(median(ttks))} / ${f2(ttks.length ? Math.max(...ttks) : null)} s over ${ttks.length} measurable runs; spawn→death min/median/max = ${f2(std.length ? Math.min(...std) : null)} / ${f2(median(std))} / ${f2(std.length ? Math.max(...std) : null)} s`);
  }
  L.push('');

  L.push('## Gate choices (primary seed)');
  L.push('');
  for (const p of PROFILES) {
    const r = primary[p];
    const crossed = r.gates.filter((x) => x.effectActuallyApplied);
    const counts = { squad: 0, damage: 0, fireRate: 0 };
    for (const x of crossed) counts[x.effectActuallyApplied!.kind]++;
    L.push(`- Profile ${p}: ${crossed.length} gates (${counts.squad} squad / ${counts.damage} damage / ${counts.fireRate} fire-rate), final power ${r.finalSquadPower} (visible ${r.finalVisible}), mods ${f2(r.finalMods.damage)} × ${f2(r.finalMods.fireRate)}, outcome ${r.outcome}`);
    L.push(`  - ${crossed.map((x) => `S${x.stage}@${Math.round(x.time)}s ${fmtEffect(x.effectActuallyApplied)}`).join(', ')}`);
  }
  L.push('');

  L.push('## Squad Power / overkill (primary seed, Profile B)');
  L.push('');
  const rifle = WEAPONS.rifle;
  const rifleDps = rifle.damage * rifle.fireRate;
  L.push(`- 10 normals theoretical DPS: ${(10 * rifleDps).toFixed(1)} · Power10 unit theoretical DPS: ${(10 * rifleDps).toFixed(1)} (1 entity × ${rifle.damage * 10} dmg × ${rifle.fireRate}/s) — identical by construction; the difference is overkill granularity.`);
  L.push(`- damageDealt ${Math.round(b.damageDealt)} · overkillDamage ${Math.round(b.overkillDamage)} (${b.damageDealt > 0 ? ((100 * b.overkillDamage) / (b.damageDealt + b.overkillDamage)).toFixed(1) : '0'} % of total output)`);
  L.push(`- peak visible soldiers ${b.peakVisibleSoldiers} (≤ 50 required)`);
  L.push('');

  L.push('## Performance (headless)');
  L.push('');
  for (const p of PROFILES) {
    const r = primary[p];
    L.push(`- Profile ${p}: sim avg ${r.simMsAvg.toFixed(3)} ms · peak ${r.simMsPeak.toFixed(2)} ms · peak projectiles ${r.peakActiveProjectiles} · pool exhausted ${r.projectilePoolExhausted} · peak visible ${r.peakVisibleSoldiers}`);
  }
  L.push('');
  return { md: L.join('\n'), balanceReviewRequired, bossApproachReviewRequired };
}

// ---------------------------------------------------------------------------

function main() {
  const wantJson = process.argv.includes('--json');
  const primary = {} as Record<Profile, RunRecord>;
  for (const p of PROFILES) {
    const t0 = performance.now();
    primary[p] = runProfile(p, PRIMARY_BALANCE_SEED);
    console.error(`[measure] profile ${p} seed ${PRIMARY_BALANCE_SEED}: ${primary[p].outcome} in ${primary[p].totalSeconds.toFixed(1)} s sim (${((performance.now() - t0) / 1000).toFixed(1)} s wall)`);
  }
  const supplemental: RunRecord[] = [];
  for (const seed of SUPPLEMENTAL_SEEDS) {
    const t0 = performance.now();
    const r = runProfile('B', seed);
    supplemental.push(r);
    console.error(`[measure] profile B seed ${seed}: ${r.outcome} in ${r.totalSeconds.toFixed(1)} s sim (${((performance.now() - t0) / 1000).toFixed(1)} s wall)`);
  }
  const { md, balanceReviewRequired, bossApproachReviewRequired } = buildReport(primary, supplemental);
  const outDir = path.resolve(process.cwd(), 'docs/reports');
  mkdirSync(outDir, { recursive: true });
  const mdPath = path.join(outDir, 'EARTH_BALANCE_v0.4.0.md');
  writeFileSync(mdPath, md);
  if (wantJson) writeFileSync(path.join(outDir, 'EARTH_BALANCE_v0.4.0.json'), JSON.stringify({ primary, supplemental, balanceReviewRequired, bossApproachReviewRequired }, null, 2));
  console.log(md);
  console.log(`\nreport written to ${mdPath}`);
  console.log(`balanceReviewRequired=${balanceReviewRequired} bossApproachReviewRequired=${bossApproachReviewRequired}`);
  const invalid = PROFILES.some((p) => primary[p].outcome === 'invalid') || supplemental.some((r) => r.outcome === 'invalid');
  if (invalid) process.exit(2);
}

main();
