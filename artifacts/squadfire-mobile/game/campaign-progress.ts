/**
 * Campaign progress model (Stage terminology only). Pure: no platform imports, so
 * the headless tests can exercise migration. Storage lives in game/campaign.ts.
 *
 * The save is a tiny versioned JSON blob. `migrateCampaign` upgrades any older
 * shape — including the legacy wave-era field names — instead of discarding it, so a
 * schema change never wipes a player's progress.
 */
export const CAMPAIGN_SCHEMA_VERSION = 2;
export const CAMPAIGN_STORAGE_KEY = 'squadfire.campaign';
/** Older builds may have written progress under these keys with wave-based fields. */
export const LEGACY_STORAGE_KEYS = ['squadfire.progress', 'squadfire.save'];

export interface CampaignProgress {
  version: number;
  highestUnlockedStage: number;
  highestCompletedStage: number;
  /** Best stage reached in a single run (for the defeat card). */
  bestStage: number;
  updatedAt: string;
}

export function defaultCampaign(): CampaignProgress {
  return { version: CAMPAIGN_SCHEMA_VERSION, highestUnlockedStage: 1, highestCompletedStage: 0, bestStage: 1, updatedAt: new Date(0).toISOString() };
}

function asInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;
}

/**
 * Upgrades any previously saved shape to the current schema. Legacy names:
 *   highestUnlockedWave / currentWave / highestWave  →  stage fields
 * Unknown input yields a fresh default rather than throwing.
 */
export function migrateCampaign(raw: unknown): CampaignProgress {
  const base = defaultCampaign();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const version = asInt(r.version, 0);

  if (version >= CAMPAIGN_SCHEMA_VERSION) {
    return {
      version: CAMPAIGN_SCHEMA_VERSION,
      highestUnlockedStage: Math.max(1, asInt(r.highestUnlockedStage, 1)),
      highestCompletedStage: asInt(r.highestCompletedStage, 0),
      bestStage: Math.max(1, asInt(r.bestStage, 1)),
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : base.updatedAt,
    };
  }

  // v0/v1: wave-era or unversioned. Waves and stages were both 1-based level counters,
  // so the numbers carry over 1:1.
  const completed = asInt(r.highestCompletedStage, asInt(r.highestCompletedWave, asInt(r.highestWave, 0)));
  const unlocked = Math.max(1, completed + 1, asInt(r.highestUnlockedStage, asInt(r.highestUnlockedWave, asInt(r.currentWave, 1))));
  return {
    version: CAMPAIGN_SCHEMA_VERSION,
    highestUnlockedStage: unlocked,
    highestCompletedStage: completed,
    bestStage: Math.max(1, asInt(r.bestStage, unlocked)),
    updatedAt: base.updatedAt,
  };
}

/** Applies a cleared stage to the progress record. Pure. */
export function recordStageCleared(progress: CampaignProgress, stage: number, now = new Date()): CampaignProgress {
  const completed = Math.max(progress.highestCompletedStage, stage);
  return {
    ...progress,
    version: CAMPAIGN_SCHEMA_VERSION,
    highestCompletedStage: completed,
    highestUnlockedStage: Math.max(progress.highestUnlockedStage, completed + 1),
    bestStage: Math.max(progress.bestStage, stage + 1),
    updatedAt: now.toISOString(),
  };
}

export function recordStageReached(progress: CampaignProgress, stage: number, now = new Date()): CampaignProgress {
  if (stage <= progress.bestStage) return progress;
  return { ...progress, version: CAMPAIGN_SCHEMA_VERSION, bestStage: stage, updatedAt: now.toISOString() };
}
