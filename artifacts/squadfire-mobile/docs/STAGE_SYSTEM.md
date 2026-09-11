# SquadFire — Stage System

The player-facing progression unit is the **Stage**. There is no "wave" anywhere in the UI, code
identifiers, saves or analytics. One Stage = several sequential spawn groups (plus a boss every 5th
stage); killing a group never completes a stage.

## Rules (non-negotiable)
- A stage completes only when **every scheduled spawn has happened and every enemy — boss included — is dead**.
- Boss stages: `stage % 5 === 0` (`STAGES.bossEvery`). Every 10th (`majorBossEvery`) is a **major** boss
  ("HIGH WARDEN", ×1.35 HP, harder cadence). Boss stages run their normal enemy sequence first, then a
  `BOSS INCOMING` warning (1.3 s), then the boss.
- Transitions are fast and never leave gameplay: `STAGE 03` banner (~1 s), `STAGE CLEAR` (0.6 s clearing +
  1.0 s transition), next stage. Squad, upgrades and run score/coins persist (`STAGES.transition`).
- Stage 1 is deliberately trivial (10 grunts in groups of 2–3 at 60 % HP / 85 % speed).

## State machine (`Game.stageState`, driven in `updateDirector`)
```
INTRO (1.1 s banner) → ACTIVE (spawn timeline) ─┬─ no boss → CLEARING → COMPLETE → next stage INTRO
                                                └─ boss: BOSS_WARNING (1.3 s) → BOSS_ACTIVE → CLEARING → COMPLETE
```
- **ACTIVE** advances the timeline: sequences in order, each with `startDelay`, then groups spaced by
  `betweenGroupDelay` (or the group's own `delayAfter`). A group spawns its enemies one per frame in a lane
  around a random x with `groupLateralSpread`. Leaves ACTIVE when `remainingScheduledSpawns === 0 &&
  activeEnemyCount === 0`.
- **BOSS_ACTIVE** keeps escorts coming (`escortInterval`, cycle ≥ 2) and gates are suppressed while the boss is
  alive. Leaves when the boss death animation finishes and the road is empty.
- `Game.stage`, `stageState`, `stageConfig`, `stageTime`, `stageCursor`, `remainingScheduledSpawns`,
  `activeEnemyCount`, `isBossStage` are all readable by HUD/renderer/tests; the debug overlay prints them.
- Gates keep their own timer across stages so squad growth continues.

## Data (`game/stages.ts`)
`StageConfig { id, difficulty, sequences[], boss?, enemyHpMultiplier, enemySpeedMultiplier, rewardMultiplier }`,
`SpawnSequence { startDelay, betweenGroupDelay, groups[] }`, `SpawnGroup { kind, count, spacing, delayAfter? }`,
`BossStageConfig { tier, hpMultiplier, attackIntervalScale, escortInterval?, escortKind? }`.
Stages 1–5 are hand-authored; 6+ are generated deterministically by `stageConfig(n)` (memoised, supports 100+):
totals 22 → ~110, group size 4 → 12, group delay 1.35 → 0.45 s, elite share 6 → 32 %, runners from stage 3,
HP × `1 + (n−5)·0.035`, speed up to +45 %, post-boss stage × 0.85 enemies / × 0.9 HP (relief). Boss per
cycle: HP × `0.9·(1 + 0.28·(cycle−1))` (×1.35 major), slam cadence 1.15 → 0.55.

## Events / HUD / rewards
Events: `stage-start` ("STAGE 03"), `stage-clear` ("STAGE CLEAR"), `boss-warning` ("BOSS INCOMING"), plus the
existing boss/gate/soldier events. HUD shows only the `STAGE 03` pill (long-press = dev panel). Rewards are
accumulated into `Game.run { coins, score, stagesCleared }` with `STAGES.rewards` (boss stages ×2.5);
they are tracked now and spent by nothing yet (shop is out of scope).

## Persistence & analytics
`game/campaign-progress.ts` (pure) + `game/campaign.ts` (AsyncStorage): `CampaignProgress { version,
highestUnlockedStage, highestCompletedStage, bestStage }`. `migrateCampaign` maps legacy
`highestUnlockedWave/currentWave/highestCompletedWave` and old storage keys. Saved on every `stage-clear`.
Runs start at Stage 1 until a menu/continue rule exists (squad size is per-run). Analytics semantics, when a
sink is added: `stage_started { stage, isBossStage }`, `stage_completed { stage, durationS, squad }`,
`stage_failed { stage, state }`.

## Dev tools
Dev panel: Clear enemies, Next stage, Stage 5, Stage 10, Reset save. Debug overlay line:
`stage N STATE  boss stage  seq i/n  group j  queued k  active m`.
