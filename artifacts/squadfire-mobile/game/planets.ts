/**
 * Planet data model. A planet is a fixed, ordered list of StageConfigs plus
 * presentation metadata. The engine only ever sees `PlanetConfig` — nothing in the
 * simulation branches on a planet id; planet-specific content lives in the config.
 *
 * v0.4.0 ships exactly one playable planet (Earth, 10 stages). The next planet is a
 * locked placeholder in the UI.
 */
import { EARTH_STAGES, type StageConfig } from './stages';

export interface PlanetConfig {
  id: string;
  displayName: string;
  /** 1-based order in the campaign. */
  order: number;
  /** Renderer environment key (skyline/palette). Earth reuses the causeway scene. */
  environmentId: string;
  stages: readonly StageConfig[];
  /** Id of the planet unlocked by completing this one. Undefined = end of the road for now. */
  nextPlanetId?: string;
}

export const EARTH: PlanetConfig = Object.freeze({
  id: 'earth',
  displayName: 'EARTH',
  order: 1,
  environmentId: 'causeway',
  stages: EARTH_STAGES,
});

export const PLANETS: Readonly<Record<string, PlanetConfig>> = Object.freeze({ earth: EARTH });

export const DEFAULT_PLANET_ID = EARTH.id;

/** Planets in campaign order. */
export const PLANET_ORDER: readonly string[] = Object.values(PLANETS)
  .sort((a, b) => a.order - b.order)
  .map((p) => p.id);

export function planetById(id: string | undefined): PlanetConfig {
  return (id !== undefined && PLANETS[id]) || EARTH;
}

/** Clamped stage lookup: `stage` outside 1..length returns the nearest end. */
export function planetStage(planet: PlanetConfig, stage: number): StageConfig {
  const n = Math.min(planet.stages.length, Math.max(1, Math.floor(stage)));
  return planet.stages[n - 1];
}

export function isLastStage(planet: PlanetConfig, stage: number): boolean {
  return Math.floor(stage) >= planet.stages.length;
}

/** Config sanity used by tests and the dev overlay. Throws on the first violation. */
export function validatePlanet(planet: PlanetConfig): void {
  if (planet.stages.length === 0) throw new Error(`${planet.id}: no stages`);
  planet.stages.forEach((s, i) => {
    if (s.id !== i + 1) throw new Error(`${planet.id} stage ${i + 1}: id ${s.id}`);
    if (!Number.isInteger(s.enemyCount) || s.enemyCount <= 0) throw new Error(`${planet.id} stage ${s.id}: enemyCount`);
    if (!(s.enemyHP > 0)) throw new Error(`${planet.id} stage ${s.id}: enemyHP`);
    if (!(s.spawnWindowSec > 0)) throw new Error(`${planet.id} stage ${s.id}: spawnWindowSec`);
    if (s.minGroupSize < 1 || s.maxGroupSize < s.minGroupSize) throw new Error(`${planet.id} stage ${s.id}: group range`);
    if (s.boss && !(s.boss.hp > 0)) throw new Error(`${planet.id} stage ${s.id}: boss hp`);
    const mix = s.archetypeMix.grunt + s.archetypeMix.runner + s.archetypeMix.elite;
    if (!(mix > 0)) throw new Error(`${planet.id} stage ${s.id}: archetype mix`);
  });
  const last = planet.stages[planet.stages.length - 1];
  if (!last.boss || last.boss.type !== 'final') throw new Error(`${planet.id}: last stage must have the final boss`);
}
