# SquadFire — Balance (v0.4.0)

All numbers live in `game/balance.ts` (weapons, squad, caps, far spawn, boss) and `game/stages.ts`
(Earth table). Measured results: `docs/reports/EARTH_BALANCE_v0.4.0.md` (`pnpm run measure:earth`).

## Damage model
```
squad DPS ≈ squadPower × damage(10) × damageMult × fireRate(2/s) × fireRateMult × hitEfficiency
```
Squad Power enters exactly once: a soldier's bullet deals `damage × damageMult × representedPower`
(`SQUAD_STACKING.md`). Modifiers come only from gates and are capped (`MODIFIER_CAPS`: damage ×3, fire
rate ×2.5). Squad Power caps at 500 (`MAX_SQUAD_POWER`), visible soldiers at 50.

## Reference numbers (base mods, all lanes hitting)
| Squad Power | Visible | Shots/s | DPS | Stage-1 grunt (20 HP) kills/s |
| --- | --- | --- | --- | --- |
| 5 | 5 | 10 | 100 | 5 |
| 9 | 9 | 18 | 180 | 9 |
| 10 | 1 × P10 | 2 | 200 | 2 (one 100-dmg bullet per kill: 80 overkill) |
| 13 | P10 + P3 | 4 | 260 | — |
| 100 | 10 × P10 | 20 | 2000 | — |
| 500 | 50 × P10 | 100 | 10 000 | — |
At both caps (×3 × ×2.5 = 7.5) power 5 already outputs 750 DPS and power 13 ≈ 1950 DPS.

## Bosses (absolute HP)
| Boss | HP | Approach | Hold | Slam cadence |
| --- | --- | --- | --- | --- |
| Warden of the Causeway (Stage 5) | 4500 | 10 s from `bossSpawnDepth` to `holdY` 3.1 | patrol ±0.5 | base |
| High Warden of the Causeway (Stage 10) | 18 000 | 10 s | patrol | ×0.85 interval |
Target windows (Principal Plan §84): sub-boss TTK 8–20 s, final 12–30 s, approach 8–12 s, bosses
should reach the hold. Bullets reach the far spawn, so the boss takes damage during the approach.

## Pacing (Earth, measured, Profile B seed 1337)
- Stage clear times 63 / 68 / 73 / 76 / 81 / 77 / 85 / 92 / 95 / 105 s → run 832 s (13.9 min), inside the
  13–15 min target; deferred spawns 0; peak active enemies 12; avg active 1–4 (the far spawn stretches a
  group over the whole road).
- Gates: 68 pairs crossed in a run (first at 9 s, every 12 s, paused during bosses). Profile A/B reach
  both modifier caps by Stage 4; Profile C (squad-first) ends at power ≈ 242 with visible 25.
- Boss results: Profile B killed the sub-boss 2.1 s after spawn and the final boss 7.8 s after spawn,
  both **during the approach** (hold never reached); Profile A (minimal, power 5) killed the sub-boss in
  7.3 s during approach and the final boss in 28.6 s total (18.6 s of combat at the hold). Supplemental
  seeds 17/29/43/71/101 agree (sub 1.3–2.4 s, final 7.4–8.3 s). → **BALANCE REVIEW REQUIRED**; no
  numbers were tuned in v0.4.0 beyond the authored spec.

## Hit efficiency and overkill
No targeting: `hitEfficiency` is positioning. Collision is a swept segment test inside `combatDepth`
(camera-derived). Overkill is now tracked (`stats.overkillDamage`, `damageDealt`): with P10 units
firing 100+-damage bullets at 20–120 HP regulars, ~53 % of raw output was overkill in the measured run.

## Formation and reach
Unchanged from v0.3.6 (5 columns × 0.15, rows 0.12, thresholds 2/5/12/24, clamp per row, ±0.70 → ±0.55).
The formation is built from *visible* soldiers, so a 500-power squad is the same 50-block as before.

## Projectile range and pool
Bullets fly to `farVisibleDepth` (≈ 23.1) and can hit anything from the spawn line (≈ 21.6) inward.
Pool 780 (50 × 12 × 1.3), sized from the visible count; measured peak 266 in-flight in the balance run
and 521 in the all-miss render scene; `projectilePoolExhausted` stayed 0.

## Tuning knobs worth touching first (see report options A–E)
1. Boss HP (`EARTH_ROWS[4|9].boss.hp`) — direct TTK lever; does not touch regular pacing.
2. `GATES.firstAt / interval` — modifier ramp speed; also changes how fast power grows.
3. Gate composition / caps (`nextGatePair`, `MODIFIER_CAPS`) — the 7.5× product is the main reason bosses
   die in the approach.
4. Boss mechanics (`FAR_SPAWN.bossInset`, `approachDurationTargetSec`, damage gating during approach).
5. `EARTH_ROWS` counts / windows / HP — stage pressure; keep the 13–15 min run.
6. `WEAPONS.rifle.fireRate` — global cadence.
