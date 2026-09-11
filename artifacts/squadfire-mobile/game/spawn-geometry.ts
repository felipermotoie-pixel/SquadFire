/**
 * Camera-derived spawn depths.
 *
 * Enemies enter at the far horizon — as deep as the readable track allows — instead
 * of a fixed depth on the road. Everything here is derived from
 * `CameraLayout.farVisibleDepth` plus the margins in `FAR_SPAWN`, so a camera change
 * moves the whole spawn/collision envelope together and the invariants below keep
 * holding:
 *
 *   maxRegularHittableDepth < farVisibleDepth
 *   maxBossHittableDepth    < farVisibleDepth
 *   combatDepth            ≤ spatialGridMaxDepth
 *
 * `combatDepth` is the deepest point at which anything can be hit; bullets beyond it
 * are in pure flight. The spatial hash grid is dimensioned from `spatialGridMaxDepth`
 * (allocated when the camera changes, never per frame).
 */
import { BOSS, ENEMIES, FAR_SPAWN, GATES } from './balance';
import type { CameraLayout } from './camera';

/** Forward extent of one spatial-hash row (world units). */
export const GRID_CELL_DEPTH = 0.5;
/** The grid starts slightly behind the squad line so contact-depth enemies bucket cleanly. */
export const GRID_MIN_DEPTH = -GRID_CELL_DEPTH;

export interface SpawnGeometry {
  farVisibleDepth: number;
  /** Nominal regular spawn line (jitter and group row offsets add depth on top). */
  enemySpawnDepth: number;
  /** Deepest position a scheduler-spawned regular can occupy the frame it appears. */
  maxRegularSpawnDepth: number;
  bossSpawnDepth: number;
  maxRegularHittableDepth: number;
  maxBossHittableDepth: number;
  /** max(all hittable depths) — the far edge of collision queries. */
  combatDepth: number;
  /** Far edge of the spatial grid (a whole number of cells past combatDepth). */
  spatialGridMaxDepth: number;
  gridRows: number;
}

export function computeSpawnGeometry(cam: CameraLayout): SpawnGeometry {
  const far = cam.farVisibleDepth;
  const enemySpawnDepth = far - FAR_SPAWN.regularInset;
  const maxRegularSpawnDepth = enemySpawnDepth + FAR_SPAWN.depthJitter + FAR_SPAWN.groupDepthOffset;
  const bossSpawnDepth = far - FAR_SPAWN.bossInset;
  const maxRegularHittableDepth = maxRegularSpawnDepth + ENEMIES.maxDepthTolerance;
  const maxBossHittableDepth = bossSpawnDepth + BOSS.depthTolerance;
  const combatDepth = Math.max(maxRegularHittableDepth, maxBossHittableDepth, GATES.spawnY + GATES.height);
  const gridRows = Math.ceil((combatDepth - GRID_MIN_DEPTH) / GRID_CELL_DEPTH) + 1;
  const spatialGridMaxDepth = GRID_MIN_DEPTH + gridRows * GRID_CELL_DEPTH;
  return {
    farVisibleDepth: far,
    enemySpawnDepth,
    maxRegularSpawnDepth,
    bossSpawnDepth,
    maxRegularHittableDepth,
    maxBossHittableDepth,
    combatDepth,
    spatialGridMaxDepth,
    gridRows,
  };
}

/** Returns every violated invariant (empty = valid). The engine throws on any. */
export function spawnGeometryViolations(g: SpawnGeometry): string[] {
  const out: string[] = [];
  if (!(g.maxRegularHittableDepth < g.farVisibleDepth)) out.push(`maxRegularHittableDepth ${g.maxRegularHittableDepth.toFixed(2)} ≥ farVisibleDepth ${g.farVisibleDepth.toFixed(2)}`);
  if (!(g.maxBossHittableDepth < g.farVisibleDepth)) out.push(`maxBossHittableDepth ${g.maxBossHittableDepth.toFixed(2)} ≥ farVisibleDepth ${g.farVisibleDepth.toFixed(2)}`);
  if (!(g.combatDepth <= g.spatialGridMaxDepth)) out.push(`combatDepth ${g.combatDepth.toFixed(2)} > spatialGridMaxDepth ${g.spatialGridMaxDepth.toFixed(2)}`);
  if (!(g.enemySpawnDepth > BOSS.holdY + 1)) out.push(`enemySpawnDepth ${g.enemySpawnDepth.toFixed(2)} too shallow`);
  return out;
}
