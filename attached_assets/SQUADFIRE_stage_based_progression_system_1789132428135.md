# SQUADFIRE — STAGE-BASED PROGRESSION SYSTEM

> **Goal:** remove the current player-facing **Wave** progression model and replace it with a true **Stage / Fase system**.
>
> In SquadFire, a **Stage is the playable level**.
>
> A Stage contains a continuous sequence of enemy spawns and enemy groups.
> The player only advances to the next Stage after completing the entire current Stage.
>
> Bosses occur every 5 Stages:
>
> ```text
> Stage 5  → Boss
> Stage 10 → Boss
> Stage 15 → Boss
> Stage 20 → Boss
> ...
> ```

---

# 1. CORE TERMINOLOGY

Remove the player-facing concept of:

```text
WAVE
```

Replace it with:

```text
STAGE
```

Portuguese meaning:

```text
FASE
```

Examples:

```text
Stage 1
Stage 2
Stage 3
Stage 4
Stage 5
```

Do not show:

```text
Wave 1
Wave 2
Wave 3
```

The game progression unit is the **Stage**.

---

# 2. IMPORTANT DISTINCTION

A Stage is NOT one single enemy group.

A Stage contains **multiple sequential enemy groups / spawn sequences**.

Correct model:

```text
STAGE 1
    ↓
small enemy group
    ↓
short interval
    ↓
another enemy group
    ↓
short interval
    ↓
another enemy group
    ↓
all Stage 1 enemies defeated
    ↓
STAGE COMPLETE
    ↓
STAGE 2
```

Incorrect model:

```text
Wave 1 = Stage 1
Wave 2 = Stage 2
Wave 3 = Stage 3
```

Do not preserve that behavior.

---

# 3. PLAYER EXPERIENCE

The intended experience is continuous.

Example:

```text
STAGE 1 STARTS
↓
3 small enemies appear
↓
player kills them
↓
2 more enemies enter
↓
player kills them
↓
4 enemies enter
↓
player kills them
↓
Stage 1 spawn sequence is finished
↓
all remaining enemies are defeated
↓
STAGE 1 COMPLETE
↓
transition
↓
STAGE 2 STARTS
```

Enemy appearances should feel like a natural sequence of encounters rather than a UI announcing multiple waves.

---

# 4. STAGE COMPLETION RULE

A Stage is complete only when BOTH conditions are true:

```text
all configured enemy spawns for the Stage have occurred
```

AND:

```text
all remaining enemies from the Stage are dead
```

Conceptually:

```ts
stageComplete =
  spawnSequenceFinished &&
  activeEnemyCount === 0;
```

Do not advance the Stage merely because one local enemy group was destroyed.

---

# 5. STAGE START

When a new Stage begins:

1. display a short Stage indicator;
2. initialize that Stage's spawn configuration;
3. preserve appropriate run progression;
4. begin the enemy spawn timeline;
5. remove the Stage banner quickly so gameplay remains visible.

Example UI:

```text
STAGE 1
```

or:

```text
1
```

with a subtle Stage label.

Do not stop gameplay for a long cinematic between normal Stages.

---

# 6. STAGE TRANSITION

After a Stage is cleared:

```text
all enemies defeated
↓
brief clear feedback
↓
STAGE CLEAR
↓
short 0.8–1.5 second transition
↓
next Stage begins
```

The transition should feel rewarding but fast.

Do not return to the Main Menu between normal Stages.

---

# 7. CONTINUOUS ENEMY SPAWNING

Inside a Stage, enemies appear according to a timed spawn schedule.

Use concepts such as:

```text
SpawnSequence
SpawnGroup
SpawnEvent
SpawnInterval
```

Do NOT call these player-facing Waves.

Recommended data structures:

```ts
interface StageConfig {
  id: number;
  difficulty: number;
  spawnSequences: SpawnSequence[];
  boss?: BossStageConfig;
  rewardMultiplier: number;
}

interface SpawnSequence {
  startDelayMs: number;
  groups: SpawnGroup[];
}

interface SpawnGroup {
  enemyType: EnemyType;
  count: number;
  spawnIntervalMs: number;
  formation: SpawnFormation;
  laneBias?: number;
}
```

Exact implementation may differ, but the architecture must preserve the same concepts.

---

# 8. SPAWN PHILOSOPHY

Enemies should not all appear at once.

They should enter gradually.

Example Stage 1:

```text
0.0s
2 Grunts

2.5s
2 Grunts

5.0s
3 Grunts

8.0s
2 Grunts
```

This gives the player time to understand the shooting/drag mechanic.

Later Stages may overlap groups more aggressively.

---

# 9. EARLY GAME DIFFICULTY

The first Stages must be intentionally forgiving.

The player should quickly understand:

```text
drag horizontally
↓
align shots
↓
kill enemies
↓
grow stronger
```

Target feeling:

```text
Stage 1 → very easy
Stage 2 → easy
Stage 3 → easy
Stage 4 → easy/moderate
Stage 5 → first boss, still accessible
```

The goal is:

```text
LEARN
↓
FEEL POWERFUL
↓
UNDERSTAND THE LOOP
↓
THEN INCREASE DIFFICULTY
```

---

# 10. EXAMPLE — STAGE 1

Stage 1 should be extremely approachable.

Example configuration:

```text
Enemy types:
Grunt only

Enemy HP:
very low

Enemy speed:
slow

Total enemies:
approximately 8–12

Spawn pattern:
small groups of 2–3

Spawn interval:
generous

Enemy damage:
low
```

Example sequence:

```text
Group 1:
2 Grunts

Group 2:
2 Grunts

Group 3:
3 Grunts

Group 4:
3 Grunts
```

Target average first-attempt completion:

```text
95%+
```

assuming the player understands basic drag.

---

# 11. EXAMPLE — STAGE 2

Slightly increase enemy volume.

Example:

```text
Total enemies:
12–16

Groups:
3–4 enemies

HP:
still low

Spawn intervals:
slightly shorter
```

Do not introduce a large difficulty jump.

---

# 12. EXAMPLE — STAGE 3

Introduce slightly more pressure.

Possible:

```text
15–20 enemies

Grunt majority
+
a small number of faster enemies
```

If a new enemy archetype is introduced, keep total difficulty conservative.

Never combine:

```text
new enemy type
+
large HP increase
+
large quantity increase
+
much faster spawns
```

all in the same Stage.

---

# 13. EXAMPLE — STAGE 4

Stage 4 prepares the player for the boss milestone.

Possible:

```text
20–25 enemies
slightly denser groups
slightly faster spawn cadence
```

Still very beatable for a normally progressed player.

---

# 14. STAGE 5 — FIRST BOSS

Every fifth Stage contains a boss.

Stage 5 should include:

```text
normal introductory enemy sequence
↓
brief pause / boss warning
↓
boss enters
↓
boss fight
↓
Stage 5 complete
```

The first boss must be easy enough to teach the boss mechanic.

Do not make Stage 5 a progression wall.

---

# 15. BOSS MILESTONE RULE

Boss Stage:

```ts
isBossStage = stageNumber % 5 === 0;
```

Examples:

```text
5
10
15
20
25
30
35
40
...
```

Every 10th Stage may eventually use a larger or more complex boss:

```text
Stage 5  → Boss
Stage 10 → Major Boss
Stage 15 → Boss
Stage 20 → Major Boss
```

This distinction is optional initially but architecture should support it.

---

# 16. BOSS STAGE FLOW

Recommended:

```text
Stage starts
↓
normal enemy encounters
↓
all pre-boss groups complete
↓
short warning
↓
boss enters
↓
boss encounter
↓
boss dies
↓
remaining summoned enemies cleared if needed
↓
Stage complete
```

Do not spawn the boss immediately at the beginning of every boss Stage unless explicitly configured.

---

# 17. BOSS WARNING

Before the boss enters:

```text
WARNING
```

or:

```text
BOSS INCOMING
```

Duration:

```text
~0.8–1.5 seconds
```

The warning should not completely hide gameplay.

---

# 18. BOSS DIFFICULTY

Boss difficulty increases progressively.

Avoid simply multiplying HP excessively.

Increase difficulty using:

- boss movement;
- attack cadence;
- attack patterns;
- summoned enemies;
- vulnerable windows;
- arena pressure;
- slightly increased HP/damage.

Bosses must remain readable and fair.

---

# 19. LONG-TERM STAGE CURVE

Initial campaign can still target:

```text
100 Stages
```

Recommended progression bands:

```text
Stage 1–5
Tutorial / very easy

Stage 6–15
Easy

Stage 16–30
Easy → moderate

Stage 31–50
Moderate

Stage 51–70
Moderate → hard

Stage 71–85
Hard

Stage 86–95
Very hard

Stage 96–100
Endgame
```

Do not make difficulty linear only through HP.

---

# 20. DIFFICULTY DIMENSIONS

Stage difficulty should be calculated from multiple dimensions:

```text
enemy count
enemy HP
enemy speed
enemy damage
spawn interval
group overlap
enemy archetype composition
formation
movement behavior
elite probability
boss mechanics
```

Avoid:

```text
difficulty = StageNumber * EnemyHP
```

as the main progression model.

---

# 21. SMOOTH DIFFICULTY GROWTH

Difficulty should grow smoothly.

Good example:

```text
Stage 7  → gradual increase
Stage 8  → gradual increase
Stage 9  → prepares for milestone
Stage 10 → boss peak
Stage 11 → slight relief after boss
```

Boss Stages may be temporary peaks.

---

# 22. POST-BOSS RELIEF

After a boss Stage, slightly reduce the immediate pressure.

Example:

```text
Stage 10 = boss peak
Stage 11 = slightly easier than Stage 10
```

Use the same philosophy after:

```text
5
10
15
20
...
```

when appropriate.

---

# 23. ENEMY GROUP SIZE

Recommended early progression:

```text
Stage 1:
2–3 enemies per group

Stage 2:
2–4

Stage 3:
3–5

Stage 4:
3–6

Stage 5:
normal groups + boss
```

Later Stages can use:

```text
small groups
medium groups
large clusters
overlapping groups
```

Do not immediately spawn huge crowds during tutorial Stages.

---

# 24. SPAWN CADENCE

Spawn cadence is one of the main difficulty controls.

Early:

```text
large interval between groups
```

Later:

```text
smaller intervals
```

Advanced:

```text
next group may spawn before the previous group is fully cleared
```

This should only become significant after the player understands the mechanics.

---

# 25. STAGE DURATION

Target normal Stage duration can begin around:

```text
20–45 seconds
```

for early Stages.

Later Stages may become:

```text
45–90 seconds
```

depending on tuning.

Boss Stages can be longer.

---

# 26. PLAYER PROGRESSION BETWEEN STAGES

Do not silently reset all progression at every Stage.

Create explicit rules.

Example:

```ts
interface StageTransitionRules {
  preserveSquad: boolean;
  preserveRunUpgrades: boolean;
  healPercentOnClear: number;
}
```

Recommended initial behavior:

```text
preserve run upgrades
preserve squad growth
small controlled recovery if needed
```

---

# 27. STAGE REWARDS

Each Stage should provide a small completion reward.

Examples:

```text
coins
score
progress
```

Boss Stages may provide larger rewards.

Example:

```text
Normal Stage:
1.0x reward

Boss Stage:
2.0x–3.0x reward
```

Exact economy values must remain configurable.

---

# 28. UI CHANGES

Remove player-facing:

```text
WAVE 1
WAVE 2
...
```

Replace with:

```text
STAGE 1
STAGE 2
...
```

The HUD should show only the current Stage number.

Example:

```text
STAGE 03
```

Do not show internal spawn-group number to the player unless there is a strong design reason.

---

# 29. MAIN MENU PLAY FLOW

When the player presses:

```text
PLAY
```

for a new game/campaign:

start at the correct unlocked Stage.

Initial new player:

```text
Stage 1
```

Later:

```text
highest unlocked Stage
```

according to campaign rules.

Do not route the player into an internal Wave identifier.

---

# 30. SAVE PROGRESSION

Campaign save should use Stage terminology.

Example:

```ts
interface CampaignProgress {
  highestUnlockedStage: number;
  highestCompletedStage: number;
}
```

Migrate legacy names such as:

```text
highestUnlockedWave
currentWave
```

if they exist.

Do not destroy existing saves.

Use save schema migration.

---

# 31. INTERNAL STATE MACHINE

Recommended Stage state:

```ts
type StageState =
  | "INTRO"
  | "SPAWNING"
  | "ACTIVE"
  | "BOSS_WARNING"
  | "BOSS_ACTIVE"
  | "CLEARING"
  | "COMPLETE";
```

Possible flow for normal Stage:

```text
INTRO
↓
SPAWNING / ACTIVE
↓
spawn sequence finishes
↓
remaining enemies killed
↓
CLEARING
↓
COMPLETE
```

Boss Stage:

```text
INTRO
↓
SPAWNING / ACTIVE
↓
pre-boss sequence cleared
↓
BOSS_WARNING
↓
BOSS_ACTIVE
↓
boss defeated
↓
CLEARING
↓
COMPLETE
```

---

# 32. DO NOT PAUSE BETWEEN INTERNAL GROUPS

The enemy groups inside a Stage should not behave like mini-levels.

Do not show:

```text
GROUP 1 COMPLETE
GROUP 2
GROUP 3
```

Do not show:

```text
WAVE COMPLETE
```

They are simply part of the Stage's spawn timeline.

Only the Stage itself receives player-facing progression feedback.

---

# 33. EXAMPLE CONFIG — STAGES 1–5

Example only. Final values must be tuned through playtesting/simulation.

```ts
const stages = [
  {
    id: 1,
    groups: [
      { type: "GRUNT", count: 2, intervalMs: 450 },
      { type: "GRUNT", count: 2, intervalMs: 450 },
      { type: "GRUNT", count: 3, intervalMs: 400 },
      { type: "GRUNT", count: 3, intervalMs: 400 },
    ],
    betweenGroupDelayMs: 1800,
  },

  {
    id: 2,
    groups: [
      { type: "GRUNT", count: 3, intervalMs: 420 },
      { type: "GRUNT", count: 3, intervalMs: 420 },
      { type: "GRUNT", count: 4, intervalMs: 380 },
      { type: "GRUNT", count: 4, intervalMs: 380 },
    ],
    betweenGroupDelayMs: 1600,
  },

  {
    id: 3,
    groups: [
      { type: "GRUNT", count: 4, intervalMs: 380 },
      { type: "GRUNT", count: 4, intervalMs: 360 },
      { type: "RUNNER", count: 2, intervalMs: 500 },
      { type: "GRUNT", count: 5, intervalMs: 350 },
    ],
    betweenGroupDelayMs: 1450,
  },

  {
    id: 4,
    groups: [
      { type: "GRUNT", count: 5, intervalMs: 350 },
      { type: "GRUNT", count: 5, intervalMs: 340 },
      { type: "RUNNER", count: 3, intervalMs: 450 },
      { type: "GRUNT", count: 6, intervalMs: 330 },
    ],
    betweenGroupDelayMs: 1300,
  },

  {
    id: 5,
    groups: [
      { type: "GRUNT", count: 5, intervalMs: 350 },
      { type: "RUNNER", count: 3, intervalMs: 420 },
      { type: "GRUNT", count: 6, intervalMs: 330 },
    ],
    boss: {
      type: "BOSS_01",
    },
    betweenGroupDelayMs: 1250,
  },
];
```

The important architecture is:

```text
ONE STAGE
=
MULTIPLE GROUPS
+
OPTIONAL BOSS
```

---

# 34. BALANCE TARGETS — EARLY STAGES

Suggested target first-attempt win rates:

```text
Stage 1:
95–100%

Stage 2:
92–98%

Stage 3:
90–96%

Stage 4:
88–95%

Stage 5:
80–90%
```

These are design targets, not guarantees.

Early game should feel forgiving.

---

# 35. MIGRATION FROM CURRENT WAVE SYSTEM

Inspect the current project for:

```text
wave
waveNumber
currentWave
waveConfig
waveStarted
waveComplete
waveProgress
spawnWave
```

Classify every use as:

```text
PLAYER PROGRESSION
```

or:

```text
INTERNAL SPAWN GROUP
```

Then migrate appropriately.

Player progression concepts become:

```text
Stage
```

Internal spawn concepts become:

```text
SpawnGroup
SpawnSequence
SpawnEvent
```

Do not perform blind string replacement.

---

# 36. RECOMMENDED TYPE RENAMING

Where safe and appropriate:

```text
WaveConfig
→ StageConfig
```

if the old WaveConfig represented the full playable level.

If the old WaveConfig represented one enemy batch:

```text
WaveConfig
→ SpawnGroup
```

Inspect semantics before renaming.

---

# 37. TEST A — STAGE 1

Start new campaign.

Expected:

```text
STAGE 1
```

Enemy groups appear sequentially.

No "Wave" UI appears.

Destroying the first group does NOT advance to Stage 2.

Only after:

```text
all Stage 1 groups spawned
+
all Stage 1 enemies defeated
```

does Stage 1 complete.

---

# 38. TEST B — STAGE 2

Stage 2 contains more enemies than Stage 1 but remains easy.

Verify:

- smooth transition;
- no major difficulty spike;
- no Wave labels;
- correct stage state.

---

# 39. TEST C — STAGE 5 BOSS

Reach Stage 5.

Expected:

```text
normal Stage 5 enemy sequence
↓
boss warning
↓
boss spawn
↓
boss defeat
↓
Stage 5 complete
```

Do not complete Stage 5 before the boss is defeated.

---

# 40. TEST D — STAGE 6 AFTER BOSS

Stage 6 should begin normally.

Recommended:

Stage 6 pressure may be slightly lower than the boss peak at Stage 5.

Verify the difficulty curve feels natural.

---

# 41. TEST E — STAGE 10

Stage 10 must be automatically recognized as a Boss Stage.

Verify:

```ts
10 % 5 === 0
```

Boss logic activates without hardcoding only Stage 5.

---

# 42. TEST F — 100-STAGE COMPATIBILITY

The architecture must support:

```text
Stage 1 → Stage 100+
```

without manually creating 100 separate gameplay screens.

Use data-driven StageConfig.

---

# 43. DEBUG TOOLS

Developer overlay may show:

```text
Stage ID
Stage State
Current Spawn Sequence
Current Spawn Group
Remaining Scheduled Spawns
Active Enemy Count
Boss Stage true/false
```

These are developer-only.

Player HUD should remain simple.

---

# 44. ANALYTICS PREPARATION

Replace future analytics semantics:

```text
wave_started
wave_completed
```

with:

```text
stage_started
stage_completed
stage_failed
```

Internal spawn analytics, if needed, may use:

```text
spawn_group_started
spawn_group_completed
```

Do not mix player progression with spawn internals.

---

# 45. DOCUMENTATION

Update:

```text
docs/GAME_DESIGN.md
docs/ARCHITECTURE.md
docs/BALANCE.md
docs/TEST_PLAN.md
docs/PROJECT_STATE.md
replit.md
```

Create if useful:

```text
docs/STAGE_SYSTEM.md
```

Document clearly:

```text
Stage = player-facing level
SpawnGroup = internal group of enemies
Boss every 5 Stages
```

---

# 46. VERSION CONTROL

Treat this as a dedicated progression-system refactor.

Before implementation:

1. inspect current Git state;
2. create a stable checkpoint;
3. do not overwrite existing tags.

After implementation:

1. run all tests;
2. update docs;
3. commit;
4. create the next valid semantic version tag;
5. STOP.

Do not implement unrelated shop/economy/content changes in the same pass.

---

# 47. FINAL NON-NEGOTIABLES

1. Remove player-facing Wave progression.
2. Use Stage as the player-facing level.
3. One Stage contains multiple sequential enemy groups.
4. Killing one group does NOT complete the Stage.
5. Stage completes only after its entire spawn schedule is finished and all enemies are dead.
6. Early Stages must be easy.
7. Difficulty increases progressively.
8. Boss every 5 Stages.
9. Stage 5, 10, 15, 20, etc. must support bosses automatically.
10. Boss Stages may contain normal enemies before the boss.
11. Do not create 100 hardcoded screens.
12. Use data-driven StageConfig.
13. Preserve straight-fire manual aiming.
14. Preserve compact squad formation.
15. Preserve current graphical quality.
16. Preserve performance budget.
17. Update save/analytics terminology safely.
18. Test, document, commit, tag, and STOP.

---

# 48. FINAL DESIGN SUMMARY

The intended SquadFire progression is:

```text
STAGE 1
small, easy sequential enemy groups
↓
CLEAR

STAGE 2
slightly more enemies
↓
CLEAR

STAGE 3
slightly higher pressure
↓
CLEAR

STAGE 4
pre-boss preparation
↓
CLEAR

STAGE 5
normal enemy sequence
+
BOSS
↓
CLEAR

STAGE 6
new progression cycle
↓
...

STAGE 10
BOSS

STAGE 15
BOSS

STAGE 20
BOSS
```

The player should feel that each **Stage is one complete piece of progression**, while enemies continuously arrive in smaller internal groups during that Stage.

Do not use "Wave" as the player-facing progression unit anymore.
