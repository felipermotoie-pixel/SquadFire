# SquadFire — Stage System (v0.4.0)

The player-facing progression unit is the **Stage**; stages belong to a **planet**
(`PLANET_SYSTEM.md`). There is no "wave" in UI, identifiers, saves or analytics. Earth has 10 fixed,
hand-authored stages; a run is Stage 1 → 10 → planet victory.

## Rules (non-negotiable)
- A stage completes only when **every scheduled spawn has happened and every enemy — boss included — is
  dead**. Spawns are never dropped: if `ENEMIES.maxAlive` (300) is reached the event is *deferred*
  (`stats.deferredSpawns`) and spawned as soon as a slot frees.
- A stage has a boss iff `StageConfig.boss` is set (Earth: Stage 5 sub-boss 4500 HP, Stage 10 final
  18000 HP). Boss stages run the whole regular schedule first, then `BOSS INCOMING` (1.3 s), then the boss.
- Transitions never leave gameplay: `STAGE 03` banner (1.1 s), `STAGE CLEAR` (0.6 s clearing + 1.0 s
  transition), next stage. Squad Power, modifiers and run coins/score persist (`STAGES.transition`).
- Every run and every RETRY starts at Stage 1 with Squad Power 5. Clearing the last stage of the planet
  is terminal (`phase = 'victory'`).

## State machine (`Game.stageState`, driven in `updateDirector`)
```
INTRO (1.1 s) → ACTIVE (spawn schedule) ─┬─ no boss → CLEARING → COMPLETE → next stage INTRO / victory
                                         └─ boss: BOSS_WARNING (1.3 s) → BOSS_ACTIVE → CLEARING → COMPLETE
```
- **ACTIVE** consumes the stage's `SpawnSchedule` by `stageTime`; leaves when all regulars have spawned
  and `activeEnemyCount === 0`. The stage clock (`stageActiveTime`) starts at ACTIVE, so `stageLog`
  clear times exclude the intro.
- **BOSS_ACTIVE**: boss spawns at `geometry.bossSpawnDepth`, approaches to `BOSS.holdY` (3.1) in
  `approachDurationTargetSec` (10 s; speed derived from the distance), then patrols/slams as before.
  Escorts only if `escortSize > 0` (Earth: none). Gates are suppressed while the boss is alive.
  `Game.bossTiming { spawnTime, holdReachedTime, deathTime, killedDuringApproach }` is what the
  balance harness reads.
- Readable: `stage`, `stageState`, `stageConfig`, `stageTime`, `stageActiveTime`, `schedule`,
  `spawnedRegulars`, `remainingScheduledSpawns`, `activeEnemyCount`, `isBossStage`, `isLastStage`,
  `stageLog[]`. The debug overlay prints planet / stage / boss type / spawned / deferred / active / peak /
  clock / power / visible / spawn depth / eligibility.

## Spawn schedule (`game/spawn-schedule.ts`)
`createSpawnSchedule(cfg, seed)` is pure and deterministic (seed = run seed ⊕ stage id):
1. Group sizes drawn in `[minGroupSize, maxGroupSize]`; the last group absorbs the remainder so the
   exact `enemyCount` is always met (a schedule that does not sum throws).
2. One archetype per group from `archetypeMix` (weights) and one lane `x ∈ (−0.55, 0.55)`.
3. Group starts spread evenly over `spawnWindowSec` with bounded jitter that can never reorder groups;
   the last enemy of the last group lands exactly at the window end. Inside a group enemies spawn
   every 0.3 s (runners 0.24 s), in rows `FAR_SPAWN.groupDepthOffset` deep with `depthJitter`.

## Far spawn geometry (`game/spawn-geometry.ts`)
Everything is derived from the camera (`computeSpawnGeometry(cam)`), never from `ROAD_LENGTH`:
```
enemySpawnDepth   = farVisibleDepth − 1.4      (≈ 21.6 at 402×874)
bossSpawnDepth    = farVisibleDepth − 1.2
combatDepth       = max(deepest regular/boss hittable depth, gate spawn)  → spatial grid rows
```
Enemies appear right below the horizon (visual fade-in 0.3 s, collision immediate) and walk the full
road; time-to-contact ≈ 50 s grunt / 33 s runner / 62 s elite at ×1.0 speed. The renderer's haze and
road fade use the same geometry, so nothing pops in a visible band. `spawnGeometryViolations()` is a
test guard (spawn ≤ far visible, grid covers combat depth).

## Earth table (`game/stages.ts`)
| Stage | Count | HP | Window | Group | Speed | Mix g/r/e | Boss |
|---|---|---|---|---|---|---|---|
| 1 | 36 | 20 | 60 s | 2–3 | 1.00 | 1/0/0 | — |
| 2 | 44 | 30 | 65 s | 2–4 | 1.02 | .86/.14/0 | — |
| 3 | 52 | 40 | 70 s | 3–4 | 1.04 | .80/.16/.04 | — |
| 4 | 60 | 50 | 75 s | 3–5 | 1.06 | .76/.18/.06 | — |
| 5 | 60 | 50 | 75 s | 3–5 | 1.07 | .74/.18/.08 | sub 4500 |
| 6 | 72 | 60 | 75 s | 4–5 | 1.08 | .72/.20/.08 | — |
| 7 | 84 | 70 | 80 s | 4–6 | 1.10 | .70/.20/.10 | — |
| 8 | 96 | 80 | 85 s | 4–7 | 1.12 | .68/.22/.10 | — |
| 9 | 108 | 100 | 90 s | 5–7 | 1.14 | .66/.22/.12 | — |
| 10 | 120 | 120 | 90 s | 5–8 | 1.15 | .64/.24/.12 | final 18000 |
Total 732 regulars, ≈ 765 s of spawn windows; measured full run ≈ 832 s (13.9 min) on the balance harness.

## Events / HUD / rewards
Events: `stage-start`, `stage-clear`, `boss-warning`, `planet-complete`, plus boss/gate/soldier events.
HUD: `EARTH • STAGE 03/10` pill (long-press = dev panel), `SQUAD n / 500`, boss bar with the boss
name. Rewards accumulate into `Game.run { coins, score, stagesCleared }` (spent by nothing; shop out of
scope).

## Persistence & analytics
See `PLANET_SYSTEM.md` (schema v3, planet-keyed, saved by `CampaignScreen` only for eligible runs).
Analytics semantics when a sink exists: `stage_started { planet, stage, hasBoss }`,
`stage_completed { planet, stage, clearTimeS, squadPower }`, `planet_completed { planet, runTimeS }`.

## Dev tools
Dev panel: presets P1/P5/P9/P10/P13/P100/P499/P500, ±power, modifier cheats, Clear enemies, Next stage,
Stage 5 / Stage 10, Boss near / Boss far entry, Stress 500/300, Reset save. All of them latch
`progressEligible = false` (`DEV RUN — PROGRESS NOT SAVED` badge).
