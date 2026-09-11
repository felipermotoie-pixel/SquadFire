# SquadFire — Planet System (v0.4.0)

A **planet** is a fixed, hand-authored list of stages with a terminal victory. v0.4.0 ships one
planet, **Earth** (10 stages). There is no infinite stage generator any more: `game/stages.ts`
holds the Earth table, `game/planets.ts` holds the planet registry.

## Data
```
PlanetConfig { id: 'earth', displayName: 'EARTH', stages: EARTH_STAGES (10), nextPlanetId?: undefined }
StageConfig  { id, enemyCount, enemyHP, spawnWindowSec, minGroupSize, maxGroupSize,
               enemySpeedMultiplier, archetypeMix { grunt, runner, elite }, boss?: StageBossConfig }
StageBossConfig { type: 'sub' | 'final', hp, approachDurationTargetSec, attackIntervalMultiplier,
                  escortSize, escortInterval }
```
- Regular enemy HP comes **only** from `StageConfig.enemyHP` (absolute values, never coupled to rifle
  damage; no Earth-specific branch in the engine). Enemy kind still sets speed / hit radius.
- Boss HP is absolute per stage (`4500` sub-boss at Stage 5, `18000` final at Stage 10). There is no
  boss multiplier, no `rewardMultiplier`, no "every 5th stage" rule: a stage has a boss iff
  `StageConfig.boss` is set. `bossDisplayName(boss)` maps type → "WARDEN OF THE CAUSEWAY" /
  "HIGH WARDEN OF THE CAUSEWAY".
- `validatePlanet()` (run at module load) rejects empty planets, non-contiguous ids, non-positive
  counts/HP/windows and `minGroupSize > maxGroupSize`.

## Run flow (outside the engine)
`components/CampaignScreen.tsx` owns the flow; the engine only knows "a planet and a stage".
```
PRE_RUN (planet card: EARTH · PROGRESS x/10 · PLAY · NEXT PLANET LOCKED)
  → RUN   (<GameScreen planetId>, one Game per run, Stage 1, Squad Power 5)
  → PLANET_COMPLETE summary (Game unmounted) → PRE_RUN
```
- Every run and every RETRY starts at **Stage 1 with the initial Squad Power**. Squad Power is
  per-run; there is no mid-planet continue.
- Clearing the last stage puts the engine in `phase = 'victory'` (terminal: no Stage 11, no gates,
  no spawns) and emits exactly one `planet-complete` event. Defeat is unchanged (`SQUAD LOST`).
- Stage-to-stage transitions keep squad power, modifiers, coins (`STAGES.transition`).

## Engine surface
`new Game({ seed, planetId?, initialSquadPower?, startStage?, width?, height?, maxAliveOverride? })`.
Readable: `planet`, `stage`, `stageConfig`, `stageState`, `stageLog[]` (per cleared stage: clear time,
peak active, deferred spawns, spawned regulars, power at clear), `bossTiming`, `isLastStage`,
`isTerminal`, `progressEligible`.

## Progress eligibility
`Game.progressEligible` starts `true` and **latches to `false`** whenever something non-campaign
touches the run: `scripted = true`, `setSquadPower`, `devAddSquadPower`, `devApplyEffect`,
`devJumpToStage`, `spawnEnemy`, `spawnEnemyGroup`, `spawnBoss`, `debugClearEnemies`,
`maxAliveOverride`. Nothing re-enables it. `GameScreen` reports `stage-clear` upward only while
eligible; the planet summary carries the flag so the wrapper never persists an ineligible run. In
dev builds the HUD shows `DEV RUN — PROGRESS NOT SAVED` while ineligible.

## Persistence (schema v3)
`game/campaign-progress.ts` (pure) + `game/campaign.ts` (AsyncStorage):
```
CampaignProgress { version: 3, currentPlanetId, planets: { [id]: { highestCompletedStage, completed, completedAt? } }, updatedAt }
```
- `recordStageCleared(progress, planetId, stage)` — monotonic, clamped to the planet's stage count;
  returns the same object when nothing changes (so the wrapper skips the write).
- `recordPlanetCompleted(progress, planetId)` — idempotent; sets `completed`, keeps
  `highestCompletedStage = stages.length`.
- `migrateCampaign(raw)`: v1 wave-era (`highestUnlockedWave`/`highestCompletedWave`) and v2
  (`highestUnlockedStage`/`highestCompletedStage`/`bestStage`) are mapped to Earth, clamped to 10;
  a v2 record with ≥ 10 completed stages is a completed Earth; `bestStage` is dropped; unknown
  planets are dropped. Old storage keys `squadfire.progress` / `squadfire.save` are read once and
  re-saved under `squadfire.campaign`.
- The wrapper performs **one reduced write per changed record** (no per-frame or per-event saving).

## Adding a planet (later)
Add a `PlanetConfig` to `PLANETS`, point `EARTH.nextPlanetId` at it, author its stage table. The
scheduler, geometry, HUD (`EARTH • STAGE 03/10`), progress record and reducers are already planet-keyed.
Unlock rules / planet select UI are out of scope for v0.4.0.
