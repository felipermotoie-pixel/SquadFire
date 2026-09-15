# SQUADFIRE — v0.4.0
## Planet Progression, Longer Fixed Stages, Far-Horizon Spawns & 10:1 Squad Compression

> **Objective:** redesign SquadFire's progression/balance architecture while preserving the current premium visual direction, straight-fire manual aiming, per-unit firing behavior, and collision-based combat.
>
> This release introduces:
>
> 1. Longer Stages with an exact enemy count and fixed HP per Stage.
> 2. Enemies spawning from the far readable end of the track/horizon.
> 3. A canonical Squad Power system capped at 500.
> 4. Automatic 10:1 soldier compression: every 10 base-equivalent soldiers become one buffed soldier with the exact combat power of 10.
> 5. Planet-based progression: 10 Stages per Planet, Sub-Boss at Stage 5, Final Boss at Stage 10.

---

# 1. PRESERVE EXISTING COMBAT RULES

Do not break or redesign:

```text
PLAYER DRAG = AIM THROUGH POSITIONING
STANDARD FIRE = STRAIGHT ALONG ROAD_FORWARD
NO AUTO-AIM
NO HOMING
NO HIDDEN AIM CORRECTION
```

Preserve:
- collision-based damage;
- current rifle direction;
- current perspective/camera system;
- current projectile visual direction;
- current compact formation architecture;
- current fire-rate upgrades;
- current damage upgrades;
- current high-fidelity visuals.

This release changes progression, spawn architecture, squad representation, and campaign structure.

---

# 2. TERMINOLOGY

Use:

```text
Planet = map/world
Stage = playable level
SpawnGroup / SpawnEvent = internal scheduling only
```

Do not reintroduce `Wave` as a player-facing concept.

---

# 3. PLANET SYSTEM

Each Planet contains exactly:

```text
10 Stages
```

Structure:

```text
Stage 1  → Normal
Stage 2  → Normal
Stage 3  → Normal
Stage 4  → Normal
Stage 5  → SUB-BOSS

Stage 6  → Normal
Stage 7  → Normal
Stage 8  → Normal
Stage 9  → Normal
Stage 10 → FINAL BOSS
```

After Stage 10:

```text
Final Boss defeated
→ Planet Complete
→ next Planet unlocked
```

Earth is the first Planet.

Recommended data model:

```ts
interface PlanetConfig {
  id: string;
  displayName: string;
  order: number;
  environmentId: string;
  stages: StageConfig[];
  unlockAfterPlanetId?: string;
}
```

Development validation:

```ts
assert(planet.stages.length === 10);
```

---

# 4. EARTH

Implement Earth as the first complete Planet.

```ts
id: "earth"
displayName: "EARTH"
```

Use the existing futuristic bridge / water / city environment.

Do not hardcode Earth-specific progression logic into the engine. Earth-specific values belong in data/config.

---

# 5. STAGE CONFIG

Recommended:

```ts
interface StageConfig {
  id: number;

  enemyCount: number;
  enemyHP: number;

  spawnWindowSec: number;
  minGroupSize: number;
  maxGroupSize: number;

  enemySpeedMultiplier: number;

  subBoss?: BossConfig;
  finalBoss?: BossConfig;

  rewardMultiplier: number;
}
```

Critical rule:

```text
enemyCount and enemyHP are fixed for that Stage.
```

Do not dynamically change them based on:
- current squad size;
- current DPS;
- how well the player is performing;
- player spending;
- clear speed.

No runtime rubber-banding.

---

# 6. LONGER STAGES

The game currently feels too easy/short.

A Stage must feel like a meaningful gameplay segment.

Achieve this through:

```text
fixed enemy count
+
fixed spawn window
+
fixed HP
+
controlled group density
```

A strong player still cannot clear the Stage before all configured enemies have actually spawned.

Do not add an artificial waiting timer after all enemies are dead.

---

# 7. TARGET DURATION

Earth target:

```text
Normal Stages:
~60–95 seconds

Stage 5:
~90–120 seconds total

Stage 10:
~105–140 seconds total
```

Stage completes only when:

```text
all regular SpawnEvents occurred
AND
all remaining regular enemies are dead
AND
required boss is dead
```

---

# 8. FIXED EARTH BALANCE TABLE

Use these as the authoritative v0.4.0 baseline.

Do not silently retune them during implementation.

| Stage | Regular Enemies | HP / Regular Enemy | Spawn Window | Speed | Boss |
|---|---:|---:|---:|---:|---|
| 1 | 36 | 2 | 60 s | 1.00x | — |
| 2 | 44 | 3 | 65 s | 1.02x | — |
| 3 | 52 | 4 | 70 s | 1.04x | — |
| 4 | 60 | 5 | 75 s | 1.06x | — |
| 5 | 60 | 5 | 75 s pre-boss | 1.07x | Sub-Boss: 450 HP |
| 6 | 72 | 6 | 75 s | 1.08x | — |
| 7 | 84 | 7 | 80 s | 1.10x | — |
| 8 | 96 | 8 | 85 s | 1.12x | — |
| 9 | 108 | 10 | 90 s | 1.14x | — |
| 10 | 120 | 12 | 90 s pre-boss | 1.15x | Final Boss: 1800 HP |

These values separate **duration** from **difficulty**.

Stage 1 should be long enough to feel substantial but still easy.

---

# 9. SPAWN GROUP SIZE

Recommended Earth group ranges:

```text
Stage 1:  2–3
Stage 2:  2–4
Stage 3:  3–4
Stage 4:  3–5
Stage 5:  3–5 + Sub-Boss
Stage 6:  4–5
Stage 7:  4–6
Stage 8:  4–7
Stage 9:  5–7
Stage 10: 5–8 + Final Boss
```

The exact regular-enemy total must always remain the StageConfig `enemyCount`.

Invariant:

```ts
sum(spawnGroups.map(g => g.count)) === stage.enemyCount;
```

---

# 10. SPAWN SCHEDULER

Build a deterministic schedule across `spawnWindowSec`.

Example concept:

```ts
createSpawnSchedule({
  exactCount: stage.enemyCount,
  windowSec: stage.spawnWindowSec,
  minGroupSize: stage.minGroupSize,
  maxGroupSize: stage.maxGroupSize,
  seed: stageSeed,
});
```

Requirements:
- exact count;
- deterministic under the same seed;
- no player-facing waves;
- no long dead periods;
- later Stages may have more overlapping groups.

---

# 11. FAR-HORIZON ENEMY SPAWN

Enemies currently appear too close.

Change the system so enemies begin:

```text
LAAAAA DE TRÁS DA PISTA
```

near the far readable end of the bridge.

The player should see:
1. tiny enemy silhouette near the horizon;
2. enemy moving forward;
3. enemy gradually increasing in projected size;
4. combat occurring over a much larger visible distance.

Do not let enemies suddenly pop into the middle of the bridge.

---

# 12. CAMERA-DERIVED SPAWN DEPTH

Do not keep the old fixed spawn depth as the source of truth.

Use:

```ts
enemySpawnDepth =
  farVisibleDepth - farSpawnInset;
```

`farVisibleDepth` must come from the camera/projection system.

`farSpawnInset` is a small margin so the enemy:
- is visible;
- remains on the road;
- is not clipped by the vanishing point;
- remains inside projectile range.

Do not permanently hardcode a value only for the current aspect ratio.

---

# 13. FAR-SPAWN VISUAL INTRO

If necessary use a subtle:

```text
0.20–0.35 s
```

fade/scale settle to avoid a visual pop.

Do not use teleport effects unless a future enemy type explicitly needs one.

---

# 14. COMBAT DEPTH MUST FOLLOW FAR SPAWN

IMPORTANT:

The old assumption that enemies only exist around world depth ~8 is obsolete.

Derive combat depth from current spawn configuration:

```ts
COMBAT_DEPTH =
  max(
    currentStageEnemySpawnDepth + maxEnemyDepthTolerance,
    bossSpawnDepth + bossDepthTolerance,
    relevantGateDepth
  );
```

Do not skip bullet collision checks at the old hardcoded depth.

Bullets must be able to damage enemies immediately after they appear at the far track.

Required invariant:

```ts
maxEnemyHittableDepth < farVisibleDepth;
```

---

# 15. PROJECTILE RANGE CONSISTENCY

Far-spawn enemies must always be inside valid projectile travel range.

Test:
- current camera;
- tallest supported screen;
- shortest supported screen;
- boss;
- regular enemy.

A bullet should never visually pass through a newly spawned distant enemy because collision checks were disabled too early.

---

# 16. STAGE 5 — SUB-BOSS

Flow:

```text
Stage 5
→ 60 regular enemies over ~75 sec
→ clear remaining regular enemies
→ SUB-BOSS warning
→ Sub-Boss enters from far track
→ Sub-Boss fight
→ Sub-Boss defeated
→ Stage 5 complete
```

Baseline:

```text
Sub-Boss HP = 450
```

Warning duration:

```text
~0.8–1.5 sec
```

---

# 17. STAGE 10 — FINAL BOSS

Flow:

```text
Stage 10
→ 120 regular enemies over ~90 sec
→ clear remaining regular enemies
→ FINAL BOSS warning
→ Final Boss enters from far track
→ Final Boss defeated
→ EARTH COMPLETE
→ next Planet unlock
```

Baseline:

```text
Final Boss HP = 1800
```

Earth must not continue into Stage 11.

---

# 18. CANONICAL SQUAD POWER

Introduce:

```ts
squadPower: number;
```

Hard range:

```text
0–500
```

Constant:

```ts
MAX_SQUAD_POWER = 500;
```

`squadPower` means the number of **base-soldier-equivalent combat units** owned by the player.

Do not use `visibleSoldiers.length` as the source of combat power.

---

# 19. 10:1 SQUAD COMPRESSION

Rule:

```text
EVERY 10 SQUAD POWER
=
1 BUFFED SOLDIER
```

Examples:

```text
10   → 1 buffed
20   → 2 buffed
100  → 10 buffed
500  → 50 buffed
```

Canonical decomposition:

```ts
const buffedCount = Math.floor(squadPower / 10);
const remainder = squadPower % 10;
```

Literal representation:

```text
visible units =
buffedCount
+
remainder normal soldiers
```

Examples:

```text
9   = 9 normal
10  = 1 buffed
13  = 1 buffed + 3 normal
29  = 2 buffed + 9 normal
100 = 10 buffed
500 = 50 buffed
```

This exactly preserves the user's requested "every 10 becomes 1 buffed soldier" behavior.

---

# 20. MAX VISIBLE COUNT NOTE

Because remainders are literal:

```text
499
=
49 buffed + 9 normal
=
58 visible units
```

At the actual cap:

```text
500
=
50 buffed
```

This is still dramatically lower than rendering 500 soldiers.

Do not instantiate 500 hidden soldier entities.

---

# 21. BUFFED SOLDIER POWER

A buffed soldier represents exactly:

```text
10 base soldiers
```

Use:

```text
same cadence
+
10× projectile damage
```

Do NOT use 10× fire rate.

Why:

```text
10× fire rate
≈ recreates the projectile load
that compression is meant to eliminate
```

---

# 22. DAMAGE FORMULA

Normal:

```ts
normalShotDamage =
  weapon.baseDamage *
  damageModifier;
```

Buffed:

```ts
buffedShotDamage =
  weapon.baseDamage *
  damageModifier *
  10;
```

Cadence for both:

```ts
firePeriod =
  1 / (weapon.fireRate * fireRateModifier);
```

No hidden duplicate projectiles.

---

# 23. DPS EQUIVALENCE

Invariant:

```text
1 buffed soldier DPS
=
10 normal soldiers DPS
```

Example:

```text
Base damage = 1
Fire rate = 2/s

10 normals:
10 × 1 × 2 = 20 DPS

1 buffed:
10 × 2 = 20 DPS
```

This equality must remain after:
- damage upgrades;
- fire-rate upgrades.

---

# 24. BUFFED VISUAL

Buffed soldier should look stronger but stay formation-friendly.

Recommended:
- 8–15% larger rendered scale;
- heavier armor;
- brighter cyan/blue core;
- distinct shoulder/helmet detail;
- subtle elite glow;
- slightly stronger muzzle flash.

Do not make it boss-sized.

---

# 25. TRANSFORMATION FEEDBACK

Crossing a complete group of 10:

```text
9 → 10
```

should cause:

```text
brief blue energy pulse
→ visual consolidation
→ one buffed soldier
```

Duration:

```text
~0.3–0.6 sec
```

No gameplay pause.

---

# 26. LOSSES / DECOMPRESSION SAFETY

If gameplay can remove squad members:

Losses must be applied to:

```text
squadPower
```

not by deleting an entire 10-power soldier arbitrarily.

Example:

```text
31 power
lose 1
→ 30
→ render 3 buffed
```

Rebuild the visual representation deterministically from canonical power.

---

# 27. MAX CAP

Always:

```ts
squadPower =
  clamp(squadPower, 0, MAX_SQUAD_POWER);
```

Never exceed:

```text
500
```

---

# 28. +SQUAD GATES NEAR CAP

For:

```text
+N SQUAD
```

use:

```ts
actualGain =
  Math.min(
    configuredGain,
    MAX_SQUAD_POWER - squadPower
  );
```

Example:

```text
497 power
+5 configured
→ display/apply +3
→ result 500
```

Do not waste invisible excess squad gain.

---

# 29. NO +SQUAD AT 500

At:

```text
squadPower === 500
```

`ADD_SQUAD` must be excluded from gate generation.

Do not show a disabled or useless squad gate.

Replace/reroll with:
- Damage;
- Fire Rate;
- other valid supported non-squad upgrades.

Invariant:

```ts
if (squadPower >= MAX_SQUAD_POWER) {
  gatePool = gatePool.filter(g => g.type !== "ADD_SQUAD");
}
```

---

# 30. FORMATION AFTER COMPRESSION

Formation operates on:

```text
visible combat units
```

not on 500 theoretical units.

At cap:

```text
500 power
→ 50 buffed visible soldiers
```

Reuse the compact v0.3.6 formation architecture:
- max 5 columns;
- depth-safe layout;
- footprint-aware edge clamp;
- perspective-correct muzzle anchors.

---

# 31. PROJECTILE PERFORMANCE BENEFIT

At cap:

Bad architecture:

```text
500 soldiers × fire rate
```

Required architecture:

```text
50 buffed soldiers × normal cadence
× 10 damage
```

Do not simulate the missing nine soldiers using hidden bullets.

Their power is carried by shot damage.

---

# 32. PLAYER/DEV UI

Player-facing option:

```text
SQUAD 237 / 500
```

Dev overlay:

```text
Squad Power: 237 / 500
Buffed: 23
Remainder Normals: 7
Visible Units: 30
```

Also display dev-only:

```text
Planet
Stage
Target enemies
Spawned enemies
Remaining enemies
Spawn timeline progress
Enemy Spawn Depth
Far Visible Depth
Combat Depth
FPS
Frame ms
Sim ms
Active Projectiles
```

---

# 33. PLANET-AWARE SAVE MODEL

Recommended:

```ts
interface PlanetProgress {
  planetId: string;
  highestCompletedStage: number;
  completed: boolean;
}

interface CampaignProgress {
  unlockedPlanetIds: string[];
  planetProgress: Record<string, PlanetProgress>;
  currentPlanetId: string;
}
```

Earth starts unlocked.

Next Planet unlocks only after Earth Stage 10 Final Boss dies.

---

# 34. SAVE MIGRATION

Version the save schema.

If legacy save only has global Stage progress:
- map it safely into Earth;
- clamp Earth progress to 10;
- do not crash or delete progression.

---

# 35. PLANET UI

After Play, support a Planet progression layer.

Minimum:

```text
EARTH
Unlocked
Progress: X / 10
```

Future Planets may appear locked.

Do not invent finished visual content for future Planets in this release.

---

# 36. GAMEPLAY HUD

Preferred:

```text
EARTH • STAGE 03/10
```

or an equally clean presentation.

A Planet uses local Stage numbers:

```text
1–10
```

Do not show:

```text
EARTH Stage 17
```

after this architecture is active.

---

# 37. PLANET COMPLETE FLOW

After Stage 10 Final Boss:

```text
FINAL BOSS DEFEATED
→ PLANET COMPLETE
→ save progress
→ unlock next Planet
→ Planet progression screen / approved continuation flow
```

Unlock must occur once only.

---

# 38. BALANCE PHILOSOPHY

Duration and difficulty are different.

Example:

```text
Stage 1:
longer but easy

Stage 9:
longer and difficult
```

Difficulty increases through:
- fixed HP;
- exact count;
- spawn density;
- slight speed increase;
- Sub-Boss / Final Boss.

Do not implement adaptive HP.

---

# 39. REQUIRED SIMULATOR SUPPORT

Update simulation to understand:
- Planet;
- Stage;
- exact enemyCount;
- fixed enemyHP;
- spawnWindowSec;
- far spawn depth;
- squadPower;
- buffed soldiers;
- remainder normals.

Simulator must compare compressed vs theoretical uncompressed combat power.

---

# 40. TEST — EXACT STAGE COUNT

For every Earth Stage:

```ts
spawnedRegularEnemies === stage.enemyCount;
```

Boss is additional.

No off-by-one errors.

---

# 41. TEST — FIXED HP

Each regular enemy gets exactly:

```text
StageConfig.enemyHP
```

for Earth v0.4.0.

Do not silently apply dynamic scaling.

---

# 42. TEST — STAGE DURATION

High-DPS autopilot:

```text
Stage cannot complete before
the final scheduled SpawnEvent occurred.
```

After the final event and all enemies are dead:
- complete immediately;
- do not wait for an arbitrary extra timer.

---

# 43. TEST — FAR SPAWN

Across supported aspect ratios verify:

- spawn is near far readable road;
- enemy is visible;
- enemy is on road;
- enemy is inside rifle range;
- collision is enabled immediately;
- enemy does not pop in halfway down track.

---

# 44. TEST — SUB-BOSS

Stage 5:
- 60 regular enemies exactly;
- regular sequence clears;
- warning;
- Sub-Boss;
- 450 HP;
- Stage cannot complete until Sub-Boss dies.

---

# 45. TEST — FINAL BOSS

Stage 10:
- 120 regular enemies exactly;
- warning;
- Final Boss;
- 1800 HP;
- Earth cannot complete until boss dies;
- next Planet unlock exactly once.

---

# 46. TEST — 10:1 DPS

Pure combat-math test:

```text
10 normals
vs
1 buffed
```

Same:
- damage modifier;
- fire-rate modifier;
- duration.

Required:

```text
equal theoretical damage
```

Repeat with:
- +Damage;
- +25% Fire Rate;
- both together.

---

# 47. TEST — CAP

Required:

```text
499 + 1 = 500
500 + N = 500
```

At 500:

```text
buffed = 50
remainder = 0
```

No `ADD_SQUAD` gate.

---

# 48. TEST — NEAR-CAP GATE

```text
497
+5 gate
→ +3 displayed
→ +3 applied
→ 500
```

No hidden lost gain.

---

# 49. TEST — VISUAL DECOMPOSITION

Examples must pass:

```text
9   → 9 normal
10  → 1 buffed
13  → 1 buffed + 3 normal
29  → 2 buffed + 9 normal
100 → 10 buffed
500 → 50 buffed
```

No hidden soldier entities.

---

# 50. PERFORMANCE TEST

Stress:

```text
500 squad power
50 buffed soldiers
max fire-rate modifier
far-range bullets
enemies active
boss active
VFX active
```

Measure:
- active projectiles;
- pool exhaustion;
- headless sim ms;
- offline renderer metric;
- real-device FPS/frame ms manually through Expo.

Do not claim physical-device validation unless actually performed.

---

# 51. MODULE RESPONSIBILITIES

Adapt to current repository, but recommended separation:

```text
game/planets.ts
  PlanetConfig

game/stages.ts
  StageConfig
  spawn schedule

game/squadPower.ts
  power
  cap
  10:1 decomposition

game/formation.ts
  visible units only

game/gates.ts
  cap-aware gate generation

game/engine.ts
  lifecycle
  spawn execution
  combat
```

Avoid duplicate architecture if equivalent modules already exist.

---

# 52. STAGE STATE MACHINE

Recommended:

```ts
type StageState =
  | "INTRO"
  | "SPAWNING"
  | "CLEARING_REGULARS"
  | "BOSS_WARNING"
  | "SUB_BOSS"
  | "FINAL_BOSS"
  | "COMPLETE";
```

Normal:

```text
INTRO
→ SPAWNING
→ CLEARING_REGULARS
→ COMPLETE
```

Stage 5:

```text
INTRO
→ SPAWNING
→ CLEARING_REGULARS
→ BOSS_WARNING
→ SUB_BOSS
→ COMPLETE
```

Stage 10:

```text
INTRO
→ SPAWNING
→ CLEARING_REGULARS
→ BOSS_WARNING
→ FINAL_BOSS
→ COMPLETE
→ PLANET COMPLETE
```

---

# 53. NO EMPTY WAITING

Long Stage does not mean boring Stage.

Schedule groups so:
- early gameplay is calm but active;
- there is usually an enemy approaching;
- later Stages overlap groups more often;
- only boss transitions deliberately create a short lull.

---

# 54. IMPLEMENTATION ORDER

## Phase A — Architecture
1. Tag `pre-v0.4.0`.
2. Add PlanetConfig.
3. Add Earth StageConfig 1–10.
4. Add Planet save/progress model.
5. Add migration.

## Phase B — Fixed Stage pacing
6. Exact enemy counts.
7. Fixed HP.
8. Spawn windows.
9. Deterministic SpawnGroups.
10. Stage-clear rules.

## Phase C — Far spawn
11. Derive spawn depth from camera.
12. Update CombatDepth.
13. Verify long-range collision.
14. Boss far spawn.

## Phase D — Squad Power
15. Add canonical `squadPower`.
16. Cap at 500.
17. Implement 10:1 decomposition.
18. Implement 10× buffed shot damage.
19. Preserve cadence.
20. Add transformation feedback.
21. Formation uses visible units only.

## Phase E — Gate cap
22. Clamp near-cap gains.
23. Remove `ADD_SQUAD` at 500.
24. Guarantee valid replacement gates.

## Phase F — Planet progression
25. Stage 5 Sub-Boss.
26. Stage 10 Final Boss.
27. Earth completion.
28. Next Planet unlock.

## Phase G — Validation
29. TypeScript.
30. Simulation tests.
31. Render previews.
32. Performance tests.
33. Manual Expo checklist.

## Phase H — Documentation / Version
34. Update docs.
35. Commit.
36. Tag `v0.4.0`.
37. STOP.

---

# 55. DOCUMENTATION

Create/update:

```text
docs/PLANET_SYSTEM.md
docs/STAGE_SYSTEM.md
docs/SQUAD_STACKING.md
docs/BALANCE.md
docs/ARCHITECTURE.md
docs/FIRING_SYSTEM.md
docs/TEST_PLAN.md
docs/PROJECT_STATE.md
```

Document:
- Earth table;
- exact counts/HP;
- far spawn;
- Stage 5/10 boss rules;
- 500 cap;
- 10:1 power equivalence;
- gate behavior;
- save migration.

---

# 56. VERSIONING

Before implementation:

```text
verify v0.3.6 is clean
tag pre-v0.4.0
```

After implementation/tests/docs:

```text
commit
tag v0.4.0
```

Never move old tags.

Then STOP.

No:
- shop redesign;
- monetization;
- new weapons;
- unrelated menu redesign;
- unrelated economy changes.

---

# 57. REQUIRED FINAL REPORT

Before declaring completion, report for every Earth Stage:

```text
enemy count
enemy HP
spawn window
measured autopilot clear time
peak simultaneous enemies
```

Also report:

```text
Stage 5 Sub-Boss fight duration
Stage 10 Final Boss fight duration

10 normals vs 1 buffed DPS
100-equivalent comparison
500-power visible count

max active projectiles
projectilePoolExhausted
headless sim ms
offline render metric
manual Expo validation still required
```

Do not silently retune the fixed Earth table while producing the report.

---

# 58. ACCEPTANCE CRITERIA

Implementation is complete only if:

1. Earth has exactly 10 Stages.
2. Every Stage has exact regular-enemy count.
3. Every Stage has fixed regular-enemy HP.
4. Stage duration is materially longer than the current build.
5. Stage 1 remains easy despite being longer.
6. Difficulty rises gradually.
7. Enemies appear near the far visible end of the track.
8. Enemies are hittable from spawn.
9. Stage 5 has a 450-HP Sub-Boss.
10. Stage 10 has an 1800-HP Final Boss.
11. Earth ends after Stage 10.
12. Next Planet unlocks after Final Boss.
13. Canonical Squad Power is capped at 500.
14. Every 10 power becomes one buffed soldier.
15. 500 power becomes exactly 50 buffed soldiers.
16. One buffed soldier has exactly 10-normal-soldier DPS.
17. Buffed soldier uses same cadence with 10× damage.
18. No hidden extra projectiles emulate the compressed soldiers.
19. +Squad gains clamp near 500.
20. No +Squad option appears at 500.
21. Existing straight-fire/manual-aim behavior remains intact.
22. Existing visual quality does not regress.
23. Save migration works.
24. Tests/docs/version tags are complete.

---

# 59. FINAL PRODUCT INTENT

The desired campaign loop is:

```text
EARTH

Stage 1
longer but easy
enemies visible from far away

Stage 2
slightly more pressure

Stage 3
more HP/count

Stage 4
pre-boss escalation

Stage 5
regular battle
+
SUB-BOSS

Stage 6
second half begins

Stage 7
denser combat

Stage 8
higher pressure

Stage 9
final preparation

Stage 10
long regular battle
+
FINAL BOSS

→ EARTH COMPLETE
→ NEXT PLANET
```

At the same time:

```text
Squad Power grows
→ every 10 power consolidates into 1 buffed soldier
→ same total combat power
→ far fewer visible entities/projectiles
→ hard cap 500
→ 50 fully buffed soldiers at cap
```

The result should feel:

```text
LONGER
BETTER BALANCED
MORE SCALABLE
MORE READABLE
MORE STRATEGIC
MORE LIKE A COMPLETE CAMPAIGN
```

without sacrificing the current premium presentation or manual straight-fire gameplay.
