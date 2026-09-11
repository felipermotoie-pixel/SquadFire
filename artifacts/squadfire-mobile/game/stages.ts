/**
 * Stage system — the player-facing progression unit.
 *
 *   Stage (player-facing level)
 *     └─ SpawnSequence[]            internal timeline, never shown to the player
 *          └─ SpawnGroup[]          a handful of enemies entering one after another
 *     └─ optional boss              every `STAGES.bossEvery`-th stage (5, 10, 15 …)
 *
 * A stage is complete only when every scheduled spawn has happened AND every enemy
 * (boss included) is dead. Killing one group never advances the stage.
 *
 * Stages 1–5 are hand-authored (tutorial band). Everything after is generated from
 * the same difficulty bands so the campaign scales to 100+ stages without 100 hand
 * written configs. Difficulty is spread over several dimensions — count, group
 * size, cadence, overlap, archetype mix, HP, speed, boss mechanics — never HP alone.
 */
import { BOSS } from './balance';
import type { EnemyKind } from './types';

export type StageState = 'INTRO' | 'ACTIVE' | 'BOSS_WARNING' | 'BOSS_ACTIVE' | 'CLEARING' | 'COMPLETE';

export interface SpawnGroup {
  kind: EnemyKind;
  count: number;
  /** Seconds between two enemies of the same group entering the road. */
  spawnInterval: number;
  /** Lateral centre of the group in road half-widths. Omitted = random lane. */
  laneBias?: number;
}

export interface SpawnSequence {
  /** Seconds after the previous sequence finished spawning (or after the intro). */
  startDelay: number;
  groups: SpawnGroup[];
  /** Seconds between two consecutive groups of this sequence. */
  betweenGroupDelay: number;
}

export interface BossStageConfig {
  /** Every 10th stage is a "major" boss: more HP, faster cadence, escorts. */
  tier: 'boss' | 'major';
  hpMultiplier: number;
  /** Multiplies both attack intervals (< 1 = faster cadence). */
  attackIntervalMultiplier: number;
  /** Escort grunts trickle in while the boss is alive. 0 = none. */
  escortInterval: number;
  escortSize: number;
}

export interface StageConfig {
  id: number;
  /** Abstract pressure rating used by tests/docs to check the curve (monotone-ish, with post-boss relief). */
  difficulty: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  sequences: SpawnSequence[];
  boss?: BossStageConfig;
  rewardMultiplier: number;
}

export interface StageTransitionRules {
  preserveSquad: boolean;
  preserveRunUpgrades: boolean;
  /** Fraction of lost soldiers restored on stage clear (0 = none). */
  healPercentOnClear: number;
}

export const STAGES = {
  bossEvery: 5,
  majorBossEvery: 10,
  /** Seconds the STAGE banner owns the screen before the first spawn. */
  introDuration: 1.1,
  /** Seconds between "BOSS INCOMING" and the boss entering. */
  bossWarningDuration: 1.3,
  /** Seconds of "STAGE CLEAR" feedback before the transition. */
  clearDuration: 0.6,
  /** Seconds between STAGE CLEAR and the next STAGE banner. */
  transitionDuration: 1.0,
  transition: { preserveSquad: true, preserveRunUpgrades: true, healPercentOnClear: 0 } satisfies StageTransitionRules,
  /** Economy hooks. Values are placeholders until the shop pass; the multipliers are what matters. */
  rewards: { killScore: 10, eliteKillScore: 35, stageClearCoins: 25, bossStageRewardMultiplier: 2.5 },
} as const;

export function isBossStage(stage: number): boolean {
  return stage > 0 && stage % STAGES.bossEvery === 0;
}

export function isMajorBossStage(stage: number): boolean {
  return stage > 0 && stage % STAGES.majorBossEvery === 0;
}

// ---------------------------------------------------------------------------
// Hand-authored tutorial band (stages 1–5)
// ---------------------------------------------------------------------------

const g = (kind: EnemyKind, count: number, spawnInterval: number, laneBias?: number): SpawnGroup =>
  laneBias === undefined ? { kind, count, spawnInterval } : { kind, count, spawnInterval, laneBias };

const AUTHORED: Record<number, Omit<StageConfig, 'id' | 'difficulty' | 'rewardMultiplier' | 'boss'>> = {
  1: {
    enemyHpMultiplier: 0.6,
    enemySpeedMultiplier: 0.85,
    sequences: [
      { startDelay: 0, betweenGroupDelay: 2.4, groups: [g('grunt', 2, 0.45, 0), g('grunt', 2, 0.45, -0.3)] },
      { startDelay: 2.0, betweenGroupDelay: 2.2, groups: [g('grunt', 3, 0.4, 0.3), g('grunt', 3, 0.4, 0)] },
    ],
  },
  2: {
    enemyHpMultiplier: 0.7,
    enemySpeedMultiplier: 0.9,
    sequences: [
      { startDelay: 0, betweenGroupDelay: 2.0, groups: [g('grunt', 3, 0.42), g('grunt', 3, 0.42)] },
      { startDelay: 1.2, betweenGroupDelay: 1.8, groups: [g('grunt', 4, 0.38), g('grunt', 4, 0.38)] },
    ],
  },
  3: {
    enemyHpMultiplier: 0.8,
    enemySpeedMultiplier: 0.95,
    sequences: [
      { startDelay: 0, betweenGroupDelay: 1.8, groups: [g('grunt', 4, 0.38), g('grunt', 4, 0.36)] },
      { startDelay: 1.0, betweenGroupDelay: 1.6, groups: [g('runner', 2, 0.5), g('grunt', 5, 0.35)] },
    ],
  },
  4: {
    enemyHpMultiplier: 0.9,
    enemySpeedMultiplier: 1,
    sequences: [
      { startDelay: 0, betweenGroupDelay: 1.6, groups: [g('grunt', 5, 0.35), g('grunt', 5, 0.34)] },
      { startDelay: 0.8, betweenGroupDelay: 1.4, groups: [g('runner', 3, 0.45), g('grunt', 7, 0.33)] },
    ],
  },
  5: {
    enemyHpMultiplier: 1,
    enemySpeedMultiplier: 1,
    sequences: [
      { startDelay: 0, betweenGroupDelay: 1.5, groups: [g('grunt', 5, 0.35), g('runner', 3, 0.42)] },
      { startDelay: 0.8, betweenGroupDelay: 1.3, groups: [g('grunt', 6, 0.33)] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Generated stages (6+)
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/** Small deterministic hash so generated stages vary without a runtime RNG. */
function jitter(stage: number, salt: number): number {
  const x = Math.sin(stage * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pressure rating in [1, ~100]. Grows smoothly, peaks on boss stages and dips right
 * after them (post-boss relief) so the curve reads: 8 → 9 → 10 (boss peak) → 11 (relief).
 */
export function stageDifficulty(stage: number): number {
  const base = stage <= 5 ? [1, 1.6, 2.3, 3.1, 4.4][stage - 1] : 4.4 + (stage - 5) * 0.95;
  if (isBossStage(stage)) return base * 1.18;
  if (stage > 1 && isBossStage(stage - 1)) return base * 0.9;
  return base;
}

function generated(stage: number): Omit<StageConfig, 'id' | 'difficulty' | 'rewardMultiplier' | 'boss'> {
  const t = (stage - 6) / 94; // 0 at stage 6, 1 at stage 100
  const relief = stage > 1 && isBossStage(stage - 1) ? 0.85 : 1;
  const total = Math.round(lerp(22, 110, t) * relief);
  const groupSize = Math.round(lerp(4, 12, t));
  const between = lerp(1.35, 0.45, t);
  const perEnemy = lerp(0.34, 0.2, t);
  const runnerShare = lerp(0.14, 0.26, t);
  const eliteShare = stage >= 6 ? lerp(0.06, 0.32, t) : 0;
  // Overlap: later sequences start before the previous one is cleared (negative delay = overlap
  // is not modelled; instead startDelay shrinks toward 0 and groups get denser).
  const seqDelay = lerp(1.0, 0.15, t);

  const sequences: SpawnSequence[] = [];
  let remaining = total;
  let seq = 0;
  while (remaining > 0) {
    const groups: SpawnGroup[] = [];
    const groupsInSeq = 2 + (jitter(stage, seq) > 0.5 ? 1 : 0);
    for (let k = 0; k < groupsInSeq && remaining > 0; k++) {
      const roll = jitter(stage, seq * 7 + k);
      const kind: EnemyKind = roll < eliteShare ? 'elite' : roll < eliteShare + runnerShare ? 'runner' : 'grunt';
      const size = Math.max(2, Math.min(remaining, kind === 'elite' ? Math.ceil(groupSize * 0.4) : kind === 'runner' ? Math.ceil(groupSize * 0.6) : groupSize));
      groups.push(g(kind, size, kind === 'runner' ? perEnemy * 1.25 : perEnemy));
      remaining -= size;
    }
    sequences.push({ startDelay: seq === 0 ? 0 : seqDelay, betweenGroupDelay: between, groups });
    seq++;
  }

  return {
    enemyHpMultiplier: 1 + (stage - 5) * 0.035,
    enemySpeedMultiplier: 1 + Math.min(0.45, (stage - 5) * 0.006),
    sequences,
  };
}

function bossFor(stage: number): BossStageConfig | undefined {
  if (!isBossStage(stage)) return undefined;
  const cycle = stage / STAGES.bossEvery; // 1 at stage 5, 2 at 10 …
  const major = isMajorBossStage(stage);
  return {
    tier: major ? 'major' : 'boss',
    // First boss is a teaching fight (90% HP, slow cadence: it survives long enough to show a slam); later ones grow through cadence and escorts more than HP.
    hpMultiplier: 0.9 * (1 + (cycle - 1) * 0.28) * (major ? 1.35 : 1),
    attackIntervalMultiplier: Math.max(0.55, 1.15 - (cycle - 1) * 0.07) * (major ? 0.9 : 1),
    escortInterval: cycle === 1 ? 0 : Math.max(3.5, 8 - cycle * 0.5),
    escortSize: cycle === 1 ? 0 : Math.min(8, 2 + cycle),
  };
}

const cache = new Map<number, StageConfig>();

/** Data-driven configuration for any stage number ≥ 1. Pure and memoised. */
export function stageConfig(stage: number): StageConfig {
  const n = Math.max(1, Math.floor(stage));
  const hit = cache.get(n);
  if (hit) return hit;
  const body = AUTHORED[n] ?? generated(n);
  const boss = bossFor(n);
  const cfg: StageConfig = {
    id: n,
    difficulty: stageDifficulty(n),
    ...body,
    rewardMultiplier: boss ? STAGES.rewards.bossStageRewardMultiplier : 1,
  };
  if (boss) cfg.boss = boss;
  cache.set(n, cfg);
  return cfg;
}

/** Total scheduled (non-boss, non-escort) enemies in a stage. */
export function stageEnemyCount(cfg: StageConfig): number {
  let n = 0;
  for (const s of cfg.sequences) for (const gr of s.groups) n += gr.count;
  return n;
}

/** Boss HP for a stage — kept here so BALANCE.md can quote one formula. */
export function bossHpFor(cfg: BossStageConfig): number {
  return Math.round(BOSS.hp * cfg.hpMultiplier);
}
