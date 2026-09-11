/**
 * Stage data model — the player-facing progression unit inside a Planet.
 *
 *   Planet (game/planets.ts)
 *     └─ StageConfig[]            fixed, hand-authored, absolute numbers
 *          └─ SpawnSchedule       generated deterministically at stage start
 *                                 (game/spawn-schedule.ts) — never ad hoc
 *
 * A stage is complete only when every scheduled regular has spawned
 * (`spawnedRegulars === enemyCount`), every regular is dead and — on boss stages — the
 * boss is dead. Killing one group never advances the stage.
 *
 * Every number in a StageConfig is ABSOLUTE. There is no difficulty curve, no HP
 * multiplier and no rifle-derived HP: `enemyHP` is what an enemy has, full stop, and
 * `boss.hp` is what the boss has. Retuning means editing the table, never a formula.
 */
import type { EnemyKind } from './types';

export type StageState = 'INTRO' | 'ACTIVE' | 'BOSS_WARNING' | 'BOSS_ACTIVE' | 'CLEARING' | 'COMPLETE';

export type BossType = 'sub' | 'final';

export interface StageBossConfig {
  /** Sub-boss (mid-planet) or the planet's final boss. Drives name/tier presentation only. */
  type: BossType;
  /** Absolute hit points. */
  hp: number;
  /** Seconds the boss takes from its far spawn to `BOSS.holdY` (speed is derived from it). */
  approachDurationTargetSec: number;
  /** Multiplies both attack intervals (< 1 = faster cadence). */
  attackIntervalMultiplier: number;
  /**
   * Escort regulars while the boss lives. 0 for every Earth stage: escorts do not
   * count toward `enemyCount`, and a late far-horizon escort would hold completion.
   */
  escortSize: number;
  escortInterval: number;
}

/** Relative weights of the regular archetypes the scheduler draws groups from. */
export interface ArchetypeMix {
  grunt: number;
  runner: number;
  elite: number;
}

export interface StageConfig {
  /** 1-based stage number inside its planet. */
  id: number;
  /** Exact number of regular enemies the stage spawns. Boss and escorts excluded. */
  enemyCount: number;
  /** Absolute hit points of EVERY regular enemy in the stage, regardless of archetype. */
  enemyHP: number;
  /** Seconds over which the schedule spreads the `enemyCount` spawns (duration floor). */
  spawnWindowSec: number;
  minGroupSize: number;
  maxGroupSize: number;
  /** Multiplies each archetype's base speed. Archetype speed identity is preserved. */
  enemySpeedMultiplier: number;
  archetypeMix: ArchetypeMix;
  boss?: StageBossConfig;
}

export interface StageTransitionRules {
  preserveSquad: boolean;
  preserveRunUpgrades: boolean;
  /** Fraction of lost power restored on stage clear (0 = none). */
  healPercentOnClear: number;
}

export const STAGES = {
  /** Seconds the STAGE banner owns the screen before the first spawn. */
  introDuration: 1.1,
  /** Seconds between "BOSS INCOMING" and the boss entering. */
  bossWarningDuration: 1.3,
  /** Seconds of "STAGE CLEAR" feedback before the transition. */
  clearDuration: 0.6,
  /** Seconds between STAGE CLEAR and the next STAGE banner. */
  transitionDuration: 1.0,
  transition: { preserveSquad: true, preserveRunUpgrades: true, healPercentOnClear: 0 } satisfies StageTransitionRules,
  /** Score/coin hooks. Nothing spends coins yet; stage clears award a flat amount. */
  rewards: { killScore: 10, eliteKillScore: 35, stageClearCoins: 25 },
  /** Seconds between two enemies of the same group entering the road. */
  groupSpawnInterval: 0.3,
  /** Runners enter a little faster within their group. */
  runnerSpawnInterval: 0.24,
} as const;

// ---------------------------------------------------------------------------
// Earth — authoritative balance table (v0.4.0 measurement baseline).
// Do not retune silently: every change here must come with new measurements.
// ---------------------------------------------------------------------------

interface EarthRow {
  count: number;
  hp: number;
  window: number;
  group: [number, number];
  speed: number;
  mix: ArchetypeMix;
  boss?: StageBossConfig;
}

const EARTH_ROWS: EarthRow[] = [
  { count: 36, hp: 20, window: 60, group: [2, 3], speed: 1.0, mix: { grunt: 1, runner: 0, elite: 0 } },
  { count: 44, hp: 30, window: 65, group: [2, 4], speed: 1.02, mix: { grunt: 0.86, runner: 0.14, elite: 0 } },
  { count: 52, hp: 40, window: 70, group: [3, 4], speed: 1.04, mix: { grunt: 0.8, runner: 0.16, elite: 0.04 } },
  { count: 60, hp: 50, window: 75, group: [3, 5], speed: 1.06, mix: { grunt: 0.76, runner: 0.18, elite: 0.06 } },
  {
    count: 60,
    hp: 50,
    window: 75,
    group: [3, 5],
    speed: 1.07,
    mix: { grunt: 0.74, runner: 0.18, elite: 0.08 },
    boss: { type: 'sub', hp: 4500, approachDurationTargetSec: 10, attackIntervalMultiplier: 1.0, escortSize: 0, escortInterval: 0 },
  },
  { count: 72, hp: 60, window: 75, group: [4, 5], speed: 1.08, mix: { grunt: 0.72, runner: 0.2, elite: 0.08 } },
  { count: 84, hp: 70, window: 80, group: [4, 6], speed: 1.1, mix: { grunt: 0.7, runner: 0.2, elite: 0.1 } },
  { count: 96, hp: 80, window: 85, group: [4, 7], speed: 1.12, mix: { grunt: 0.68, runner: 0.22, elite: 0.1 } },
  { count: 108, hp: 100, window: 90, group: [5, 7], speed: 1.14, mix: { grunt: 0.66, runner: 0.22, elite: 0.12 } },
  {
    count: 120,
    hp: 120,
    window: 90,
    group: [5, 8],
    speed: 1.15,
    mix: { grunt: 0.64, runner: 0.24, elite: 0.12 },
    boss: { type: 'final', hp: 18000, approachDurationTargetSec: 10, attackIntervalMultiplier: 0.85, escortSize: 0, escortInterval: 0 },
  },
];

/** Earth's ten stages, in order. Frozen: the engine never mutates config. */
export const EARTH_STAGES: readonly StageConfig[] = EARTH_ROWS.map((row, i) => {
  const cfg: StageConfig = {
    id: i + 1,
    enemyCount: row.count,
    enemyHP: row.hp,
    spawnWindowSec: row.window,
    minGroupSize: row.group[0],
    maxGroupSize: row.group[1],
    enemySpeedMultiplier: row.speed,
    archetypeMix: row.mix,
  };
  if (row.boss) cfg.boss = row.boss;
  return Object.freeze(cfg);
});

/** Presentation helper: the stage's boss name, if any. */
export function bossDisplayName(boss: StageBossConfig | undefined): string {
  if (!boss) return '';
  return boss.type === 'final' ? 'HIGH WARDEN OF THE CAUSEWAY' : 'WARDEN OF THE CAUSEWAY';
}

/** Spawn interval inside a group for an archetype. */
export function groupSpawnIntervalFor(kind: EnemyKind): number {
  return kind === 'runner' ? STAGES.runnerSpawnInterval : STAGES.groupSpawnInterval;
}
