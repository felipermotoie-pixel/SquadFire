/**
 * Deterministic spawn schedule for one stage.
 *
 *   same planet + same stage + same seed  →  byte-identical schedule
 *
 * Built once at stage start from `StageConfig` with a stage-specific PRNG (never the
 * general Game RNG, so combat randomness cannot perturb the timeline). The schedule
 * is the only source of regular enemies during a stage: the engine walks it with a
 * cursor and defers events that `maxAlive` blocks instead of discarding them.
 *
 * Invariant (asserted): sum of all regular counts === StageConfig.enemyCount.
 */
import { mulberry32 } from './rng';
import { groupSpawnIntervalFor, type StageConfig } from './stages';
import type { EnemyKind } from './types';

export interface SpawnEvent {
  /** Seconds after the stage becomes ACTIVE. */
  time: number;
  kind: EnemyKind;
  group: number;
  indexInGroup: number;
  groupSize: number;
  /** Lateral centre of the group in road half-widths. */
  lane: number;
}

export interface SpawnSchedule {
  stageId: number;
  seed: number;
  events: readonly SpawnEvent[];
  groupCount: number;
  totalRegulars: number;
  /** Time of the last event (≤ spawnWindowSec). */
  lastSpawnTime: number;
}

function pickKind(rng: () => number, cfg: StageConfig): EnemyKind {
  const { grunt, runner, elite } = cfg.archetypeMix;
  const total = grunt + runner + elite;
  const roll = rng() * total;
  if (roll < elite) return 'elite';
  if (roll < elite + runner) return 'runner';
  return 'grunt';
}

export function createSpawnSchedule(cfg: StageConfig, seed: number): SpawnSchedule {
  const rng = mulberry32(seed);
  const min = Math.max(1, Math.floor(cfg.minGroupSize));
  const max = Math.max(min, Math.floor(cfg.maxGroupSize));

  // 1. Group sizes: draw inside [min, max]; the final group absorbs the remainder so
  //    the exact stage count is always satisfied (a short tail merges into the
  //    previous group rather than producing a sub-minimum group).
  const sizes: number[] = [];
  let remaining = cfg.enemyCount;
  while (remaining > 0) {
    let size = min + Math.floor(rng() * (max - min + 1));
    // Final group takes whatever is left (it may end up min−1 larger than max).
    if (size >= remaining || remaining - size < min) size = remaining;
    sizes.push(size);
    remaining -= size;
  }

  // 2. Archetype and lane per group.
  const kinds = sizes.map(() => pickKind(rng, cfg));
  const lanes = sizes.map(() => (rng() - 0.5) * 1.1);

  // 3. Group start times spread over the spawn window. The last enemy of the last
  //    group lands exactly at spawnWindowSec; interior starts get a bounded jitter that
  //    can never reorder groups or push the tail past the window.
  const groupCount = sizes.length;
  const durations = sizes.map((n, i) => (n - 1) * groupSpawnIntervalFor(kinds[i]));
  const lastDuration = durations[groupCount - 1];
  const span = Math.max(0, cfg.spawnWindowSec - lastDuration);
  const gap = groupCount > 1 ? span / (groupCount - 1) : 0;
  const starts: number[] = [];
  for (let k = 0; k < groupCount; k++) {
    let t = groupCount > 1 ? gap * k : 0;
    if (k > 0 && k < groupCount - 1) t += (rng() - 0.5) * gap * 0.5;
    starts.push(t);
  }

  const events: SpawnEvent[] = [];
  for (let k = 0; k < groupCount; k++) {
    const interval = groupSpawnIntervalFor(kinds[k]);
    for (let i = 0; i < sizes[k]; i++) {
      events.push({ time: starts[k] + i * interval, kind: kinds[k], group: k, indexInGroup: i, groupSize: sizes[k], lane: lanes[k] });
    }
  }
  events.sort((a, b) => a.time - b.time || a.group - b.group || a.indexInGroup - b.indexInGroup);

  const totalRegulars = events.length;
  if (totalRegulars !== cfg.enemyCount) {
    throw new Error(`spawn schedule for stage ${cfg.id}: ${totalRegulars} events ≠ enemyCount ${cfg.enemyCount}`);
  }
  return {
    stageId: cfg.id,
    seed,
    events,
    groupCount,
    totalRegulars,
    lastSpawnTime: events.length > 0 ? events[events.length - 1].time : 0,
  };
}
