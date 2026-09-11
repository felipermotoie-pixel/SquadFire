# SQUADFIRE — v0.4.0
## Final Corrections Before Implementation
### Mandatory Addendum to the Principal Engineering Implementation Plan

> **Status:** APPROVED AFTER THESE CORRECTIONS
>
> This document is an addendum to:
>
> `SQUADFIRE_v0.4.0_PRINCIPAL_ENGINEERING_IMPLEMENTATION_PLAN.md`
>
> The Principal Engineering Implementation Plan remains authoritative.
>
> The corrections below are **mandatory** and override any conflicting wording in the current v0.4.0 task/plan.
>
> Do not begin implementation until these points are incorporated into the task description.
>
> If any conflict appears during implementation:
>
> ```text
> STOP
> REPORT THE CONFLICT
> DO NOT IMPROVISE A SILENT WORKAROUND
> ```

---

# 1. CORRECTION — SQUAD POWER VS VISIBLE ENTITY COUNT

The current Phase 9–10 wording is ambiguous and can incorrectly imply that projectile-pool sizing or visible-soldier stats should use `squadPower`.

That is NOT allowed.

The architecture must maintain two distinct concepts:

```text
squadPower
=
logical/base-equivalent combat power
range 0..500
```

and:

```text
squadSize / visibleUnitCount
=
actual visible living combat entities
maximum 50
```

These are intentionally different values and must never be treated as interchangeable.

---

## 1.1 Systems that MUST use `squadPower`

The following are combat-power semantics and must use canonical `squadPower`:

```text
+SQUAD gate gains
Squad Power losses
defeat condition
dev Power setter/presets
player-facing SQUAD N / 500 HUD
save/reporting values related to combat power
```

Required examples:

```text
squadPower = 497
+5 gate
→ effective gain +3
→ squadPower = 500
```

```text
squadPower = 500
lose 1
→ squadPower = 499
```

```text
squadPower = 0
→ defeat
```

Defeat must be based on:

```ts
squadPower === 0
```

not on a logical inference from visible entity count.

---

## 1.2 Systems that MUST continue to use visible entity count

The following systems operate on actual physical/visual combat entities and must NOT be switched to `squadPower`:

```text
formation layout
formation slots
formation edge clamp
anchorLimitFor(...)
firing iteration
per-soldier shot timers
renderer iteration
muzzle positions
projectile-source count
projectile pool sizing
stats.activeSoldiers
visible-unit performance metrics
```

At maximum Squad Power:

```text
squadPower = 500
visible units = 50
```

Therefore projectile pool sizing must continue to assume at most:

```text
50 visible firing sources
```

NOT:

```text
500 firing sources
```

This is a hard architectural invariant.

---

## 1.3 Exact replacement for Phase 9–10 wording

Replace the ambiguous Phase 9–10 description with:

> **Phase 9–10 — Damage, gain/loss and gates**
>
> Multiply projectile damage by `representedPower` while preserving the existing firing cadence.
>
> Add `addSquadPower(...)` and `loseSquadPower(...)`.
>
> Route only combat-power semantics through canonical `squadPower`:
>
> - +SQUAD gate gains;
> - enemy-contact / squad losses;
> - defeat check (`squadPower === 0`);
> - dev Power setter/presets;
> - player-facing `SQUAD N / 500` HUD.
>
> **Do not change existing `squadSize` consumers that operate on physical/visible entities.**
>
> The following must continue to use visible entity count:
>
> - formation;
> - anchor clamp;
> - firing iteration;
> - renderer;
> - projectile pool sizing;
> - `stats.activeSoldiers`.
>
> Add separate `squadPower`, Power10 count, partial-unit Power and visible-unit values to the developer overlay.
>
> Clamp +SQUAD gate amounts before display and exclude ADD_SQUAD at Power 500 with a valid alternative.
>
> No hidden bullets and no hidden soldier entities may be introduced.

---

# 2. CORRECTION — BOSS BALANCE DECISION GATE MUST DETECT BOTH EXTREMES

The current balance gate only detects bosses that die too quickly.

That is insufficient.

A boss can also be poorly balanced because it survives too long.

The release-balance decision must therefore test both lower and upper bounds.

---

## 2.1 Boss timing definitions

Keep two measurements separate:

```text
Boss Approach Time
```

and:

```text
Boss Combat TTK
```

`Boss Combat TTK` begins only once the boss reaches the intended combat/hold state.

Do NOT include the 8–12 second approach period inside combat TTK.

---

## 2.2 Boss approach target

Required target:

```text
8–12 seconds
```

from far-horizon spawn to the intended boss combat/hold position.

The boss approach speed should be derived from the travel distance and this semantic target duration.

Do not reuse the old raw approach speed if it creates ~30+ seconds of walking.

---

## 2.3 Measurement profiles

Run three deterministic profiles.

### Profile A — Minimal upgrades

Purpose:

```text
low-power / conservative progression
worst practical build
```

Report:
- Sub-Boss TTK;
- Final Boss TTK;
- approach time;
- final Squad Power;
- damage/fire-rate modifiers.

Profile A is primarily informational.

Do not fail the release solely because Profile A is slower than the preferred target unless it is clearly unreasonable or functionally unwinnable.

---

### Profile B — Balanced / realistic progression

This is the PRIMARY release-balance profile.

Use a deterministic balanced gate-choice strategy representative of a normal player.

Boss combat targets:

```text
Sub-Boss:
10–20 sec preferred
```

```text
Final Boss:
18–30 sec preferred
```

Mandatory balance-review thresholds:

```text
Sub-Boss:
< 8 sec
OR
> 20 sec
→ BALANCE REVIEW REQUIRED
```

```text
Final Boss:
< 12 sec
OR
> 30 sec
→ BALANCE REVIEW REQUIRED
```

---

### Profile C — Aggressively optimized

Purpose:

```text
high-power / optimized build
```

Report:
- Squad Power;
- damage modifier;
- fire-rate modifier;
- boss TTK.

Do not silently rebalance the entire game around Profile C.

An optimized build is allowed to outperform the balanced profile.

However, extreme values must still be reported.

---

# 3. CORRECTION — WHAT HAPPENS IF BALANCE REVIEW REQUIRED TRIGGERS

This must be explicit.

The executor must not decide this behavior ad hoc.

Use the conservative release process below.

---

## 3.1 If boss balance passes

If the mandatory Profile B thresholds pass:

```text
continue normal validation
complete docs
commit
tag v0.4.0
STOP
```

---

## 3.2 If boss balance fails

If either boss triggers:

```text
BALANCE REVIEW REQUIRED
```

then:

1. Complete all implementation work unrelated to the balance adjustment.
2. Complete automated tests.
3. Complete render/performance validation.
4. Generate the full Principal Plan §89 report.
5. Clearly mark:

```text
BALANCE REVIEW REQUIRED
```

6. Report:
   - current Sub-Boss HP;
   - current Final Boss HP;
   - Profile A/B/C TTK;
   - boss approach time;
   - Squad Power at boss entry;
   - damage/fire-rate modifiers;
   - current gate count/frequency contribution;
   - recommended balance options.
7. Commit the tested implementation state if appropriate.
8. **DO NOT create the final `v0.4.0` tag yet.**
9. STOP and wait for explicit user approval.

Never silently change:
- boss HP;
- gate frequency;
- gate multipliers;
- boss mechanics.

Never create `v0.4.0`, then move that tag later.

The final tag is created only after the user explicitly approves the balance correction or confirms that the measured baseline is acceptable.

---

# 4. REQUIRED BALANCE OPTIONS IN THE REPORT

If the boss decision gate fails, report options separately rather than implementing one automatically.

Potential options may include:

```text
A. increase/decrease boss HP
B. adjust gate frequency
C. adjust available gate composition
D. adjust boss combat mechanics
E. leave baseline unchanged intentionally
```

For each proposed option report:

```text
expected impact
regression risk
systems affected
whether it changes existing upgrade behavior
```

The Principal Plan scope restrictions remain in force.

---

# 5. BOSS HP REMAINS BASELINE UNTIL MEASURED

Do not change the authoritative measurement baseline before the test:

```text
Stage 5 Sub-Boss = 4,500 HP
Stage 10 Final Boss = 18,000 HP
```

These values must be measured first.

If balance review triggers:

```text
report
STOP
wait for approval
```

Do not tune them during implementation just to make the tests "green".

---

# 6. REQUIRED TEST ADDITIONS

Add explicit tests/measurements confirming the corrected architecture.

---

## 6.1 Squad Power vs visible-unit semantics test

At Power 500:

```text
squadPower = 500
visible count = 50
projectile pool sized for visible firing sources
```

Assertions:

```text
projectile pool requirement does NOT multiply by 500
stats.activeSoldiers == visible entity count
HUD Squad value == squadPower
formation input == visible entity count
```

---

## 6.2 Power boundary test

Test:

```text
500 → lose 1 → 499
```

Required:

```text
squadPower == 499
visibleUnitCount <= 50
projectile pool semantics unchanged
```

Test:

```text
10 → lose 1 → 9
```

Required:

```text
squadPower == 9
no accidental -10 Power
```

---

## 6.3 Boss Profile B balance gate test/report

The measurement script must automatically compute:

```text
subBossCombatTTK
finalBossCombatTTK
```

and derive:

```text
balanceReviewRequired: boolean
```

using:

```text
Sub-Boss:
TTK < 8 || TTK > 20
```

```text
Final Boss:
TTK < 12 || TTK > 30
```

The script/report must keep:

```text
approachSec
```

separate from combat TTK.

---

# 7. REQUIRED FINAL REPORT ADDITION

Add a final section:

```text
BALANCE VERDICT
```

It must contain:

```text
Sub-Boss:
HP
Profile A TTK
Profile B TTK
Profile C TTK
Approach Time
PASS / REVIEW REQUIRED

Final Boss:
HP
Profile A TTK
Profile B TTK
Profile C TTK
Approach Time
PASS / REVIEW REQUIRED

Overall:
BALANCED FOR v0.4.0
or
BALANCE REVIEW REQUIRED
```

If review is required, also include:

```text
Recommended Option 1
Recommended Option 2
Recommended Option 3
```

with expected impact and regression risk.

---

# 8. FINAL AUTHORIZATION AFTER THIS ADDENDUM

With this addendum incorporated, the v0.4.0 Principal Engineering Implementation Plan is approved for implementation.

Mandatory invariants remain:

```text
rifle base damage unchanged
rifle cadence unchanged
standard projectile behavior unchanged
manual straight-fire unchanged
damage/fire-rate upgrade formulas unchanged
squadPower separated from visible entities
maximum 50 visible combat units
projectile pool based on visible firing sources
no Stage 11
exact Stage enemy counts
far-spawn enemies immediately hittable
spatial grid covers far spawn
maxAlive defers rather than drops
save writes serialized
Planet completion idempotent
boss HP not silently retuned
```

If implementation cannot preserve any of these:

```text
STOP
REPORT THE CONFLICT
DO NOT CREATE THE FINAL v0.4.0 TAG
```

---

# 9. EXECUTOR ACKNOWLEDGEMENT REQUIRED

Before changing code, the executor should explicitly confirm:

```text
1. squadPower and visible entity count will remain separate.
2. projectile pool/stat visible consumers will NOT be moved to squadPower.
3. boss balance will be measured with Profiles A/B/C.
4. Profile B will use both lower and upper TTK thresholds.
5. boss approach time and combat TTK will be reported separately.
6. if BALANCE REVIEW REQUIRED triggers, final v0.4.0 tagging will stop pending approval.
7. boss HP and gate balance will never be silently modified.
```

Only then proceed with implementation.
