# SQUADFIRE — v0.4.0
## Final Pre-Implementation Clarifications
### Mandatory Addendum #2 to the Principal Engineering Implementation Plan

> **Status:** FINAL APPROVAL AFTER INCORPORATION
>
> This document supplements:
>
> 1. `SQUADFIRE_v0.4.0_PRINCIPAL_ENGINEERING_IMPLEMENTATION_PLAN.md`
> 2. `SQUADFIRE_v0.4.0_FINAL_CORRECTIONS_ADDENDUM.md`
>
> Priority when wording conflicts:
>
> ```text
> Final Pre-Implementation Clarifications (this document)
> > Final Corrections Addendum
> > Principal Engineering Implementation Plan
> > original v0.4.0 specification
> ```
>
> These clarifications were produced after a final read-only comparison of the current Task #6 against the actual v0.3.6 codebase.
>
> No code should be changed before these rules are incorporated into the task.
>
> After incorporation, implementation is authorized.
>
> If the implementation cannot preserve any rule below:
>
> ```text
> STOP
> REPORT THE CONFLICT
> DO NOT IMPROVISE
> DO NOT CREATE THE FINAL v0.4.0 TAG
> ```

---

# 1. DETERMINISTIC BOSS BALANCE PROFILES — DEFINE EXACTLY

The current plan requires deterministic Profiles A/B/C but does not define exactly how gate choices are made.

This is a material ambiguity because gate choices substantially affect:
- Squad Power;
- fire-rate modifier;
- damage modifier;
- boss TTK.

The measurement harness must not choose gates arbitrarily.

All profiles must use the same deterministic stage seed(s), spawn schedule and gameplay rules. Only the gate-choice policy differs.

---

## 1.1 Common theoretical DPS score

For profile decision-making only, define a projected theoretical squad DPS score proportional to:

```text
projectedDpsScore
=
squadPower
× damageModifier
× fireRateModifier
```

The constant rifle factors:

```text
baseDamage = 10
baseFireRate = 2
```

are identical for both choices and can be omitted from the comparison.

When evaluating a gate option:
- apply the actual modifier cap;
- apply the actual Squad Power cap;
- use the actual clamped +Squad gain;
- then compute the resulting score.

Do not use visible unit count as the DPS score input.

---

# 2. PROFILE A — MINIMAL COMBAT-POWER GROWTH

Profile A represents a conservative / low-power path.

For every gate pair:

1. Compute the post-choice `projectedDpsScore` for both offered effects.
2. Select the option producing the LOWER resulting score.
3. If both scores are equal because of caps or rounding, use this deterministic tie-break order:

```text
fire-rate
→ damage
→ squad
```

This tie-break exists only for reproducibility.

Profile A does not mean "skip gates"; the current game requires taking one side.

Record:
- every chosen effect;
- Squad Power at each boss;
- damage modifier;
- fire-rate modifier;
- total gates crossed.

Profile A is informational for release balance unless the resulting boss fight becomes clearly unreasonable or functionally unwinnable.

---

# 3. PROFILE C — MAXIMAL COMBAT-POWER GROWTH

Profile C represents an aggressively optimized path.

For every gate pair:

1. Compute the post-choice `projectedDpsScore` for both offered effects.
2. Select the option producing the HIGHER resulting score.
3. If equal, deterministic tie-break:

```text
damage
→ fire-rate
→ squad
```

Profile C is allowed to outperform Profile B.

Do not balance the entire release around Profile C.

Report extreme boss TTKs and overkill, but do not automatically fail the release solely because a fully optimized path is strong unless it breaks gameplay functionality.

---

# 4. PROFILE B — BALANCED / REALISTIC PROGRESSION

Profile B is the PRIMARY release-balance profile.

It must not be a subjective "pick whatever feels balanced" policy.

For each candidate gate choice, calculate the post-choice growth factors relative to the run's starting state:

```text
squadFactor =
postChoiceSquadPower / INITIAL_SQUAD_POWER
```

with:

```text
INITIAL_SQUAD_POWER = 5
```

and:

```text
damageFactor =
postChoiceDamageModifier
```

```text
fireRateFactor =
postChoiceFireRateModifier
```

Then calculate:

```text
imbalanceRatio =
max(squadFactor, damageFactor, fireRateFactor)
/
min(squadFactor, damageFactor, fireRateFactor)
```

Profile B selects the offered gate option that produces the LOWER `imbalanceRatio`.

This deliberately favors a more even progression among:
- Squad Power;
- Damage;
- Fire Rate.

If both choices produce the same `imbalanceRatio`:

1. choose the one with the LOWER resulting `projectedDpsScore`;
2. if still tied, use deterministic effect-type order:

```text
squad
→ fire-rate
→ damage
```

This policy is mechanical, reproducible and must be implemented in the measurement harness only.

Do not alter normal player gate behavior to enforce Profile B.

---

# 5. BALANCE SEEDS — REPRODUCIBILITY

Define one canonical acceptance seed and a small fixed robustness set in the measurement script.

Recommended:

```text
PRIMARY_BALANCE_SEED = 1337
```

Supplemental fixed seeds:

```text
17
29
43
71
101
```

The release gate thresholds are evaluated against Profile B on the PRIMARY seed.

The supplemental seeds are reported as robustness data:

```text
min TTK
median TTK
max TTK
```

If supplemental seeds reveal a severe outlier, report it even if the primary seed passes.

Do not use a random seed chosen at execution time for release acceptance.

---

# 6. GATE STEERING IN THE HEADLESS MEASUREMENT

The profile policy chooses an EFFECT, not merely "left" or "right".

The headless autopilot must then deliberately steer to the side containing that chosen effect before the gate is crossed.

Required assertion:

```text
chosenEffectByPolicy
===
effectActuallyAppliedByEngine
```

If not:
- the run is invalid;
- fail the measurement;
- do not silently continue.

Normal gameplay steering remains unchanged.

This policy exists only in the deterministic measurement harness.

---

# 7. BOSS DEATH DURING APPROACH — DEFINE SEMANTICS

The plan currently separates:
- boss approach time;
- boss combat TTK.

It must also define what happens if a powerful player kills the boss before it reaches its hold/combat position.

Required fields:

```text
bossSpawnTime
bossHoldReachedTime | null
bossDeathTime
approachCompleted: boolean
killedDuringApproach: boolean
approachSec
combatTTK | null
spawnToDeathSec
```

Rules:

### Boss survives to hold

```text
approachCompleted = true
killedDuringApproach = false

approachSec =
holdReachedTime - spawnTime

combatTTK =
deathTime - holdReachedTime
```

### Boss dies before hold

```text
approachCompleted = false
killedDuringApproach = true

approachSec =
deathTime - spawnTime

combatTTK = null

spawnToDeathSec =
deathTime - spawnTime
```

For Profile B:

```text
boss killed during approach
→ BALANCE REVIEW REQUIRED
```

automatically.

Reason:
a Sub-Boss or Final Boss that dies before entering its intended combat state has failed its gameplay purpose even if raw DPS math is internally correct.

Do not fake `combatTTK = 0`.

Report the actual `spawnToDeathSec`.

---

# 8. BOSS BALANCE GATE — FINAL RULE

Primary Profile B rules:

### Sub-Boss

If it reaches hold:

```text
preferred combat TTK:
10–20 sec
```

Balance review if:

```text
combatTTK < 8 sec
OR
combatTTK > 20 sec
```

or:

```text
killedDuringApproach === true
```

### Final Boss

If it reaches hold:

```text
preferred combat TTK:
18–30 sec
```

Balance review if:

```text
combatTTK < 12 sec
OR
combatTTK > 30 sec
```

or:

```text
killedDuringApproach === true
```

Approach target remains separately:

```text
8–12 sec
```

If approach is outside that range, flag:

```text
BOSS APPROACH REVIEW REQUIRED
```

and report it independently from HP/TTK balance.

---

# 9. `maxAlive` DEFER — TESTABILITY REQUIREMENT

Earth's normal configuration is unlikely to naturally hit the production `maxAlive` cap.

Therefore the required defer test must not depend on changing the production balance constant.

Add a TEST-ONLY injectable capacity override.

Recommended semantic API:

```text
Game test option:
maxAliveOverride?: number
```

Rules:

```text
production:
override undefined
→ use ENEMIES.maxAlive
```

```text
tests:
override small value such as 2 or 3
→ force defer behavior deterministically
```

This override:
- must not appear in production UI;
- must not persist;
- must not change the production balance constant;
- must exist only to make the invariant testable.

---

# 10. `spawnedRegulars` OWNERSHIP

Only regular enemies successfully spawned by the active Stage scheduler may increment:

```text
spawnedRegulars
```

Do NOT increment it for:
- dev stress spawns;
- manual dev spawn commands;
- boss entities;
- boss escorts;
- test-only arbitrary spawn helpers;
- render-preview fixtures.

For Earth v0.4.0:

```text
boss escorts = 0
```

so boss escort entities do not participate in the exact regular count.

Required invariant at Stage completion:

```text
spawnedRegulars
===
StageConfig.enemyCount
```

---

# 11. DEV / SCRIPTED RUNS MUST BE NON-PERSISTENT

The current task says dev/scripted stage jumps must not persist, but the mechanism must be explicit.

Add a run-level eligibility flag:

```text
progressEligible: boolean
```

Default normal run:

```text
true
```

Any developer action that materially changes run progression sets:

```text
progressEligible = false
```

This includes at minimum:
- jump to Stage;
- Next Stage dev command;
- Stage 5/10 shortcuts;
- Power presets;
- boss test;
- stress mode;
- direct enemy/spawn manipulation if present;
- any scripted shortcut that bypasses normal progression.

Once false:

```text
progressEligible
```

must remain false for the rest of that Game instance.

Retry/new normal run creates a fresh Game with:

```text
progressEligible = true
```

unless explicitly launched in dev/scripted mode.

---

# 12. CAMPAIGN SAVE MUST CHECK `progressEligible`

Before applying any campaign-persistent event:

```text
stage-clear
planet-complete
stage-unlock
```

the UI/campaign bridge must verify:

```text
game.progressEligible === true
```

If false:
- no campaign mutation;
- no AsyncStorage write caused by progression;
- runtime gameplay still functions normally.

Dev overlay must clearly display:

```text
DEV RUN — PROGRESS NOT SAVED
```

when `progressEligible === false`.

This avoids accidental Earth completion from a Stage 10 dev shortcut.

---

# 13. STAGE UNLOCK CLAMP MUST LIVE IN THE REDUCER

Do not rely only on migration-time clamping.

Every normal progress reducer must enforce the Planet boundary.

For Earth:

```text
highestCompletedStage <= 10
highestUnlockedStage <= 10
```

Therefore clearing Stage 10 must NOT temporarily produce:

```text
highestUnlockedStage = 11
```

even in memory.

Generic rule:

```text
highestUnlockedStage <= planet.stages.length
```

The reducer should receive or otherwise know the Planet Stage count.

---

# 14. `bestStage` DECISION — REMOVE FROM v3

Current v2 `bestStage` has no active UI consumer and conflicts conceptually with the new Planet-local model.

For v3:

```text
remove bestStage from the persisted schema
```

Migration may read old `bestStage`, but it does not need to preserve it.

Also:

```text
stage-start
```

should not trigger a campaign save merely to update `bestStage`.

Persistent progression is based on:
- cleared Stage;
- unlocked Stage;
- completed Planet.

Document removal in migration notes.

Do not leave the field's fate to executor interpretation.

---

# 15. REGULAR HP SOURCE OF TRUTH — REMOVE AMBIGUOUS "FOR EARTH" WORDING

The previous wording:

```text
retire archetype-HP × multiplier path for Earth
```

can invite an engine branch such as:

```text
if earth ...
```

which the architecture explicitly forbids.

Replace with the generic runtime rule:

```text
Regular enemy HP is always provided by StageConfig.enemyHP.
```

For the v0.4.0 runtime campaign:
- every playable Stage config must provide absolute `enemyHP`;
- `spawnEnemy` reads StageConfig only;
- no archetype HP multiplier participates in runtime regular HP.

Remove:
- `enemyHpMultiplier` from the active Stage model;
- obsolete `bossHpFor`/equivalent derived boss-HP path.

Enemy archetypes retain only their non-HP identity:
- speed;
- hit radius;
- depth tolerance;
- visuals;
- behavior.

If legacy HP fields have no remaining runtime/test consumer after refactor, delete them.

If a non-runtime fixture still needs a value, make it explicit in the fixture rather than preserving a second game-balance source of truth.

---

# 16. `rewardMultiplier` IS RESERVED ONLY

`rewardMultiplier` currently has no meaningful economy consumer in the requested v0.4.0 scope.

If retained in `StageConfig`, mark it:

```text
RESERVED / NO RUNTIME EFFECT IN v0.4.0
```

Do not wire it into:
- coins;
- upgrades;
- gates;
- permanent economy;
- score;

as part of this task.

Alternatively remove it from `StageConfig` for v0.4.0 if nothing requires it.

Do not invent an economy behavior.

---

# 17. PHASE 0 BASELINE — DO NOT MODIFY v0.3.6 TO CREATE MEASUREMENT TOOLS

Order must be:

1. Verify clean `v0.3.6`.
2. Create `pre-v0.4.0`.
3. Run already-existing type/tests/performance tooling.
4. Record all baseline metrics already available.

If v0.3.6 does NOT already contain a boss-TTK measurement utility:

```text
do not modify the clean baseline commit just to create one
```

Allowed options:
- mark the before boss-TTK metric as unavailable;
- use a temporary non-committed external/ad-hoc script;
- implement the proper repeatable measurement harness only after the `pre-v0.4.0` checkpoint as v0.4.0 work.

The checkpoint must represent the untouched clean baseline.

---

# 18. SPAWN GEOMETRY — INCLUDE ALL DEPTH MARGINS

When deriving:

```text
spatialGridMaxDepth
combatDepth
farSpawnInset
```

include the actual maximum of:
- regular spawn depth;
- spawn depth jitter;
- multi-row/group forward-depth offset;
- maximum regular `depthTolerance`;
- boss spawn depth;
- boss `depthTolerance`.

Required invariant:

```text
maximum actual hittable target depth
<
farVisibleDepth
```

and:

```text
maximum actual hittable target depth
<=
spatialGridMaxDepth
```

Do not size the grid only to the nominal spawn center.

Required first-step test:
- spawn the deepest legal regular target;
- confirm valid bucket;
- confirm immediate projectile sweep can hit it.

Repeat for boss.

---

# 19. UPDATED EXECUTOR ACKNOWLEDGEMENT

Before changing code, executor must explicitly acknowledge ALL of the following:

```text
1. squadPower and visible entity count remain separate.

2. projectile pool sizing, formation, firing iteration,
   renderer and stats.activeSoldiers remain based on visible entities,
   never squadPower.

3. Profiles A/B/C use the exact deterministic gate policies
   defined in this addendum.

4. The headless harness steers to the selected gate effect and
   asserts that the intended effect was actually applied.

5. boss approach time and boss combat TTK are separate metrics.

6. a boss killed before reaching hold automatically triggers
   BALANCE REVIEW REQUIRED under Profile B.

7. maxAlive defer is tested through a test-only injectable
   capacity override, without changing production balance.

8. only successful scheduler regular spawns increment
   spawnedRegulars.

9. dev/scripted mutations permanently mark the current run
   progressEligible = false.

10. campaign persistence ignores progression from ineligible runs.

11. Stage unlock reducers clamp to the Planet's real Stage count;
    Stage 10 never produces unlocked Stage 11.

12. bestStage is removed from schema v3.

13. regular runtime HP comes only from StageConfig.enemyHP;
    there is no Earth-specific HP branch in the engine.

14. rewardMultiplier is reserved/no-op or removed;
    no economy behavior is invented.

15. the clean pre-v0.4.0 checkpoint is created before any new
    measurement tooling is committed.

16. if any mandatory invariant cannot be honored,
    implementation stops and no final v0.4.0 tag is created.
```

Only after this acknowledgement should implementation begin.

---

# 20. FINAL AUTHORIZATION

After these clarifications are incorporated into Task #6, no further planning pass is required unless the executor discovers a contradiction with the real codebase.

Authorized workflow:

```text
incorporate clarifications
→ executor acknowledgement
→ implement Phases 0–15
→ automated validation
→ deterministic balance measurement
```

If balance passes:

```text
docs
→ commit
→ tag v0.4.0
→ STOP
```

If balance review is required:

```text
finish unrelated validation
→ commit tested state if appropriate
→ full report
→ DO NOT tag v0.4.0
→ STOP
→ wait for explicit user decision
```

No silent retuning.

No moved final tag.

No unrelated scope expansion.
