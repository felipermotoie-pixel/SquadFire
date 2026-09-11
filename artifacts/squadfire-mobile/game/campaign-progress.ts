/**
 * Campaign progress model — per-planet stage progress. Pure: no platform imports, so
 * the headless tests can exercise migration and reducers. Storage lives in
 * game/campaign.ts.
 *
 * Schema v3:
 *   {
 *     version: 3,
 *     currentPlanetId: 'earth',
 *     planets: { earth: { highestCompletedStage, highestUnlockedStage, completed, completedAt? } },
 *     updatedAt
 *   }
 *
 * `migrateCampaign` upgrades every older shape (unversioned / wave-era v0–v1, flat v2)
 * instead of discarding it. Legacy single-track stage progress maps onto Earth; a
 * legacy record that had cleared ≥ 10 stages arrives as "Earth completed" and is
 * clamped to Earth's length. Progress only ever grows, and only from real runs — the
 * engine's `progressEligible` flag gates the reducers upstream (components/campaign).
 */
import { DEFAULT_PLANET_ID, PLANETS, planetById } from './planets';

export const CAMPAIGN_SCHEMA_VERSION = 3;
export const CAMPAIGN_STORAGE_KEY = 'squadfire.campaign';
/** Older builds may have written progress under these keys with wave-based fields. */
export const LEGACY_STORAGE_KEYS = ['squadfire.progress', 'squadfire.save'];

export interface PlanetProgress {
  highestCompletedStage: number;
  highestUnlockedStage: number;
  completed: boolean;
  completedAt?: string;
}

export interface CampaignProgress {
  version: number;
  currentPlanetId: string;
  planets: Record<string, PlanetProgress>;
  updatedAt: string;
}

export function defaultPlanetProgress(): PlanetProgress {
  return { highestCompletedStage: 0, highestUnlockedStage: 1, completed: false };
}

export function defaultCampaign(): CampaignProgress {
  return {
    version: CAMPAIGN_SCHEMA_VERSION,
    currentPlanetId: DEFAULT_PLANET_ID,
    planets: { [DEFAULT_PLANET_ID]: defaultPlanetProgress() },
    updatedAt: new Date(0).toISOString(),
  };
}

function asInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;
}

/** Normalises one planet record against the planet's real length. */
function normalisePlanet(planetId: string, completedStage: number, unlockedStage: number, completedFlag: boolean, completedAt?: string): PlanetProgress {
  const length = planetById(planetId).stages.length;
  const completed = Math.min(length, Math.max(0, completedStage));
  const isDone = completedFlag || completed >= length;
  const out: PlanetProgress = {
    highestCompletedStage: isDone ? length : completed,
    highestUnlockedStage: Math.min(length, Math.max(1, completed + 1, unlockedStage)),
    completed: isDone,
  };
  if (isDone && completedAt) out.completedAt = completedAt;
  return out;
}

/** Reads the progress of a planet, defaulting when absent. */
export function planetProgress(progress: CampaignProgress, planetId: string): PlanetProgress {
  return progress.planets[planetId] ?? defaultPlanetProgress();
}

/**
 * Upgrades any previously saved shape to the current schema. Unknown input yields a
 * fresh default rather than throwing.
 */
export function migrateCampaign(raw: unknown): CampaignProgress {
  const base = defaultCampaign();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const version = asInt(r.version, 0);

  if (version >= 3 && r.planets && typeof r.planets === 'object') {
    const planets: Record<string, PlanetProgress> = {};
    for (const [id, rec] of Object.entries(r.planets as Record<string, unknown>)) {
      if (!PLANETS[id] || !rec || typeof rec !== 'object') continue;
      const p = rec as Record<string, unknown>;
      planets[id] = normalisePlanet(
        id,
        asInt(p.highestCompletedStage, 0),
        asInt(p.highestUnlockedStage, 1),
        p.completed === true,
        typeof p.completedAt === 'string' ? p.completedAt : undefined,
      );
    }
    if (!planets[DEFAULT_PLANET_ID]) planets[DEFAULT_PLANET_ID] = defaultPlanetProgress();
    const current = typeof r.currentPlanetId === 'string' && PLANETS[r.currentPlanetId] ? r.currentPlanetId : DEFAULT_PLANET_ID;
    return {
      version: CAMPAIGN_SCHEMA_VERSION,
      currentPlanetId: current,
      planets,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : base.updatedAt,
    };
  }

  // v2 (flat stage fields) and v0/v1 (wave-era or unversioned). Waves and stages were
  // both 1-based level counters on the single track that is now Earth.
  const completed = asInt(r.highestCompletedStage, asInt(r.highestCompletedWave, asInt(r.highestWave, 0)));
  const unlocked = Math.max(1, completed + 1, asInt(r.highestUnlockedStage, asInt(r.highestUnlockedWave, asInt(r.currentWave, 1))));
  return {
    version: CAMPAIGN_SCHEMA_VERSION,
    currentPlanetId: DEFAULT_PLANET_ID,
    planets: { [DEFAULT_PLANET_ID]: normalisePlanet(DEFAULT_PLANET_ID, completed, unlocked, false) },
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : base.updatedAt,
  };
}

/** Applies a cleared stage on a planet. Pure; clamps to the planet's length; never regresses. */
export function recordStageCleared(progress: CampaignProgress, planetId: string, stage: number, now = new Date()): CampaignProgress {
  const planet = planetById(planetId);
  const prev = planetProgress(progress, planetId);
  const cleared = Math.min(planet.stages.length, Math.max(0, Math.floor(stage)));
  if (cleared <= prev.highestCompletedStage) return progress;
  const next = normalisePlanet(planetId, cleared, prev.highestUnlockedStage, prev.completed, prev.completedAt);
  if (next.completed && !next.completedAt) next.completedAt = now.toISOString();
  return {
    ...progress,
    version: CAMPAIGN_SCHEMA_VERSION,
    planets: { ...progress.planets, [planetId]: next },
    updatedAt: now.toISOString(),
  };
}

/** Marks a planet complete (idempotent) and unlocks the next planet record if one exists. */
export function recordPlanetCompleted(progress: CampaignProgress, planetId: string, now = new Date()): CampaignProgress {
  const planet = planetById(planetId);
  const prev = planetProgress(progress, planetId);
  if (prev.completed) return progress;
  const done = normalisePlanet(planetId, planet.stages.length, planet.stages.length, true, now.toISOString());
  const planets = { ...progress.planets, [planetId]: done };
  if (planet.nextPlanetId && PLANETS[planet.nextPlanetId] && !planets[planet.nextPlanetId]) {
    planets[planet.nextPlanetId] = defaultPlanetProgress();
  }
  return { ...progress, version: CAMPAIGN_SCHEMA_VERSION, planets, updatedAt: now.toISOString() };
}

/** Byte-identical serialisation for two records with the same content. */
export function serializeCampaign(progress: CampaignProgress): string {
  return JSON.stringify(progress);
}
